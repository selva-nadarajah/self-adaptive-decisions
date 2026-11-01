/* Choice state is shared by every stage and survives a page refresh. */
(function (root) {
  'use strict';
  class AudienceChoiceSession {
    constructor(data, saved) {
      this.data = data;
      this.reset();
      if (saved?.version === data.version) {
        try {
          if (saved.started) {
            this.start(saved.initial);
            for (const entry of saved.additions || []) this.add(entry.period, entry.action);
            this.stage = saved.stage === 'result' && this.history.length ? 'result' : 'refine';
          }
          if (saved.period === 0 || saved.period === 1) this.period = saved.period;
        } catch (_) { this.reset(); }
      }
    }
    reset() {
      this.stage = 'choose';
      this.initial = null;
      this.masks = [0, 0];
      this.period = 0;
      this.history = [];
    }
    ids(period) {
      return [0, 1, 2, 3, 4].filter(a => a === 0 || this.masks[period] & (1 << (a - 1)));
    }
    key() { return this.masks.join('-'); }
    current() { return this.data.states[this.key()]; }
    start(action) {
      if (!Number.isInteger(action) || action < 0 || action > 4) throw new Error('Choose a feasible assortment.');
      this.reset();
      this.initial = action;
      this.masks = action ? [1 << (action - 1), 1 << (action - 1)] : [0, 0];
      this.stage = 'refine';
    }
    candidates(period = this.period) {
      return [1, 2, 3, 4].filter(a => !this.ids(period).includes(a));
    }
    best() {
      const candidates = [0, 1].flatMap(period => this.candidates(period).map(action => ({
        period, action, score: this.current().pricing[period].scores[action]
      })));
      return candidates.sort((a, b) => b.score - a.score || a.period - b.period || a.action - b.action)[0] || null;
    }
    add(period, action) {
      if (![0, 1].includes(period) || !this.candidates(period).includes(action)) throw new Error('Choose an omitted feasible assortment.');
      const before = this.key();
      const score = this.current().pricing[period].scores[action];
      this.masks[period] |= 1 << (action - 1);
      this.history.push({ period, action, before, after: this.key(), score });
      this.stage = 'result';
    }
    serialize() {
      return { version: this.data.version, started: this.initial !== null, initial: this.initial,
        additions: this.history.map(({period, action}) => ({period, action})), stage: this.stage, period: this.period };
    }
  }
  root.AudienceChoiceSession = AudienceChoiceSession;
  if (typeof module !== 'undefined') module.exports = AudienceChoiceSession;
})(typeof window !== 'undefined' ? window : globalThis);
