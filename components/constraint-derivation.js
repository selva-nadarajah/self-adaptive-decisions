/* Each advance replaces the ALP constraint with its next equivalent form. */
(() => {
  const root = document.querySelector('.cv-general-slide');
  if (!root) return;
  const container = root.querySelector('.cv-derivation');
  const reading = !document.querySelector('.reveal');
  function update() {
    let step = 0;
    for (let n=1;n<=3;n++) if(root.querySelector(`.cv-step-${n}.visible`)) step=n;
    container.dataset.cvStep = String(step);
    root.querySelectorAll('[data-cv-heading-step]').forEach(label => {
      label.hidden = Number(label.dataset.cvHeadingStep) !== (reading ? 0 : step);
    });
  }
  if (window.Reveal) ['ready','fragmentshown','fragmenthidden','slidechanged'].forEach(event=>Reveal.on(event,update));
  update();
})();
