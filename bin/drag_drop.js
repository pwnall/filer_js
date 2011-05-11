/** File drag and drop functionality. */

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
};

/** Hooks up the drag and drop control. */
PwnUploader.initDragDrop = function () {
  $('#drop-area').bind('dragenter', PwnUploader.onDropAreaDragEnter);
  $('#drop-area').bind('dragover', PwnUploader.onDropAreaDragOver);
  $('#drop-area').bind('dragleave', PwnUploader.onDropAreaDragLeave);
  $('#drop-area').bind('drop', PwnUploader.onDropAreaDrop);
}
