/*jslint white: true, undef: true, newcap: true, nomen: false, onevar: false, regexp: false, plusplus: true, bitwise: true, maxlen: 80, indent: 2 */
/*global console, document, window, Element, FileReader, sjcl, XMLHttpRequest */

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
};
