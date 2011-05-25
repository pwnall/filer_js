/** Computationally-intensive cryptography. */

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
