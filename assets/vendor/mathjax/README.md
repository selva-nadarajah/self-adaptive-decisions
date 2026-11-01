# Local MathJax renderer

MathJax 4.1.3 and matching MathJax-Newcm SVG glyph data from the official npm packages `mathjax` and `@mathjax/mathjax-newcm-font`. Apache-2.0 license included. Original package files are unchanged; `checksums.json` records their hashes.

The deck renders only slides 24–43 and their speaker notes through `components/math-polish.js`. Earlier slides keep their existing MathML. Source TeX is read from Pandoc’s existing MathML annotations; mathematical content is unchanged. SVG output gives consistent integrals, scripts, and set notation independently of installed math fonts. All runtime paths resolve to this local directory. No CDN or math server is needed.

Included: the combined TeX-to-SVG component, TeX extension components, SVG glyph data, and local speech-rule resources for accessible math. Browser Python runs separately and remains on demand.
