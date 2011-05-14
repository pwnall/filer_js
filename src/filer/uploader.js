/** Upload sketch. */
PwnFiler.prototype.pumpFiles = function (files) {
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
