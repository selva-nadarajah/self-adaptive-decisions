/* The roulette previews subsets; only its final result is a weighted draw. */
(() => {
  const root = document.querySelector('[data-mu-sampling]');
  if (!root) return;
  const slide = root.closest('section');
  const trigger = root.querySelector('.mu-sim-trigger');
  const button = root.querySelector('[data-mu-roulette]');
  const reading = !document.querySelector('.reveal');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const products = window.ASSORTMENT_DATA.products;
  const pictures = ['backpack', 'cooler', 'tent'];
  const options = [...root.querySelectorAll('[data-mu-action]')].map(row => {
    const action = row.dataset.muAction.split(',').map(Number);
    return {row, action, key: action.join(','), probability: Number(row.dataset.muProbability),
      name: action.flatMap((selected, j) => selected ? [products[j]] : []).join(' + ') || 'Nothing'};
  });
  let state = reading ? 'selected' : 'idle';
  let winner = reading ? options.find(option => option.key === '1,1,0') : null;
  let preview = winner, order = [], frame = 0, lastFrame = 0, timer;

  function active() {
    return !document.hidden && (reading || (Reveal.getCurrentSlide() === slide &&
      trigger.classList.contains('visible') && !Reveal.isOverview() && !Reveal.isPaused()));
  }

  function text(selector, value) {
    const element = root.querySelector(selector);
    if (element.textContent !== value) element.textContent = value;
  }

  function render() {
    root.dataset.state = state;
    root.dataset.running = String(state === 'spinning' && active());
    root.dataset.tick = String(frame);
    root.dataset.preview = preview?.key || '';
    if (state === 'selected') root.dataset.result = winner.key;
    else delete root.dataset.result;
    options.forEach(option => {
      option.row.dataset.preview = String(state === 'spinning' && option === preview);
      option.row.dataset.picked = String(state === 'selected' && option === winner);
      option.row.querySelector('[data-mu-weight]').textContent = `${Math.round(option.probability * 100)}%`;
    });
    const images = root.querySelector('[data-mu-images]');
    const key = preview?.key || 'pending';
    if (images.dataset.action !== key) {
      images.replaceChildren();
      if (preview?.action.some(Boolean)) {
        preview.action.forEach((selected, j) => {
          if (!selected) return;
          const img = document.createElement('img');
          img.src = `assets/products/${pictures[j]}.svg`;
          img.alt = products[j];
          images.append(img);
        });
      } else if (preview) {
        const symbol = document.createElement('span');
        symbol.textContent = '∅';
        images.append(symbol);
      }
      images.dataset.action = key;
    }
    text('[data-mu-selection]', preview?.name || '');
    text('[data-mu-probability-label]', state === 'selected'
      ? `${Math.round(winner.probability * 100)}% probability` : state === 'spinning' ? 'Sampling…' : '');
    text('[data-mu-status]', state === 'selected' ? 'Selected' : '');
    button.setAttribute('aria-busy', String(state === 'spinning'));
    button.setAttribute('aria-label', state === 'selected'
      ? `Selected ${winner.name}. Draw another subset.` : 'Draw a subset using the displayed probabilities');
  }

  function tick() {
    clearTimeout(timer);
    if (state !== 'spinning' || !active()) { render(); return; }
    preview = order[frame % order.length];
    if (frame === lastFrame) {
      state = 'selected';
      preview = winner;
      render();
      return;
    }
    render();
    const delay = 55 + 230 * (frame / lastFrame) ** 2;
    frame++;
    timer = setTimeout(tick, delay);
  }

  function spin() {
    if (state === 'spinning') return;
    const draw = Math.random();
    let cumulative = 0;
    winner = options.find(option => { cumulative += option.probability; return draw < cumulative; }) || options[options.length - 1];
    order = [...options];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    frame = 0;
    lastFrame = 18 + order.indexOf(winner);
    state = reduced.matches ? 'selected' : 'spinning';
    if (reduced.matches) { preview = winner; render(); }
    else tick();
  }

  function sync() {
    clearTimeout(timer);
    if (!trigger.classList.contains('visible')) {
      state = 'idle';
      winner = preview = null;
      frame = 0;
      render();
    } else if (active() && state === 'idle') spin();
    else if (state === 'spinning') tick();
    else render();
  }

  button.addEventListener('click', () => {
    if (!reading && !trigger.classList.contains('visible')) Reveal.nextFragment();
    else spin();
  });
  button.addEventListener('keydown', event => {
    if ([' ', 'Enter'].includes(event.key)) event.stopPropagation();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches && state === 'spinning') {
      clearTimeout(timer);
      state = 'selected';
      preview = winner;
      render();
    }
  });
  function bind() {
    ['fragmentshown', 'fragmenthidden', 'slidechanged', 'overviewshown', 'overviewhidden', 'paused', 'resumed']
      .forEach(event => Reveal.on(event, sync));
    document.addEventListener('visibilitychange', sync);
    sync();
  }
  root.dataset.ready = 'true';
  if (!reading && window.Reveal) {
    if (Reveal.isReady()) bind();
    else Reveal.on('ready', bind);
  } else {
    document.addEventListener('visibilitychange', () => {
      if (state === 'spinning') tick();
    });
    render();
  }
})();
