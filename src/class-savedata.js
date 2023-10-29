(function () {
  'use strict';
  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return;
  if (window.app?.savedata) return;

  const LOCAL_STORAGE_KEY = 'tatt61880-domino-counting';

  const stateOff = 0;

  class Savedata {
    constructor() {
      this.data = null;
      this.#load();
    }

    #load() {
      this.data = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
      if (this.data?.counts === undefined) {
        this.data = {};
        this.data.counts = {};
      }
    }

    #save() {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.data));
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

    getCount(count) {
      return this.data.counts[count];
    }

    saveCount(count, states) {
      const prev = this.data.counts[count];
      const current = this.#statesToArray(states);
      if (prev === undefined || comp(prev, current) > 0) {
        this.data.counts[count] = current;
        this.#save();
      }

      function comp(a, b) {
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

  if (isBrowser) {
    window.app = window.app || {};
    const savedata = new Savedata();
    window.app.savedata = savedata;
  }
})();
