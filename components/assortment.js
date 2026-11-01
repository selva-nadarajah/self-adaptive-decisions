/* Whole-assortment sampling. LP solutions are prepared assets. */
(() => {
  'use strict';
  const data = window.ASSORTMENT_DATA;
  document.querySelectorAll('[data-assortment-widget="policy"]').forEach(root => {
    const weights = data.trace[0].weights[1];
    root.querySelector('[data-policy-draw]').addEventListener('click', () => {
      const draw = Math.random();
      let cumulative = 0;
      const chosen = weights.find(([, weight]) => { cumulative += weight; return draw < cumulative; }) || weights[weights.length - 1];
      const names = chosen[0].flatMap((yes, j) => yes ? [data.products[j].toLowerCase()] : []);
      root.querySelector('[data-policy-choice]').textContent = `Selected: ${names.join(' + ')}`;
    });
    root.querySelector('[data-policy-reset]').addEventListener('click', () => { root.querySelector('[data-policy-choice]').textContent = 'Ready to sample'; });
    root.dataset.ready = 'true';
  });
  document.querySelectorAll('[data-assortment-widget]').forEach(root => {
    root.addEventListener('keydown', event => {
      if (event.target.closest('button') && [' ', 'Enter'].includes(event.key)) event.stopPropagation();
    });
  });
  // Retain slide 6's separate bracket reveals with the same native math as slide 13.
  const equation = document.querySelector('.bellman-equation-native math');
  if (equation) {
    let index = 1;
    equation.querySelectorAll('munder').forEach(under => {
      const brace = under.firstElementChild?.lastElementChild;
      const label = under.lastElementChild;
      if (under.firstElementChild?.tagName === 'munder' && brace?.textContent === '⏟' && label?.tagName === 'mtext') {
        under.classList.add(['bellman-value', 'bellman-choice', 'bellman-now', 'bellman-future'][index - 1]);
        brace.classList.add('fragment', 'bellman-annotation');
        label.classList.add('fragment', 'bellman-native-label');
        brace.setAttribute('data-fragment-index', String(index));
        label.setAttribute('data-fragment-index', String(index++));
      }
    });
    // Reveal may have normalized the connection's index before these math fragments existed.
    document.querySelector('.bellman-connection')?.setAttribute('data-fragment-index', String(index));
    if (window.Reveal?.isReady()) window.Reveal.sync();
    else window.Reveal?.on('ready', () => window.Reveal.sync());
  }
  window.ASSORTMENT_READY = true;
})();
