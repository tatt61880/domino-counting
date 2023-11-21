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

    getSavedataString() {
      return JSON.stringify(this.data);
    }

    getCollectionNum() {
      return Object.keys(this.data.counts).length;
    }

    getCollectionState(count) {
      return this.data.counts[count];
    }

    saveCollectionState(count, states) {
      if (app.common.maxW !== app.common.defaultW) return;
      if (app.common.maxH !== app.common.defaultH) return;

      elems.notice.innerHTML = '<br>';
      const prev = this.data.counts[count];
      const current = this.#statesToArray(states);
      if (prev === undefined || comp(prev, current) > 0) {
        if (count === 0) {
          elems.notice.innerHTML = '<br>';
        } else if (prev === undefined) {
          elems.notice.innerHTML = 'New!<br>';
        } else {
          elems.notice.innerHTML = 'Update!<br>';
        }
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

  window.app = window.app || {};
  const savedata = new Savedata();
  window.app.savedata = savedata;
})();
