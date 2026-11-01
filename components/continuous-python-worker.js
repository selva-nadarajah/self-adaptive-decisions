/* Browser-only research demos. This worker fetches static files from this site. */
let runtime, scope, activeId, executing = false;
const send = (type, detail = {}) => self.postMessage({type, id: activeId, ...detail});

async function initialize() {
  const indexURL = new URL('../assets/vendor/pyodide/', self.location.href).href;
  importScripts(indexURL + 'pyodide.js');
  const python = await loadPyodide({indexURL,
    stdout: text => {if (executing) send('stdout', {text});},
    stderr: text => {if (executing) send('stdout', {text});}});
  send('status', {text: 'Loading NumPy, SciPy, and Matplotlib in your browser…'});
  await python.loadPackage(['numpy', 'scipy', 'matplotlib']);
  const base = new URL('../assets/python/continuous/', self.location.href);
  const fetchText = async path => {
    const response = await fetch(new URL(path, base), {cache: "no-store"});
    if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
    return response.text();
  };
  const manifest = JSON.parse(await fetchText('manifest.json'));
  const directory = '/home/pyodide/continuous';
  python.FS.mkdirTree(directory);
  await Promise.all([...manifest.modules, manifest.initialization].map(async path => {
    const filename = `${directory}/${path}`;
    python.FS.mkdirTree(filename.slice(0, filename.lastIndexOf('/')));
    python.FS.writeFile(filename, await fetchText(path));
  }));
  scope = python.toPy({__name__: '__main__'});
  await python.runPythonAsync(`
import os, sys
os.environ['MPLCONFIGDIR'] = '/tmp/matplotlib'
sys.path.insert(0, '${directory}')
import matplotlib
matplotlib.use('Agg')
exec(compile(open('${directory}/demo_helpers.py').read(), 'demo_helpers.py', 'exec'))

# Match the presentation palette without changing the numerical models.
INK, PRIMARY, TEAL = '#182c3e', '#226a85', '#267f77'
ACCENT, MUTED, DANGER = '#a4592f', '#dce4e9', '#9b3f34'
plt.rcParams.update({'text.color': INK, 'axes.labelcolor': INK,
                     'xtick.color': INK, 'ytick.color': INK, 'figure.dpi': 130})
import io as _browser_io, base64 as _browser_base64
_browser_images = []
def _browser_capture_figures(*args, **kwargs):
    for number in list(plt.get_fignums()):
        figure = plt.figure(number)
        buffer = _browser_io.BytesIO()
        figure.savefig(buffer, format='svg', bbox_inches='tight', facecolor='white')
        _browser_images.append(_browser_base64.b64encode(buffer.getvalue()).decode('ascii'))
        plt.close(figure)
plt.show = _browser_capture_figures
`, {globals: scope});
  return python;
}

self.onmessage = async ({data}) => {
  activeId = data.id;
  let images;
  try {
    runtime ??= initialize().catch(error => {
      scope?.destroy?.(); scope = null; runtime = null;
      throw error;
    });
    const python = await runtime;
    executing = true;
    send('running');
    send('status', {text: 'Running Python on your device…'});
    await python.runPythonAsync("_browser_images = []\nplt.close('all')", {globals: scope});
    await python.runPythonAsync(data.code, {globals: scope});
    await python.runPythonAsync('_browser_capture_figures()', {globals: scope});
    images = scope.get('_browser_images');
      send('result', {images: images.toJs(), mimeType: 'image/svg+xml', version: python.version});
  } catch (error) {
    send('error', {text: String(error.message || error)});
    // A failed initial load can be retried with a new worker.
    if (!scope) runtime = null;
  } finally {
    executing = false;
    images?.destroy?.();
  }
};
