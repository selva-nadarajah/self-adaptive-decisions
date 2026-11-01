/* Compare selected assortment collections with the LP containing every action. */
(() => {
  'use strict';
  const data = window.AUDIENCE_CHOICE_DATA;
  const storageKey = 'informs-audience-choice-v1';
  const el = id => document.getElementById(id);
  const fullMask = (1 << (data.actions.length - 1)) - 1;
  const reference = data.states[`${fullMask}-${fullMask}`];
  const shortNames = ['∅', '1 only', '2 only', '3 only', '1 + 3'];
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch (_) { /* Storage can be unavailable. */ }
  let previousRun = new window.AudienceChoiceSession(data, saved);
  if (previousRun.initial === null) previousRun = null;
  let session = new window.AudienceChoiceSession(data);
  let selectedAddition = null;
  let showPricing = false;
  const number = value => Math.abs(value) < 1e-7 ? '0' : Number(value.toFixed(2)).toLocaleString('en-US');
  const name = action => data.names[action];
  const matched = () => Math.abs(session.current().objective - reference.objective) < 1e-7;
  const smaller = () => session.ids(0).length + session.ids(1).length < 2 * data.actions.length;

  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(session.serialize())); } catch (_) { /* The in-memory run still works. */ }
  }
  function announce(message) { el('announcement').textContent = message; }
  function symbols(action) {
    const products = data.actions[action].flatMap((yes, j) => yes ? [j + 1] : []);
    return '<span class="product-symbols" aria-hidden="true">' + (products.length ? products.map(j => `<i>${j}</i>`).join('') : '<i class="empty">∅</i>') + '</span>';
  }
  function resourceUse(action) {
    return data.resources.map(row => row.reduce((sum, coefficient, j) => sum + coefficient * data.actions[action][j], 0));
  }
  function card(action) {
    const button = document.createElement('button');
    button.className = 'action-card';
    button.type = 'button';
    button.setAttribute('aria-pressed', String(action === selectedAddition));
    const [space, inventory] = resourceUse(action);
    button.innerHTML = `${symbols(action)}<strong>${name(action)}</strong><span class="resources">Space ${space} · Inventory ${inventory}</span>`
      + (showPricing ? `<span class="score">Pricing score: ${number(session.current().pricing[session.period].scores[action])}</span>` : '');
    button.addEventListener('click', () => {
      selectedAddition = action;
      renderRefine();
      announce(`${name(action)} selected as another option for period ${session.period}.`);
    });
    return button;
  }
  function renderQuality() {
    el('support-counts').innerHTML = [0, 1].map(period => {
      const ids = session.ids(period);
      const tokens = data.actions.map((_, action) => `<span class="assortment-token${ids.includes(action) ? ' represented' : ''}" title="${name(action)}" aria-label="${name(action)}: ${ids.includes(action) ? 'represented' : 'not represented'}">${shortNames[action]}</span>`).join('');
      return `<div class="support-row"><div class="support-label"><span>Period ${period}</span><strong>${ids.length} of ${data.actions.length}</strong></div><div class="assortment-tokens">${tokens}</div></div>`;
    }).join('');
    const current = session.current().objective;
    el('current-objective').textContent = number(current);
    el('reference-objective').textContent = number(reference.objective);
    el('quality-progress').setAttribute('aria-valuemax', reference.objective);
    el('quality-progress').setAttribute('aria-valuenow', current);
    el('quality-bar').style.width = `${Math.max(0, Math.min(100, 100 * current / reference.objective))}%`;
    el('quality-gap').textContent = matched() ? 'Full LP objective matched.' : `${number(reference.objective - current)} below the full LP objective.`;
  }
  function pricingMessage() {
    const best = session.best();
    if (!best) return 'Every feasible assortment is already represented in both periods.';
    if (best.score <= 1e-7) return 'Pricing finds no improvement in either period. More assortments cannot improve this LP objective.';
    return `The LP suggests ${name(best.action)} in period ${best.period}. Pricing score: ${number(best.score)}. Test it or compare another choice.`;
  }
  function renderChoose() {
    el('all-assortments').innerHTML = data.actions.map((_, action) => `<div class="reference-assortment${action === 0 ? ' included' : ''}">${symbols(action)}<strong>${name(action)}</strong>${action === 0 ? '<span>Initially represented</span>' : ''}</div>`).join('');
  }
  function renderRefine() {
    document.querySelectorAll('[data-period]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.period) === session.period)));
    const candidates = session.candidates();
    el('addition-options').replaceChildren(...candidates.map(card));
    if (!candidates.length) {
      const note = document.createElement('p');
      note.textContent = `All five assortments are represented in period ${session.period}. Check the other period.`;
      el('addition-options').append(note);
    }
    el('pricing').setAttribute('aria-pressed', String(showPricing));
    el('pricing').textContent = showPricing ? 'Hide the pricing scores' : 'Show what the LP suggests';
    el('pricing-message').hidden = !showPricing;
    el('pricing-message').textContent = pricingMessage();
    el('add').disabled = selectedAddition === null;
    el('add').textContent = selectedAddition === null ? 'Choose an assortment to test →' : `Test ${name(selectedAddition)} as another option for period ${session.period} →`;
  }
  function counts(key) {
    return key.split('-').map(mask => 1 + [...Array(data.actions.length - 1)].filter((_, i) => Number(mask) & (1 << i)).length);
  }
  function renderResult() {
    const last = session.history.at(-1);
    const before = data.states[last.before];
    const after = session.current();
    const gain = after.objective - before.objective;
    el('addition-description').textContent = `We included ${name(last.action)} as another assortment option in period ${last.period}.`;
    let insight;
    if (matched() && smaller()) {
      insight = `${Math.abs(gain) < 1e-7 ? 'This addition did not improve the LP objective. ' : ''}We match ${number(reference.objective)} with ${session.ids(0).length} of ${data.actions.length} assortments in period 0 and ${session.ids(1).length} of ${data.actions.length} in period 1.`;
    } else if (matched()) {
      insight = 'The full LP objective is matched. This run includes every assortment; pricing can help us find a smaller collection.';
    } else if (Math.abs(gain) < 1e-7) {
      insight = 'One more assortment, the same LP objective. This addition did not improve the objective this round.';
    } else {
      insight = `This addition raised the LP objective from ${number(before.objective)} to ${number(after.objective)}. We still need ${number(reference.objective - after.objective)} to match the full LP.`;
    }
    el('result-insight').textContent = insight;
    const startMask = session.initial ? 1 << (session.initial - 1) : 0;
    const rows = [{label: 'Starting collection', key: `${startMask}-${startMask}`}, ...session.history.map((entry, i) => ({label: `After addition ${i + 1}`, key: entry.after}))];
    el('progression-rows').innerHTML = rows.map(row => {
      const [n0, n1] = counts(row.key);
      return `<tr><th scope="row">${row.label}</th><td>${n0}</td><td>${n1}</td><td>${number(data.states[row.key].objective)}</td></tr>`;
    }).join('') + `<tr class="reference-row"><th scope="row">All feasible assortments</th><td>${data.actions.length}</td><td>${data.actions.length}</td><td>${number(reference.objective)}</td></tr>`;
    el('policy-evaluation').textContent = `Evaluated policy profit: ${number(after.policy)}. Matching the LP objective does not by itself establish an optimal MDP policy.`;
    el('weights').innerHTML = after.weights.map((weights, period) => `<div class="weight-period"><b>Period ${period}</b>` + weights.flatMap((weight, action) => weight > 1e-7 ? [`<div class="weight-row"><span>${name(action)}</span><span>${number(100 * weight)}%</span></div>`] : []).join('') + '</div>').join('');
    el('continue').textContent = matched() ? 'Would another assortment help? →' : 'Predict another useful addition →';
    el('continue').disabled = !session.candidates(0).length && !session.candidates(1).length;
  }
  function render() {
    ['choose', 'refine', 'result'].forEach(stage => {
      el(stage + '-view').hidden = session.stage !== stage;
      document.querySelector(`[data-stage-label="${stage}"]`).classList.toggle('active', session.stage === stage);
    });
    el('reset').hidden = session.stage === 'choose';
    el('resume').hidden = session.stage !== 'choose' || previousRun === null;
    let title = 'Do we need every feasible assortment?';
    let intro = 'Can a small collection match the LP containing all five feasible assortments per period?';
    if (session.stage === 'refine') {
      title = matched() ? 'Would more assortments improve the LP?' : 'Which omitted assortment could help?';
      intro = 'Predict an addition, then compare with the LP suggestion. Each addition is a separate assortment option.';
    } else if (session.stage === 'result') {
      title = matched() && smaller() ? 'Same LP objective, fewer assortments' : 'Did this addition help?';
      intro = 'Compare the collection size and the achieved LP objective.';
    }
    el('demo-title').textContent = title;
    el('demo-intro').textContent = intro;
    renderQuality();
    if (session.stage === 'choose') renderChoose();
    if (session.stage === 'refine') renderRefine();
    if (session.stage === 'result') renderResult();
  }
  el('start').addEventListener('click', () => {
    session.start(0); previousRun = null; selectedAddition = null; showPricing = false;
    save(); render(); announce('Start with only the empty assortment in each period. Predict a useful addition.');
  });
  el('resume').addEventListener('click', () => {
    if (!previousRun) return;
    session = previousRun; previousRun = null; selectedAddition = null; showPricing = false;
    save(); render(); announce('Previous audience run restored.');
  });
  document.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
    session.period = Number(button.dataset.period); selectedAddition = null;
    save(); renderRefine();
  }));
  el('pricing').addEventListener('click', () => { showPricing = !showPricing; renderRefine(); });
  el('add').addEventListener('click', () => {
    session.add(session.period, selectedAddition); selectedAddition = null; showPricing = false;
    save(); render(); announce(el('result-insight').textContent);
  });
  el('continue').addEventListener('click', () => {
    session.stage = 'refine'; selectedAddition = null; showPricing = false;
    if (!session.candidates(session.period).length) session.period = 1 - session.period;
    save(); render();
  });
  el('reset').addEventListener('click', () => {
    session.reset(); selectedAddition = null; showPricing = false; previousRun = null;
    save(); render(); announce('Start with a small collection.');
  });
  render();
})();
