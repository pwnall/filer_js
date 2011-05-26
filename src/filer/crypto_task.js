/** Computationally-intensive cryptography. */

/** Computes a cryptographic hash for a blob (file fragment). */
PwnFiler.HashTask = function (filer, hasher, blobData, callback) {
  this.blobData = blobData;
  this.callback = callback;
  this.hasher = hasher;
  
  var task = this;
  filer.inWorker('PwnFiler.HashTask.hashData',
                 { hasher: this.hasher, data: this.blobData.binaryData },
                 function (result) {
    if (task.blobData === null) {
      return;
    }
    task.blobData.hashId = result;
    task.callback(task.blobData);
  });
};

/**
 * Creates a HashTask instance.
 * 
 * @param filer PwnFiler instance whose Web Worker will be used
 * @param hasher name of sjcl class for crypto hashes (e.g. "sjcl.hash.sha256")
 */
PwnFiler.HashTask.create = function (filer, hasher) {
  return function (blobData, callback) {
    return new PwnFiler.HashTask(filer, hasher, blobData, callback);
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
PwnFiler.HashTask.hashData = function (request) {
  var hasher = PwnFiler.resolveName(request.hasher);
  return sjcl.codec.hex.fromBits(hasher.hash(request.data));
};
