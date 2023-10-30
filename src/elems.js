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
    notice: 'notice',

    collections: {
      button: 'button-collections',
      buttonText: 'button-collections-text',
      dialog: 'dialog-collections',
      num: 'collections-num',
      dialogSvg: 'dialog-collections-svg',
      dialogDiv: 'dialog-collections-div',
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
