/* Two visual applications of continuous quantities; no backend or solver. */
(() => {
  const root = document.querySelector('[data-continuous-story]');
  if (!root) return;
  const inventory = root.querySelector('[data-dc-inventory-art]');
  inventory.innerHTML = `<svg viewBox="0 0 760 340" role="img" aria-label="A supplier replenishes inventory while customers draw down stock. Delivery delays and stock ageing appear on the next advance.">
    <defs>
      <clipPath id="dc-tank-clip"><rect x="291" y="67" width="142" height="190" rx="13"/></clipPath>
      <marker id="dc-flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#267f77"/></marker>
    </defs>
    <g font-family="Avenir Next,Segoe UI,sans-serif" fill="#5f7180" text-anchor="middle" font-size="16"><text x="87" y="76">Supplier</text><text x="362" y="42">Warehouse</text><text x="651" y="76">Customer</text></g>
    <path d="M25 252H735" fill="none" stroke="#dce4e9" stroke-width="2"/>
    <g stroke="#7b9ba9" stroke-width="2" fill="#fff"><path d="M28 252V128L66 104V128L105 104V128H147V252Z"/><path d="M45 163H130M45 190H130" stroke="#dce4e9"/><rect x="46" y="215" width="26" height="37" rx="3"/><rect x="96" y="215" width="26" height="37" rx="3"/></g>
    <path d="M154 178H278M446 178H580" fill="none" stroke="#c8dcd7" stroke-width="5"/>
    <path class="dc-flow dc-supply-flow" d="M154 178H278" fill="none" stroke="#267f77" stroke-width="3" stroke-dasharray="6 10" marker-end="url(#dc-flow-arrow)"/>
    <path class="dc-flow dc-demand-flow" d="M446 178H580" fill="none" stroke="#267f77" stroke-width="3" stroke-dasharray="6 10" marker-end="url(#dc-flow-arrow)"/>
    <g font-family="Avenir Next,Segoe UI,sans-serif" fill="#5f7180" text-anchor="middle" font-size="14"><text x="215" y="158">Replenish</text><text x="513" y="158">Demand</text></g>
    <rect x="290" y="65" width="145" height="194" rx="15" fill="#fff" stroke="#7b9ba9" stroke-width="2"/>
    <g clip-path="url(#dc-tank-clip)"><path data-dc-liquid fill="#9ccbc2"/></g>
    <path d="M305 85H319M305 126H319M305 168H319M305 210H319" stroke="#b5cdc9" stroke-width="2"/>
    <text x="362" y="151" data-dc-stock font-family="Avenir Next,Segoe UI,sans-serif" font-size="29" font-weight="600" text-anchor="middle" fill="#182c3e">8</text>
    <text x="362" y="176" font-family="Avenir Next,Segoe UI,sans-serif" font-size="13" text-anchor="middle" fill="#5f7180">inventory level</text>
    <g fill="#fff" stroke="#7b9ba9" stroke-width="2"><path d="M594 252V133H711V252Z"/><path d="M584 133L603 108H704L722 133Z" fill="#d9ebe6"/><path d="M594 134H711V151H594Z" fill="#a9cfc6"/><rect x="610" y="174" width="34" height="39" rx="2"/><path d="M666 252V176H696V252"/></g>
    <g class="dc-truck" data-dc-truck stroke="#7b9ba9" stroke-width="2"><rect x="168" y="218" width="49" height="25" rx="4" fill="#f4dfcf"/><path d="M217 225H231L241 236V243H217Z" fill="#fff"/><circle cx="182" cy="247" r="7" fill="#182c3e"/><circle cx="228" cy="247" r="7" fill="#182c3e"/></g>
    <g class="dc-lead-time"><circle cx="216" cy="108" r="20" fill="#fff" stroke="#a4592f" stroke-width="2"/><path data-dc-clock d="M216 94V108L226 114" fill="none" stroke="#a4592f" stroke-width="2" stroke-linecap="round"/></g>
    <g class="dc-age-batches" stroke="#a8896c" stroke-width="1.5"><g data-dc-batch="0"><path d="M304 283L308 273H326L330 283V309H304Z" fill="#b1d3b6"/></g><g data-dc-batch="1"><path d="M347 283L351 273H369L373 283V309H347Z" fill="#d4cea0"/></g><g data-dc-batch="2"><path d="M390 283L394 273H412L416 283V309H390Z" fill="#d6b799"/></g></g>
    <g class="dc-age-batches" font-family="Avenir Next,Segoe UI,sans-serif" font-size="12" fill="#5f7180" text-anchor="middle"><text x="317" y="329">fresh</text><text x="403" y="329">older</text></g>
  </svg>`;
  root.querySelector('[data-dc-options-art]').innerHTML = `<svg viewBox="0 0 420 245" role="img" aria-label="Three illustrative simulated asset price paths moving up and down over time.">
    <defs><clipPath id="dc-price-clip"><rect x="44" y="30" width="350" height="174"/></clipPath></defs>
    <g stroke="#dce4e9" stroke-width="1"><path d="M44 68H394M44 112H394M44 156H394"/></g>
    <path d="M44 30V204H394" fill="none" stroke="#9aafb8" stroke-width="1.5"/>
    <g clip-path="url(#dc-price-clip)" data-dc-price-lines></g>
    <g font-family="Avenir Next,Segoe UI,sans-serif" font-size="12" fill="#5f7180"><text x="199" y="232">Time</text><text transform="translate(18 149) rotate(-90)">Price index</text><text x="59" y="18" fill="#226a85">Asset A</text><text x="177" y="18" fill="#267f77">Asset B</text><text x="295" y="18" fill="#a4592f">Asset C</text></g>
  </svg>`;
  let seed = 1973;
  const random = () => {seed = (seed*1664525+1013904223)>>>0; return (seed+.5)/4294967296;};
  const prices = [80,100,120].map((start,series) => {
    const values=[start];
    for(let i=1;i<=120;i++) {
      const z=Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
      values.push(Math.max(42,Math.min(178,values[i-1]*Math.exp(-.5*.32**2/120 + (.26+series*.05)/Math.sqrt(120)*z))));
    }
    return values;
  });
  const priceNodes = ['#226a85','#267f77','#a4592f'].map(color => {
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('fill','none');path.setAttribute('stroke',color);path.setAttribute('stroke-width','2.6');
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');dot.setAttribute('r','4');dot.setAttribute('fill',color);
    root.querySelector('[data-dc-price-lines]').append(path,dot);return {path,dot};
  });
  function drawPrices(time,complete=false) {
    const progress=complete?120:(time%14)/14*120;
    prices.forEach((values,k) => {
      const n=Math.floor(progress), points=values.slice(0,n+1);
      if(n<120)points.push(values[n]+(values[n+1]-values[n])*(progress-n));
      const coords=points.map((v,i)=>[44+350*(i===points.length-1?progress:i)/120,204-(v-40)/140*174]);
      priceNodes[k].path.setAttribute('d',coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' '));
      const last=coords[coords.length-1];priceNodes[k].dot.setAttribute('cx',last[0]);priceNodes[k].dot.setAttribute('cy',last[1]);
    });
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame, phase, started = 0;
  const reading = !document.querySelector('.reveal');
  function draw(time) {
    const t = time % 10, q = 7.4;
    const delay = phase === 'complexity' ? 4 : 1;
    const arrival = Math.max(0, Math.min(1, t-delay));
    const demand = .68*t;
    const spoiled = phase === 'complexity' ? .22*Math.max(0,t-6) : 0;
    const stock = Math.max(0, Math.min(20,8 + q*arrival - demand - spoiled));
    const y = 257 - stock/20*180;
    inventory.querySelector('[data-dc-liquid]').setAttribute('d', `M291 ${y} Q326 ${y-4} 362 ${y} T433 ${y} V257H291Z`);
    inventory.querySelector('[data-dc-stock]').textContent = `${Number(stock.toFixed(1))}`;
    const truckX = Math.max(0, Math.min(1,(t-delay+1)/2))*66;
    inventory.querySelector('[data-dc-truck]').setAttribute('transform', `translate(${truckX} 0)`);
    inventory.querySelector('[data-dc-clock]').setAttribute('transform', `rotate(${t*36} 216 108)`);
    inventory.querySelectorAll('[data-dc-batch]').forEach((batch,i) => {
      batch.style.opacity = String(Math.max(.15,1-(t/10)*(.2+i*.3)));
    });
    drawPrices(time, reduced.matches || reading);
  }
  function stop() {cancelAnimationFrame(frame); frame = null; root.dataset.running = 'false';}
  function animate(now) {
    draw((now-started)/1000);
    frame = requestAnimationFrame(animate);
  }
  function update() {
    const next = 'business';
    const active = !document.hidden && (reading || root.closest('section').classList.contains('present'));
    if (next !== phase) {stop(); phase = next; started = performance.now();}
    root.dataset.phase = phase;
    if (!active || phase === 'intro' || reduced.matches || reading) {stop();draw(phase === 'complexity' ? 7 : 0);}
    else if (!frame) {root.dataset.running = 'true';started = performance.now();frame = requestAnimationFrame(animate);}
  }
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);
  draw(0);
  if (window.Reveal) ['ready','slidechanged','fragmentshown','fragmenthidden'].forEach(event => Reveal.on(event,update));
  update();
})();
