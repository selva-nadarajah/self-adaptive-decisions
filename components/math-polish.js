/* Typeset all tutorial equations with the site's bundled MathJax. */
(() => {
  const sections = [...document.querySelectorAll('section:not(:has(section))')];
  if (!sections.length) return;
  const base = new URL('../assets/vendor/mathjax/', document.currentScript.src);
  const font = new URL('fonts/mathjax-newcm-font/', base).href.replace(/\/$/, '');
  window.MathJax = {
    loader: {paths: {mathjax: base.href.replace(/\/$/, ''), fonts: new URL('fonts/', base).href}},
    startup: {typeset: false},
    options: {
      enableMenu: false,
      worker: {path: new URL('sre/', base).href.replace(/\/$/, ''),
        maps: new URL('sre/mathmaps/', base).href.replace(/\/$/, '')}
    },
    output: {font: 'mathjax-newcm', fontPath: font,
      displayOverflow: 'scroll', linebreaks: {inline: false}},
    svg: {fontCache: 'local', dynamicPrefix: `${font}/svg/dynamic`}
  };
  const script = document.createElement('script');
  script.src = new URL('tex-svg.js', base).href;
  script.onload = async () => {
    try {
      await MathJax.startup.promise;
      // Conversion APIs return equation nodes; install their companion SVG CSS.
      const mathDocument = MathJax.startup.document;
      const stylesheet = mathDocument.outputJax.styleSheet(mathDocument);
      if (stylesheet) document.head.append(stylesheet);
      for (const section of sections) {
        for (const math of section.querySelectorAll('math')) {
          const tex = math.querySelector('annotation[encoding="application/x-tex"]')?.textContent;
          if (!tex) continue;
          const display = math.getAttribute('display') === 'block';
          const equation = await MathJax.tex2svgPromise(tex, {display});
          if (equation.querySelector('[data-mjx-error], merror')) {
            throw new Error(`Could not typeset an equation in ${section.id}.`);
          }
          const wrapper = document.createElement('span');
          wrapper.className = `polished-math${display ? ' display-math' : ''}`;
          wrapper.dataset.tex = tex;
          if (display) wrapper.setAttribute('display', 'block');
          wrapper.append(equation);
          math.replaceWith(wrapper);
        }
        section.dataset.mathReady = 'true';
      }
      window.MATH_POLISH_READY = true;
      window.dispatchEvent(new Event('tutorial:math-ready'));
      const layout = () => window.Reveal?.layout();
      if (window.Reveal?.isReady()) layout();
      else window.Reveal?.on('ready', layout);
    } catch (error) {
      document.documentElement.dataset.mathError = String(error.message || error);
      console.error('Tutorial math:', error);
    }
  };
  script.onerror = () => {document.documentElement.dataset.mathError = 'MathJax could not load.';};
  document.head.append(script);
})();
