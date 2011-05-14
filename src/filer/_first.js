/*jslint white: true, undef: true, newcap: true, nomen: false, onevar: false, regexp: false, plusplus: true, bitwise: true, maxlen: 80, indent: 2 */
/*global $, console, document, window, Element, FileReader */

/* This file is concatenated first in the big JS file. */

/**
 * Creates an upload control.
 * 
 * The following options are understood:
 *   * multiple: support multiple files (false by default)
 *   * uploadButton: CSS selector or DOM element for the user-friendly upload
 *                   button
 *   * dropArea: CSS selector or DOM element for area that accepts drop files
 *   * dropAreaActiveClass: CSS class applied to drop area when the user is
 *                          dragging a file on it ('active' by default)
 *   * selection: CSS selector or DOM element for list that displays selected
 *                files (should be an 'ol' or 'ul' element)
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

  if (options.selection) {
    var selection = options.selection;
    if (!(selection instanceof Element)) {
      selection = document.querySelector(selection);
    }
    this.initSelection(selection);
  } else {
    throw "Missing file selection display";
  }
};
