(function () {
  'use strict';
  const VERSION_TEXT = 'v2023.10.30';

  const app = window.app;
  Object.freeze(app);
  const elems = app.elems;

  let drawingFlag = false;
  let drawingState = null;
  const prev = { x: null, y: null };

  document.addEventListener('DOMContentLoaded', onloadApp);
  return;
  // ==========================================================================

  function onloadApp() {
    elems.version.textContent = VERSION_TEXT;

    const pointerdownEventName =
      window.ontouchstart !== undefined ? 'touchstart' : 'mousedown';

    elems.collections.button.addEventListener(
      pointerdownEventName,
      app.dialog.collections.show
    );
    elems.collections.dialog.addEventListener(
      pointerdownEventName,
      app.dialog.collections.close
    );
    elems.collections.dialogDiv.addEventListener(pointerdownEventName, (e) =>
      e.stopPropagation()
    );
    elems.collections.close.addEventListener(
      pointerdownEventName,
      app.dialog.collections.close
    );
    elems.collections.prev.addEventListener(
      pointerdownEventName,
      app.dialog.collections.prevPage
    );
    elems.collections.next.addEventListener(
      pointerdownEventName,
      app.dialog.collections.nextPage
    );

    if (window.ontouchstart === undefined) {
      elems.svg.addEventListener('mousedown', pointerdown);
    } else {
      elems.svg.addEventListener('touchstart', pointerdown);
    }
    if (window.ontouchmove === undefined) {
      elems.svg.addEventListener('mousemove', pointermove);
    } else {
      elems.svg.addEventListener('touchmove', pointermove);
    }
    if (window.ontouchend === undefined) {
      elems.svg.addEventListener('mouseup', pointerup);
      document.addEventListener('mouseup', pointerup);
    } else {
      elems.svg.addEventListener('touchend', pointerup);
      document.addEventListener('touchend', pointerup);
    }

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
      app.common.maxW - 1
    );
    const y = clamp(
      Math.floor(cursorPos.y / app.common.blockSize),
      0,
      app.common.maxH - 1
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

    elems.svg.setAttribute('width', app.common.blockSize * app.common.maxW);
    elems.svg.setAttribute('height', app.common.blockSize * app.common.maxH);

    const g = app.common.createStatesG(app.common.states, app.common.blockSize);
    elems.svg.appendChild(g);
  }
})();
