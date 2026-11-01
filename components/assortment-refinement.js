/* Re-solving adds a whole assortment; the tween is a visual interpolation. */
(() => {
  'use strict';
  const root = document.querySelector('[data-assortment-refinement]');
  if (!root || !window.ASSORTMENT_DATA) return;
  const slide = root.closest('section');
  const reading = !document.querySelector('.reveal');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const [initial, refined] = window.ASSORTMENT_DATA.trace;
  const key = action => action.join(',');
  const before = new Map(initial.weights[1].map(([action, weight]) => [key(action), weight]));
  const after = new Map(refined.weights[1].map(([action, weight]) => [key(action), weight]));
  const considered = new Set(initial.support[1].map(key));
  const expanded = new Set(refined.support[1].map(key));
  const rows = [...root.querySelectorAll('[data-refine-action]')];
  const omission = root.querySelector('.refinement-omission');
  const addition = root.querySelector('.refinement-addition');
  let progress = reading ? 1 : 0;
  let target = reading ? 1 : 0;
  let frame;

  function draw() {
    root.dataset.phase = target ? (progress >= 1 ? 'refined' : 'updating')
      : omission.classList.contains('visible') ? 'omitted' : 'initial';
    // Allocate rounding residuals so the displayed probabilities always total 100%.
    const raw = rows.map(row => {
      const action = row.dataset.refineAction;
      return 100 * ((before.get(action) || 0) * (1 - progress) + (after.get(action) || 0) * progress);
    });
    const weights = raw.map(Math.floor);
    const order = raw.map((value, i) => ({i, fraction: value - weights[i]}))
      .sort((a, b) => b.fraction - a.fraction);
    const residual = 100 - weights.reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < residual; i++) weights[order[i % order.length].i]++;
    rows.forEach((row, i) => {
      const action = row.dataset.refineAction;
      const added = Boolean(target && expanded.has(action) && !considered.has(action));
      const included = considered.has(action) || added;
      row.dataset.omitted = String(!included);
      row.dataset.added = String(added);
      row.querySelector('[data-refine-weight]').textContent = `${weights[i]}%`;
      row.querySelector('[data-refine-status]').textContent = added ? 'Added' : included ? 'Considered' : 'Not considered';
    });
    const value = initial.objective + (refined.objective - initial.objective) * progress;
    root.querySelector('[data-refine-objective]').textContent = `$${value.toFixed(2)}`;
    root.querySelector('[data-refine-gain]').textContent = `+$${(refined.objective - initial.objective).toFixed(2)} in expected profit`;
    root.dataset.progress = progress.toFixed(3);
  }

  function active() {
    return !document.hidden && (reading || (Reveal.getCurrentSlide() === slide &&
      !Reveal.isOverview() && !Reveal.isPaused()));
  }

  function sync() {
    cancelAnimationFrame(frame);
    target = reading || addition.classList.contains('visible') ? 1 : 0;
    if (!target) progress = 0;
    else if (reading || reduced.matches) progress = 1;
    draw();
    if (!target || progress >= 1 || !active()) return;
    const start = performance.now();
    const from = progress;
    const duration = 1700 * (1 - from);
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      progress = from + (1 - from) * (t * t * (3 - 2 * t));
      draw();
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }

  root.dataset.ready = 'true';
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  if (!reading && window.Reveal) {
    const bind = () => {
      ['fragmentshown', 'fragmenthidden', 'slidechanged', 'paused', 'resumed', 'overviewshown', 'overviewhidden']
        .forEach(event => Reveal.on(event, sync));
      sync();
    };
    if (Reveal.isReady()) bind();
    else Reveal.on('ready', bind);
  } else sync();
})();
