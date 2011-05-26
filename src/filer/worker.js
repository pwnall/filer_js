/** Worker threads using Web Workers. */

/**
 * Starts up worker threads so they can receive commands.
 * @param workerStubUrl points to the filer-worker.min.js stub; null disables
 *                      workers and runs computationally-intensive code in the
 *                      main thread
 */
PwnFiler.prototype.initWorkers = function (workerStubUrl) {
  var worker = this.worker = workerStubUrl && (new Worker(workerStubUrl));
  this.workerCallbacks = {};
  this.nextCommandId = 0;
  
  var filer = this;
  if (worker) {
    worker.onmessage = function (event) {
      return filer.onWorkerMessage(event);
    };
  }
};

/** Performs the given command in the background. */
PwnFiler.prototype.inWorker = function (functionName, argument, callback) {
  var commandId = this.nextCommandId;
  this.nextCommandId += 1;
  
  this.workerCallbacks[commandId] = callback;
  var command = {id: commandId, fn: functionName, arg: argument};
  if (this.worker) {
    this.worker.postMessage(command);
  } else {
    // Run the call in the main thread.
    PwnFiler.Worker.currentFiler = this;
    PwnFiler.Worker.onMessage({data: command});
  }
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
  var fn = PwnFiler.resolveName(data.fn);
  var returnValue = fn(data.arg);
  PwnFiler.Worker.postMessage({id: data.id, result: returnValue});
};

/** Replaced with the global postMessage in real Web Workers. */
PwnFiler.Worker.postMessage = function (data) {
  PwnFiler.Worker.currentFiler.onWorkerMessage({data: data});
};

/** Executed when a worker starts. */
PwnFiler.Worker.main = function () {
};
