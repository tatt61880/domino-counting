(function () {
  'use strict';
  const VERSION_TEXT = 'v' + '2026.11.01';

  const app = window.app;
  const elems = app.elems;
  const common = app.common;

  let pointerId = null;
  let drawingState = null;
  let previous = null;
  let strokeBefore = null;
  const undoStack = [];
  const redoStack = [];
  let repeatId;
  const snapshot = () => common.states.map((row) => row.slice());

  app.editBoard = (states) => {
    finishStroke();
    remember(snapshot());
    restore(states);
  };

  document.addEventListener('DOMContentLoaded', onloadApp);
  return;
  // ==========================================================================

  function onloadApp() {
    elems.version.textContent = VERSION_TEXT;

    if (
      common.maxX !== common.defaultMaxX ||
      common.maxY !== common.defaultMaxY
    ) {
      hideElem(elems.collectionButtonDiv);
      hideElem(elems.notice);
    }

    function hideElem(elem) {
      if (!elem) return;
      elem.classList.add('hide');
    }

    const queryStrs = location.href.split('?')[1];
    if (queryStrs !== undefined) {
      for (const queryStr of queryStrs.split('&')) {
        if (queryStr === 'backup') {
          elems.collections.button.addEventListener(
            'click',
            copySavedataToClipboard
          );
          elems.collections.buttonText.innerHTML = 'バックアップ';
          elems.svg.classList.add('hide');
          return;
        }
      }
    }

    setupButton(elems.collections.button, app.dialog.collections.show, 'コレクション');
    elems.collections.dialog.addEventListener('click', (event) => {
      if (event.target === elems.collections.dialog) app.dialog.collections.close();
    });
    setupButton(elems.collections.close, app.dialog.collections.close, '閉じる');
    setupButton(elems.collections.pagesize, app.dialog.collections.togglePagesize, '表示件数切り替え');
    for (const [button, action, label] of [
      [elems.collections.prev, app.dialog.collections.prevPage, '前のページ'],
      [elems.collections.next, app.dialog.collections.nextPage, '次のページ'],
    ]) {
      setupButton(button, action, label);
      button.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        button.setPointerCapture(event.pointerId);
        clearInterval(repeatId);
        repeatId = setInterval(action, 300);
      });
      button.addEventListener('pointerup', stopRepeat);
      button.addEventListener('pointercancel', stopRepeat);
      button.addEventListener('lostpointercapture', stopRepeat);
    }
    elems.collections.dialog.addEventListener('close', stopRepeat);
    document.getElementById('collection-order').addEventListener('change', app.dialog.collections.refresh);
    document.addEventListener('keydown', (event) => {
      if (!elems.collections.dialog.open || event.target.tagName === 'SELECT') return;
      if (event.key === 'ArrowLeft') app.dialog.collections.prevPage();
      else if (event.key === 'ArrowRight') app.dialog.collections.nextPage();
      else if (event.key === 'Home') app.dialog.collections.firstPage();
      else return;
      event.preventDefault();
    });
    elems.svg.addEventListener('pointerdown', pointerdown);
    elems.svg.addEventListener('pointermove', pointermove);
    elems.svg.addEventListener('pointerup', finishStroke);
    elems.svg.addEventListener('pointercancel', finishStroke);
    elems.svg.addEventListener('lostpointercapture', finishStroke);
    window.addEventListener('blur', () => { finishStroke(); stopRepeat(); });
    document.addEventListener('domino-result', updateSvg);
    document.getElementById('undo').addEventListener('click', undo);
    document.getElementById('redo').addEventListener('click', redo);
    document.getElementById('clear').addEventListener('click', () => {
      if (common.states.some((row) => row.includes(common.stateOn))) {
        app.editBoard(common.states.map((row) => row.map(() => common.stateOff)));
      }
    });
    document.getElementById('share-url').addEventListener('click', copyUrl);
    document.getElementById('copy-image').addEventListener('click', copyImage);
    document.getElementById('save-image').addEventListener('click', saveImage);
    document.getElementById('help-button').addEventListener('click', () => document.getElementById('help-dialog').showModal());
    document.getElementById('help-close').addEventListener('click', () => document.getElementById('help-dialog').close());
    document.addEventListener('keydown', (event) => {
      if (document.querySelector('dialog[open]') || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
    });
    updateHistoryButtons();

    update();
  }

  function stopRepeat() {
    clearInterval(repeatId);
  }

  function setupButton(button, action, label) {
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', label);
    button.addEventListener('click', action);
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
      }
    });
  }

  function getCursorXY(event) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(elems.svg.getScreenCTM().inverse());
    const x = Math.floor(point.x / common.blockSize);
    const y = Math.floor(point.y / common.blockSize);
    if (x < 0 || y < 0 || x >= common.maxX || y >= common.maxY) return null;
    return { x, y };
  }

  function pointerdown(event) {
    if (pointerId !== null || event.button !== 0) return;
    const cur = getCursorXY(event);
    if (!cur) return;
    event.preventDefault();
    pointerId = event.pointerId;
    elems.svg.setPointerCapture(pointerId);
    strokeBefore = snapshot();
    drawingState = common.states[cur.y][cur.x] === common.stateOff ? common.stateOn : common.stateOff;
    previous = null;
    pointermove(event);
  }

  function pointermove(event) {
    if (event.pointerId !== pointerId) return;
    const cur = getCursorXY(event);
    if (!cur) { previous = null; return; }
    let changed = false;
    const start = previous || cur;
    const steps = Math.max(Math.abs(cur.x - start.x), Math.abs(cur.y - start.y));
    for (let i = 0; i <= steps; i++) {
      const ratio = steps === 0 ? 0 : i / steps;
      const x = Math.round(start.x + (cur.x - start.x) * ratio);
      const y = Math.round(start.y + (cur.y - start.y) * ratio);
      if (common.states[y][x] !== drawingState) {
        common.states[y][x] = drawingState;
        changed = true;
      }
    }
    previous = cur;
    if (changed) update();
  }

  function finishStroke(event) {
    if (pointerId === null || (event?.pointerId !== undefined && event.pointerId !== pointerId)) return;
    const id = pointerId;
    pointerId = null;
    if (elems.svg.hasPointerCapture(id)) elems.svg.releasePointerCapture(id);
    if (JSON.stringify(strokeBefore) !== JSON.stringify(common.states)) remember(strokeBefore);
    strokeBefore = null;
    previous = null;
  }

  function remember(states) {
    undoStack.push(states);
    if (undoStack.length > 100) undoStack.shift();
    redoStack.length = 0;
    updateHistoryButtons();
  }

  function restore(states) {
    for (let y = 0; y < common.maxY; y++) {
      for (let x = 0; x < common.maxX; x++) common.states[y][x] = states[y]?.[x] === common.stateOn ? common.stateOn : common.stateOff;
    }
    update();
    updateHistoryButtons();
  }

  function undo() {
    finishStroke();
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restore(undoStack.pop());
  }

  function redo() {
    finishStroke();
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restore(redoStack.pop());
  }

  function updateHistoryButtons() {
    document.getElementById('undo').disabled = undoStack.length === 0;
    document.getElementById('redo').disabled = redoStack.length === 0;
  }

  async function copyUrl() {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    if (common.maxX !== common.defaultMaxX) url.searchParams.set('w', common.maxX);
    if (common.maxY !== common.defaultMaxY) url.searchParams.set('h', common.maxY);
    url.searchParams.set('s', common.states.map((row) => row.join('')).join('-'));
    try {
      await navigator.clipboard.writeText(url.href);
      elems.notice.textContent = 'URLをコピーしました';
    } catch {
      window.prompt('盤面の共有URL', url.href);
    }
  }

  async function imageBlob() {
    const clone = elems.svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = common.blockSize * common.maxX;
      canvas.height = common.blockSize * common.maxY;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('image'))));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function copyImage() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': imageBlob() })]);
      elems.notice.textContent = '画像をコピーしました';
    } catch {
      elems.notice.textContent = '画像コピーに対応していません。「画像保存」をお使いください';
    }
  }

  async function saveImage() {
    try {
      const url = URL.createObjectURL(await imageBlob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'domino-board.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      elems.notice.textContent = '画像を保存できませんでした';
    }
  }

  function update() {
    app.common.updateResult();
    updateSvg();
  }

  function updateSvg() {
    elems.svg.textContent = '';

    elems.svg.setAttribute('width', app.common.blockSize * app.common.maxX);
    elems.svg.setAttribute('height', app.common.blockSize * app.common.maxY);
    elems.svg.setAttribute('viewBox', `0 0 ${common.blockSize * common.maxX} ${common.blockSize * common.maxY}`);

    const g = app.common.createStatesG(app.common.states, app.common.blockSize);
    elems.svg.appendChild(g);
  }

  function copySavedataToClipboard() {
    const text = app.savedata.getSavedataString();
    const num = app.savedata.getCollectionNum();
    navigator.clipboard.writeText(text).then(
      () => {
        alert(
          `【「コレクション数: ${num}」の全データをクリップボードにコピーしました】\n${text}`
        );
      },
      () => {
        alert('クリップボードへのコピーに失敗しました。');
      }
    );
  }
})();
