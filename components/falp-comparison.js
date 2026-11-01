(() => {
 const root=document.querySelector('[data-falp-comparison]');if(!root)return;
 const svg=root.querySelector('svg'),ns='http://www.w3.org/2000/svg';
 const states=Array.from({length:21},(_,i)=>-1+i/10),gamma=.9;
 const phi=states.map(s=>[1,Math.cos(.15+1.4*s),Math.cos(-.3+2.1*s),Math.cos(.2+3.3*s)]),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
 const transitions=states.map(s=>[-.45,.45].map(a=>({next:Math.round((Math.max(-1,Math.min(1,.75*s+a))+1)*10),cost:.35+(s-.25)**2+.12*a*a})));
 const bellman=v=>transitions.map(actions=>Math.min(...actions.map(a=>a.cost+gamma*v[a.next])));
 function solve(A,b){const n=b.length,m=A.map((row,i)=>[...row,b[i]]);for(let j=0;j<n;j++){let p=j;for(let k=j+1;k<n;k++)if(Math.abs(m[k][j])>Math.abs(m[p][j]))p=k;if(Math.abs(m[p][j])<1e-10)return null;[m[j],m[p]]=[m[p],m[j]];const scale=m[j][j];for(let k=j;k<=n;k++)m[j][k]/=scale;for(let i=0;i<n;i++)if(i!==j){const t=m[i][j];for(let k=j;k<=n;k++)m[i][k]-=t*m[j][k];}}return m.map(row=>row[n]);}
 const rows=[],costs=[];transitions.forEach((actions,i)=>actions.forEach(a=>{rows.push(phi[i].map((v,j)=>v-gamma*phi[a.next][j]));costs.push(a.cost);}));
 const solutions=[states.map(()=>0)],scores=[];
 for(let dimension=2;dimension<=4;dimension++){
  const A=rows.map(row=>row.slice(0,dimension)),objective=Array.from({length:dimension},(_,j)=>phi.reduce((sum,row)=>sum+row[j],0)/21);let best=0,beta=Array(dimension).fill(0);
  function visit(selected,start){if(selected.length===dimension){const b=solve(selected.map(i=>A[i]),selected.map(i=>costs[i]));if(!b)return;const score=dot(objective,b);if(score>best&&A.every((row,i)=>dot(row,b)<=costs[i]+1e-8)){best=score;beta=b;}return;}for(let i=start;i<=A.length-(dimension-selected.length);i++)visit([...selected,i],i+1);}
  visit([],0);solutions.push(phi.map(row=>dot(row.slice(0,dimension),beta)));scores.push(best);
 }
 let truth=states.map(()=>0);
 for(let i=0;i<1000;i++){const next=bellman(truth),error=Math.max(...next.map((v,j)=>Math.abs(v-truth[j])));truth=next;if(error<1e-11)break;}
 const observed=[0,3,6,10,14,17,20],gram=[0,1,2,3].map(i=>[0,1,2,3].map(j=>observed.reduce((sum,k)=>sum+phi[k][i]*phi[k][j],0))),rhs=[0,1,2,3].map(i=>observed.reduce((sum,k)=>sum+phi[k][i]*truth[k],0));
 const regBeta=solve(gram,rhs),regression=phi.map(row=>dot(row,regBeta));
 const maxViolation=Math.max(...solutions.flatMap(v=>v.map((value,i)=>value-bellman(v)[i])));
 if(maxViolation>1e-6||solutions.some(v=>v.some((value,i)=>value>truth[i]+1e-6))||scores.some((score,i)=>i&&score<scores[i-1]-1e-7))throw new Error('Toy FALP feasibility or nested-objective check failed.');
 root.dataset.maxViolation=maxViolation.toFixed(9);root.dataset.solved='true';root.dataset.objectives=JSON.stringify(scores);
 const ymax=Math.max(...truth,...regression)*1.3,y=v=>205-175*v/ymax,x=(i,right)=>55+(right?565:0)+i*23;
 function node(tag,attrs={},text){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,String(v)));if(text)e.textContent=text;svg.append(e);return e;}
 function curve(values,right,color,dashed=false){return node('path',{d:values.map((v,i)=>(i?'L':'M')+x(i,right)+','+y(v)).join(' '),fill:'none',stroke:color,'stroke-width':3,...(dashed?{'stroke-dasharray':'6 5'}:{})});}
 let animation,started=0,phase="regression";
 function render(alpha){alpha=Math.max(0,Math.min(1,alpha));const showFalp=root.closest('section').querySelector('.falp-right-trigger').classList.contains('visible');svg.replaceChildren();[false,true].forEach(right=>{if(right&&!showFalp)return;node('path',{d:`M${x(0,right)} 20V205H${x(20,right)}`,stroke:'#a3b4bc',fill:'none'});node('text',{x:x(10,right),y:242,'text-anchor':'middle','font-size':15,fill:'#536770'},'state');node('text',{x:x(0,right),y:225,'font-size':12,fill:'#536770'},'−1');node('text',{x:x(20,right),y:225,'font-size':12,fill:'#536770'},'1');});
  const regAlpha=phase==='falp'?1:alpha;
  // Different candidate coefficients, finally settling at the least-squares optimum.
  const offsets=[[.65,-.25,.15,-.1],[-.45,.35,-.1,.2],[.25,-.2,.2,-.1],[0,0,0,0]];
  const rp=Math.min(2.999999,regAlpha*3),ri=Math.floor(rp),rt=regAlpha===1?1:Math.min(1,(rp-ri)/.7);
  const weights=regBeta.map((value,j)=>value+offsets[ri][j]*(1-rt)+offsets[ri+1][j]*rt);
  const reg=phi.map(row=>dot(row,weights));
  const progress=phase==='falp'?alpha:0,step=Math.min(2,Math.floor(progress*3)),within=progress===1?1:Math.min(1,(progress*3-step)/.6);
  const v=solutions[step].map((value,i)=>value*(1-within)+solutions[step+1][i]*within),tv=bellman(v);
  observed.forEach(i=>{node('path',{d:`M${x(i,false)} ${y(truth[i])}V${y(reg[i])}`,stroke:'#c9d4d9','stroke-width':1.5});node('circle',{cx:x(i,false),cy:y(truth[i]),r:4,fill:'#182c3e'});});curve(reg,false,'#226a85');if(showFalp){curve(tv,true,'#c78842');curve(v,true,'#226a85');
  curve(truth,true,'#182c3e',true);
  v.forEach((value,i)=>{if(Math.abs(tv[i]-value)<1e-6)node('circle',{cx:x(i,true),cy:y(value),r:5,fill:'white',stroke:'#c78842','stroke-width':2});});
  node('text',{x:635,y:16,'font-size':15,fill:'#182c3e'},'Dashed V* (unknown)');
  node('text',{x:1000,y:16,'font-size':15,fill:'#267f77'},'N = '+(step+1));root.dataset.featureCount=String(step+1);
  }root.dataset.minSlack=Math.min(...tv.map((value,i)=>value-v[i])).toFixed(9);root.dataset.progress=alpha.toFixed(3);
 }
 function play(which="regression"){phase=which;cancelAnimationFrame(animation);started=performance.now();const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;function frame(now){const alpha=reduced?1:Math.min(1,(now-started)/(phase==='falp'?9000:6000));render(alpha);if(alpha<1)animation=requestAnimationFrame(frame);}animation=requestAnimationFrame(frame);}
 root.querySelector('[data-falp-replay]').addEventListener('click',()=>play(root.closest('section').querySelector('.falp-right-trigger').classList.contains('visible')?'falp':'regression'));
 function bind(){Reveal.on('fragmentshown',event=>{if(event.fragment.classList.contains('falp-comparison'))play('regression');if(event.fragment.classList.contains('falp-right-trigger'))play('falp');});Reveal.on('fragmenthidden',event=>{if(event.fragment.classList.contains('falp-comparison')){cancelAnimationFrame(animation);phase='regression';render(0);}if(event.fragment.classList.contains('falp-right-trigger')){cancelAnimationFrame(animation);phase='regression';render(1);}});Reveal.on('slidechanged',()=>{if(!root.closest('section').classList.contains('present'))cancelAnimationFrame(animation);});}
 if(window.Reveal?.isReady())bind();else window.Reveal?.on('ready',bind);render(0);
})();
