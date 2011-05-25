/** Uploads a blob (file fragment) to the server. */
PwnFiler.UploadTask = function (uploadUrl, progressCallback, blobData,
                                finishCallback) {
  this.uploadUrl = uploadUrl;
  this.blobData = blobData;
  this.progressCallback = progressCallback;
  this.finishCallback = finishCallback;
  
  this.checkChunk();
};

/** Verifies if a chunk exists on the server, to avoid re-uploading. */
PwnFiler.UploadTask.prototype.checkChunk = function () {
  var xhr = new XMLHttpRequest();
  this.xhr = xhr;
  
  var task = this;
  var loadHandler = function (event) {
    return task.onChunkLoadEnd(event);
  };
  xhr.onloadend = loadHandler;
  xhr.onerror = loadHandler;
  xhr.onload = loadHandler;

  var blobData = this.blobData;
  xhr.open('PUT', this.uploadUrl, true);
  xhr.setRequestHeader('X-PwnFiler-FileID', blobData.fileId);
  xhr.setRequestHeader('X-PwnFiler-Hash', blobData.hashId);
  xhr.setRequestHeader('X-PwnFiler-Start', blobData.start);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({fileSize: blobData.fileSize,
      mimeType: blobData.blob.type || 'application/octet-stream'}));
};

/** Called when the check XHR completes, successfully or with an error. */
PwnFiler.UploadTask.prototype.onChunkLoadEnd = function (event) {
  if (event.target.readyState !== (XMLHttpRequest.DONE || 4) ||
      this.blobData === null) {
    return true;
  }
  if (event.target.status === 200) {
    var response = JSON.parse(event.target.response);
    
    if (response.present) {
      this.onXhrCompletion();
    } else {
      this.uploadChunk();
    }
    return true;
  }
  // TODO(pwnall): report unrecoverable error
  return true;
};

/** Uploads chunk contents that presumably does not exist on the server. */
PwnFiler.UploadTask.prototype.uploadChunk = function () {
  var xhr = new XMLHttpRequest();
  this.xhr = xhr;

  var task = this;
  xhr.upload.onprogress = function (event) {
    if (event.loaded) {
      task.progressCallback(task.blobData, event.loaded);
    }
  };
  var loadHandler = function (event) {
    return task.onUploadLoadEnd(event);
  };
  xhr.onloadend = loadHandler;
  xhr.onerror = loadHandler;
  xhr.onload = loadHandler;

  var blobData = this.blobData;
  xhr.open('POST', this.uploadUrl, true);
  xhr.setRequestHeader('X-PwnFiler-FileID', blobData.fileId);
  xhr.setRequestHeader('X-PwnFiler-Hash', blobData.hashId);
  xhr.setRequestHeader('X-PwnFiler-Start', blobData.start);
  xhr.setRequestHeader('Content-Type', 'application/octet-stream');
  xhr.send(blobData.binaryData);
};

/** Called when the upload XHR completes, successfully or with an error. */
PwnFiler.UploadTask.prototype.onUploadLoadEnd = function (event) {
  if (event.target.readyState !== (XMLHttpRequest.DONE || 4) ||
      this.blobData === null) {
    return true;
  }
  if (event.target.status === 200) {
    this.onXhrCompletion();
    return true;
  } else if (event.target.status === 400) {
    // Data must have been corrupted in transit. Retry.
    this.uploadChunk();
    return true;
  }
  // TODO(pwnall): report unrecoverable error
  return true;
};

/** Called when all the necessary XHRs complete successfully. */
PwnFiler.UploadTask.prototype.onXhrCompletion = function () {
  var result = this.blobData;
  this.blobData = null;
  this.progressCallback(result, result.binaryData.length);
  this.finishCallback(result);
};

/** Creates an UploadTask constructor. */
PwnFiler.UploadTask.create = function (uploadUrl, progressCallback) {
  return function (blobData, callback) {
    return new PwnFiler.UploadTask(uploadUrl, progressCallback, blobData,
                                   callback);
  };
};

/** Cancels a partial file read task. */
PwnFiler.UploadTask.prototype.cancel = function (event) {
  if (this.blobData === null) {
    return;
  }
  this.blobData = null;
  this.xhr.abort();
};
