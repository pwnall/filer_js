/** Uploads a blob (file fragment) to a server. */
PwnFiler.UploadTask = function (uploadUrl, progressCallback, blobData,
                                finishCallback) {
  this.blobData = blobData;
  this.finishCallback = finishCallback;
  var xhr = new XMLHttpRequest();
  this.xhr = xhr;
  var task = this;
  xhr.onprogress = function (event) {
    
  };
  var loadHandler = function (event) {
    if (event.target.readyState !== (XMLHttpRequest.DONE || 4) ||
        task.blobData === null) {
      return true;
    }
    if (event.target.status === 200) {
      var result = task.blobData;
      task.blobData = null;
      task.finishCallback(result);
      return;
    }
    // TODO(pwnall): transport error, retry
  };
  xhr.onloadend = loadHandler;
  xhr.onerror = loadHandler;
  xhr.onload = loadHandler;
  PwnFiler.UploadTask.xhrSend(xhr, blobData, uploadUrl);
};
/**
 * Sets up an XHR to upload binary data.
 * 
 * @param xhr a XmlHttpRequest object
 * @param blobData pipeline data block that contains the raw binary data in 
 *                 the binaryData property
 * @param uploadUrl root URL for uploading chunks of a file
 */
PwnFiler.UploadTask.xhrSend = function (xhr, blobData, uploadUrl) {
  xhr.open('POST', uploadUrl + '/' + blobData.hashId, true);
  xhr.setRequestHeader('X-Filer-Start', blobData.start);
  xhr.setRequestHeader('X-Filer-Size', blobData.fileSize);
  xhr.setRequestHeader('X-Filer-ID', blobData.fileId);
  xhr.setRequestHeader('Content-Type', blobData.blob.type ||
                                       'application/octet-stream');
  
  var data = blobData.binaryData;
  if (true) {
    // Assumes the browser is smart enough to avoid doing the disk I/O twice.
    xhr.send(blobData.blob);
  } else {
    if (xhr.sendAsBinary) {
      // Firefox 4 supports this, but not BlobBuilder.
      xhr.sendAsBinary(data);
    } else {
      var length = data.length;
      var buffer = new ArrayBuffer(data.length);
      var bytes = new Uint8Array(buffer, 0);
      for (var i = 0; i < length; i += 1) {
        bytes[i] = data.charCodeAt(i);
      }
      
      var builderClass = window.BlobBuilder || window.WebKitBlobBuilder;
      var builder = new builderClass();
      builder.append(buffer);
      xhr.send(builder.getBlob());
    }
  }
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
