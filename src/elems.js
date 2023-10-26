(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  let app = {};
  if (isBrowser) {
    app = window.app;
    if (app?.Elems === undefined) console.error('app.Elems is undefined.');
  }

  const elems = new app.Elems({
    version: 'version',
    svg: 'svg',
  });

  if (isBrowser) {
    window.app = window.app || {};
    window.app.elems = elems;
  }
})();
