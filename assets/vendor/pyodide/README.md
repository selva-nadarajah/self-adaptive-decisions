# Bundled browser Python runtime

Pinned distribution: **Pyodide 0.29.3**, downloaded from
`https://cdn.jsdelivr.net/pyodide/v0.29.3/full/`. The original runtime/SciPy
closure was downloaded on 2026-10-24; the Matplotlib closure was added on
2026-10-29 for the continuous-MDP demonstrations.

The included runtime and dependency closure contains Python's standard library,
NumPy 2.2.5, SciPy 1.14.1, OpenBLAS 0.3.26, and Matplotlib 3.8.4. Matplotlib's
additional dependencies are ContourPy 1.3.1, Cycler 0.12.1, FontTools 4.56.0,
KiwiSolver 1.4.8, Packaging 24.2, Pillow 11.3.0, PyParsing 3.2.1,
python-dateutil 2.9.0.post0, pytz 2025.2, and six 1.17.0. SciPy's HiGHS LP
solver and Matplotlib's plotting code run inside WebAssembly on the visitor's
device.

The release's lockfile contains older build-version metadata; package filenames
and SHA-256 hashes follow that exact distribution. All package archives were
checked against `pyodide-lock.json`; `checksums.json` records the bundled
runtime files, package archives, and extracted license notices. Preserve these
pins together.

Workers load these files by relative URL when a participant runs Python. The
complete distribution is approximately 41 MB before HTTP compression. The
assortment LP loads only its SciPy dependency closure, while the continuous
examples also load Matplotlib. All files must be published, including `.wasm`,
`.zip`, and `.whl`; no CDN is contacted at runtime. Normal static HTTP hosting
and GitHub Pages work without a computation server or cross-origin-isolation
headers. Use HTTP, not `file://`.

`LICENSE` is Pyodide's license/third-party notice from its 0.29.3 source tag.
`*-LICENSE-*.txt` retain notices extracted from the bundled package archives.
The original archives also retain their package metadata and licenses. SciPy
includes HiGHS and its license notices. No Gurobi binary is distributed.

The assortment slide's Python module lives in
`../../python/delayed_allocation.py`. The continuous demonstrations and research
modules live in `../../python/continuous/`; its `manifest.json` enumerates the
Python files loaded into the browser's virtual filesystem. Browser execution
has no access to the author's Conda installation. Installing a package in
`informstutorial` does not make it available inside Pyodide.
