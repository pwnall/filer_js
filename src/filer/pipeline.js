/** Manages the upload pipeline. */

/** Sets up the upload pipeline. */
PwnFiler.prototype.initPipeline = function (options) {
  var pipeline = this.pipeline = {};
  pipeline.blockQ = new PwnFilter.BlockQueue(options.blockSize || 1024 * 1024);
  pipeline.readQ = new PwnFilter.ReadQueue(pipeline.blockQ,
                                           options.readQueueSize || 5);
  pipeline.hashQ = new PwnFilter.HashQueue(pipeline.readQ,
                                           options.hashQueueSize || 5);
  pipeline.sendQ = new PwnFilter.SendQueue(pipeline.sendQ, 1);
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
  this.files.push(fileData);
};
/** True if there is nothing to pop from the queue. */
PwnFiler.BlockQueue.prototype.empty = function () {
  return this.currentFile > this.files.length;
};
/** A blob data object to be read, or null if the queue is empty. */
PwnFiler.BlockQueue.prototype.pop = function () {
  if (this.empty()) { return null; }
  
  var fileData = this.files[this.currentFile];
  var file = fileData.domFile;
  var blockSize = Math.min(this.blockSize, file.size - this.currentOffset);
  var blob = file;
  if (file.slice) {
    blob = file.slice(this.currentOffset, blockSize, file.type);
  } else if (file.mozSlice) {
    blob = file.mozSlice(this.currentOffset, this.currentOffset + blockSize,
                         file.type);
  } else if (file.webkitSlice) {
    blob = file.webkitSlice(this.currentOffset, this.currentOffset + blockSize,
                            file.type);
  } else {
    // No slice support, reading in the whole file.
    blockSize = fileData.size - this.currentOffset;
    blob = file;
  }
  
  this.currentOffset += blockSize;
  if (file.size <= this.currentOffset) {
    this.currentOffset = 0;
    this.currentFile += 1;
  }
  
  return { fileData: fileData, blob: blob };
};
/** Indicates a desire to pop data, calls onData when data is available. */
PwnFiler.BlockQueue.prototype.wantData = function () {
  if (!this.empty()) { this.onData(); }
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
/** Cancels a partial file read task. */
PwnFiler.ReadTask.prototype.cancel = function (event) {
  if (this.blobData === null) {
    return;
  }
  this.blobData = null;
  this.reader.abort();
};
