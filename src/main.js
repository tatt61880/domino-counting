(function () {
  'use strict';
  const VERSION_TEXT = 'v2023.10.29f';

  const app = window.app;
  Object.freeze(app);
  const elems = app.elems;

  const maxW = 7;
  const maxH = 6;
  const blockSize = 50;

  const states = [];
  for (let y = 0; y < maxH; ++y) {
    states[y] = [];
    for (let x = 0; x < maxW; ++x) {
      states[y][x] = app.common.stateOn;
    }
  }

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
    const x = clamp(Math.floor(cursorPos.x / blockSize), 0, maxW - 1);
    const y = clamp(Math.floor(cursorPos.y / blockSize), 0, maxH - 1);
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
      states[cur.y][cur.x] === app.common.stateOff
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

    if (states[cur.y][cur.x] !== drawingState) {
      states[cur.y][cur.x] = drawingState;
      update(e);
    }
  }

  function update() {
    updateResult();
    updateSvg();
  }

  function updateSvg() {
    elems.svg.textContent = '';

    elems.svg.setAttribute('width', blockSize * maxW);
    elems.svg.setAttribute('height', blockSize * maxH);

    const g = app.common.createStatesG(states, blockSize);
    elems.svg.appendChild(g);
  }

  function dominoCount() {
    let ans = 0;
    let numDomino = 0;
    let numOrange = 0;

    for (let y = 0; y < maxH; y++) {
      for (let x = 0; x < maxW; x++) {
        if (states[y][x] === app.common.stateOn) {
          numOrange++;
        }
      }
    }

    if (numOrange % 2 !== 0) {
      return [0, numOrange];
    }

    if (numOrange === 0) {
      return [1, numOrange];
    }

    const numDominoMax = numOrange / 2;

    dfs(0, 0);

    return [ans, numOrange];

    function dfs(y0, x0) {
      for (let y = y0; y < maxH; y++) {
        const x00 = y === y0 ? x0 : 0;
        for (let x = x00; x < maxW; x++) {
          if (states[y][x] !== app.common.stateOn) continue;

          if (x !== maxW - 1) {
            // 横置き
            if (states[y][x + 1] === app.common.stateOn) {
              numDomino++;
              if (numDomino === numDominoMax) {
                ans++;
              } else {
                states[y][x] = states[y][x + 1] = app.common.stateOff;
                dfs(y, x + 2);
                states[y][x] = states[y][x + 1] = app.common.stateOn;
              }
              numDomino--;
            }
          }

          if (y !== maxH - 1) {
            // 縦置き
            if (states[y + 1][x] === app.common.stateOn) {
              numDomino++;
              if (numDomino === numDominoMax) {
                ans++;
              } else {
                states[y][x] = states[y + 1][x] = app.common.stateOff;
                dfs(y, x + 1);
                states[y][x] = states[y + 1][x] = app.common.stateOn;
              }
              numDomino--;
            }
          }
          return;
        }
      }
    }
  }

  function updateResult() {
    const [result, numOrange] = dominoCount();

    elems.num.innerText = `${numOrange}マス`;
    elems.result.innerText = `${result}通り`;

    app.savedata.saveCount(result, states);
  }
})();
