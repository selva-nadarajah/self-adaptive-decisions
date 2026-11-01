(() => {
 const root=document.querySelector('.constraint-density-demo'); if(!root)return;
 const slider=root.querySelector('input'); let mode='uniform';
 const n=400, xs=Array.from({length:n+1},(_,i)=>i/n);
 const raw=xs.map(x=>0.6+0.22*Math.cos(4*Math.PI*x)+0.13*Math.sin(10*Math.PI*x)-0.65*Math.exp(-(((x-.33)/.11)**2)));
 const lo=Math.min(...raw), hi=Math.max(...raw), f=raw.map(v=>(v-lo)/(hi-lo)), k=f.indexOf(0);
 const path=(ys)=>ys.map((v,i)=>(i?'L':'M')+(55+1000*xs[i]).toFixed(2)+','+v.toFixed(2)).join(' ');
 root.querySelector('[data-density-curve]').setAttribute('d',path(f.map(v=>165-110*v)));
 root.querySelector('[data-density-min]').setAttribute('cx',55+1000*xs[k]);root.querySelector('[data-density-min]').setAttribute('cy',165);
 const label=root.querySelector('[data-density-min-label]');label.setAttribute('x',70+1000*xs[k]);label.setAttribute('y',173);
 root.querySelector('[data-density-uniform]').setAttribute('d','M55 210V198H1055V210Z');
 function update(){
  const lambda=.018*Math.pow(250,Number(slider.value)/100), weights=f.map(v=>Math.exp(-v/lambda));
  const mass=weights.reduce((a,v,i)=>a+v*(i===0||i===n?.5:1),0)/n;
  root.querySelector('[data-density-learned]').setAttribute('d',path(weights.map(v=>210-12*v/mass))+' L1055 210L55 210Z');
  root.querySelector('[data-density-value]').textContent=lambda.toFixed(2);
  root.querySelector('[data-density-uniform]').style.opacity=mode==='uniform'?1:.45;
  root.querySelector('[data-density-learned]').style.opacity=mode==='learned'?1:.15;
  root.querySelector('[data-density-min]').setAttribute('r',mode==='minimum'?10:6);
  slider.disabled=mode!=='learned';
  root.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.densityMode===mode)));
  root.querySelector('[data-density-explanation]').textContent=mode==='uniform'?'Constraint sampling: draw pairs uniformly, without using the shape of f.':mode==='minimum'?'Constraint generation: solve for a pair that minimizes f.':'Constraint violation learning: sample near low values of f. Lower regularization concentrates the density; higher regularization approaches uniform.';
 }
 root.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.densityMode;update();}));slider.addEventListener('input',update);update();
 function syncStep(){
  mode=root.querySelector('.density-learning-step.visible')?'learned':root.querySelector('.density-generation-step.visible')?'minimum':'uniform';
  update();
 }
 function bind(){['fragmentshown','fragmenthidden','slidechanged'].forEach(name=>Reveal.on(name,syncStep));syncStep();}
 if(window.Reveal?.isReady())bind();else window.Reveal?.on('ready',bind);
})();
