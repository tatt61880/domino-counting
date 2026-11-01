'use strict';
self.importScripts('counting.js');
self.onmessage = (event) => {
  try {
    self.postMessage({ id: event.data.id, ...self.analyzeDomino(event.data.states) });
  } catch {
    self.postMessage({ id: event.data.id, error: true });
  }
};
