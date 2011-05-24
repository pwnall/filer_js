/** Worker threads using Web Workers. */

/**
 * Starts up worker threads so they can receive commands.
 * @param workerStubUrl points to the filer-worker.min.js stub
 */
PwnFiler.prototype.initWorkers = function (workerStubUrl) {
  var worker = this.worker = new Worker(workerStubUrl);
  this.workerCallbacks = {};
  this.nextCommandId = 0;
  
  var filer = this;
  worker.onmessage = function (event) {
    return filer.onWorkerMessage(event);
  };
};

/** Performs the given command in the background. */
PwnFiler.prototype.inWorker = function (functionName, argument, callback) {
  var commandId = this.nextCommandId;
  this.nextCommandId += 1;
  
  this.workerCallbacks[commandId] = callback;
  this.worker.postMessage({id: commandId, fn: functionName, arg: argument});
};

/** Receives command responses from Worker threads. */
PwnFiler.prototype.onWorkerMessage = function (event) {
  var data = event.data;
  var commandId = data.id;
  var callback = this.workerCallbacks[commandId];
  delete this.workerCallbacks[commandId];
  callback(data.result);
};

/** Namespace for Web Worker code. */
PwnFiler.Worker = {};

/** Handles events on the worker side. */
PwnFiler.Worker.onMessage = function (event) {
  var data = event.data;
  var fn = eval(data.fn);
  var returnValue =  fn(data.arg);
  PwnFiler.Worker.postMessage({id: data.id, result: returnValue});
};

/** Executed when a worker starts. */
PwnFiler.Worker.main = function () {
};
