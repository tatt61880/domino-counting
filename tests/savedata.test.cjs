'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/class-savedata.js'), 'utf8');

function load(initial, failWrite = false) {
  let stored = initial;
  const app = { elems: { notice: {} }, common: { maxX: 7, maxY: 6, defaultMaxX: 7, defaultMaxY: 6 } };
  vm.runInNewContext(source, {
    window: { app },
    localStorage: {
      getItem: () => stored,
      setItem: (_, value) => { if (failWrite) throw new Error('quota'); stored = value; },
    },
  });
  return app;
}
const board = (rows) => Array.from({ length: 6 }, (_, y) => Array.from({ length: 7 }, (_, x) => ((rows[y] || 0) >> x) & 1));

test('original and compact records update independently across reloads', () => {
  const original = [3, 3, 0, 0, 3];
  const compact = [0, 0, 0, 3, 3];
  const app = load(JSON.stringify({ counts: { 2: original } }));
  // All three candidates have exactly two tilings. The two rules disagree.
  app.savedata.saveCollectionState('2', board(compact));
  let data = JSON.parse(app.savedata.getSavedataString());
  assert.deepEqual(data.counts['2'], original);
  assert.deepEqual(data.compactCounts['2'], compact);
  const reloaded = load(JSON.stringify(data));
  reloaded.savedata.saveCollectionState('2', board([3, 3, 0, 3]));
  data = JSON.parse(reloaded.savedata.getSavedataString());
  assert.deepEqual(data.counts['2'], [3, 3, 0, 3]);
  assert.deepEqual(data.compactCounts['2'], compact);
  assert.deepEqual(Array.from(reloaded.savedata.getCollectionState('2')), [3, 3, 0, 3]);
  assert.deepEqual(Array.from(reloaded.savedata.getCollectionState('2', 'compact')), compact);
});

test('compact collection uses bounding area and preserves unrelated original records', () => {
  const original = { 1: [1, 0, 1], 2: [3, 3] };
  const app = load(JSON.stringify({ counts: original }));
  app.savedata.saveCollectionState('1', board([3]));
  const data = JSON.parse(app.savedata.getSavedataString());
  assert.deepEqual(data.compactCounts['1'], [3]);
  assert.deepEqual(data.counts['2'], original['2']);
  assert.deepEqual(data.compactCounts['2'], original['2']);
});

test('corrupted or unavailable storage does not stop editing', () => {
  for (const initial of ['broken', '{"counts":[]}', '{"counts":{"1":null,"2":[999]}}']) {
    const app = load(initial, true);
    assert.equal(app.savedata.getCollectionNum(), 0);
    assert.doesNotThrow(() => app.savedata.saveCollectionState('1', board([3])));
    assert.match(app.elems.notice.textContent, /保存できません/);
  }
});
