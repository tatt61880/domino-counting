(function () {
  'use strict';
  const VERSION_TEXT = 'v' + '2026.04.25';

  const app = window.app;
  Object.freeze(app);
  const elems = app.elems;
  const common = app.common;

  let drawingFlag = false;
  let drawingState = null;
  const prev = { x: null, y: null };

  let intervalPrevId;
  let intervalNextId;

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

    elems.collections.button.addEventListener(
      'pointerdown',
      app.dialog.collections.show
    );
    elems.collections.dialog.addEventListener(
      'pointerdown',
      app.dialog.collections.close
    );
    elems.collections.dialogDiv.addEventListener('pointerdown', (e) =>
      e.stopPropagation()
    );

    // ◀
    {
      elems.collections.prev.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        app.dialog.collections.prevPage();
        intervalPrevId = setInterval(app.dialog.collections.prevPage, 300);
      });
      elems.collections.prev.addEventListener('pointerup', () => {
        clearInterval(intervalPrevId);
      });
    }

    // ✕
    elems.collections.close.addEventListener(
      'pointerdown',
      app.dialog.collections.close
    );

    // ▶
    {
      elems.collections.next.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        app.dialog.collections.nextPage();
        intervalNextId = setInterval(app.dialog.collections.nextPage, 300);
      });
      elems.collections.next.addEventListener('pointerup', () => {
        clearInterval(intervalNextId);
      });
    }

    elems.collections.pagesize.addEventListener(
      'pointerdown',
      app.dialog.collections.togglePagesize
    );

    const downEvent =
      window.ontouchstart !== undefined ? 'touchstart' : 'mousedown';
    const moveEvent =
      window.ontouchmove !== undefined ? 'touchmove' : 'mousemove';
    const upEvent = window.ontouchend !== undefined ? 'touchend' : 'mouseup';

    elems.svg.addEventListener(downEvent, pointerdown);
    elems.svg.addEventListener(moveEvent, pointermove);
    elems.svg.addEventListener(upEvent, pointerup);
    document.addEventListener(upEvent, pointerup);

    update();
  }

  function getCursorPos(elem, e) {
    const bcRect = elem.getBoundingClientRect();
    let cursorX;
    let cursorY;
    if (e.touches !== undefined) {
      cursorX = e.touches[0].clientX - bcRect.left;
      cursorY = e.touches[0].clientY - bcRect.top;
    } else {
      cursorX = e.clientX - bcRect.left;
      cursorY = e.clientY - bcRect.top;
    }
    return { x: cursorX, y: cursorY };
  }

  // カーソル位置の座標を得る
  function getCursorXY(e) {
    const cursorPos = getCursorPos(elems.svg, e);
    const x = clamp(
      Math.floor(cursorPos.x / app.common.blockSize),
      0,
      app.common.maxX - 1
    );
    const y = clamp(
      Math.floor(cursorPos.y / app.common.blockSize),
      0,
      app.common.maxY - 1
    );
    return { x, y };

    function clamp(val, min, max) {
      if (val < min) return min;
      if (val > max) return max;
      return val;
    }
  }

  function pointerdown(e) {
    e.preventDefault();
    drawingFlag = true;

    const cur = getCursorXY(e);
    drawingState =
      app.common.states[cur.y][cur.x] === app.common.stateOff
        ? app.common.stateOn
        : app.common.stateOff;
    pointermove(e);
  }

  function pointerup(e) {
    e.preventDefault();
    drawingFlag = false;
    clearInterval(intervalPrevId);
    clearInterval(intervalNextId);
  }

  function pointermove(e) {
    e.preventDefault();
    if (!drawingFlag) {
      return;
    }

    const cur = getCursorXY(e);
    e.preventDefault();

    prev.x = cur.x;
    prev.y = cur.y;

    if (app.common.states[cur.y][cur.x] !== drawingState) {
      app.common.states[cur.y][cur.x] = drawingState;
      update(e);
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
