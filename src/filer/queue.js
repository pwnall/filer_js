/**
 * Executes an asynchronous task, and buffers a fixed amount of results.
 * 
 * @param sourceQueue the queue that feeds data into this queue; can be null
 * @param createTask function(input, callback) that returns a running
 *                   asynchronous task which can be aborted by calling cancel()
 *                   on it; upon completion, the task will call callback(result)
 * @param poolSize number of results to be cached (defaults to 1)
 */
PwnFiler.TaskQueue = function (sourceQueue, createTask, poolSize) {
  this.pool = [];  // Results from completed tasks. 
  this.poolSize = poolSize || 1;
  this.pendingTask = null;  // Running task.
  this.pendingTaskData = null;  // The input given to the running task.
  this.source = sourceQueue;
  this.createTask = createTask;
  
  var queue = this;
  this.unboundOnTaskFinish = function (result) {
    this.onTaskFinish(result);
  };
  this.unboundOnSourceData = function () {
    queue.onSourceData();
  };
  if (this.source) {
    this.source.onData = this.unboundOnSourceData;
  }
};

/** True if there is nothing currently available to pop from the queue. */
PwnFiler.TaskQueue.prototype.empty = function () {
  return this.pool.length === 0;
};

/** True if there is no room for pushing objects in the queue. */
PwnFiler.TaskQueue.prototype.full = function () {
  return this.pool.length >= this.poolSize;
};

/** A blob contents object, or null if the queue is empty. */
PwnFiler.TaskQueue.prototype.pop = function () {
  var returnValue = this.empty() ? null : this.pool.pop();
  if (!this.full()) {
    this.source.wantData();
  }
  return returnValue;
};

/** Tells the queue that its source queue has data available. */
PwnFiler.TaskQueue.prototype.onSourceData = function () {
  if (this.pendingTask || this.full()) {
    return;
  }
  
  this.pendingTaskData = this.source.pop();
  this.pendingTask = this.createTask(this.pendingTaskData,
                                     this.unboundOnTaskFinish);
};
/** onSourceData variant that doesn't require scope. */
PwnFiler.TaskQueue.prototype.unboundOnSourceData = null;

/** Called by the async task when it is finished. */
PwnFiler.TaskQueue.prototype.onTaskFinish = function (result) {
  this.pendingTask = null;
  this.pendingTaskData = null;
  
  this.pool.push(result);
  if (!this.full()) {
    this.source.wantData();
  }
  this.onData();
};
/** onTaskFinish variant that doesn't require scope. */
PwnFiler.TaskQueue.prototype.unboundOnTaskFinish = null;

/** Called when data is available to be popped from the queue. */
PwnFiler.TaskQueue.prototype.onData = function () { };

/** Indicates a desire to pop data, calls onData when data is available. */
PwnFiler.TaskQueue.prototype.wantData = function () {
  if (!this.empty()) {
    this.onData();
    return;
  }
  if (!this.pendingOp && !this.full()) {
    this.source.wantData();
  }
};
