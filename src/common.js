(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const app = window.app;
  console.assert(app.svg !== undefined);

  const stateOff = 0;
  const stateOn = 1;
  const blockSize = 60;

  const svg = app.svg;

  const states = [];
  const maxW = 7;
  const maxH = 6;

  for (let y = 0; y < maxH; ++y) {
    states[y] = [];
    for (let x = 0; x < maxW; ++x) {
      states[y][x] = stateOn;
    }
  }

  const common = {
    states,
    stateOff,
    stateOn,
    blockSize,
    createStatesG,
    updateResult,
    maxW,
    maxH,
  };

  function dominoCount() {
    let ans = 0;
    let numDomino = 0;
    let numOn = 0;
    let numOdd = 0;
    let numEven = 0;

    for (let y = 0; y < maxH; y++) {
      for (let x = 0; x < maxW; x++) {
        if (app.common.states[y][x] !== app.common.stateOn) continue;

        numOn++;

        if ((x + y) % 2 === 0) {
          numEven++;
        } else {
          numOdd++;
        }
      }
    }

    if (numEven !== numOdd) {
      return [0, numOn];
    }

    if (numOn === 0) {
      return [1, numOn];
    }

    const numDominoMax = numOn / 2;

    dfs(0, 0);

    return [ans, numOn];

    function dfs(y0, x0) {
      for (let y = y0; y < maxH; y++) {
        const x00 = y === y0 ? x0 : 0;
        for (let x = x00; x < maxW; x++) {
          if (app.common.states[y][x] !== app.common.stateOn) continue;

          if (x !== maxW - 1) {
            // 横置き
            if (app.common.states[y][x + 1] === app.common.stateOn) {
              numDomino++;
              if (numDomino === numDominoMax) {
                ans++;
              } else {
                app.common.states[y][x] = app.common.states[y][x + 1] =
                  app.common.stateOff;
                dfs(y, x + 2);
                app.common.states[y][x] = app.common.states[y][x + 1] =
                  app.common.stateOn;
              }
              numDomino--;
            }
          }

          if (y !== maxH - 1) {
            // 縦置き
            if (app.common.states[y + 1][x] === app.common.stateOn) {
              numDomino++;
              if (numDomino === numDominoMax) {
                ans++;
              } else {
                app.common.states[y][x] = app.common.states[y + 1][x] =
                  app.common.stateOff;
                dfs(y, x + 1);
                app.common.states[y][x] = app.common.states[y + 1][x] =
                  app.common.stateOn;
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
    const [result, numOn] = dominoCount();

    app.elems.num.innerText = `${numOn}マス`;
    app.elems.result.innerText = `${result}通り`;

    app.savedata.saveCollectionState(result, app.common.states);
  }

  // 盤面図形を作成
  function createStatesG(states, blockSize) {
    const g = svg.createG();
    const lineColor = '#888888';

    const emptyColor = 'none';
    const emptyStroke = 'none';

    const floorColor1 = '#ffbb88';
    const floorColor2 = '#ffaa88';
    const floorStroke = '#fd7e00';

    {
      const fill = 'white';
      const stroke = 'none';
      const rect = svg.createRect(blockSize, {
        x: 0,
        y: 0,
        width: maxW,
        height: maxH,
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
      for (let y = 1; y < maxH; y++) {
        const line = svg.createLine(blockSize, {
          x1: -0.5 * dotRatio,
          y1: y,
          x2: maxW,
          y2: y,
          stroke: lineColor,
        });

        line.setAttribute('stroke-dasharray', strokeDasharray);
        g.appendChild(line);
      }
      for (let x = 1; x < maxW; x++) {
        const line = svg.createLine(blockSize, {
          x1: x,
          y1: -0.5 * dotRatio,
          x2: x,
          y2: maxH,
          stroke: lineColor,
        });
        line.setAttribute('stroke-dasharray', strokeDasharray);
        g.appendChild(line);
      }
    }

    for (let y = 0; y < maxH; y++) {
      if (states[y] === undefined) break;
      for (let x = 0; x < maxW; x++) {
        if (states[y][x] === undefined) break;
        const floorColor = (x + y) % 2 === 0 ? floorColor1 : floorColor2;
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
