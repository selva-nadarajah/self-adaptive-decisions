/* Use Quarto's existing slide menu; keep the title-slide sharing link local. */
(() => {
  function publicPageURL() {
    const host = location.hostname.toLowerCase();
    const local = !host || !host.includes('.') || host === 'localhost' || host === '[::1]' ||
      /\.(localhost|local|test|invalid)$/.test(host) ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
    return !local && /^https?:$/.test(location.protocol)
      ? new URL('index.html', location.href).href : '';
  }

  function shareCode() {
    document.querySelectorAll('[data-share-url]').forEach(card => {
      const destination = card.dataset.shareUrl.trim() || publicPageURL();
      const picture = card.querySelector('img');
      const link = card.querySelector('[data-share-link]');
      const caption = card.querySelector('[data-share-caption]');
      // Quarto adds an empty href to anchors; placeholders must not act as links.
      link.removeAttribute('href');
      if (!destination) return;
      try {
        const url = new URL(destination);
        if (!/^https?:$/.test(url.protocol) || url.username || url.password) return;
        const qr = qrcode(0, 'M');
        qr.addData(url.href, 'Byte');
        qr.make();
        // Four modules of white space surround the code; no decorative overlay.
        const svg = qr.createSvgTag({cellSize: 4, margin: 16, scalable: true});
        picture.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        picture.removeAttribute('data-src');
        picture.alt = 'QR code to open the presentation';
        link.href = url.href;
        link.removeAttribute('aria-disabled');
        link.setAttribute('aria-label', 'Open the presentation');
        caption.textContent = url.hostname + url.pathname.replace(/index\.html$/, '');
        card.dataset.shareState = 'ready';
      } catch (_) {
        // An invalid or oversized author-supplied URL leaves the honest placeholder.
        caption.textContent = 'Presentation link to be added';
      }
    });
  }

  function contents() {
    const menu = window.Reveal?.getPlugin('menu');
    const panel = document.querySelector('.slide-menu');
    const wrapper = document.querySelector('.slide-menu-button');
    const trigger = wrapper?.querySelector('a');
    if (!menu || !panel || !trigger) return;
    panel.id = 'tutorial-contents';
    panel.setAttribute('aria-label', 'Slide contents');
    trigger.innerHTML = '<span class="contents-icon" aria-hidden="true">☰</span><span>Contents</span>';
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-label', 'Open slide contents');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.title = 'Slide contents (M)';
    wrapper.classList.add('contents-ready');
    panel.querySelector('[data-panel="Slides"] .slide-menu-toolbar-label').textContent = 'Contents';
    trigger.addEventListener('keydown', event => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault(); event.stopImmediatePropagation(); menu.openMenu();
      }
    });

    const rows = [...panel.querySelectorAll('.slide-menu-panel[data-panel="Slides"] li')];
    const toolbar = [...panel.querySelectorAll('.slide-menu-toolbar > li')];
    [...rows, ...toolbar].forEach(item => {
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
    });
    rows.forEach((item, index) => {
      item.querySelector('.slide-menu-item-number').textContent = String(index + 1).padStart(2, '0');
      item.addEventListener('focus', () => {
        rows.forEach(row => row.classList.toggle('selected', row === item));
      });
    });

    // Keep Tab inside the open menu; let the built-in plugin handle M/Escape.
    panel.addEventListener('keydown', event => {
      const item = event.target.closest('li[role="button"]');
      if (item && ['Enter', ' '].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation(); item.click();
      } else if (rows.includes(item) && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        let index = rows.indexOf(item) + (event.key === 'ArrowDown' ? 1 : -1);
        if (event.key === 'Home') index = 0;
        if (event.key === 'End') index = rows.length - 1;
        rows[Math.max(0, Math.min(rows.length - 1, index))].focus();
      } else if (event.key === 'Tab') {
        const controls = [...panel.querySelectorAll('[tabindex="0"], a[href]')].filter(el =>
          getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    });

    let wasOpen = false, returnFocus = trigger;
    panel.inert = true;
    new MutationObserver(() => {
      const open = menu.isOpen();
      if (open === wasOpen) return;
      wasOpen = open;
      trigger.setAttribute('aria-expanded', String(open));
      panel.inert = !open;
      if (open) {
        returnFocus = document.activeElement;
        const current = panel.querySelector('.slide-menu-item.active') || rows[0];
        current?.focus();
        current?.scrollIntoView({block:'nearest'});
      } else {
        (returnFocus?.isConnected ? returnFocus : trigger).focus({preventScroll:true});
      }
    }).observe(document.body, {attributes:true, attributeFilter:['class']});
    window.CONTENTS_READY = true;
  }

  function start() {
    shareCode();
    const reading = document.querySelector('main[aria-label="Tutorial reading view"]');
    if (reading) {
      // Wide tables scroll within their own region, not the entire phone page.
      reading.querySelectorAll('table').forEach(table => {
        if (table.parentElement.classList.contains('reading-overflow')) return;
        const region = document.createElement('div');
        region.className = 'reading-overflow';
        region.tabIndex = 0;
        region.setAttribute('role', 'region');
        region.setAttribute('aria-label', 'Table, scroll horizontally if needed');
        table.before(region);
        region.append(table);
      });
      const target = location.hash.replace(/^#\/?/, '');
      const section = target && document.getElementById(target);
      if (section) {
        const jump = document.querySelector('#reading-jump');
        if (jump) jump.value = section.id;
        window.addEventListener('load', () => section.scrollIntoView(), {once:true});
        // Equations can change earlier sections' heights after the initial load.
        let interacted = false;
        const inputEvents = ['pointerdown', 'touchstart', 'wheel', 'keydown'];
        const markInteraction = () => { interacted = true; };
        inputEvents.forEach(type => window.addEventListener(type, markInteraction, {once:true, passive:true}));
        window.addEventListener('tutorial:math-ready', () => {
          if (!interacted) section.scrollIntoView();
          inputEvents.forEach(type => window.removeEventListener(type, markInteraction));
        }, {once:true});
      }
      const slideLink = document.querySelector('[data-slide-view]');
      if (slideLink && target) slideLink.hash = '/' + target;
    }
    if (!document.querySelector('.reveal')) return;
    if (window.Reveal?.isReady()) contents();
    else window.Reveal?.on('ready', contents);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
