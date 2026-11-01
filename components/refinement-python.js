/* Rewards and Python are editable; the plot and additions come from real LP solves. */
(() => {
  'use strict';
  const root = document.querySelector('[data-refinement-python]');
  if (!root) return;
  const workerURL = new URL('refinement-python-worker.js', document.currentScript.src);
  const editor = root.querySelector('textarea');
  const original = editor.value;
  const status = root.querySelector('[data-refinement-status]');
  const run = root.querySelector('[data-refinement-run]');
  const stop = root.querySelector('[data-refinement-stop]');
  const history = root.querySelector('[data-refinement-history]');
  const plot = root.querySelector('[data-refinement-plot]');
  const value = root.querySelector('[data-refinement-value]');
  const current = root.querySelector('[data-refinement-step]');
  const certificate = root.querySelector('[data-refinement-certificate]');
  const probabilities = root.querySelector('[data-refinement-probabilities]');
  const finalWeights = root.querySelector('[data-refinement-final-weights]');
  let worker, timer, imageURL, runId = 0;

  function busy(enabled) {
    run.disabled = enabled;
    stop.disabled = !enabled;
    root.setAttribute('aria-busy', String(enabled));
  }
  function terminate(message) {
    runId++;
    worker?.terminate();
    worker = null;
    clearTimeout(timer);
    busy(false);
    status.textContent = message;
    root.dataset.state = 'stopped';
  }
  function clear() {
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = null;
    history.replaceChildren();
    plot.replaceChildren();
    value.textContent = current.textContent = certificate.textContent = '';
    probabilities.hidden = true;
    finalWeights.replaceChildren();
  }
  function cell(row, text) {
    const td = document.createElement('td');
    td.textContent = text;
    row.append(td);
  }
  function iteration(step, svg) {
    const row = document.createElement('tr');
    cell(row, step.iteration);
    cell(row, step.added ? `P${step.added.period}: ${step.added.name}` : 'Empty assortments');
    cell(row, `$${step.objective.toFixed(2)}`);
    history.append(row);
    const historyWrap = history.closest('.refinement-history-wrap');
    historyWrap.scrollTop = historyWrap.scrollHeight;
    value.textContent = `$${step.objective.toFixed(2)}`;
    current.textContent = step.added
      ? `Step ${step.iteration} · added ${step.added.name} in period ${step.added.period}.`
      : 'Step 0 · solve with only the empty assortment in each period.';
    if (svg) {
      const previousURL = imageURL;
      imageURL = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml'}));
      const image = document.createElement('img');
      image.src = imageURL;
      image.alt = `LP expected reward through iteration ${step.iteration}: $${step.objective.toFixed(2)}.`;
      image.onload = () => {if (previousURL) URL.revokeObjectURL(previousURL);};
      plot.replaceChildren(image);
    }
    status.textContent = `Iteration ${step.iteration} · LP solved. Checking omitted assortments…`;
    root.dataset.iteration = String(step.iteration);
  }

  run.addEventListener('click', () => {
    clear();
    busy(true);
    root.dataset.state = 'running';
    delete root.dataset.iteration;
    const id = ++runId;
    status.textContent = worker ? 'Solving and pricing assortments…' : 'Starting Python · first run loads the solver…';
    if (!worker) {
      worker = new Worker(workerURL);
      worker.onmessage = ({data}) => {
        if (data.id !== runId) return;
        if (data.type === 'status') {status.textContent = data.text; return;}
        if (data.type === 'stdout') return;
        if (data.type === 'iteration') {iteration(data.step, data.svg); return;}
        clearTimeout(timer);
        busy(false);
        if (data.type === 'error') {
          status.textContent = data.text.trim().split('\n').filter(Boolean).pop();
          root.dataset.state = 'error';
          return;
        }
        const result = data.value;
        root.dataset.state = result.converged ? 'converged' : 'limited';
        status.textContent = result.converged
          ? `Converged after ${result.iterations} additions.`
          : 'Iteration limit reached. Increase max_iterations to continue.';
        certificate.textContent = result.converged
          ? 'No positive reduced cost remains · full LP optimum reached.'
          : `Best remaining reduced cost: ${result.best_score.toFixed(3)}.`;
        if (result.converged) {
          const positive = result.weights[0].filter(row => row.probability > 1e-7);
          const format = new Intl.NumberFormat(undefined, {maximumFractionDigits: 1});
          positive.forEach(row => {
            const item = document.createElement('span');
            item.className = 'refinement-final-weight';
            item.dataset.action = row.action.join(',');
            item.append(`${row.name}: `);
            const percentage = document.createElement('strong');
            percentage.textContent = `${format.format(100 * row.probability)}%`;
            item.append(percentage);
            finalWeights.append(item);
          });
          const zero = document.createElement('span');
          zero.className = 'refinement-final-zero';
          zero.textContent = 'All other assortments: 0%';
          finalWeights.append(zero);
          probabilities.hidden = false;
        }
      };
      worker.onerror = event => {
        event.preventDefault();
        terminate('Python could not start. Run again to retry.');
      };
    }
    worker.postMessage({id, code: editor.value, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches});
    timer = setTimeout(() => terminate('Stopped after 90 seconds. Run again to retry.'), 90000);
  });
  stop.addEventListener('click', () => terminate('Stopped. Edit rewards and run again.'));
  root.querySelector('[data-refinement-reset]').addEventListener('click', () => {
    terminate('Ready · edit rewards and run.');
    editor.value = original;
    clear();
    const message = document.createElement('p');
    message.textContent = 'Run refinement to see the LP objective and the assortments added at each step.';
    plot.append(message);
    const row = document.createElement('tr');
    cell(row, 'Starts with the empty assortment in each period.');
    row.firstChild.colSpan = 3;
    history.append(row);
    root.dataset.state = 'ready';
    delete root.dataset.iteration;
  });
  editor.addEventListener('input', () => {
    if (!run.disabled) status.textContent = 'Code changed · run to update the results.';
  });
  editor.addEventListener('keydown', event => {
    if (event.key === 'Escape') editor.blur();
    event.stopPropagation();
  });
  root.querySelectorAll('button').forEach(button => button.addEventListener('keydown', event => {
    if ([' ', 'Enter'].includes(event.key)) event.stopPropagation();
  }));
  root.dataset.ready = 'true';
})();
