(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;

  const app = window.app;
  console.assert(app.elems !== undefined);
  console.assert(app.savedata !== undefined);
  console.assert(app.svg !== undefined);

  const elems = app.elems;
  const svg = app.svg;

  const dialog = {
    collections: {
      show: showCollectionsDialog,
      prevPage: gotoPrevCollectionsPage,
      nextPage: gotoNextCollectionsPage,
      close: closeCollectionsDialog,
      togglePagesize: toggleCollectionsPagesize,
      refresh: updateCollectionsDialog,
      firstPage: () => { page20 = 0; updateCollectionsDialog(); },
    },
  };

  // --------------------------------------------------------------------------

  let page20 = 0;
  const collectionOrder = () => document.getElementById('collection-order').value;
  const pagesize20 = Symbol('pagesize20');
  const pagesize100 = Symbol('pagesize100');
  let pagesize = pagesize20;

  function toggleCollectionsPagesize() {
    if (pagesize === pagesize20) {
      pagesize = pagesize100;
    } else {
      pagesize = pagesize20;
      page20 = Math.floor(page20 / 5) * 5;
    }
    updateCollectionsDialog();
  }

  function showCollectionsDialog() {
    updateCollectionsDialog();
    elems.collections.dialog.showModal();
    elems.collections.close.focus();
  }

  function gotoPrevCollectionsPage() {
    if (!elems.collections.prev.classList.contains('hide')) {
      page20 -= pagesize === pagesize20 ? 1 : 5;
      updateCollectionsDialog();
    }
  }

  function gotoNextCollectionsPage() {
    if (!elems.collections.next.classList.contains('hide')) {
      page20 += pagesize === pagesize20 ? 1 : 5;
      updateCollectionsDialog();
    }
  }

  function updateCollectionsDialog() {
    window.getSelection().removeAllRanges();
    const num = app.savedata.getCollectionNum(collectionOrder());
    elems.collections.num.innerText = `コレクション数: ${num}`;

    elems.collections.dialogSvg.innerHTML = '';
    const page = pagesize === pagesize20 ? page20 : Math.floor(page20 / 5);

    if (page === 0) {
      elems.collections.prev.classList.add('hide');
    } else {
      elems.collections.prev.classList.remove('hide');
    }

    const COLS = pagesize === pagesize20 ? 5 : 10;
    const ROWS = pagesize === pagesize20 ? 4 : 10;
    const NUM_PER_PAGE = COLS * ROWS;

    const HEIGHT = pagesize === pagesize20 ? 90 : 36;
    const WIDTH = pagesize === pagesize20 ? 90 : 45;

    elems.collections.dialogSvg.setAttribute('width', WIDTH * COLS);
    elems.collections.dialogSvg.setAttribute('height', HEIGHT * ROWS);
    elems.collections.dialogSvg.setAttribute('viewBox', `0 0 ${WIDTH * COLS} ${HEIGHT * ROWS}`);

    for (let i = page * NUM_PER_PAGE; i < (page + 1) * NUM_PER_PAGE; i++) {
      const count = i + 1;
      addCell(count, i);
    }

    function addCell(count, i) {
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

      const sss = app.savedata.getCollectionState(count, collectionOrder());
      const sameCount = String(count) === app.common.getResult();
      const sameBoard = sss !== undefined && app.common.states.every((row, y) =>
        row.reduce((mask, cell, x) => mask + (cell === app.common.stateOn ? 2 ** x : 0), 0) === (sss[y] || 0));
      if (sameBoard) rect.setAttribute('fill', '#dcecff');
      if (sss === undefined) {
        if (pagesize === pagesize20) {
          const titleColor = '#ff3333';
          const text = app.svg.createText(1, {
            x: WIDTH / 2,
            y: HEIGHT / 2,
            text: '?',
            fill: titleColor,
          });
          text.setAttribute('font-size', '32px');
          g.appendChild(text);
        }
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
          (WIDTH - 14) / app.common.maxX
        );
        gStates.setAttribute('transform', `translate(7,5)`);
        g.appendChild(gStates);

        g.classList.add('button');
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', `${count}通りの盤面を開く`);
        gStates.style.pointerEvents = 'none';
        const load = () => {
          app.editBoard(states);
          closeCollectionsDialog();
        };
        g.addEventListener('click', load);
        g.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            load();
          }
        });
      }

      {
        const y = pagesize === pagesize20 ? HEIGHT - 9 : HEIGHT / 2 + 2;
        const text = app.svg.createText(1, {
          x: WIDTH / 2,
          y,
          text: count,
          fill: sameCount ? '#cc3300' : '#000000',
        });
        if (pagesize === pagesize20) {
          text.setAttribute('font-size', '16px');
        } else {
          text.setAttribute('font-size', '12px');
          text.setAttribute('opacity', '0.5');
        }
        g.appendChild(text);
      }
    }
  }

  function closeCollectionsDialog() {
    elems.collections.dialog.close();
    elems.collections.button.focus();
  }

  window.app = window.app || {};
  window.app.dialog = dialog;
})();
