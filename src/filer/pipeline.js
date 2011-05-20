/** Manages the upload pipeline. */

/**
 * Sets up the upload pipeline.
 * 
 * @param
 * @param options optional flags for tweaking the pipeline performance
 */
PwnFiler.prototype.initPipeline = function (options) {
  var pipeline = this.pipeline = {};
  pipeline.blockQ = new PwnFiler.BlockQueue(options.blockSize || 1024 * 1024);
  pipeline.readQ = new PwnFiler.TaskQueue(pipeline.blockQ,
      PwnFiler.ReadQueue.create, options.readQueueSize || 5);
  pipeline.hashQ = new PwnFiler.TaskQueue(pipeline.readQ,
      PwnFiler.TaskQueue.create, options.hashQueueSize || 5);
  pipeline.sendQ = new PwnFiler.SendQueue(pipeline.sendQ,
      PwnFiler.UploadTask.create, 1);
};

/** Special queue that takes files and breaks them up into blobs. */
PwnFiler.BlockQueue = function (blockSize) {
  this.blockSize = blockSize;
  this.files = [];
  this.currentFile = 0;
  this.currentOffset = 0;
};
/** Pushes a file into the queue. */
PwnFiler.BlockQueue.prototype.push = function (fileData) {
  var fileId = sjcl.hash.sha256.hash(fileData.domFile.name);
  this.files.push({fileData: fileData, fileId: fileId});
};
/** True if there is nothing to pop from the queue. */
PwnFiler.BlockQueue.prototype.empty = function () {
  return this.currentFile > this.files.length;
};
/** A blob data object to be read, or null if the queue is empty. */
PwnFiler.BlockQueue.prototype.pop = function () {
  if (this.empty()) {
    return null;
  }
  
  var blobData = this.files[this.currentFile];
  var file = blobData.fileData.domFile;
  var bytesLeft = file.size - this.currentOffset;
  var blockSize = Math.min(this.blockSize, bytesLeft);
  var blob = file;
  var start = this.currentOffset;
  if (file.slice) {
    blob = file.slice(start, blockSize, file.type);
  } else if (file.mozSlice) {
    blob = file.mozSlice(start, start + blockSize, file.type);
  } else if (file.webkitSlice) {
    blob = file.webkitSlice(start, start + blockSize, file.type);
  } else {
    // No slice support, reading in the whole file.
    blockSize = bytesLeft;
    blob = file;
  }
  blobData.blob = blob;
  blobData.start = start;
  
  this.currentOffset += blockSize;
  if (file.size <= this.currentOffset) {
    this.currentOffset = 0;
    this.currentFile += 1;
  }
  
  return blobData;
};
/** Indicates a desire to pop data, calls onData when data is available. */
PwnFiler.BlockQueue.prototype.wantData = function () {
  if (!this.empty()) {
    this.onData();
  }
};
/** Called when data is available to be popped from the queue. */
PwnFiler.BlockQueue.prototype.onData = function () { };

/** Reads a blob (file fragment) into memory. */
PwnFiler.ReadTask = function (blobData, callback) {
  this.blobData = blobData;
  this.callback = callback;
  var reader = new FileReader();
  this.reader = reader;
  var task = this;
  reader.onloadend = function (event) {
    if (event.target.readyState !== FileReader.DONE || this.blobData === null) {
      return true;
    }
    var result = task.blobData;
    task.blobData = null;
    result.binaryData = event.target.result;
    task.callback(result);
  };
  reader.readAsBinaryString(blobData.blob);
};
/** Creates a ReadTask instance. */
PwnFiler.ReadTask.create = function (blobData, callback) {
  return new PwnFiler.ReadTask(blobData, callback);
};
/** Cancels a partial file read task. */
PwnFiler.ReadTask.prototype.cancel = function (event) {
  if (this.blobData === null) {
    return;
  }
  this.blobData = null;
  this.reader.abort();
};

/** Computes a cryptographic hash for a blob (file fragment). */
PwnFiler.HashTask = function (blobData, callback) {
  this.blobData = blobData;
  this.callback = callback;
  
  // TODO(pwnall): run the computation in a Web worker
  this.blobData.hashId = sjcl.hash.sha256.hash(this.blobData.binaryData);
  this.callback(this.blobData);
};
/** Creates a HashTask instance. */
PwnFiler.HashTask.create = function (blobData, callback) {
  return new PwnFiler.HashTask(blobData, callback);
};
/** File hashing cannot be aborted. */
PwnFiler.HashTask.prototype.cancel = function () {
  return;
};

/** Uploads a blob (file fragment) to a server. */
PwnFiler.UploadTask = function (backendUrl, progressCallback, blobData,
                                finishCallback) {
  this.blobData = blobData;
  this.finishCallback = finishCallback;
  var xhr = new XMLHttpRequest();
  this.xhr = xhr;
  var task = this;
  xhr.onprogress = function (event) {
    
  };
  xhr.onloadend = function (event) {
    if (event.target.readyState !== XMLHttpRequest.DONE ||
        this.blobData === null) {
      return true;
    }
    var result = task.blobData;
    task.blobData = null;
    result.binaryData = event.target.result;
    task.finishCallback(result);
  };
  xhr.open('POST', backendUrl + '/' + blobData.hashId, true);
  xhr.setRequestHeader('X-Filer-Start', blobData.start);
  xhr.setRequestHeader('X-Filer-ID', blobData.fileId);
  xhr.setRequestHeader('Content-Type', blobData.blob.mimeType);
  xhr.send(blobData.binaryData);
};
/** Creates an UploadTask constructor. */
PwnFiler.UploadTask.create = function (backendUrl, progressCallback) {
  return function (blobData, callback) {
    return new PwnFiler.UploadTask(backendUrl, progressCallback, blobData,
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

PwnFiler.QueueTask = function(allQueues, sourceQueue) {
  
};
PwnFiler.QueueTask.create = function(allQueues) {
  
};
