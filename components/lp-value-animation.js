/* A schematic family V_delta = V* - delta, feasible for discounted cost MDPs. */
(() => {
  const root = document.querySelector('#s25');
  const stage = root?.querySelector('.lp-model-stage');
  if (!stage) return;
  const svg = stage.querySelector('.lp-value-chart svg');
  const target = x => 158 - .00125 * (x - 315) ** 2 + .03 * (x - 315);
  const curve = offset => Array.from({length:109}, (_,i) => {
    const x = 50 + i * 5;
    return `${i ? 'L' : 'M'}${x},${(target(x) + offset).toFixed(2)}`;
  }).join(' ');
  svg.querySelector('[data-value-optimum]').setAttribute('d', curve(0));
  svg.querySelector('[data-value-shade]').setAttribute('d', `${curve(0)} L590,230 L50,230 Z`);
  [24,48,72].forEach(offset => {
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', curve(offset));
    svg.querySelector('[data-value-guides]').append(path);
  });
  let frame, view;
  const progress = stage.querySelector('[data-value-progress]');
  function draw(fraction) {
    const offset = 72 * (1 - fraction);
    svg.querySelectorAll('[data-value-guides] path').forEach((path, i) => {
      path.setAttribute('d', curve([24,48,72][i] * (1 - fraction)));
    });
    svg.querySelector('[data-value-moving]').setAttribute('d', curve(offset));
    const arrow = svg.querySelector('[data-value-push]'), x = 425, y = target(x);
    arrow.setAttribute('d', `M${x},${y+offset-4} V${y+5}`);
    arrow.style.opacity = offset > 14 ? '1' : '0';
    if (progress) progress.textContent = fraction >= 1 ? 'δ = 0: the illustrated function reaches V*.' : 'δ decreases: the feasible function and its objective rise.';
  }
  function animate() {
    cancelAnimationFrame(frame);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {draw(1); return;}
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / 4800);
      draw(t*t*(3-2*t));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    draw(0); frame = requestAnimationFrame(tick);
  }
  function update() {
    const next = stage.querySelector('.lp-plot-step.visible') ? 'plot' : 'equation';
    const active = root.classList.contains('present');
    stage.dataset.view = next;
    if (next === 'plot' && active && view !== 'plot') animate();
    if (next !== 'plot' || !active) cancelAnimationFrame(frame);
    view = active ? next : null;
  }
  stage.querySelector('.lp-value-replay').addEventListener('click', animate);
  draw(1);
  if (!document.querySelector('.reveal')) return;
  if (window.Reveal) {
    ['ready','fragmentshown','fragmenthidden','slidechanged'].forEach(event => Reveal.on(event, update));
    update();
  }
})();
