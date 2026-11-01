(() => {
 const root=document.querySelector('[data-warehouse-choice]');if(!root)return;
 const before=[3,4],after=[9,8],truth=[9,10],names=['north','south'];
 if(!after.every((v,i)=>before[i]<v&&v<=truth[i])||before[0]>=before[1]||after[1]>=after[0])throw new Error('Warehouse illustration invariant failed.');root.dataset.verified='true';
 const money=v=>'$'+(Number.isInteger(v)?v:v.toFixed(2)),shown=cls=>root.querySelector('.'+cls).classList.contains('visible');let animation;
 function draw(alpha){names.forEach((name,i)=>{root.querySelector('[data-warehouse-estimate="'+name+'"]').textContent=money(before[i]+alpha*(after[i]-before[i]));root.querySelector('[data-warehouse-old="'+name+'"]').textContent=alpha>0?'Previously '+money(before[i]):'';});root.dataset.fitProgress=alpha.toFixed(3);}
 function update(){const estimates=shown('warehouse-show-estimates'),picked=shown('warehouse-pick-trigger'),better=shown('warehouse-fit-trigger'),reversed=shown('warehouse-ranking-trigger');root.dataset.phase=reversed?'reversed':better?'improved':picked?'picked':estimates?'estimates':'truth';
 root.querySelector('[data-warehouse-phase]').textContent=reversed?'The new approximation picks the more costly warehouse.':better?'Add random features and improve both approximations.':picked?'The policy picks the lower approximate value.':estimates?'Approximate the values with N random features.':'The true values are shown for comparison; the policy does not know them.';
 names.forEach(name=>{root.querySelector('[data-warehouse="'+name+'"]').classList.toggle('warehouse-chosen',reversed?name==='south':picked&&!better&&name==='north');});
 root.querySelector('[data-warehouse-selection="north"]').textContent=reversed?'':better?'Previously chosen':picked?'Choose North · lower estimate':'';
 root.querySelector('[data-warehouse-selection="south"]').textContent=reversed?'Choose South · lower estimate':'';
 root.querySelectorAll('[data-warehouse-before-label]').forEach(e=>e.hidden=better);root.querySelectorAll('[data-warehouse-after-label]').forEach(e=>e.hidden=!better);
 }
 function fit(animate=false){cancelAnimationFrame(animation);const target=shown('warehouse-fit-trigger')?1:0;update();if(!animate||matchMedia('(prefers-reduced-motion: reduce)').matches){draw(target);return;}const start=performance.now();function frame(now){const alpha=Math.min(1,(now-start)/1100);draw(alpha*target);if(alpha<1)animation=requestAnimationFrame(frame);}animation=requestAnimationFrame(frame);}
 function bind(){Reveal.on('fragmentshown',e=>{if(e.fragment.classList.contains('warehouse-fit-trigger'))fit(true);else if(e.fragment.classList.contains('warehouse-ranking-trigger'))fit(false);else update();});Reveal.on('fragmenthidden',()=>fit(false));Reveal.on('slidechanged',()=>fit(false));}
 if(window.Reveal?.isReady())bind();else window.Reveal?.on('ready',bind);fit(false);
})();
