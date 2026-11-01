/* Keep the timeline line in sync with ordinary slide-fragment navigation. */
(() => {
  const root = document.querySelector('[data-assortment-periods]');
  if (!root) return;
  const reading = !document.querySelector('.reveal');
  const events = [...root.querySelectorAll('[data-period-stage]')];

  function update() {
    const visible = events.filter(event => reading || event.classList.contains('visible'));
    const phase = events.indexOf(visible[visible.length - 1]);
    root.dataset.phase = String(phase);
    root.style.setProperty('--flow-progress', Math.max(0, phase));
    events.forEach((event, index) => {
      event.dataset.revealed = String(index <= phase);
      event.setAttribute('aria-hidden', String(index > phase));
      if (index === phase) event.setAttribute('aria-current', 'step');
      else event.removeAttribute('aria-current');
    });
  }

  function bind() {
    ['slidechanged', 'fragmentshown', 'fragmenthidden'].forEach(event => Reveal.on(event, update));
    update();
  }
  root.dataset.ready = 'true';
  if (!reading && window.Reveal) {
    if (Reveal.isReady()) bind();
    else Reveal.on('ready', bind);
  }
  update();
})();
