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
