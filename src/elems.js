(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app?.Elems !== undefined);

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
      pagesize: 'button-toggle-pagesize',
    },
  });

  window.app = window.app || {};
  window.app.elems = elems;
})();
