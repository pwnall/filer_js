/** The components and topology of the upload pipeline. */

/**
 * Sets up the upload pipeline.
 * 
 * @param uploadUrl root URL for uploading chunks of a file
 * @param options optional flags for tweaking the pipeline performance
 */
PwnFiler.prototype.initPipeline = function (uploadUrl, options) {
  var pipeline = this.pipeline = {};
  pipeline.blockQ = new PwnFiler.BlockQueue(options.blockSize || 1024 * 1024);
  pipeline.readQ = new PwnFiler.TaskQueue(pipeline.blockQ,
      PwnFiler.ReadTask.create, options.readQueueSize || 5);
  pipeline.hashQ = new PwnFiler.TaskQueue(pipeline.readQ,
      PwnFiler.HashTask.create(this), options.hashQueueSize || 5);
  pipeline.sendQ = new PwnFiler.TaskQueue(pipeline.hashQ,
      PwnFiler.UploadTask.create(uploadUrl, function () {}), 1);
  var drainTask = PwnFiler.DrainTask.create([pipeline.blockQ, pipeline.readQ,
      pipeline.hashQ, pipeline.sendQ, pipeline.drain]);
  pipeline.drain = new PwnFiler.TaskQueue(pipeline.sendQ,
      drainTask, 1);
};

/** Adds a bunch of files to the upload pipeline and kicks it off. */
PwnFiler.prototype.pipelineFiles = function (filesData) {
  for (var i = 0; i < filesData.length; i += 1) {
    this.pipeline.blockQ.push(filesData[i]);
  }
  this.pipeline.drain.wantData();
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
  var fileId =
      sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(fileData.domFile.name));
  this.files.push({fileData: fileData, fileId: fileId});
};
/** True if there is nothing to pop from the queue. */
PwnFiler.BlockQueue.prototype.empty = function () {
  return this.currentFile >= this.files.length;
};
/** A blob data object to be read, or null if the queue is empty. */
PwnFiler.BlockQueue.prototype.pop = function () {
  if (this.empty()) {
    return null;
  }
  
  var sourceData = this.files[this.currentFile];
  // NOTE: cloning the file data to do per-blob changes.
  var blobData = {fileData: sourceData.fileData, fileId: sourceData.fileId};
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
    blobData.last = true;
    this.currentOffset = 0;
    this.currentFile += 1;
  } else {
    blobData.last = false;
  }
  
  console.log(blobData);
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
PwnFiler.HashTask = function (filer, blobData, callback) {
  this.blobData = blobData;
  this.callback = callback;
  
  var task = this;
  filer.inWorker('PwnFiler.HashTask.hashData', this.blobData.binaryData,
                function (result) {
    if (task.blobData === null) {
      return;
    }
    task.blobData.hashId = result;
    task.callback(task.blobData);
  });
};
/** Creates a HashTask instance. */
PwnFiler.HashTask.create = function (filer) {
  return function (blobData, callback) {
    return new PwnFiler.HashTask(filer, blobData, callback);
  };
};
/** File hashing cannot be aborted. */
PwnFiler.HashTask.prototype.cancel = function () {
  this.blobData = null;
};
/**
 * Hashes its argument.
 * 
 * This is computationally intensive and should not be run in the main thread.
 */
PwnFiler.HashTask.hashData = function (data) {
  return sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash(data));
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
  xhr.onloadend = xhr.onload = xhr.onerror = function (event) {
    if (event.target.readyState !== XMLHttpRequest.DONE ||
        task.blobData === null) {
      return true;
    }
    var result = task.blobData;
    task.blobData = null;
    task.finishCallback(result);
  };
  xhr.open('POST', backendUrl + '/' + blobData.hashId, true);
  xhr.setRequestHeader('X-Filer-Start', blobData.start);
  xhr.setRequestHeader('X-Filer-Last', blobData.last.toString());
  xhr.setRequestHeader('X-Filer-ID', blobData.fileId);
  xhr.setRequestHeader('Content-Type', blobData.blob.mimeType);
  xhr.send(blobData.blob);
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

/** Pops data out of a queue while there is activity in a chain of queues. */
PwnFiler.DrainTask = function (allQueues, sourceQueue, callback) {
  this.done = false;
  this.allQueues = allQueues;
  this.sourceQueue = sourceQueue;
  this.callback = callback;
  
  callback(null);
};
PwnFiler.DrainTask.create = function (allQueues) {
  return function (sourceQueue, callback) {
    return new PwnFiler.DrainTask(allQueues, sourceQueue, callback);
  };
};
/** True if none of the queues can produce more output.*/
PwnFiler.DrainTask.prototype.done = false;
