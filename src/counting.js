(function (root) {
  'use strict';

  // Pure calculation shared by the worker and regression tests.
  function analyze(states, budget = 200000) {
    const height = states.length;
    const width = states[0]?.length || 0;
    const seen = new Set();
    const islands = [];
    let remaining = budget;
    let total = 1n;
    let numEven = 0;
    let numOdd = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (states[y][x] !== 1) continue;
        if ((x + y) % 2 === 0) numEven++;
        else numOdd++;
        const start = y * width + x;
        if (seen.has(start)) continue;
        const cells = [start];
        seen.add(start);
        for (let i = 0; i < cells.length; i++) {
          const id = cells[i];
          const cx = id % width;
          const cy = Math.floor(id / width);
          for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
            const next = ny * width + nx;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height || states[ny][nx] !== 1 || seen.has(next)) continue;
            seen.add(next);
            cells.push(next);
          }
        }
        islands.push({ cells });
      }
    }
    for (const island of islands) {
      const cells = island.cells.sort((a, b) => a - b);
      const even = cells.filter((id) => ((id % width) + Math.floor(id / width)) % 2 === 0).length;
      if (even * 2 !== cells.length) {
        island.count = '0';
      } else {
        const index = new Map(cells.map((id, i) => [id, i]));
        const bits = cells.map((_, i) => 1n << BigInt(i));
        const neighbors = cells.map((id) => [
          id % width + 1 < width ? index.get(id + 1) : undefined,
          index.get(id + width),
        ].filter((i) => i !== undefined));
        const memo = new Map();
        function count(mask) {
          if (mask === 0n) return 1n;
          if (memo.has(mask)) return memo.get(mask);
          if (--remaining < 0) throw new Error('limit');
          let i = 0;
          while ((mask & bits[i]) === 0n) i++;
          let result = 0n;
          for (const j of neighbors[i]) {
            if (mask & bits[j]) result += count(mask ^ bits[i] ^ bits[j]);
          }
          memo.set(mask, result);
          return result;
        }
        try {
          island.count = count((1n << BigInt(cells.length)) - 1n).toString();
        } catch (error) {
          if (error.message !== 'limit') throw error;
          island.count = null;
        }
      }
      if (island.count !== null) total *= BigInt(island.count);
    }
    const limited = total !== 0n && islands.some((island) => island.count === null);
    return { count: limited ? null : total.toString(), numEven, numOdd, islands };
  }

  if (typeof module !== 'undefined') module.exports = { analyze };
  else root.analyzeDomino = analyze;
})(globalThis);
