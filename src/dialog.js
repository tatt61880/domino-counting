(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';

  if (!isBrowser) {
    console.error('Error: dialog.js is for browser.');
    return;
  }

  const app = window.app;
  if (app.elems === undefined) {
    console.error('app.elems is undefined.');
  }
  if (app.savedata === undefined) {
    console.error('app.savedata is undefined.');
  }
  if (app.svg === undefined) {
    console.error('app.svg is undefined.');
  }

  const elems = app.elems;
  const svg = app.svg;

  const dialog = {
    collections: {
      show: showCollectionsDialog,
      prevPage: gotoPrevLevelPage,
      nextPage: gotoNextLevelPage,
      close: closeCollectionsDialog,
    },
  };

  // --------------------------------------------------------------------------

  let page = 0;

  function showCollectionsDialog() {
    const num = app.savedata.getNum();
    elems.collections.num.innerText = `コレクション数: ${num}`;
    updateCollectionsDialog();
    elems.collections.dialog.showModal();
  }

  function gotoPrevLevelPage() {
    if (!elems.collections.prev.classList.contains('hide')) {
      page -= 1;
      updateCollectionsDialog();
    }
  }

  function gotoNextLevelPage() {
    if (!elems.collections.next.classList.contains('hide')) {
      page += 1;
      updateCollectionsDialog();
    }
  }

  function updateCollectionsDialog() {
    window.getSelection().removeAllRanges();

    elems.collections.dialogSvg.innerHTML = '';

    if (page === 0) {
      elems.collections.prev.classList.add('hide');
    } else {
      elems.collections.prev.classList.remove('hide');
    }

    const COLS = 5;
    const ROWS = 4;
    const NUM_PER_PAGE = COLS * ROWS;

    const HEIGHT = 90;
    const WIDTH = 90;

    elems.collections.dialogSvg.setAttribute('height', HEIGHT * ROWS);
    elems.collections.dialogSvg.setAttribute('width', HEIGHT * COLS);

    for (let i = page * NUM_PER_PAGE; i < (page + 1) * NUM_PER_PAGE; i++) {
      const count = i + 1;
      const g = svg.createG();
      elems.collections.dialogSvg.appendChild(g);

      const x = (i % COLS) * WIDTH;
      const y = Math.floor((i % NUM_PER_PAGE) / COLS) * HEIGHT;
      g.setAttribute('transform', `translate(${x},${y})`);

      const rect = app.svg.createRect(1, {
        x: 0,
        y: 0,
        width: WIDTH,
        height: HEIGHT,
        fill: '#ffffff',
        stroke: '#dddddd',
      });
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('rx', '5');
      rect.setAttribute('ry', '5');
      g.appendChild(rect);

      const sss = app.savedata.getCount(count);
      if (sss === undefined) {
        const titleColor = '#ff3333';
        const text = app.svg.createText(1, {
          x: WIDTH / 2,
          y: HEIGHT / 2,
          text: '?',
          fill: titleColor,
        });
        text.setAttribute('font-size', '32px');
        g.appendChild(text);
        rect.setAttribute('fill', '#ffeeee');
      } else {
        const states = [];
        for (let ss of sss) {
          const state = [];
          while (ss) {
            const v = ss & 1;
            ss -= v;
            ss /= 2;
            state.push(v);
          }
          states.push(state);
        }

        const gStates = app.common.createStatesG(
          states,
          (WIDTH - 14) / app.common.maxW
        );
        gStates.setAttribute('transform', `translate(7,5)`);
        g.appendChild(gStates);

        const pointerdownEventName =
          window.ontouchstart !== undefined ? 'touchstart' : 'mousedown';

        g.classList.add('button');
        rect.addEventListener(pointerdownEventName, () => {
          for (let y = 0; y < app.common.states.length; y++) {
            for (let x = 0; x < app.common.states[0].length; x++) {
              app.common.states[y][x] =
                states[y] === undefined || states[y][x] !== app.common.stateOn
                  ? app.common.stateOff
                  : app.common.stateOn;
            }
          }
          const g = app.common.createStatesG(
            app.common.states,
            app.common.blockSize
          );
          elems.svg.appendChild(g);
          app.common.updateResult();
          closeCollectionsDialog();
        });
      }

      {
        const text = app.svg.createText(1, {
          x: WIDTH / 2,
          y: HEIGHT - 9,
          text: count,
          fill: '#000000',
        });
        text.setAttribute('font-size', '16px');
        g.appendChild(text);
      }
    }
  }

  function closeCollectionsDialog() {
    elems.collections.dialog.close();
  }

  if (isBrowser) {
    window.app = window.app || {};
    window.app.dialog = dialog;
  }
})();
