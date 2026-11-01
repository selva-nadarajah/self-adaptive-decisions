/* Forward navigation first runs a visible Python demo, then waits for success.
 * Reveal's own fragment/slide navigation remains in charge after completion.
 */
(() => {
  function bind() {
    const deck = window.Reveal;
    if (!deck || !document.querySelector('.reveal')) return;
    function currentLabs() {
      const slide = deck.getCurrentSlide();
      if (!slide?.matches('#s24,.continuous-import-slide')) return [];
      return [...slide.querySelectorAll('[data-continuous-python]')].filter(root => {
        const style = getComputedStyle(root);
        return style.display !== 'none' && style.visibility !== 'hidden' && root.getClientRects().length;
      });
    }
    function intercept() {
      const labs = currentLabs();
      // Repeated Next presses cannot skip an in-progress or failed computation.
      if (labs.some(root => root.getAttribute('aria-busy') === 'true')) return true;
      const pending = labs.find(root => root.dataset.completed !== 'true');
      if (!pending) {
        const sequences = [...(deck.getCurrentSlide()?.querySelectorAll('[data-static-sequence]') || [])];
        return [...labs, ...sequences].some(root => !root.dispatchEvent(new Event('demo-next-request', {cancelable:true})));
      }
      const run = pending.querySelector('[data-demo-run]');
      if (run && !run.disabled) run.click();
      return true;
    }
    for (const name of ['next','right','down','navigateNext','navigateRight','navigateDown']) {
      const original = deck[name];
      if (typeof original === 'function') deck[name] = function(...args) {
        if (!intercept()) return original.apply(deck, args);
      };
    }
    // Reveal's legacy global API copies methods from its internal deck. Capture
    // native controls/keys too, since those retain the internal method references.
    for (const type of ['click', 'touchstart']) {
      document.addEventListener(type, event => {
        if (event.target.closest('.reveal .controls :is(.navigate-right,.navigate-down,.navigate-next)') && intercept()) {
          event.preventDefault(); event.stopImmediatePropagation();
        }
      }, {capture:true, passive:false});
    }
    document.addEventListener('keydown', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || deck.isOverview() || deck.isPaused()) return;
      if (event.target.closest('input,textarea,select,[contenteditable="true"],.slide-menu-wrapper')) return;
      if (event.key === ' ' && event.target.closest('button,a')) return;
      if (['ArrowRight','ArrowDown','PageDown',' ','n','N','l','L','j','J'].includes(event.key) && intercept()) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }, true);
    function updateNextControl() {
      const pending = currentLabs().some(root => root.dataset.completed !== 'true' || root.getAttribute('aria-busy') === 'true' || root.dataset.navigationPending === 'true');
      const hasNext = deck.availableRoutes().right || deck.availableRoutes().down || deck.availableFragments().next;
      document.querySelectorAll('.reveal .controls :is(.navigate-right,.navigate-next)').forEach(button => {
        // Also make Next available to run the demo on the final slide.
        if (pending) {
          if (!button.classList.contains('enabled')) button.classList.add('enabled');
          if (button.disabled) button.disabled = false;
          button.dataset.pythonNext = 'true';
        } else if (button.dataset.pythonNext) {
          delete button.dataset.pythonNext;
          button.classList.toggle('enabled', !!hasNext);
          button.disabled = !hasNext;
        }
      });
    }
    for (const name of ['slidechanged','fragmentshown','fragmenthidden']) deck.on(name, updateNextControl);
    document.querySelectorAll('[data-continuous-python]').forEach(root => {
      new MutationObserver(updateNextControl).observe(root, {attributes:true, attributeFilter:['data-completed','aria-busy','data-navigation-pending']});
    });
    const controls = document.querySelector('.reveal .controls');
    if (controls) new MutationObserver(updateNextControl).observe(controls, {subtree:true,attributes:true,attributeFilter:['class','disabled']});
    updateNextControl();
    window.CONTINUOUS_PYTHON_NAVIGATION_READY = true;
  }
  if (window.Reveal?.isReady()) bind();
  else window.Reveal?.on('ready', bind);
})();
