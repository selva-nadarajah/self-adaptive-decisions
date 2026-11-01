/* One shared browser Python session preserves related demos' computed results. */
(() => {
  const workerURL = new URL('continuous-python-worker.js', document.currentScript.src);
  workerURL.searchParams.set('v', 'projection-svg');
  const labs = [...document.querySelectorAll('[data-continuous-python]')];
  if (!labs.length) return;
  let worker, active, timer;
  const states = labs.map((root, index) => ({root, id: root.dataset.demoId || `demo-${index}`,
    editor: root.querySelector('[data-demo-editor]'),
    run: root.querySelector('[data-demo-run]'), stop: root.querySelector('[data-demo-stop]'),
    reset: root.querySelector('[data-demo-reset]'), status: root.querySelector('[data-demo-status]'),
    output: root.querySelector('[data-demo-output]')}));

  function busy(current) {
    if (!current && active) active.output.querySelector('.demo-loading')?.remove();
    active = current;
    states.forEach(state => {
      state.run.disabled = !!current;
      state.stop.disabled = state !== current;
      state.reset.disabled = !!current && state !== current;
      state.root.setAttribute('aria-busy', String(state === current));
    });
  }
  function terminate(message) {
    worker?.terminate(); worker = null; clearTimeout(timer);
    if (active) active.status.textContent = message;
    busy(null);
  }
  function stdout(state, text) {
    let log = state.output.querySelector('.continuous-python-log');
    if (!log) {log = document.createElement('pre'); log.className = 'continuous-python-log'; state.output.append(log);}
    log.textContent = (log.textContent + text + '\n').slice(-60000);
  }
  function showImages(state, images, mimeType = 'image/png') {
    state.output.querySelector('.demo-loading')?.remove();
    state.root.dispatchEvent(new Event("demo-before-images"));
    images.forEach((png, index) => {
      const image = document.createElement('img');
      image.src = `data:${mimeType};base64,${png}`;
      image.alt = `${state.root.closest('section')?.querySelector('h2')?.textContent || 'Python demo'}: computed plot ${index + 1}`;
      image.className = 'continuous-python-figure';
      state.output.insertBefore(image, state.output.querySelector('.continuous-python-log'));
    });
  }
  function createWorker() {
    const instance = new Worker(workerURL);
    instance.onmessage = ({data}) => {
      if (!active || active.id !== data.id) return;
      const state = active;
      if (data.type === 'running') {
        clearTimeout(timer);
        timer = setTimeout(() => terminate('Computation time limit reached. Edit the code and run again.'), state.id === 'psmd-bounds' ? 900000 : 180000);
      } else if (data.type === 'status') state.status.textContent = data.text;
      else if (data.type === 'stdout') stdout(state, data.text);
      else {
        clearTimeout(timer);
        if (data.type === 'error') {
          state.status.textContent = 'Python error. Edit the code and run again.';
          stdout(state, data.text);
        } else if (data.type === 'result') {
          showImages(state, data.images, data.mimeType);
          state.root.dispatchEvent(new Event("demo-images-ready"));
          state.status.textContent = ['constraint-violation', 'gibbs-density'].includes(state.root.dataset.demoId) ? '' : 'Finished on your device. Edit the code to explore.';
          state.root.dataset.completed = String(state.editor.value === state.executedCode);
          if (!state.output.childElementCount) stdout(state, 'Code finished without printed output or a figure.');
        }
        busy(null);
      }
    };
    instance.onerror = event => {
      event.preventDefault();
      terminate('Python could not start. Reload the page or try Run Python again.');
    };
    return instance;
  }
  states.forEach(state => {
    const original = state.editor.value;
    const initialOutput = state.output.innerHTML;
    const restore = () => {state.root.dispatchEvent(new Event("demo-clear")); state.output.innerHTML = initialOutput; delete state.root.dataset.completed;};
    state.stop.disabled = true;
    state.run.addEventListener('click', () => {
      if (active) return;
      if (location.protocol === 'file:') {
        state.status.textContent = 'Open the published website to run Python in your browser.';
        return;
      }
      delete state.root.dataset.completed;
      state.root.dispatchEvent(new Event("demo-clear"));
      state.output.replaceChildren();
      const loading = document.createElement('div');
      loading.className = 'demo-loading'; loading.setAttribute('role', 'status');
      loading.innerHTML = '<span class="demo-loading-spinner" aria-hidden="true"></span><span>Loading plot…</span>';
      state.output.append(loading); busy(state);
      state.status.textContent = worker ? 'Running Python on your device…' : 'Starting browser Python. First run loads the bundled packages…';
      worker ??= createWorker();
      state.executedCode = state.editor.value;
      worker.postMessage({id: state.id, code: state.executedCode});
      timer = setTimeout(() => terminate('Python startup timed out. Try Run Python again.'), 240000);
    });
    state.stop.addEventListener('click', () => terminate('Stopped. The next run starts a fresh Python session.'));
    state.reset.addEventListener('click', () => {
      if (active === state) terminate('Stopped.');
      state.editor.value = original; restore();
      state.status.textContent = 'Code restored. Run Python to recompute.';
    });
    state.editor.addEventListener('input', () => {
      delete state.root.dataset.completed;
      if (active !== state) state.status.textContent = 'Code changed. Run Python to update the result.';
    });
    state.editor.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape') {state.editor.blur(); state.run.focus();}
    });
    state.root.dataset.ready = 'true';
  });
  window.CONTINUOUS_PYTHON_READY = true;
})();
