'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze } = require('../src/counting.js');

function brute(board) {
  const h = board.length;
  const w = board[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!board[y][x]) continue;
      let count = 0n;
      board[y][x] = 0;
      for (const [nx, ny] of [[x + 1, y], [x, y + 1]]) {
        if (nx >= w || ny >= h || !board[ny][nx]) continue;
        board[ny][nx] = 0;
        count += brute(board);
        board[ny][nx] = 1;
      }
      board[y][x] = 1;
      return count;
    }
  }
  return 1n;
}

test('all 4096 subsets of a 4×3 board match independent enumeration', () => {
  for (let mask = 0; mask < 4096; mask++) {
    const board = Array.from({ length: 3 }, (_, y) => Array.from({ length: 4 }, (_, x) => (mask >> (4 * y + x)) & 1));
    const before = JSON.stringify(board);
    assert.equal(analyze(board).count, brute(board).toString(), `mask ${mask}`);
    assert.equal(JSON.stringify(board), before);
  }
});

test('full standard board and exact integers above Number.MAX_SAFE_INTEGER', () => {
  assert.equal(analyze(Array.from({ length: 6 }, () => Array(7).fill(1))).count, '31529');
  const board = Array.from({ length: 30 }, (_, y) => Array.from({ length: 30 }, (_, x) => x % 3 < 2 && y % 3 < 2 ? 1 : 0));
  const result = analyze(board);
  assert.equal(result.islands.length, 100);
  assert.equal(result.count, (2n ** 100n).toString());
});

test('impossible islands and calculation limits are distinguished', () => {
  const result = analyze([[1, 0, 1]]);
  assert.equal(result.count, '0');
  assert.ok(result.islands.every((island) => island.count === '0'));
  assert.equal(analyze([[1, 1], [1, 1]], 0).count, null);
  assert.equal(analyze([[1, 1, 0, 1], [1, 1, 0, 0]], 0).count, '0');
});
