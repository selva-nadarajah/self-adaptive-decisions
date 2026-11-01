# Continuous-MDP browser demonstrations

These files preserve Site 1's Python demonstrations for execution in a browser
worker. `demo_helpers.py` is the hidden initialization cell extracted from
`section-4-self-adapting-mdps-research-readout.qmd`; it defines the same plotting
and solver helpers used by that presentation. The remaining Python modules are
copied from the supplied Site 1 research implementation, including their
original notices.

`manifest.json` lists the eleven model modules and the initialization file.
The browser worker downloads them from this static directory, writes them into
Pyodide's in-memory filesystem, and executes the helper initialization in a
shared session. This session preserves the preceding PSMD and feature-demo
results used by later slides. A page reload or worker restart clears that
session. The demonstrations include their original fallback solves when the
preceding slide has not yet run.

Python, NumPy, SciPy/HiGHS, and Matplotlib run locally in the visitor's browser.
The complete runtime and packages are bundled under `../../vendor/pyodide/`.
There is no Python service, remote solve endpoint, commercial solver, or
participant-side installation. The complete rendered static site must be
served over HTTP(S) so web workers, WebAssembly, and package assets can load.
