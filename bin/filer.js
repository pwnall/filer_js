/*jslint white: true, undef: true, newcap: true, nomen: false, onevar: false, regexp: false, plusplus: true, bitwise: true, maxlen: 80, indent: 2 */
/*global $, console, document, window, Element, FileReader */

/* This file is concatenated first in the big JS file. */

/**
 * Creates an upload control.
 * 
 * The following options are understood:
 *   * multiple: support multiple files (false by default)
 *   * uploadButton: CSS selector or DOM element for the user-friendly upload
 *                   button
 *   * dropArea: CSS selector or DOM element for area that accepts drop files
 *   * dropAreaActiveClass: CSS class applied to drop area when the user is
 *                          dragging a file on it ('active' by default)
 */
var PwnFiler = PwnFiler || function (options) {
  options = options || {};
  
  this.multiple = options.multiple || false;
  if (options.uploadButton) {
    var button = options.uploadButton;
    if (!(button instanceof Element)) {
      button = document.querySelector(button);
    }
    this.initControl(button);
  }
  
  if (options.dropArea) {
    var area = options.dropArea;
    if (!(area instanceof Element)) {
      area = document.querySelector(area);
    }
    this.initDropArea(area, options.dropAreaActiveClass || 'active');
  }
};
/**
 * Sets up a file upload dialog in response to clicks on a fake control.
 * 
 * @param uploadButton DOM element whose clicks trigger the upload dialog
 */
PwnFiler.prototype.initControl = function (uploadButton) {
  var fileInput = document.createElement('input');
  fileInput.setAttribute('type', 'file');
  if (this.multiple) {
    fileInput.setAttribute('multiple', 'multiple');
  }
  
  var inputStyle = fileInput.style;
  inputStyle.display = 'block';
  inputStyle.position = 'absolute';
  inputStyle.width = inputStyle.height = '0';
  inputStyle.zIndex = '-1000';
  
  uploadButton.parentNode.insertBefore(fileInput, uploadButton);

  var filer = this;
  uploadButton.addEventListener('click', function (event) {
    return filer.onUploadClick(event);
  }, false);
  fileInput.addEventListener('change', function (event) {
    return filer.onFileInputChange(event);
  }, false);
  
  this.fileInput = fileInput;
};

/**
 * Called when the user clicks on an upload button.
 * 
 * Invokes a file selection dialog.
 */
PwnFiler.prototype.onUploadClick = function (event) {
  this.fileInput.click();
  event.preventDefault();
  return false;
};

/** Updates the nice file display. */
PwnFiler.prototype.onFileInputChange = function (event) {
  var control = event.target;
  if (control.files.length === 0) {
    this.onFileSelect(null);
  } else {
    var files = [];
    for (var i = 0; i < control.files.length; i += 1) {
      files[i] = control.files[i];
    }
    this.onFileSelect(files);
  }
  return true;
};
/** File drag and drop functionality. */

/**
 * Sets up a DOM element to accept files via drag and drop.
 * 
 * @param dropArea DOM element that accepts files
 * @param dropActiveClass class to be applied to the DOM element when active
 */
PwnFiler.prototype.initDropArea = function (dropArea, dropActiveClass) {
  var filer = this;
  dropArea.addEventListener('dragenter', function (event) {
    return filer.onDropAreaDragEnter(event);
  }, false);
  dropArea.addEventListener('dragover', this.onDropAreaDragOver, false);
  dropArea.addEventListener('dragleave', function (event) {
    return filer.onDropAreaDragLeave(event);
  }, false);
  dropArea.addEventListener('drop', function (event) {
    return filer.onDropAreaDrop(event);
  }, false);
  this.dropArea = dropArea;
  this.dropActiveClass = dropActiveClass;
};

/** Highlights the file drop area, to show that it accepts files. */
PwnFiler.prototype.onDropAreaDragEnter = function (event) {
  // Not interested in anything that's not a file.
  var transfer = event.dataTransfer;
  if (PwnFiler.dataTransferHasFiles(transfer)) {
    transfer.dropEffect = 'copy';
  } else {
    return true;
  }

  if (this.dropAreaEnterCount === 0) {
    this.activateDropArea();
  }
  this.dropAreaEnterCount += 1;
  event.stopPropagation();
  event.preventDefault();
  return false;
};


/** Removes the file drop area highlighting if the user drags out the file. */
PwnFiler.prototype.onDropAreaDragLeave = function (event) {
  if (!PwnFiler.dataTransferHasFiles(event.dataTransfer)) {
    return true;
  }
  
  this.dropAreaEnterCount -= 1;
  if (this.dropAreaEnterCount === 0) {
    this.deactivateDropArea();
  }
};

/** Number of dragenter events not matched by dragleave events.  */
PwnFiler.prototype.dropAreaEnterCount = 0;

/** Shows interest in the drag operation. */
PwnFiler.prototype.onDropAreaDragOver = function (event) {
  // Not interested in anything that's not a file.
  var transfer = event.dataTransfer;
  if (PwnFiler.dataTransferHasFiles(transfer)) {
    transfer.dropEffect = 'copy';
  } else {
    return true;
  }

  event.stopPropagation();
  event.preventDefault();
  return false;
};

/** Registers a dropped file. */
PwnFiler.prototype.onDropAreaDrop = function (event) {
  this.dropAreaEnterCount = 0;
  this.deactivateDropArea();
  
  var transfer = event.dataTransfer;
  if (transfer.files.length === 0) {
    this.onFileSelect(null);
  } else {
    var files = [];
    for (var i = 0; i < transfer.files.length; i += 1) {
      files[i] = transfer.files.item(i);
    }
    this.onFileSelect(files);
    transfer.dropEffect = 'copy';
  }

  event.stopPropagation();
  event.preventDefault();
  return false;
};

/** Change the drop area to reflect that the user is dragging a file over it. */
PwnFiler.prototype.activateDropArea = function () {
  var area = this.dropArea;
  var klass = this.dropActiveClass;
  if (area.className.split(/\s+/).indexOf(klass) === -1) {
    area.className += " " + klass;
  }
};

/** Revert the drop area to the state before the user dragged a file over it. */
PwnFiler.prototype.deactivateDropArea = function () {
  var area = this.dropArea;
  var klass = this.dropActiveClass;
  area.className = area.className.split(/\s+/).filter(function (s) {
    return s !== klass;
  }).join(' ');
};

/** Cross-browser check for whether a Drag and Drop involves files. */
PwnFiler.dataTransferHasFiles = function (data) {
  if (data.types.contains) {
    return data.types.contains('Files');
  } else if (data.types.indexOf) {
    return data.types.indexOf('Files') !== -1;
  } else if (data.files) {
    return data.files.length > 0;
  }
  return false;
};
/** Updates internal state to reflect the actively selected file. */
PwnFiler.prototype.onFileSelect = function (files) {
  if (files) {
    var file = files[0];
    this.currentFile = file[0];
    $('#upload-file-name').text(file.name + " " + file.size + " " + file.type);
    
    var blob = file;
    var start = file.size * 0.9;
    var length = 128 * 1024;
    if (file.slice) {
      blob = file.slice(start, length, file.type);
    } else if (file.mozSlice) {
      blob = file.mozSlice(start, start + length, file.type);
    } else if (file.webkitSlice) {
      blob = file.webkitSlice(start, start + length, file.type);
    } else {
      $('#upload-file-name').text('no File.slice support; reading whole file');
    }
    
    var reader = new FileReader();
    reader.onloadend = function (event) {
      if (event.target.readyState !== FileReader.DONE) {
        return;
      }
      var data = event.target.result;
      $('#status-text').text('read ' + data.length + ' bytes');
    };
    
    reader.readAsBinaryString(blob);
  } else {
    $('#upload-file-name').text('none');
  }
};
/** The file to be uploaded. */
PwnFiler.prototype.currentFile = null;
