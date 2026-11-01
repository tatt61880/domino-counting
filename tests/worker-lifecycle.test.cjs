'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup() {
  const workers = [];
  const timers = new Map();
  let nextTimer = 0;
  const saved = [];
  const app = { svg: {}, elems: { result: {}, notice: {}, numEven: {}, numOdd: {} }, savedata: { saveCollectionState: (...args) => saved.push(args) } };
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
