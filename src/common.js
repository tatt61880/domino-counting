(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const app = window.app;
  console.assert(app.svg !== undefined);

  const stateOff = 0;
  const stateOn = 1;

  const svg = app.svg;

  const option = {};

  const params = new URLSearchParams(location.search);
  for (const key of ['w', 'h']) {
    const value = Number(params.get(key));
    if (Number.isInteger(value) && value >= 1 && value <= 30) option[key] = value;
  }
  option.s = params.get('s');

  const defaultMaxX = 7;
  const defaultMaxY = 6;
  const states = [];
  const maxX = option.w ?? defaultMaxX;
  const maxY = option.h ?? defaultMaxY;
  const blockSize = (() => {
    let res = 60;
    if (maxX > defaultMaxX) {
      res = 460 / maxX;
      if (res < 30) res = 30;
    }
    return res;
  })();

  for (let y = 0; y < maxY; ++y) {
    states[y] = [];
    for (let x = 0; x < maxX; ++x) {
      states[y][x] = stateOff;
    }
  }

  if (option.s) {
    for (let y = 0; y < maxY; ++y) {
      states[y] = [];
      for (let x = 0; x < maxX; ++x) {
        states[y][x] = stateOff;
      }
    }

    let y = 0;
    let x = 0;
    for (const c of stateCharGenerator(option.s)) {
      if (c === '-') {
        y++;
        if (y >= maxY) break;
        x = 0;
      } else {
        if (x >= maxX) continue;
        states[y][x] = c === '1' ? stateOn : stateOff;
        x++;
      }
    }
  }

  function* stateCharGenerator(stateStr) {
    for (let i = 0; i < stateStr.length; ++i) {
      let c = stateStr[i];
      if (c === '(') {
        c = '';
        while (i !== stateStr.length - 1 && stateStr[++i] !== ')') {
          c += stateStr[i];
        }
      }
      yield c;
    }
  }

  const common = {
    states,
    stateOff,
    stateOn,
    blockSize,
    createStatesG,
    updateResult,
    maxX,
    maxY,
    defaultMaxX,
    defaultMaxY,
  };

  let worker;
  let requestId = 0;
  let timeout;
  let startTimer;
  let analysis = null;
  let resultCount = null;

  function updateResult() {
    const id = ++requestId;
    clearTimeout(startTimer);
    clearTimeout(timeout);
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
      worker = null;
    }
    analysis = null;
    resultCount = null;
    app.elems.notice.textContent = '';
    let even = 0;
    let odd = 0;
    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < maxX; x++) {
        if (states[y][x] === stateOn) {
          if ((x + y) % 2 === 0) even++;
          else odd++;
        }
      }
    }
    app.elems.numEven.textContent = `×${even}`;
    app.elems.numOdd.textContent = `×${odd}`;
    app.elems.result.textContent = '計算中…';
    // Coalesce rapid pointer updates instead of starting a worker per event.
    startTimer = setTimeout(() => {
      let currentWorker;
      const isCurrent = () => id === requestId && worker === currentWorker;
      try {
        currentWorker = new Worker('./src/count-worker.js');
        worker = currentWorker;
        currentWorker.onmessage = ({ data }) => {
          if (!isCurrent() || data.id !== id) return;
          clearTimeout(timeout);
          currentWorker.terminate();
          worker = null;
          analysis = data;
          resultCount = data.count ?? null;
          app.elems.result.textContent = data.count === null || data.error
            ? '計算量の上限に達しました' : `${data.count}通り`;
          if (resultCount !== null) app.savedata.saveCollectionState(resultCount, states);
          document.dispatchEvent(new Event('domino-result'));
        };
        currentWorker.onerror = () => {
          if (!isCurrent()) return;
          clearTimeout(timeout);
          currentWorker.terminate();
          worker = null;
          app.elems.result.textContent = '計算を実行できませんでした';
        };
        timeout = setTimeout(() => {
          if (!isCurrent()) return;
          currentWorker.terminate();
          worker = null;
          app.elems.result.textContent = '計算量の上限に達しました';
        }, 5000);
        currentWorker.postMessage({ id, states });
      } catch {
        if (id !== requestId) return;
        clearTimeout(timeout);
        currentWorker?.terminate();
        worker = null;
        app.elems.result.textContent = '計算を実行できませんでした';
      }
    }, 40);
  }

  common.getResult = () => resultCount;
  common.getAnalysis = () => analysis;

  // 盤面図形を作成
  function createStatesG(states, blockSize) {
    const g = svg.createG();
    const lineColor = '#888888';

    const emptyColor = 'none';
    const emptyStroke = 'none';

    const floorColorEven = '#ffbb88';
    const floorColorOdd = '#ffaa88';
    const invalidCells = new Set();
    if (states === common.states && analysis?.islands) {
      for (const island of analysis.islands) {
        if (island.count === '0') island.cells.forEach((id) => invalidCells.add(id));
      }
    }
    const floorStroke = '#fd7e00';

    {
      const fill = 'white';
      const stroke = 'none';
      const rect = svg.createRect(blockSize, {
        x: 0,
        y: 0,
        width: maxX,
        height: maxY,
        fill,
        stroke,
      });
      g.appendChild(rect);
    }

    // 点線
    {
      const dotRatio = 1 / 40;
      const size = blockSize * dotRatio;
      const strokeDasharray = `${size} ${4 * size}`;
      for (let y = 1; y < maxY; y++) {
        const line = svg.createLine(blockSize, {
          x1: -0.5 * dotRatio,
          y1: y,
          x2: maxX,
          y2: y,
          stroke: lineColor,
        });

        line.setAttribute('stroke-dasharray', strokeDasharray);
        g.appendChild(line);
      }
      for (let x = 1; x < maxX; x++) {
        const line = svg.createLine(blockSize, {
          x1: x,
          y1: -0.5 * dotRatio,
          x2: x,
          y2: maxY,
          stroke: lineColor,
        });
        line.setAttribute('stroke-dasharray', strokeDasharray);
        g.appendChild(line);
      }
    }

    for (let y = 0; y < maxY; y++) {
      if (states[y] === undefined) break;
      for (let x = 0; x < maxX; x++) {
        if (states[y][x] === undefined) break;
        const floorColor = invalidCells.has(y * maxX + x)
          ? ((x + y) % 2 === 0 ? '#c9c9dc' : '#aaaac4')
          : ((x + y) % 2 === 0 ? floorColorEven : floorColorOdd);
        const fill = states[y][x] !== stateOn ? emptyColor : floorColor;
        const stroke = states[y][x] !== stateOn ? emptyStroke : floorStroke;
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

    return g;
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.common = common;
  }
})();
