(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const app = window.app;
  if (app.svg === undefined) {
    console.error('app.svg is undefined.');
  }

  const stateOff = 0;
  const stateOn = 1;
  const blockSize = 50;

  const svg = app.svg;

  const states = [];

  const common = {
    states,
    stateOff,
    stateOn,
    blockSize,
    createStatesG,
  };

  function createStatesG(states, blockSize) {
    const g = svg.createG();
    const lineColor = '#aaaaaa';

    const wallColor = 'none';
    const wallStroke = 'none';

    const floorColor = '#ffbb88';
    const floorStroke = '#fd7e00';

    const maxH = states.length;
    const maxW = states[0].length;

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
      for (let x = 0; x < maxW; x++) {
        const fill = states[y][x] !== stateOn ? wallColor : floorColor;
        const stroke = states[y][x] !== stateOn ? wallStroke : floorStroke;
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
