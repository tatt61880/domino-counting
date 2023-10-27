(function () {
  "use strict";
  const VERSION_TEXT = "v2023.10.27";

  const app = window.app;
  Object.freeze(app);
  const elems = app.elems;
  const svg = app.svg;

  const maxW = 6;
  const maxH = 6;
  const blockSize = 50;

  const stateNone = 0;
  const stateWall = 1;

  let ans = 0;
  let num = 0;
  let numMax = 0;

  const states = [];
  for (let y = 0; y < maxH; ++y) {
    states[y] = [];
    for (let x = 0; x < maxW; ++x) {
      states[y][x] = stateNone;
    }
  }

  let drawingFlag = false;
  let drawingState = null;
  let prev = { x: null, y: null };

  document.addEventListener("DOMContentLoaded", onloadApp);
  return;
  // ==========================================================================

  function onloadApp() {
    elems.version.textContent = VERSION_TEXT;

    if (window.ontouchstart === undefined) {
      elems.svg.addEventListener("mousedown", pointerdown, false);
    } else {
      elems.svg.addEventListener("touchstart", pointerdown, false);
    }
    if (window.ontouchmove === undefined) {
      elems.svg.addEventListener("mousemove", pointermove, false);
    } else {
      elems.svg.addEventListener("touchmove", pointermove, false);
    }
    if (window.ontouchend === undefined) {
      elems.svg.addEventListener("mouseup", pointerup, false);
      document.addEventListener("mouseup", pointerup, false);
    } else {
      elems.svg.addEventListener("touchend", pointerup, false);
      document.addEventListener("touchend", pointerup, false);
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
    drawingState = states[cur.y][cur.x] === stateWall ? stateNone : stateWall;
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
    updateSvg();
    updateResult();
  }

  function updateSvg() {
    elems.svg.textContent = "";

    elems.svg.setAttribute("width", blockSize * maxW);
    elems.svg.setAttribute("height", blockSize * maxH);

    const g = svg.createG();
    elems.svg.appendChild(g);

    const lineColor = "#aaaaaa";
    const wallColor = "#ffffff";
    const floorColor = "#ffbb88";
    const wallStroke = "none";
    const floorStroke = "#ff8800";

    for (let y = 0; y < maxH; y++) {
      for (let x = 0; x < maxW; x++) {
        const fill = states[y][x] === stateWall ? wallColor : floorColor;
        const stroke = states[y][x] === stateWall ? wallStroke : floorStroke;
        const rect = svg.createRect(blockSize, {
          x,
          y,
          width: 1,
          height: 1,
          fill,
          stroke,
        });
        g.appendChild(rect);
      }
    }

    for (let y = 0; y <= maxH; y++) {
      const line = svg.createLine(blockSize, {
        x1: 0,
        y1: y,
        x2: maxW,
        y2: y,
        stroke: lineColor,
      });
      g.appendChild(line);
    }
    for (let x = 0; x <= maxW; x++) {
      const line = svg.createLine(blockSize, {
        x1: x,
        y1: 0,
        x2: x,
        y2: maxH,
        stroke: lineColor,
      });
      g.appendChild(line);
    }
  }

  function dfs(y0, x0) {
    for (let y = y0; y < maxH; y++) {
      const x00 = y == y0 ? x0 : 0;
      for (let x = x00; x < maxW; x++) {
        if (states[y][x] == stateNone) {
          if (x !== maxW - 1) {
            // 横置き
            if (states[y][x + 1] === stateNone) {
              num++;
              if (num === numMax) {
                ans++;
              } else {
                states[y][x] = states[y][x + 1] = stateWall;
                dfs(y, x + 2);
                states[y][x] = states[y][x + 1] = stateNone;
              }
              num--;
            }
          }

          if (y !== maxH - 1) {
            // 縦置き
            if (states[y + 1][x] === stateNone) {
              num++;
              if (num === numMax) {
                ans++;
              } else {
                states[y][x] = states[y + 1][x] = stateWall;
                dfs(y, x + 1);
                states[y][x] = states[y + 1][x] = stateNone;
              }
              num--;
            }
          }
          return;
        }
      }
    }
  }

  function dominoCount() {
    ans = 0;
    num = 0;
    numMax = 0;
    for (let y = 0; y < maxH; y++) {
      for (let x = 0; x < maxW; x++) {
        if (states[y][x] === stateNone) {
          numMax++;
        }
      }
    }

    if (numMax % 2 !== 0) {
      return 0;
    }

    if (numMax === 0) {
      return 1;
    }

    numMax /= 2;

    dfs(0, 0);

    return ans;
  }

  function updateResult() {
    const num = dominoCount();
    elems.result.innerText = num;
  }
})();
