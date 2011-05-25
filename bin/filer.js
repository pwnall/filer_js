/*jslint white: true, undef: true, newcap: false, nomen: false, onevar: false,
         regexp: false, plusplus: true, bitwise: true, evil: true, maxlen: 80,
         indent: 2 */
/*global document, sjcl, window, ArrayBuffer, Element, FileReader, Uint8Array,
         XMLHttpRequest, Worker, console */

/* This file is concatenated first in the big JS file. */

/**
 * Creates an upload control.
 * 
 * The following options are understood:
 *   * multiple: support multiple files (false by default)
 *   * commitButton: CSS selector or DOM element for the upload commit button;
 *                   required for multi-file upload; single-file upload will
 *                   start as soon as the file is selected if no commit button
 *                   is provided
 *   * uploadButton: CSS selector or DOM element for the user-friendly upload
 *                   button
 *   * dropArea: CSS selector or DOM element for area that accepts drop files
 *   * dropAreaActiveClass: CSS class applied to drop area when the user is
 *                          dragging a file on it ('active' by default)
 *   * selection: CSS selector or DOM element for list that displays selected
 *                files (should be an 'ol' or 'ul' element)
 *   * blockUploadUrl: backend URL for uploading file fragments
 *   * workerUrl: URL for the filer-worker.min.js stub for Web Workers
 */
var PwnFiler = PwnFiler || function (options) {
  options = options || {};
  
  this.multiple = options.multiple || false;
  if (options.uploadButton) {
    var button = options.uploadButton;
    if (!(button instanceof Element)) {
      button = document.querySelector(button);
    }
    this.initControl(button);
  }
  
  if (options.dropArea) {
    var area = options.dropArea;
    if (!(area instanceof Element)) {
      area = document.querySelector(area);
    }
    this.initDropArea(area, options.dropAreaActiveClass || 'active');
  }
  
  var commit = null;
  if (options.commitButton) {
    commit = options.commitButton;
    if (!(commit instanceof Element)) {
      commit = document.querySelector(commit);
    }
  } else {
    if (this.multiple) {
      throw "No commit button provided for multi-file uploader";
    }
  }

  if (options.selection) {
    var selection = options.selection;
    if (!(selection instanceof Element)) {
      selection = document.querySelector(selection);
    }
    this.initSelection(selection, commit);
  } else {
    throw "Missing file selection display";
  }
  
  this.initPipeline(options.blockUploadUrl, options.pipeline || {});
  this.initWorkers(options.workerUrl);
};
/**
 * Sets up a file upload dialog in response to clicks on a fake control.
 * 
 * @param uploadButton DOM element whose clicks trigger the upload dialog
 */
PwnFiler.prototype.initControl = function (uploadButton) {
  var fileInput = document.createElement('input');
  fileInput.setAttribute('type', 'file');
  if (this.multiple) {
    fileInput.setAttribute('multiple', 'multiple');
  }
  
  var inputStyle = fileInput.style;
  inputStyle.display = 'block';
  inputStyle.position = 'absolute';
  inputStyle.width = inputStyle.height = '0';
  inputStyle.zIndex = '-1000';
  
  uploadButton.parentNode.insertBefore(fileInput, uploadButton);

  var filer = this;
  uploadButton.addEventListener('click', function (event) {
    return filer.onUploadClick(event);
  }, false);
  fileInput.addEventListener('change', function (event) {
    return filer.onFileInputChange(event);
  }, false);
  
  this.fileInput = fileInput;
};

/**
 * Called when the user clicks on an upload button.
 * 
 * Invokes a file selection dialog.
 */
PwnFiler.prototype.onUploadClick = function (event) {
  this.fileInput.click();
  event.preventDefault();
  return false;
};

/** Updates the nice file display. */
PwnFiler.prototype.onFileInputChange = function (event) {
  var control = event.target;
  if (control.files.length === 0) {
    this.onFileSelect(null);
  } else {
    var files = [];
    for (var i = 0; i < control.files.length; i += 1) {
      files[i] = control.files[i];
    }
    this.onFileSelect(files);
  }
  return true;
};
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
/** File drag and drop functionality. */

/**
 * Sets up a DOM element to accept files via drag and drop.
 * 
 * @param dropArea DOM element that accepts files
 * @param dropActiveClass class to be applied to the DOM element when active
 */
PwnFiler.prototype.initDropArea = function (dropArea, dropActiveClass) {
  var filer = this;
  dropArea.addEventListener('dragenter', function (event) {
    return filer.onDropAreaDragEnter(event);
  }, false);
  dropArea.addEventListener('dragover', this.onDropAreaDragOver, false);
  dropArea.addEventListener('dragleave', function (event) {
    return filer.onDropAreaDragLeave(event);
  }, false);
  dropArea.addEventListener('drop', function (event) {
    return filer.onDropAreaDrop(event);
  }, false);
  this.dropArea = dropArea;
  this.dropActiveClass = dropActiveClass;
  this.dropAreaEnterCount = 0;
};

/** Highlights the file drop area, to show that it accepts files. */
PwnFiler.prototype.onDropAreaDragEnter = function (event) {
  // Not interested in anything that's not a file.
  var transfer = event.dataTransfer;
  if (PwnFiler.dataTransferHasFiles(transfer)) {
    transfer.dropEffect = 'copy';
  } else {
    return true;
  }

  if (this.dropAreaEnterCount === 0) {
    this.activateDropArea();
  }
  this.dropAreaEnterCount += 1;
  event.stopPropagation();
  event.preventDefault();
  return false;
};


/** Removes the file drop area highlighting if the user drags out the file. */
PwnFiler.prototype.onDropAreaDragLeave = function (event) {
  if (!PwnFiler.dataTransferHasFiles(event.dataTransfer)) {
    return true;
  }
  
  this.dropAreaEnterCount -= 1;
  if (this.dropAreaEnterCount === 0) {
    this.deactivateDropArea();
  }
};

/** Number of dragenter events not matched by dragleave events.  */
PwnFiler.prototype.dropAreaEnterCount = 0;

/** Shows interest in the drag operation. */
PwnFiler.prototype.onDropAreaDragOver = function (event) {
  // Not interested in anything that's not a file.
  var transfer = event.dataTransfer;
  if (PwnFiler.dataTransferHasFiles(transfer)) {
    transfer.dropEffect = 'copy';
  } else {
    return true;
  }

  event.stopPropagation();
  event.preventDefault();
  return false;
};

/** Registers a dropped file. */
PwnFiler.prototype.onDropAreaDrop = function (event) {
  this.dropAreaEnterCount = 0;
  this.deactivateDropArea();
  
  var transfer = event.dataTransfer;
  if (transfer.files.length !== 0) {
    var files = [];
    for (var i = 0; i < transfer.files.length; i += 1) {
      files[i] = transfer.files.item(i);
    }
    this.onFileSelect(files);
    transfer.dropEffect = 'copy';
  }

  event.stopPropagation();
  event.preventDefault();
  return false;
};

/** Change the drop area to reflect that the user is dragging a file over it. */
PwnFiler.prototype.activateDropArea = function () {
  var area = this.dropArea;
  var klass = this.dropActiveClass;
  if (area.className.split(/\s+/).indexOf(klass) === -1) {
    area.className += " " + klass;
  }
};

/** Revert the drop area to the state before the user dragged a file over it. */
PwnFiler.prototype.deactivateDropArea = function () {
  var area = this.dropArea;
  var klass = this.dropActiveClass;
  area.className = area.className.split(/\s+/).filter(function (s) {
    return s !== klass;
  }).join(' ');
};

/** Cross-browser check for whether a Drag and Drop involves files. */
PwnFiler.dataTransferHasFiles = function (data) {
  if (data.types.contains) {
    return data.types.contains('Files');
  } else if (data.types.indexOf) {
    return data.types.indexOf('Files') !== -1;
  } else if (data.files) {
    return data.files.length > 0;
  }
  return false;
};
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
    queue.onTaskFinish(result);
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
  var returnValue = this.empty() ? null : this.pool.shift();
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
  this.pendingTask = true;
  var newTask = this.createTask(this.pendingTaskData,
                                this.unboundOnTaskFinish);
  // This test fails if the task completes in the constructor.
  if (this.pendingTask === true) {
    this.pendingTask = newTask;
  }
};
/** onSourceData variant that doesn't require scope. */
PwnFiler.TaskQueue.prototype.unboundOnSourceData = null;

/** Called by the async task when it is finished. */
PwnFiler.TaskQueue.prototype.onTaskFinish = function (result) {
  this.pendingTask = null;
  this.pendingTaskData = null;
  
  if (result !== null) {
    this.pool.push(result);
  }
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
/** Keeps track of the files that the user has selected. */

/**
 * Initializes the file selection state.
 * 
 * @param selection DOM element that will display the files selected for upload
 */
PwnFiler.prototype.initSelection = function (selection, commitButton) {
  this.selection = [];
  this.selectionDom = selection;
  this.commitButton = commitButton;
  if (this.commitButton) {
    this.commitButton.setAttribute('disabled', 'disabled');
    
    var filer = this;
    this.commitButton.addEventListener('click', function (event) {
      return filer.onCommitClick(event);
    });
  }
};

/** Called when the user selects one or more files for uploading. */
PwnFiler.prototype.onFileSelect = function (files) {
  if (this.multiple) {
    for (var i = 0; i < files.length; i += 1) {
      this.addFile(files[i]);
    }
  } else {
    if (this.selection.length > 0) {
      this.removeFile(this.selection[0]);
    }
    this.addFile(files[0]);
  }

  if (!this.multiple) {
    this.commitUpload();
  }
};

/** List of files that the user has selected for upload. */
PwnFiler.prototype.selection = null;

/** DOM element displaying the selected files. */
PwnFiler.prototype.selectionDom = null;

/** Adds a file at the end of the upload list. */
PwnFiler.prototype.addFile = function (file) {
  var newFile = {domFile: file};
  this.selection.push(newFile);
  this.selectionDom.appendChild(this.buildFileSelectionDom(newFile));
  if (this.commitButton) {
    this.commitButton.removeAttribute('disabled');
  }
};

/** Removes the file at a given position in the upload list. */
PwnFiler.prototype.removeFile = function (fileData) {
  var index = 0;
  for (; index < this.selection.length; index += 1) {
    if (this.selection[index] === fileData) {
      break;
    }
  }
  this.selection.splice(index, 1);
  this.selectionDom.removeChild(fileData.selectionDom);
  
  if (this.commitButton && this.selection.length === 0) {
    this.commitButton.setAttribute('disabled', 'disabled');
  }
  
  // TODO: cancel any in-progress upload
};

/** Creates a DOM element representing a user-selected file. */
PwnFiler.prototype.buildFileSelectionDom = function (fileData) {
  var nameSpan = document.createElement('span');
  nameSpan.className = 'name';
  nameSpan.appendChild(document.createTextNode(fileData.domFile.name));
  
  var sizeSpan = document.createElement('span');
  sizeSpan.className = 'size';
  var sizeText = '';
  var size = fileData.domFile.size;
  if (size < 1024) {
    sizeText = '' + size + ' bytes';
  } else if (size < 1024 * 1024) {
    sizeText = '' + (size / 1024).toFixed(2) + ' kb';
  } else if (size < 1024 * 1024 * 1024) {
    sizeText = '' + (size / (1024 * 1024)).toFixed(2) + ' mb';
  } else {
    sizeText = '' + (size / (1024 * 1024 * 1024)).toFixed(2) + ' gb';
  }
  sizeSpan.appendChild(document.createTextNode(sizeText));
  
  var progress = document.createElement('progress');
  progress.setAttribute('max', size);
  progress.setAttribute('value', 0);
  fileData.progressDom = progress;
  
  var removeButton = document.createElement('button');
  removeButton.appendChild(document.createTextNode('Remove'));
  removeButton.addEventListener('click', this.removeClickListener(fileData),
                                false);
  
  var li = document.createElement('li');
  li.appendChild(nameSpan);
  li.appendChild(sizeSpan);
  li.appendChild(progress);
  li.appendChild(removeButton);
  fileData.selectionDom = li;
  
  return li;
};

/** Builds a listener for the onclick DOM event of a file removal button. */
PwnFiler.prototype.removeClickListener = function (fileData) {
  var filer = this;
  return function (event) {
    filer.removeFile(fileData);
    event.preventDefault();
    return false;
  };
};

/** Called when the user presses on the commit upload button. */
PwnFiler.prototype.onCommitClick = function (event) {
  this.commitUpload();
  event.preventDefault();
  return false;
};

/** Starts uploading the files selected by the user. */
PwnFiler.prototype.commitUpload = function () {
  this.pipelineFiles(this.selection);
};
/** Uploads a blob (file fragment) to the server. */
PwnFiler.UploadTask = function (uploadUrl, progressCallback, blobData,
                                finishCallback) {
  this.uploadUrl = uploadUrl;
  this.blobData = blobData;
  this.progressCallback = progressCallback;
  this.finishCallback = finishCallback;
  
  this.checkChunk();
};

/** Verifies if a chunk exists on the server, to avoid re-uploading. */
PwnFiler.UploadTask.prototype.checkChunk = function () {
  var xhr = new XMLHttpRequest();
  this.xhr = xhr;
  
  var task = this;
  var loadHandler = function (event) {
    return task.onChunkLoadEnd(event);
  };
  xhr.onloadend = loadHandler;
  xhr.onerror = loadHandler;
  xhr.onload = loadHandler;

  var blobData = this.blobData;
  xhr.open('PUT', this.uploadUrl, true);
  xhr.setRequestHeader('X-PwnFiler-FileID', blobData.fileId);
  xhr.setRequestHeader('X-PwnFiler-Hash', blobData.hashId);
  xhr.setRequestHeader('X-PwnFiler-Start', blobData.start);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.send(JSON.stringify({fileSize: blobData.fileSize,
      mimeType: blobData.blob.type || 'application/octet-stream'}));
};

/** Called when the check XHR completes, successfully or with an error. */
PwnFiler.UploadTask.prototype.onChunkLoadEnd = function (event) {
  if (event.target.readyState !== (XMLHttpRequest.DONE || 4) ||
      this.blobData === null) {
    return true;
  }
  if (event.target.status === 200) {
    var response = JSON.parse(event.target.response);
    
    if (response.present) {
      this.onXhrCompletion();
    } else {
      this.uploadChunk();
    }
    return true;
  }
  // TODO(pwnall): report unrecoverable error
  return true;
};

/** Uploads chunk contents that presumably does not exist on the server. */
PwnFiler.UploadTask.prototype.uploadChunk = function () {
  var xhr = new XMLHttpRequest();
  this.xhr = xhr;

  var task = this;
  xhr.upload.onprogress = function (event) {
    if (event.loaded) {
      task.progressCallback(task.blobData, event.loaded);
    }
  };
  var loadHandler = function (event) {
    return task.onUploadLoadEnd(event);
  };
  xhr.onloadend = loadHandler;
  xhr.onerror = loadHandler;
  xhr.onload = loadHandler;

  var blobData = this.blobData;
  xhr.open('POST', this.uploadUrl, true);
  xhr.setRequestHeader('X-PwnFiler-FileID', blobData.fileId);
  xhr.setRequestHeader('X-PwnFiler-Hash', blobData.hashId);
  xhr.setRequestHeader('X-PwnFiler-Start', blobData.start);
  xhr.setRequestHeader('Content-Type', 'application/octet-stream');
  xhr.send(blobData.binaryData);
};

/** Called when the upload XHR completes, successfully or with an error. */
PwnFiler.UploadTask.prototype.onUploadLoadEnd = function (event) {
  if (event.target.readyState !== (XMLHttpRequest.DONE || 4) ||
      this.blobData === null) {
    return true;
  }
  if (event.target.status === 200) {
    this.onXhrCompletion();
    return true;
  } else if (event.target.status === 400) {
    // Data must have been corrupted in transit. Retry.
    this.uploadChunk();
    return true;
  }
  // TODO(pwnall): report unrecoverable error
  return true;
};

/** Called when all the necessary XHRs complete successfully. */
PwnFiler.UploadTask.prototype.onXhrCompletion = function () {
  var result = this.blobData;
  this.blobData = null;
  this.progressCallback(result, result.binaryData.length);
  this.finishCallback(result);
};

/** Creates an UploadTask constructor. */
PwnFiler.UploadTask.create = function (uploadUrl, progressCallback) {
  return function (blobData, callback) {
    return new PwnFiler.UploadTask(uploadUrl, progressCallback, blobData,
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
