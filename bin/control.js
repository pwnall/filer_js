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

/** Hooks up the classic uploader control. */
PwnUploader.initControl = function () {
  $('#fake-file-control').bind('click', PwnUploader.onFakeUploadClick);
  $('#real-file-control').bind('change', PwnUploader.onRealUploadChange);
};
