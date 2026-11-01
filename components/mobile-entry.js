/* Use normal document flow on phones; an explicit slide-view link opts out. */
(() => {
  const query = new URLSearchParams(location.search);
  const phone = matchMedia('(max-width: 700px)').matches ||
    (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) <= 600);
  if (!phone || query.get('view') === 'slides' || query.has('print-pdf') || query.has('speaker-view')) return;
  const destination = new URL('reading.html', location.href);
  destination.hash = location.hash.replace(/^#\//, '#');
  location.replace(destination.href);
})();
