(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;
  if (window.app?.savedata) return;

  const app = window.app;
  const elems = app.elems;

  const LOCAL_STORAGE_KEY = 'tatt61880-domino-counting';

  const stateOff = 0;

  class Savedata {
    constructor() {
      this.data = null;
      this.#load();
    }

    #load() {
      this.data = { counts: {} };
      try {
        const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
        if (parsed && parsed.counts && typeof parsed.counts === 'object' && !Array.isArray(parsed.counts)) {
          this.data = parsed;
          for (const [count, rows] of Object.entries(this.data.counts)) {
            if (!/^\d+$/.test(count) || !Array.isArray(rows) || rows.length < 1 || rows.length > 6 ||
                !rows.every((row) => Number.isInteger(row) && row >= 0 && row < 128)) delete this.data.counts[count];
          }
        }
      } catch {
        // Keep the application usable when storage is unavailable or damaged.
      }
    }

    #save() {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.data));
      } catch {
        elems.notice.textContent = '保存できませんでした。この画面を閉じると今回の記録は失われます';
      }
    }

    #statesToArray(states) {
      const res = [];
      let index = 0;
      let indexMax = 0;
      for (const state of states) {
        for (const s of state) {
          if (s !== stateOff) {
            indexMax = index;
            break;
          }
        }
        index++;
      }
      for (let i = 0; i <= indexMax; i++) {
        let val = 0;
        let v = 1;
        for (const s of states[i]) {
          if (s !== stateOff) {
            val += v;
          }
          v *= 2;
        }
        res.push(val);
      }

      return res;
    }

    getSavedataString() {
      return JSON.stringify(this.data);
    }

    getCollectionNum(order = 'original') {
      return Object.keys(order === 'compact' ? this.data.compactCounts || this.data.counts : this.data.counts).length;
    }

    getCollectionState(count, order = 'original') {
      return (order === 'compact' ? this.data.compactCounts || this.data.counts : this.data.counts)[count];
    }

    saveCollectionState(count, states) {
      if (app.common.maxX !== app.common.defaultMaxX) return;
      if (app.common.maxY !== app.common.defaultMaxY) return;

      elems.notice.innerHTML = '<br>';
      const prev = this.data.counts[count];
      const current = this.#statesToArray(states);
      // The original collection always keeps the original comparison rule.
      // Seed the independent compact collection without changing existing records.
      if (!this.data.compactCounts || typeof this.data.compactCounts !== 'object' || Array.isArray(this.data.compactCounts)) {
        this.data.compactCounts = Object.fromEntries(
          Object.entries(this.data.counts).map(([key, rows]) => [key, rows.slice()])
        );
      }
      let changed = false;
      if (prev === undefined || compareBits(prev, current) > 0) {
        if (String(count) !== '0') elems.notice.innerHTML = prev === undefined ? 'New!<br>' : 'Update!<br>';
        this.data.counts[count] = current.slice();
        changed = true;
      }
      const compactPrev = this.data.compactCounts[count];
      if (compactPrev === undefined || comp(compactPrev, current) > 0) {
        this.data.compactCounts[count] = current.slice();
        changed = true;
      }
      if (changed) this.#save();

      function comp(a, b) {
        function score(rows) {
          let cells = 0;
          let minX = 7;
          let maxX = -1;
          let minY = 6;
          let maxY = -1;
          rows.forEach((row, y) => {
            for (let x = 0; x < 7; x++) {
              if (!(row & (1 << x))) continue;
              cells++;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          });
          return [cells, cells ? (maxX - minX + 1) * (maxY - minY + 1) : 0];
        }
        const sa = score(a);
        const sb = score(b);
        for (let i = 0; i < sa.length; i++) {
          if (sa[i] !== sb[i]) return sa[i] - sb[i];
        }
        return compareBits(a, b);
      }

      function compareBits(a, b) {
        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;

        for (let i = a.length - 1; i >= 0; i--) {
          if (a[i] < b[i]) return -1;
          if (a[i] > b[i]) return 1;
        }
        return 0;
      }
    }
  }

  window.app = window.app || {};
  const savedata = new Savedata();
  window.app.savedata = savedata;
})();
