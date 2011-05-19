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
  this.commitButton.setAttribute('disabled', 'disabled');
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
    // Commit upload.
    return;
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
  
  if (this.commitButton && this.)
  
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
