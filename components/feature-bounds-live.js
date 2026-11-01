(() => {
  const root = document.querySelector('[data-demo-id="feature-bounds"]');
  if (!root) return;
  const editor = root.querySelector('[data-demo-editor]');
  const run = root.querySelector('[data-demo-run]');
  const previous = root.querySelector('[data-bounds-previous]');
  const next = root.querySelector('[data-bounds-next]');
  const label = root.querySelector('[data-bounds-count]');
  let current = 0;
  function update() {
    const busy = run.disabled;
    previous.disabled = busy || current === 0;
    next.disabled = busy || current === 6;
    label.textContent = 'N = ' + current;
    root.dataset.navigationPending = String(current < 6);
  }
  function compute(n) {
    editor.value = editor.value.replace(/^num_features\s*=.*$/m, 'num_features = ' + n);
    run.click();
    update();
  }
  root.addEventListener('demo-next-request', event => {
    if (current < 6) { event.preventDefault(); compute(current + 1); }
  });
  previous.addEventListener('click', () => { if (current > 0) compute(current - 1); });
  next.addEventListener('click', () => { if (current < 6) compute(current + 1); });
  root.addEventListener('demo-images-ready', () => {
    current = Math.max(0, Math.min(6, Number(editor.value.match(/^num_features\s*=\s*(\d+)/m)?.[1] ?? current)));
    update();
  });
  new MutationObserver(update).observe(run, {attributes: true, attributeFilter: ['disabled']});
  update();
})();
