'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { analyze } = require('../src/counting.js');

function setup() {
  const workers = [];
  const timers = new Map();
  let nextTimer = 0;
  const saved = [];
  const app = { svg: {}, elems: { result: {}, notice: {}, numEven: {}, numOdd: {} }, savedata: { saveCollectionState: (...args) => saved.push(args) } };
  app.svg.createG = () => ({ children: [], appendChild(child) { this.children.push(child); } });
  app.svg.createRect = (_, attrs) => ({ type: 'rect', ...attrs });
  app.svg.createLine = () => ({ type: 'line', setAttribute() {} });
  class Worker {
    constructor() { this.terminated = false; workers.push(this); }
    terminate() { this.terminated = true; }
    postMessage(message) { this.message = structuredClone(message); }
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/common.js'), 'utf8'), {
    window: { app }, location: { search: '' }, URLSearchParams, console, Worker,
    setTimeout: (callback, delay) => { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => timers.delete(id),
    document: { dispatchEvent() {} }, Event: class {},
  });
  const runStart = () => {
    for (const [id, timer] of [...timers]) {
      if (timer.delay === 40) { timers.delete(id); timer.callback(); }
    }
  };
  return { app, workers, runStart, timers, saved };
}

test('rapid updates launch only the latest board', () => {
  const { app, workers, runStart } = setup();
  for (let i = 0; i < 200; i++) {
    app.common.states[0][0] = i % 2;
    app.common.updateResult();
  }
  assert.equal(workers.length, 0);
  runStart();
  assert.equal(workers.length, 1);
  assert.equal(workers[0].message.states[0][0], 1);
  assert.equal(workers[0].message.id, 200);
});

function cellFills(common, states = common.states) {
  return common.createStatesG(states, common.blockSize).children
    .filter((element) => element.type === 'rect' && element.width === 1 && element.height === 1)
    .map((element) => element.fill);
}

function complete(worker) {
  worker.onmessage({ data: { id: worker.message.id, ...analyze(worker.message.states) } });
}

test('island colors remain until the latest calculation completes, while edits appear immediately', () => {
  const { app, workers, runStart } = setup();
  const { common } = app;
  common.states[0].splice(0, 3, 1, 1, 1);
  common.updateResult(); runStart(); complete(workers[0]);
  assert.deepEqual(cellFills(common).slice(0, 4), ['#c9c9dc', '#aaaac4', '#c9c9dc', 'none']);

  common.states[0][2] = 0;
  common.states[0][3] = 1;
  common.updateResult();
  assert.equal(common.getResult(), null);
  assert.equal(common.getAnalysis(), null);
  const pending = ['#c9c9dc', '#aaaac4', 'none', '#ffaa88'];
  assert.deepEqual(cellFills(common).slice(0, 4), pending, 'keep colors during debounce');
  runStart();
  assert.deepEqual(cellFills(common).slice(0, 4), pending, 'keep colors while worker runs');
  complete(workers[1]);
  assert.deepEqual(cellFills(common).slice(0, 4), ['#ffbb88', '#ffaa88', 'none', '#aaaac4']);
  assert.equal(common.getResult(), '0');

  const collectionStates = common.states.map((row) => row.slice());
  assert.equal(cellFills(common, collectionStates)[3], '#ffaa88', 'main board colors do not leak to collection thumbnails');
});

test('interrupted calculations cannot replace the retained island colors', () => {
  const { app, workers, runStart } = setup();
  const { common } = app;
  common.states[0][0] = 1;
  common.updateResult(); runStart(); complete(workers[0]);
  common.states[0][1] = 1;
  common.updateResult(); runStart();
  const old = workers[1];
  const staleResult = old.onmessage;
  common.states[0][2] = 1;
  common.updateResult(); runStart();
  staleResult({ data: { id: old.message.id, ...analyze(old.message.states) } });
  assert.equal(app.elems.result.textContent, '計算中…');
  assert.equal(cellFills(common)[0], '#c9c9dc');
  complete(workers[2]);
  assert.deepEqual(cellFills(common).slice(0, 3), ['#c9c9dc', '#aaaac4', '#c9c9dc']);
});

test('failed and limited calculations retain colors until a later successful result', () => {
  for (const failure of ['error', 'timeout', 'worker-error', 'limit']) {
    const { app, workers, runStart, timers } = setup();
    const { common } = app;
    common.states[0][0] = 1;
    common.updateResult(); runStart(); complete(workers[0]);
    common.states[0][1] = 1;
    common.updateResult(); runStart();
    const current = workers[1];
    if (failure === 'error') current.onerror();
    else if (failure === 'timeout') [...timers.values()].find((timer) => timer.delay === 5000).callback();
    else current.onmessage({ data: failure === 'worker-error'
      ? { id: current.message.id, error: true }
      : { id: current.message.id, count: null, islands: [{ cells: [0, 1], count: null }] } });
    assert.equal(cellFills(common)[0], '#c9c9dc', failure);
    common.updateResult(); runStart(); complete(workers[2]);
    assert.deepEqual(cellFills(common).slice(0, 2), ['#ffbb88', '#ffaa88']);
  }
});

test('stale worker error, timeout and result cannot stop or overwrite a newer calculation', () => {
  const { app, workers, runStart, timers, saved } = setup();
  app.common.updateResult(); runStart();
  const old = workers[0];
  const error = old.onerror;
  const result = old.onmessage;
  const timeout = [...timers.values()].find((timer) => timer.delay === 5000).callback;
  app.common.states[0][0] = 1;
  app.common.updateResult(); runStart();
  const current = workers[1];
  error(); timeout(); result({ data: { id: old.message.id, count: '999' } });
  assert.equal(current.terminated, false);
  assert.equal(app.elems.result.textContent, '計算中…');
  assert.equal(saved.length, 0);
  current.onmessage({ data: { id: current.message.id, count: '0', islands: [] } });
  assert.equal(app.elems.result.textContent, '0通り');
  assert.equal(saved.length, 1);
  error(); timeout();
  assert.equal(app.elems.result.textContent, '0通り');
});
