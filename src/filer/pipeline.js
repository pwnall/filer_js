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
