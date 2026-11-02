# Self adaptive decisions tutorial presentation

Published presentation: https://self-adaptive-decisions.com/

This repository contains the rendered INFORMS tutorial presentation, reading view, and bundled browser demonstrations.

Source repository: https://github.com/andrecire/informs-tutorial-2026
Source revision: ed89f98 (local authoring commit, based on upstream 8697f99)

Phones open the responsive reading view automatically. Use `index.html?view=slides` to choose the presentation view explicitly.

GitHub Pages publishes the main branch from the repository root. The CNAME file sets the custom domain. The .nojekyll file preserves the generated assets and bundled Python runtime.

To update the presentation, build the latest source with Quarto and copy its index.html, reading.html, assets, components, styles, site_libs, and generated page dependency directories into this repository. Remove obsolete output files when retiring a page. Commit and push the updated files. Keep CNAME and .nojekyll when updating.
