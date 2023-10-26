(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  const svg = {};

  const SVG_NS = 'http://www.w3.org/2000/svg';

  svg.createSvg = () => {
    const svg = document.createElementNS(SVG_NS, 'svg');
    return svg;
  };

  svg.createG = () => {
    const g = document.createElementNS(SVG_NS, 'g');
    return g;
  };

  svg.createLine = (blockSize, { x1, y1, x2, y2, stroke, strokeWidth }) => {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', blockSize * x1);
    line.setAttribute('y1', blockSize * y1);
    line.setAttribute('x2', blockSize * x2);
    line.setAttribute('y2', blockSize * y2);
    line.setAttribute('stroke-width', `${blockSize / 50}`);
    if (stroke) line.setAttribute('stroke', stroke);
    if (strokeWidth) line.setAttribute('stroke-width', blockSize * strokeWidth);
    return line;
  };

  svg.createRect = (
    blockSize,
    { x, y, width, height, fill, stroke, strokeWidth }
  ) => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', blockSize * x);
    rect.setAttribute('y', blockSize * y);
    rect.setAttribute('width', blockSize * width);
    rect.setAttribute('height', blockSize * height);
    if (fill) rect.setAttribute('fill', fill);
    if (stroke) rect.setAttribute('stroke', stroke);
    if (strokeWidth) rect.setAttribute('stroke-width', blockSize * strokeWidth);
    return rect;
  };

  svg.createText = (blockSize, { x, y, text, fill }) => {
    const textElem = document.createElementNS(SVG_NS, 'text');
    textElem.setAttribute('x', blockSize * x);
    textElem.setAttribute('y', blockSize * (y + 0.08));
    textElem.textContent = text;
    textElem.setAttribute('dominant-baseline', 'middle');
    textElem.setAttribute('text-anchor', 'middle');
    textElem.setAttribute('font-weight', 'bold');
    textElem.setAttribute('fill', fill);
    return textElem;
  };

  Object.freeze(svg);

  if (isBrowser) {
    window.app = window.app || {};
    window.app.svg = svg;
  }
})();
