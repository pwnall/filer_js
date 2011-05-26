/**
 * Resolves a dotted name starting from the global namespace.
 * 
 * @param name a nested object name, e.g. "PwnFiler.Worker.main"
 * @return the object pointed by the name
 */
PwnFiler.resolveName = function (name) {
  var parts = name.split('.');
  var result = self;  // self works in Web Workers too
  for (var i = 0; i < parts.length; i += 1) {
    result = result[parts[i]];
  } 
  return result;
};
