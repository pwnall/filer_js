/*jslint white: true, undef: true, newcap: true, nomen: false, onevar: false,
         regexp: false, plusplus: true, bitwise: true, maxlen: 80, indent: 2 */
/*global importScripts, navigator, onmessage:true, postMessage, PwnFiler */

/** Stub for Web workers. */

importScripts('filer.min.js');
importScripts('filer.js');
onmessage = PwnFiler.Worker.onMessage;
PwnFiler.Worker.postMessage = function (message) {
  postMessage(message);
};
PwnFiler.Worker.main();
