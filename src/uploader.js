/** Namespace. */
PwnUploader = {};

/** Invokes the real file click. */
PwnUploader.onFakeUploadClick = function (event) {
  $('#real-file-control').click();
  event.preventDefault();
  return false;
};

/** Updates the nice file display. */
PwnUploader.onRealUploadChange = function (event) {
  var control = $('#real-file-control')[0];
  if (control.files.length < 1) {
    PwnUploader.setFile(null);
  } else {
    PwnUploader.setFile(control.files.item(0));
  }
};

/** Highlights the file drop area, to show that it accepts files. */
PwnUploader.onDropAreaDragEnter = function (event) {
  // Not interested in anything that's not a file.
  var transfer = event.originalEvent.dataTransfer;
  if (PwnUploader.dataTransferHasFiles(transfer)) {
    transfer.dropEffect = 'copy';
  } else {
    return true;
  }

  if (PwnUploader.onDropAreaDragEnter.count === 0) {
    $('#drop-area').addClass('active');
  }
  PwnUploader.onDropAreaDragEnter.count += 1;
  event.preventDefault();
  return false;
};

/** Removes the file drop area highlighting if the user drags out the file. */
PwnUploader.onDropAreaDragLeave = function (event) {
  var transfer = event.originalEvent.dataTransfer;
  if (!PwnUploader.dataTransferHasFiles(transfer)) {
    return true;
  }
  
  PwnUploader.onDropAreaDragEnter.count -= 1;
  if (PwnUploader.onDropAreaDragEnter.count == 0) {
    $('#drop-area').removeClass('active');
  }
};

/** Number of dragenter events not matched by dragleave events.  */
PwnUploader.onDropAreaDragEnter.count = 0;

/** Shows interest in the drag operation. */
PwnUploader.onDropAreaDragOver = function (event) {
  // Not interested in anything that's not a file.
  var transfer = event.originalEvent.dataTransfer;
  if (PwnUploader.dataTransferHasFiles(transfer)) {
    transfer.dropEffect = 'copy';
  } else {
    return true;
  }

  event.preventDefault();
  return false;
};

/** Registers a dropped file. */
PwnUploader.onDropAreaDrop = function (event) {
  PwnUploader.onDropAreaDragEnter.count = 0;
  $('#drop-area').removeClass('active');
  
  var transfer = event.originalEvent.dataTransfer;
  if (transfer.files.length == 0) {
    PwnUploader.setFile(null);
  } else {
    PwnUploader.setFile(transfer.files.item(0));
    transfer.dropEffect = 'copy';
  }
  event.preventDefault();
  return false;
};

/** Cross-browser check for whether a Drag and Drop involves files. */
PwnUploader.dataTransferHasFiles = function(data) {
  if (data.types.contains) {
    return data.types.contains('Files');
  } else if (data.types.indexOf) {
    return data.types.indexOf('Files') !== -1;
  } else if (data.files) {
    return data.files.length > 0;
  }
  return false;
}

/** Updates internal state to reflect the actively selected file. */
PwnUploader.setFile = function (file) {
  if(file) {
    PwnUploader.setFile.currentFile = file;
    $('#upload-file-name').text(file.name + " " + file.size + " " + file.type);
    
    var blob = file;
    var start = file.size * 0.9;
    var length = 128 * 1024;
    if (file.slice) {
      var blob = file.slice(start, length);
    } else if (file.mozSlice) {
      var blob = file.mozSlice(start, start + length, file.type);
    } else if (file.webkitSlice) {
      var blob = file.webkitSlice(start, start + length, file.type);
    } else {
      $('#upload-file-name').text('no File.slice support; reading whole file');
    }
    
    var reader = new FileReader();
    reader.onloadend = function (event) {
      if (event.target.readyState != FileReader.DONE) { return; }
      var data = event.target.result;
      $('#status-text').text('read ' + data.length + ' bytes');
    };
    
    reader.readAsBinaryString(blob);
  } else {
    $('#upload-file-name').text('none');
  }
};
/** The file to be uploaded. */
PwnUploader.setFile.currentFile = null;

/** Hooks up listeners to interesting DOM events. */
PwnUploader.onLoad = function (event) {
  $('#fake-file-control').bind('click', PwnUploader.onFakeUploadClick);
  $('#real-file-control').bind('change', PwnUploader.onRealUploadChange);
  $('#drop-area').bind('dragenter', PwnUploader.onDropAreaDragEnter);
  $('#drop-area').bind('dragover', PwnUploader.onDropAreaDragOver);
  $('#drop-area').bind('dragleave', PwnUploader.onDropAreaDragLeave);
  $('#drop-area').bind('drop', PwnUploader.onDropAreaDrop);
};

$(PwnUploader.onLoad);
