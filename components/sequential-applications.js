/* Reveal the introductory applications automatically without advancing slides. */
(() => {
  const slide = document.querySelector('.reveal .sequential-intro');
  if (!slide || !window.Reveal) return;
  let timer;

  function revealNext() {
    if (Reveal.getCurrentSlide() !== slide) return;
    if (!slide.querySelector('.sequential-application.fragment:not(.visible)')) return;
    Reveal.nextFragment();
    timer = setTimeout(revealNext, 800);
  }

  function enter() {
    clearTimeout(timer);
    if (Reveal.getCurrentSlide() === slide) {
      timer = setTimeout(revealNext, 450);
    }
  }

  function bind() {
    Reveal.on('slidechanged', enter);
    enter();
  }

  if (Reveal.isReady()) bind();
  else Reveal.on('ready', bind);
})();
