/** The components and topology of the upload pipeline. */

/**
 * Sets up the upload pipeline.
 * 
 * @param uploadUrl root URL for uploading chunks of a file
 * @param hasher name of sjcl class for crypto hashes (e.g. "sjcl.hash.sha256")
 * @param options optional flags for tweaking the pipeline performance
 */
PwnFiler.prototype.initPipeline = function (uploadUrl, hasher, options) {
  var pipeline = this.pipeline = {};
  pipeline.blockQ = new PwnFiler.BlockQueue(PwnFiler.resolveName(hasher),
                                            options.blockSize || 1024 * 1024);
  pipeline.readQ = new PwnFiler.TaskQueue(pipeline.blockQ,
      PwnFiler.ReadTask.create, options.readQueueSize || 5);
  pipeline.hashQ = new PwnFiler.TaskQueue(pipeline.readQ,
      PwnFiler.HashTask.create(this, hasher),
      options.hashQueueSize || 5);
  var filer = this;
  var onProgress = function (blobData, blockSent) {
    filer.onPipelineProgress(blobData, blockSent);
  };
  pipeline.sendQ = new PwnFiler.TaskQueue(pipeline.hashQ,
      PwnFiler.UploadTask.create(uploadUrl, onProgress), 1);
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

/** Uploads the progress meter when an XHR upload makes progress. */
PwnFiler.prototype.onPipelineProgress = function (blobData, blockSent) {
  var totalSent = blobData.start + blockSent;
  var progressDom = blobData.fileData.progressDom;
  progressDom.setAttribute('value', totalSent);
};

/** Called when the pipeline is drained. */
PwnFiler.prototype.onPipelineDrain = function () {
  
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
