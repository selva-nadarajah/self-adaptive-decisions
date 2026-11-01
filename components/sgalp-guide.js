(() => {
 const root=document.querySelector('[data-sg-guide]');if(!root)return;
 const ns='http://www.w3.org/2000/svg',n=120,xs=Array.from({length:n+1},(_,i)=>i/n);
 const base=xs.map(x=>.9+.15*x+.18*Math.cos(2*Math.PI*x));
 const guided1=base.map((v,i)=>v+.48*Math.sin(Math.PI*xs[i])**2),guided2=guided1.map((v,i)=>v+.32*Math.sin(2*Math.PI*xs[i])**2);
 const guided3=guided2.map((v,i)=>v+.24*Math.sin(Math.PI*xs[i])**2);
 const free1=base.map((v,i)=>v+.2+.4*Math.sin(2*Math.PI*xs[i])),free2=free1.map((v,i)=>v+.17+.3*Math.cos(2*Math.PI*xs[i]));
 const free3=free2.map((v,i)=>v+.14+.26*Math.sin(4*Math.PI*xs[i]));
 if(guided3.some((v,i)=>v<guided2[i]-1e-10)||guided1.some((v,i)=>v<base[i]-1e-10)||guided2.some((v,i)=>v<guided1[i]-1e-10))throw new Error('Guide floor violation.');root.dataset.verified='true';
 // Use one padded vertical range for every round and both comparison panels.
 const allValues=[...base,...guided1,...guided2,...guided3,...free1,...free2,...free3];
 const valueMin=Math.min(0,...allValues),valueMax=Math.max(...allValues);
 const range=(valueMax-valueMin)*1.12||1;
 const plotY=v=>132-108*(v-valueMin)/range;
 if(allValues.some(v=>plotY(v)<20||plotY(v)>140))throw new Error('Comparison curve exceeds the plot area.');
 function add(svg,tag,attrs,text){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text)e.textContent=text;svg.append(e);return e;}
 function graph(svg,floor,values,guided){svg.replaceChildren();const x=i=>30+490*i/n,y=plotY,path=vs=>vs.map((v,i)=>(i?'L':'M')+x(i)+','+y(v)).join(' ');
  add(svg,'path',{d:'M30 15V150H520',fill:'none',stroke:'#acbec6'});add(svg,'text',{x:275,y:177,'text-anchor':'middle','font-size':22,fill:'#6d848e'},'state');
  if(guided){add(svg,'path',{d:path(floor)+' L520 150H30Z',fill:'#e9dfcf','fill-opacity':.6});add(svg,'text',{x:275,y:140,'text-anchor':'middle','font-size':22,fill:'#94713f'},'Below the previous VFA');}
  else {let points=[];function flush(){if(points.length>1){const a=points[0],b=points[points.length-1];const d=points.map((i,k)=>(k?'L':'M')+x(i)+','+y(floor[i])).join(' ')+points.slice().reverse().map(i=>'L'+x(i)+','+y(values[i])).join(' ')+'Z';add(svg,'path',{d,fill:'#d7857755'});}points=[];}values.forEach((v,i)=>{if(v<floor[i])points.push(i);else flush();});flush();}
  if(root.dataset.stage!=='0')add(svg,'path',{d:path(floor),fill:'none',stroke:'#b57c43','stroke-width':2,'stroke-dasharray':'5 4'});add(svg,'path',{d:path(values),fill:'none',stroke:'#226a85','stroke-width':3});
  if(guided)[0,n/2,n].forEach(i=>{if(Math.abs(values[i]-floor[i])<1e-8)add(svg,'circle',{cx:x(i),cy:y(values[i]),r:4,fill:'white',stroke:'#b57c43','stroke-width':1.7});});
 }
 function stage(){return Math.max(0,...[...root.querySelectorAll('.sg-round-step.visible')].map(e=>Number(e.dataset.round)));}
 let animation,last=-1;
 function draw(s,t){root.dataset.stage=String(s);if(s===0){graph(root.querySelector('[data-sg-guided]'),base,base,false);graph(root.querySelector('[data-sg-unguided]'),base,base,false);return;}const prevG=s>=3?guided2:s>=2?guided1:base,nextG=s>=3?guided3:s>=2?guided2:guided1,prevF=s>=3?free2:s>=2?free1:base,nextF=s>=3?free3:s>=2?free2:free1;
 graph(root.querySelector('[data-sg-guided]'),prevG,prevG.map((v,i)=>v+t*(nextG[i]-v)),true);graph(root.querySelector('[data-sg-unguided]'),prevF,prevF.map((v,i)=>v+t*(nextF[i]-v)),false);root.dataset.stage=String(s);root.dataset.progress=t.toFixed(3);}
 function update(animate){const s=stage();if(s===last)return;last=s;cancelAnimationFrame(animation);if(!animate||s===0||matchMedia('(prefers-reduced-motion: reduce)').matches){draw(s,s===0?0:1);return;}const start=performance.now();function frame(now){const t=Math.min(1,(now-start)/1800);draw(s,t);if(t<1)animation=requestAnimationFrame(frame);}animation=requestAnimationFrame(frame);}
 function bind(){Reveal.on('fragmentshown',()=>update(true));Reveal.on('fragmenthidden',()=>update(false));Reveal.on('slidechanged',()=>{cancelAnimationFrame(animation);last=-1;update(false);});}
 if(window.Reveal?.isReady())bind();else window.Reveal?.on('ready',bind);update(false);
})();
