/* Illustrative feasible decisions in two weakly coupled applications. */
(() => {
  const root = document.querySelector('[data-discrete-applications]');
  if (!root) return;
  const maintenance = root.querySelector('[data-maintenance-illustration]');
  maintenance.innerHTML = `<svg viewBox="0 0 520 190" role="img" aria-label="Three cell towers have one coverage conflict between towers 1 and 2. Tower 3 has no conflict with either. Cell towers 1 and 3 update together.">
    <path d="M120 80H230" stroke="#b26a5a" stroke-width="2" fill="none"/>
    <g font-family="Avenir Next,Segoe UI,sans-serif" text-anchor="middle" fill="#182c3e">
      ${[90,260,430].map((x,i) => `<g class="cell-tower" data-maintenance-asset="${i}" data-service="${i!==1}">
        <g transform="translate(${x},42) scale(.82)" class="tower-symbol">
          <path class="tower-structure" d="M0 3V20M-6 20L-20 75H20L6 20ZM-10 35H10M-15 55H15M-10 35L15 55M10 35L-15 55M-15 55L20 75M15 55L-20 75"/>
          <circle r="6" fill="currentColor"/>
          <g class="tower-radio"><path d="M-18-18A26 26 0 0 0-18 18M18-18A26 26 0 0 1 18 18"/></g>
        </g>
        <text class="tower-id" x="${x}" y="137" font-size="24">${i+1}</text>
      </g>`).join('')}
      <text data-maintenance-caption x="260" y="181" font-size="23" fill="#49636f">Updating cell towers 1 and 3</text>
    </g>
  </svg>`;
  const assets = [...maintenance.querySelectorAll('[data-maintenance-asset]')];
  const maintenanceCaption = maintenance.querySelector('[data-maintenance-caption]');
  const products = [...root.querySelectorAll('[data-overview-product]')];
  const selections = [[1,1,0],[0,0,1],[1,0,1]];
  const updates = [[1,0,1],[0,1,0]];
  const spaces = [2,3,6];
  const budget = root.querySelector('[data-overview-budget]');
  const fill = root.querySelector('[data-overview-space]');
  const assortment = root.querySelector('[data-assortment-illustration]');
  const names = ['backpack','cooler','tent'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const reading = !document.querySelector('.reveal');
  let frame = null, started = 0, phase = -1;

  function show(next) {
    if (next === phase) return;
    phase = next;
    const update = updates[phase%updates.length];
    assets.forEach((asset,i) => {
      const servicing = Boolean(update[i]);
      asset.dataset.service = String(servicing);
    });
    const updatingTowers = update.flatMap((on,i) => on ? [i+1] : []);
    maintenanceCaption.textContent = `Updating cell tower${updatingTowers.length>1?'s':''} ${updatingTowers.join(' and ')}`;
    maintenance.querySelector('svg').setAttribute('aria-label',
      `Software updates at cell towers ${updatingTowers.join(' and ')}. The only coverage conflict is between towers 1 and 2. Tower 3 is independent. No adjacent towers update together. Other towers stay online.`);
    const selection = selections[phase%selections.length];
    const used = selection.reduce((sum,on,i) => sum+on*spaces[i], 0);
    products.forEach((product,i) => {product.dataset.featured = String(Boolean(selection[i]));});
    budget.textContent = `${used} of 8 space units used`;
    fill.style.width = `${100*used/8}%`;
    const selectedNames = names.filter((_,i) => selection[i]).join(' and ');
    assortment.setAttribute('aria-label', `Display ${selectedNames}, using ${used} of 8 space units. Faded products are not displayed.`);
  }

  function stop() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    root.dataset.running = 'false';
  }
  function animate(now) {
    show(Math.floor(Math.max(0,now-started)/4200)%(selections.length*updates.length));
    frame = requestAnimationFrame(animate);
  }
  function update() {
    const active = !document.hidden && !reading && !reduced.matches &&
      root.closest('section').classList.contains('present');
    if (!active) {
      stop();
      show(0);
    } else if (frame === null) {
      started = performance.now();
      show(0);
      root.dataset.running = 'true';
      frame = requestAnimationFrame(animate);
    }
  }
  show(0);
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);
  if (window.Reveal) ['ready','slidechanged'].forEach(event => Reveal.on(event, update));
  update();
})();
