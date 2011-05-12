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
