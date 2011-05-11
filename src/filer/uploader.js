/** Namespace. */
PwnUploader = {};

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
  PwnUploader.initControl();
  PwnUploader.initDragDrop();
};

$(PwnUploader.onLoad);
