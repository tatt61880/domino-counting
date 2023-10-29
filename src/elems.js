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
    num: 'num',
    svg: 'svg',
    result: 'result',

    collections: {
      button: 'button-collections',
      dialogSvg: 'dialog-collections-svg',
      dialog: 'dialog-collections',
      close: 'dialog-collections-close',
      prev: 'button-collections-prev',
      next: 'button-collections-next',
    },
  });

  if (isBrowser) {
    window.app = window.app || {};
    window.app.elems = elems;
  }
})();
