/* Execute actual LP refinement, then display its computed iterates in sequence. */
let runtime, activeId;
const send = (type, detail = {}) => self.postMessage({type, id: activeId, ...detail});

async function initialize() {
  const indexURL = new URL('../assets/vendor/pyodide/', self.location.href).href;
  importScripts(indexURL + 'pyodide.js');
  const python = await loadPyodide({indexURL,
    stdout: text => send('stdout', {text}), stderr: text => send('stdout', {text})});
  send('status', {text: 'Loading the LP solver and plotting tools…'});
  await python.loadPackage(['scipy', 'matplotlib']);
  const response = await fetch(new URL('../assets/python/delayed_allocation.py', self.location.href));
  if (!response.ok) throw new Error('Could not load the refinement model.');
  python.FS.writeFile('/home/pyodide/delayed_allocation.py', await response.text());
  return python;
}

self.onmessage = async ({data}) => {
  activeId = data.id;
  let scope, result;
  try {
    runtime ??= initialize().catch(error => {runtime = undefined; throw error;});
    const python = await runtime;
    send('status', {text: 'Solving and pricing omitted assortments…'});
    scope = python.toPy({__name__: '__main__'});
    await python.runPythonAsync(data.code, {globals: scope});
    result = scope.get('result');
    if (!result?.toJs) throw new Error('Assign da.refine_display_lp(rewards=rewards) to result.');
    const value = result.toJs({dict_converter: Object.fromEntries});
    if (!Array.isArray(value.history) || !value.history.length ||
        !value.history.every(step => Number.isFinite(step.objective)))
      throw new Error('result must contain the trace returned by da.refine_display_lp.');
    await python.runPythonAsync('from delayed_allocation import plot_refinement as _plot_refinement', {globals: scope});
    for (let i = 0; i < value.history.length; i++) {
      const svg = !data.reduced || i === value.history.length - 1
        ? await python.runPythonAsync(`_plot_refinement(result['history'][:${i + 1}])`, {globals: scope}) : null;
      send('iteration', {step: value.history[i], svg});
      if (!data.reduced && i < value.history.length - 1)
        await new Promise(resolve => setTimeout(resolve, 850));
    }
    send('result', {value});
  } catch (error) {
    send('error', {text: String(error.message || error)});
  } finally {
    result?.destroy?.();
    scope?.destroy?.();
  }
};
