/** Pipeline stages that read a set of files as 1Mb blocks. */

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
  blobData.fileSize = file.size;
  
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
