/* Isolated, on-demand Python execution; all runtime files are served locally. */
let runtime;
async function initialize() {
  const indexURL = new URL('../assets/vendor/pyodide/', self.location.href).href;
  importScripts(indexURL + 'pyodide.js');
  const python = await loadPyodide({indexURL,
    stdout: text => self.postMessage({type:'stdout', text}),
    stderr: text => self.postMessage({type:'stdout', text})});
  self.postMessage({type:'status', text:'Loading the SciPy / HiGHS solver…'});
  await python.loadPackage('scipy');
  const response = await fetch(new URL('../assets/python/delayed_allocation.py', self.location.href));
  if (!response.ok) throw new Error('Could not load the LP model.');
  python.FS.writeFile('/home/pyodide/delayed_allocation.py', await response.text());
  return python;
}
self.onmessage = async ({data}) => {
  let scope, result;
  try {
    runtime ??= initialize();
    const python = await runtime;
    self.postMessage({type:'status', text:'Solving the LP…'});
    scope = python.toPy({__name__:'__main__'});
    await python.runPythonAsync(data.code, {globals:scope});
    result = scope.get('result');
    if (!result) throw new Error('Assign the output of solve_display_lp to result.');
    const value = result.toJs({dict_converter:Object.fromEntries});
    self.postMessage({type:'result', value, version:python.version});
  } catch (error) {
    self.postMessage({type:'error', text:String(error.message || error)});
  } finally {
    result?.destroy?.(); scope?.destroy?.();
  }
};
