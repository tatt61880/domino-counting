(function () {
  'use strict';
  const VERSION_TEXT = 'v2023.10.27';

  const app = window.app;
  Object.freeze(app);
  const elems = app.elems;
  const svg = app.svg;

  const maxW = 5;
  const maxH = 5;
  const blockSize = 30;
  const marginRatio = 0.2;

  document.addEventListener('DOMContentLoaded', onloadApp);
  return;
  // ==========================================================================

  function onloadApp() {
    elems.version.textContent = VERSION_TEXT;

    drawSvg();
  }

  function drawSvg() {
    elems.svg.textContent = '';

    elems.svg.setAttribute('width', blockSize * (maxW + 2 * marginRatio));
    elems.svg.setAttribute('height', blockSize * (maxH + 2 * marginRatio));

    const g = svg.createG();
    elems.svg.appendChild(g);

    const lineColor = '#aaaaaa';

    for (let h = 0; h <= maxH; h++) {
      const line = svg.createLine(blockSize, {
        x1: marginRatio,
        y1: h + marginRatio,
        x2: maxW + marginRatio,
        y2: h + marginRatio,
        stroke: lineColor,
      });
      g.appendChild(line);
    }
    for (let w = 0; w <= maxW; w++) {
      const line = svg.createLine(blockSize, {
        x1: w + marginRatio,
        y1: 0 + marginRatio,
        x2: w + marginRatio,
        y2: maxH + marginRatio,
        stroke: lineColor,
      });
      g.appendChild(line);
    }
  }
})();
