/* Shared interaction controllers for reveal.js and the reading view.
 * Each widget owns its state; all data are local and numerical work is bounded.
 * Reset restores the documented initial state. Source figures remain available
 * without JavaScript; each numerical widget includes a static text fallback.
 */
(() => {
  'use strict';
  const M=window.TutorialModels, D=window.TUTORIAL_DATA;
  const $=(root,s)=>root.querySelector(s);
  const num=(v,d=1)=>(Math.abs(v)<1e-8?0:Number(v)).toLocaleString('en-US',{maximumFractionDigits:d});
  const button=(label,action,extra='')=>`<button type="button" data-action="${action}" ${extra}>${label}</button>`;
  const reset=()=>button('Reset','reset','class="reset"');
  const select=(label,name,values)=>`<label>${label}<select data-input="${name}">${values.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`;
  const range=(label,name,value,min,max,step=1)=>`<label>${label}<input aria-label="${label}" data-input="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output data-output="${name}">${value}</output></label>`;
  const svg=(body,label,view='0 0 620 280')=>`<svg class="chart" viewBox="${view}" role="img" aria-label="${label}">${body}</svg>`;
  const line=(x1,y1,x2,y2,color='#dce4e9',width=2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
  const text=(x,y,t,extra='')=>`<text x="${x}" y="${y}" ${extra}>${t}</text>`;
  function install(root,html,render,events) {
    root.classList.add('widget');root.innerHTML=html;root.setAttribute('data-ready','true');
    root.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)events(b.dataset.action,b);});
    root.addEventListener('input',e=>{if(e.target.dataset.input)events(e.target.dataset.input,e.target);});
    root.addEventListener('change',e=>{if(e.target.matches('select[data-input]'))events(e.target.dataset.input,e.target);});
    root.addEventListener('keydown',e=>{
      // Fields retain their editing keys. Escape returns focus to the deck.
      // Buttons consume activation keys, but leave slide-navigation keys free.
      const field=e.target.closest('input,select,textarea');
      if(field){if(e.key==='Escape')field.blur();e.stopPropagation();}
      else if(e.target.closest('button')&&(e.key===' '||e.key==='Enter'))e.stopPropagation();
    });
    render();
  }
  function output(root,name,value) {const el=$(root,`[data-output="${name}"]`);if(el)el.textContent=value;}
  function cubes(value) {return `<div class="cubes" aria-hidden="true">${Array.from({length:Math.min(12,Math.abs(value))},()=>`<i class="cube ${value<0?'debt':''}"></i>`).join('')}</div>`;}
  function inventory(root) {
    const initialStock=0;
    let firstOrder=2,nextOrder=1,phase=0,lastPhase=0;
    let demands=[null,null],replayDemands=null;
    const money=v=>'$'+num(v,0);
    const inventoryLabel=v=>v>0?`${v} unit${v===1?'':'s'} left in stock`:v<0?`${-v} unit${v===-1?'':'s'} of unmet demand`:'No stock or unmet demand';
    const outcome=r=>`<div class="inventory-outcome ${r.next<0?'shortage':'leftover'}"><strong>${inventoryLabel(r.next)}</strong>${cubes(r.next)}<span>${r.next<0?'Stockout':r.next>0?'Holding':'Holding / stockout'} cost: <b>${money(r.holding+r.stockout)}</b></span></div>`;
    const html=`<p class="inventory-prompt" aria-live="polite"></p><div class="toolbar inventory-controls">${range('First order','order',2,0,6)}<div class="next-order-control" hidden>${range('Next order','next-order',1,0,6)}</div>${button('Place first order','advance','class="primary"')}<div class="inventory-replays" hidden>${button('Replay same demands','replay')}</div>${button('New run','reset','class="reset"')}</div><div class="inventory-periods"><span>Period 1</span><span>Period 2</span></div><div class="decision-timeline" aria-label="Order, demand, next order, next demand"></div><div class="inventory-ledger" aria-live="polite"></div>`;
    function render(){
      const first=M.inventoryCosts(initialStock,firstOrder,demands[0]??0,false);
      const second=M.inventoryCosts(first.next,nextOrder,demands[1]??0,false);
      const prompts=replayDemands?[
        'Compare: choose a different first order for the same demand path.',
        'Predict: how will this order change stock or unmet demand?',
        'Choose again: what order makes sense with the stock or backlog you now have?',
        'Predict: how will the total cost change on this same demand path?',
        'Discuss: what changed? One demand path does not establish which policy is best.'
      ]:[
        'Your choice: order 2, 4, or 6 units? Be ready to explain why.',
        'Predict: will this order leave stock, unmet demand, or neither?',
        'Choose again: how should the stock or backlog change your next order?',
        'Predict: will the next order cover both backlog and new demand?',
        'Discuss: would you change your first order? Compare using Replay same demands.'
      ];
      const prompt=$(root,'.inventory-prompt');
      const separator=prompts[phase].indexOf(':')+1;
      const cue=document.createElement('strong');
      cue.className='inventory-prompt-label';
      cue.textContent=prompts[phase].slice(0,separator);
      prompt.replaceChildren(cue,document.createTextNode(prompts[phase].slice(separator)));
      const entering=phase!==lastPhase?phase-1:-1;
      const card=(index,title,body)=>`<div class="decision-event ${phase>=index+1?'complete':'pending'} ${index===Math.min(phase,3)?'current':''} ${index===entering?'entering':''}"><div class="event-heading"><span>${index+1}</span><strong>${title}</strong></div>${body}</div>`;
      const unknown='<strong class="event-quantity">?</strong><p class="event-detail">Not yet observed</p>';
      const firstBody=`<p class="event-detail">Start: <b>${initialStock}</b> in stock</p><strong class="event-quantity">+${firstOrder}<small> units</small></strong><div class="order-parcels">${cubes(firstOrder)}</div><p class="event-detail">${phase>=1?`Purchase: <b>${money(first.purchase)}</b>`:'Choose before demand'}</p>`;
      const demandBody=phase>=2?`<strong class="event-quantity">−${demands[0]}<small> units</small></strong>${outcome(first)}`:unknown;
      const nextBody=phase>=2?`<p class="event-detail carry-label">Carry: <b>${first.next>=0?first.next+' in stock':(-first.next)+' unmet'}</b></p><strong class="event-quantity">+${nextOrder}<small> units</small></strong><div class="order-parcels">${cubes(nextOrder)}</div><p class="event-detail">${phase>=3?`Purchase: <b>${money(second.purchase)}</b>`:'Choose using this outcome'}</p>`:'<strong class="event-quantity">…</strong><p class="event-detail">Use the first outcome.</p>';
      const finalBody=phase>=4?`<strong class="event-quantity">−${demands[1]}<small> units</small></strong>${outcome(second)}`:unknown;
      $(root,'.decision-timeline').innerHTML=card(0,'Order',firstBody)+card(1,'Demand',demandBody)+card(2,'Order again',nextBody)+card(3,'Demand',finalBody);
      const purchase=(phase>=1?first.purchase:0)+(phase>=3?second.purchase:0);
      const holding=(phase>=2?first.holding:0)+(phase>=4?second.holding:0);
      const stockout=(phase>=2?first.stockout:0)+(phase>=4?second.stockout:0);
      $(root,'.inventory-ledger').innerHTML=`<span class="cost-heading">Costs ${phase===4?'over both periods':'so far'}</span><span class="cost-purchases">Purchases <b>${money(purchase)}</b></span><span class="cost-holding">Holding <b>${money(holding)}</b></span><span class="cost-stockout">Stockout <b>${money(stockout)}</b></span><strong>Total ${money(purchase+holding+stockout)}</strong>`;
      const firstInput=$(root,'[data-input="order"]'),nextInput=$(root,'[data-input="next-order"]');
      firstInput.value=firstOrder;firstInput.disabled=phase>0;output(root,'order',firstOrder);
      nextInput.value=nextOrder;nextInput.disabled=phase!==2;output(root,'next-order',nextOrder);
      $(root,'.next-order-control').hidden=phase<2;
      const advance=$(root,'[data-action="advance"]');
      advance.textContent=['Place first order','Reveal first demand','Place next order','Reveal next demand','Complete'][phase];advance.disabled=phase===4;advance.hidden=phase===4;
      $(root,'.inventory-replays').hidden=phase!==4;
      lastPhase=phase;
    }
    install(root,html,render,(name,el)=>{
      if(name==='order'&&phase===0)firstOrder=+el.value;
      if(name==='next-order'&&phase===2)nextOrder=+el.value;
      if(name==='advance'&&phase<4){
        if(phase===1)demands[0]=replayDemands?replayDemands[0]:M.sampleInventoryDemand(0);
        if(phase===3)demands[1]=replayDemands?replayDemands[1]:M.sampleInventoryDemand(1);
        phase++;
      }
      if(name==='reset'||(name==='replay'&&phase===4)){
        replayDemands=name==='replay'?[...demands]:null;
        demands=[null,null];firstOrder=2;nextOrder=1;phase=0;
      }
      render();
    });
    root.setAttribute('data-navigation-steps','');
    root.addEventListener('demo-next-request',event=>{
      if(phase===4||(root.classList.contains('fragment')&&!root.classList.contains('visible')))return;
      event.preventDefault();
      $(root,'[data-action="advance"]').click();
    });
  }
  function notation(root) {
    let step=0;
    const entries=[['State s₀','4','Stock before ordering. Positive is stock; negative is backlog.'],['Action a₀','2','Order selected before observing demand.'],['Demand g₀','5','A realized value of the random demand G₀.'],['Next state s₁','1','Carry this inventory into the next period.'],['Cost c(s,a)','','Expected ordering, holding, backlog, disposal, and lost-sales cost.'],['Policy π(s)','','An illustrative rule orders toward 6: π(4) = 2 and π(−1) = 6.']];
    install(root,`<div class="toolbar">${button('Next term','next')}${reset()}</div><div class="term-grid"></div><div class="status" aria-live="polite"></div>`,()=>{
      $(root,'.term-grid').innerHTML=entries.slice(0,4).map(([label,v],i)=>`<div style="opacity:${i<=step?1:.25}"><span class="label">${label}</span><strong class="big-number">${i<=step?v:'?'}</strong></div>`).join('');
      $(root,'.status').textContent=entries[step][0]+': '+entries[step][2];$(root,'[data-action="next"]').disabled=step===5;
    },name=>{step=name==='reset'?0:Math.min(step+1,5);root.querySelector('.term-grid').innerHTML=entries.slice(0,4).map(([label,v],i)=>`<div style="opacity:${i<=step?1:.25}"><span class="label">${label}</span><strong class="big-number">${i<=step?v:'?'}</strong></div>`).join('');$(root,'.status').textContent=entries[step][0]+': '+entries[step][2];$(root,'[data-action="next"]').disabled=step===5;});
  }
  function scale(root) {
    let j=1;
    const count=base=>{
      const exact=BigInt(base)**BigInt(j), full=exact.toLocaleString('en-US');
      let shown=full;
      if(exact>=1000000000n){
        const [mantissa,exponent]=Number(exact).toExponential(2).split('e');
        shown=`<span class="count-approx">≈</span> ${mantissa} × 10<sup>${Number(exponent)}</sup>`;
      }
      return `<strong class="big-number" data-count="${exact}" title="${full}" aria-label="${full}">${shown}</strong>`;
    };
    const render=()=>{output(root,'products',j);$(root,'.counts').innerHTML=`<div class="panel blue"><span class="label">15 inventory levels per product</span>${count(15)}<span>15<sup>${j}</sup> joint states</span></div><div class="panel peach"><span class="label">4 order choices per product</span>${count(4)}<span>4<sup>${j}</sup> candidate joint actions</span></div>`;$(root,'input').value=j;};
    install(root,`<div class="toolbar">${range('Products','products',1,1,30)}${reset()}</div><div class="cols counts" aria-live="polite"></div>`,render,(name,el)=>{j=name==='reset'?1:+el.value;render();});
    root.setAttribute('data-navigation-steps','');
    root.addEventListener('demo-next-request',event=>{
      if(j>=30||root.closest('.fragment:not(.visible)'))return;
      event.preventDefault();
      j=Math.min(30,j+5);
      render();
    });
  }
  function methods(root) {
    let selected='optimization';
    function render(){
      root.querySelectorAll('[data-action="method"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.method===selected)));
      root.querySelectorAll('.method-detail').forEach(panel=>{panel.hidden=panel.id!==`method-panel-${selected}`;});
    }
    install(root,root.innerHTML,render,(name,el)=>{
      if(name==='reset')selected='optimization';
      else if(name==='method')selected=el.dataset.method;
      render();
    });
  }
  function animateCorFit(path) {
    // Reading/no-script output retains the complete fitted curve in the SVG.
    if(!path.closest('.reveal'))return;
    const panel=path.closest('.fragment'), initial=path.dataset.fitStart, fitted=path.getAttribute('d');
    const numbers=/-?\d+(?:\.\d+)?/g;
    const from=initial.match(numbers).map(Number), to=fitted.match(numbers).map(Number);
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0, visible, printing=false;
    function update(force=false){
      const next=panel.classList.contains('visible');
      if(!force&&next===visible)return;
      visible=next;cancelAnimationFrame(frame);
      if(reduced.matches||printing){path.setAttribute('d',fitted);return;}
      path.setAttribute('d',initial);
      if(!visible)return;
      const begins=performance.now()+600, duration=2400;
      function tick(now){
        const t=Math.max(0,Math.min(1,(now-begins)/duration)), blend=t*t*(3-2*t);
        let i=0;
        const d=t===1?fitted:fitted.replace(numbers,()=>{const j=i++;return (from[j]+blend*(to[j]-from[j])).toFixed(2);});
        path.setAttribute('d',d);
        if(t<1)frame=requestAnimationFrame(tick);
      }
      frame=requestAnimationFrame(tick);
    }
    new MutationObserver(()=>update()).observe(panel,{attributes:true,attributeFilter:['class']});
    reduced.addEventListener('change',()=>update(true));
    window.addEventListener('beforeprint',()=>{printing=true;update(true);});
    window.addEventListener('afterprint',()=>{printing=false;update(true);});
    update();
  }
  function flow(root){
    let p=.5;
    function render(){const low=.8*p+.3*(1-p), high=1-low;output(root,'split',p.toFixed(2));$(root,'input').value=p;
      let b='';[[85,140,270,65,p],[85,140,270,215,1-p],[270,65,510,65,p*.8],[270,65,510,215,p*.2],[270,215,510,65,(1-p)*.3],[270,215,510,215,(1-p)*.7]].forEach(([x,y,x2,y2,w])=>b+=line(x,y,x2,y2,'#80b8b0',2+14*w));
      [[85,140,'Start: 1'],[270,65,`Low order: ${p.toFixed(2)}`],[270,215,`High order: ${(1-p).toFixed(2)}`],[510,65,`Low stock: ${low.toFixed(2)}`],[510,215,`High stock: ${high.toFixed(2)}`]].forEach(([x,y,t])=>{b+=`<circle cx="${x}" cy="${y}" r="12" fill="#267f77"/>`+text(x,y+32,t,'text-anchor="middle"');});
      b+=text(325,25,'Transition probabilities: low order (0.8, 0.2); high order (0.3, 0.7)','text-anchor="middle"');
      $(root,'.plot').innerHTML=svg(b,'Probability flow conserved from one starting state to two next states');$(root,'.status').textContent=`Next-state mass: ${low.toFixed(2)} + ${high.toFixed(2)} = 1.00.`;}
    install(root,`<div class="toolbar">${range('Probability of low order','split',.5,0,1,.05)}${reset()}</div><div class="plot"></div><div class="status" aria-live="polite"></div>`,render,(n,e)=>{p=n==='reset'?.5:+e.value;render();});
  }
  function meters(action){const r=M.resources(action);return `<div class="resource-pair">${r.map((v,i)=>`<div>Resource ${i+1}: <strong>${num(v)} / ${[14,20][i]}</strong><div class="meter ${v>[14,20][i]?'bad':''}"><span style="width:${100*v/[14,20][i]}%"></span></div></div>`).join('')}</div>`;}
  function products(root){
    let a=[0,0,0];function render(){root.querySelectorAll('.product').forEach((b,i)=>b.setAttribute('aria-pressed',String(!!a[i])));$(root,'.resources').innerHTML=meters(a);$(root,'.status').textContent=`Action ${a.join('')}: ${M.feasible(a)?'feasible':'infeasible'}.`;}
    install(root,`<div class="toolbar"><span class="small">Choose which products to offer</span>${reset()}</div><div class="products">${[0,1,2].map(i=>button(`<strong>Product ${i+1}</strong><small>Resource 1: ${[2,10,8][i]}<br>Resource 2: ${[3,18,15][i]}</small>`,'product',`class="product" data-index="${i}" aria-pressed="false"`)).join('')}</div><div class="resources"></div><div class="status" aria-live="polite"></div>`,render,(name,el)=>{if(name==='reset')a=[0,0,0];else a[+el.dataset.index]=1-a[+el.dataset.index];render();});
  }
  function marginals(root){
    let shown=false,draws=[],random=M.rng(42),proof=false;
    function render(){const outcomes=[[1,0,0],[1,0,1],[1,1,0],[1,1,1]];$(root,'.outcomes').innerHTML=shown?`<table class="compact-table"><tr><th>Joint action</th><th>Probability</th><th>Resource 2</th><th>Feasible?</th></tr>${outcomes.map(a=>`<tr><td>${a.join('')}</td><td>¼</td><td>${M.resources(a)[1]} / 20</td><td>${M.feasible(a)?'Yes':'No'}</td></tr>`).join('')}</table>`:'<div class="panel peach">Expected use: <strong>11 ≤ 14</strong> and <strong>19.5 ≤ 20</strong>.<br>Does this guarantee a feasible joint action?</div>';
      $(root,'.status').textContent=proof?'Product 1 is always offered. Feasibility then requires product 2 never to be offered. These marginals cannot come from any feasible joint distribution.':draws.length?`${draws.length} seeded draws; ${draws.filter(a=>!M.feasible(a)).length} infeasible. Exact independent violation probability: 50%.`:'Predict first, then reveal the four equally likely independent outcomes.';}
    install(root,`<div class="toolbar">${button('Show outcomes','show')}${button('Draw 20 actions','draw')}${button('Can correlation fix this?','proof')}${reset()}</div><div class="outcomes"></div><div class="status" aria-live="polite"></div>`,render,(n)=>{if(n==='reset'){shown=false;proof=false;draws=[];random=M.rng(42);}if(n==='show')shown=true;if(n==='draw'){shown=true;proof=false;for(let i=0;i<20;i++)draws.push([1,+(random()<.5),+(random()<.5)]);}if(n==='proof'){shown=true;proof=true;}render();});
  }
  function network(root){
    let selected='000';
    function render(){const levels=[[''],['0','1'],['00','01','10'],['000','001','010','100','101']];let b='';const pos={};levels.forEach((ls,i)=>ls.forEach((p,j)=>{pos[p]=[40+i*170,30+(j+.5)*210/ls.length];}));
      levels.slice(1).forEach(ls=>ls.forEach(p=>{const [x,y]=pos[p.slice(0,-1)],[xx,yy]=pos[p];const active=selected.startsWith(p);b+=line(x,y,xx,yy,active?'#267f77':'#dce4e9',active?5:2)+text((x+xx)/2,(y+yy)/2-8,p.slice(-1));}));
      Object.entries(pos).forEach(([p,[x,y]])=>{b+=`<circle cx="${x}" cy="${y}" r="7" fill="${selected.startsWith(p)?'#267f77':'#b7c4cc'}"/>`;if(p.length===3)b+=text(x+15,y+5,p);});
      b+=text(35,275,'Start')+text(180,275,'Product 1')+text(350,275,'Product 2')+text(515,275,'Product 3');
      $(root,'.plot').innerHTML=svg(b,`Selected feasible path ${selected}. Layers are products, not periods.`);$(root,'.status').textContent=`Path ${selected}: resource use ${M.resources(selected.split('').map(Number)).join(' and ')}. No path represents 110.`;$(root,'select').value=selected;}
    install(root,`<div class="toolbar">${select('Feasible action','path',M.actions.map(a=>[a.join(''),a.join('')]))}${reset()}</div><div class="plot"></div><div class="status" aria-live="polite"></div>`,render,(n,e)=>{selected=n==='reset'?'000':e.value;render();});
  }
  function support(root){let p=.3;function render(){output(root,'weight',p.toFixed(2));$(root,'input').value=p;$(root,'.support-view').innerHTML=`<div class="panel blue"><span class="label">Action 000 · offer nothing</span><strong class="big-number">${(1-p).toFixed(2)}</strong></div><div class="panel sage"><span class="label">Action 010 · offer product 2</span><strong class="big-number">${p.toFixed(2)}</strong></div>`;$(root,'.status').textContent=`Supported offering mass: product 1 = 0; product 2 = ${p.toFixed(2)}; product 3 = 0. Total weight = 1.`;}
    install(root,`<div class="toolbar">${range('Weight of 010','weight',.3,0,1,.05)}${reset()}</div><div class="cols support-view"></div><div class="status" aria-live="polite"></div><p class="hint">Illustrative weights · only represented feasible actions receive mass</p>`,render,(n,e)=>{p=n==='reset'?.3:+e.value;render();});}
  function allocation(root){let k=0,t=0;const mode=root.dataset.mode, data=D.allocation;
    function render(){const row=data.trace[k], prices=row.pricing[t];output(root,'checkpoint',k);$(root,'input').value=k;$(root,'select').value=t;
      if(mode==='pricing'){
        $(root,'.body').innerHTML=`<div class="replay-grid"><div><span class="label">Period ${t} · current represented support</span><div class="pills">${row.support[t].map(a=>`<span class="pill">${a.join('')}</span>`).join('')}</div><span class="label">Restricted LP objective</span><strong class="big-number">${num(row.objective)}</strong><p class="small">Component prices for action 1: ${prices.duals.map(d=>num(d[1])).join(', ')}<br>Probability-budget price: ${num(prices.simplex)}</p></div><div><table class="compact-table"><tr><th>Feasible action</th><th>Reduced cost</th></tr>${data.actions.map((a,i)=>`<tr class="${prices.scores[i]>1e-7&&prices.scores[i]===Math.max(...prices.scores)?'selected':''}"><td>${a.join('')}</td><td>${num(prices.scores[i])}</td></tr>`).join('')}</table></div></div>`;
      }else{
        let b='';for(let v=0;v<=60;v+=20)b+=line(45,235-v*3,570,235-v*3)+text(32,240-v*3,v,'text-anchor="end"');
        ['objective','policy'].forEach((key,j)=>{const points=data.trace.slice(0,k+1).map((r,i)=>`${65+i*150},${235-r[key]*3+(j?3:0)}`).join(' ');b+=`<polyline points="${points}" fill="none" stroke="${j?'#a4592f':'#267f77'}" stroke-width="3" ${j?'stroke-dasharray="5 4"':''}/>`;});
        data.trace.forEach((r,i)=>{b+=text(65+i*150,265,i,'text-anchor="middle"');if(i<=k)b+=`<circle cx="${65+i*150}" cy="${235-r.objective*3}" r="5" fill="#267f77"/>`;});
        $(root,'.body').innerHTML=`<div class="replay-grid"><div>${svg(b,'Restricted objective and exactly evaluated deterministic policy reward by refinement checkpoint')}<p class="fine">Checkpoint → · teal: LP objective · dashed orange: policy reward (coincident here)</p></div><div><span class="label">Restricted objective / policy reward</span><strong class="big-number">${num(row.objective)} / ${num(row.policy)}</strong><p class="small">Period ${t} support: ${row.support[t].map(a=>a.join('')).join(', ')}</p><p class="small">Positive weights: ${row.weights[t].map(([a,w])=>`${a.join('')}: ${num(w,2)}`).join('; ')}</p></div></div>`;
      }
      $(root,'.status').textContent=Math.max(...prices.scores)>1e-7?'An improving feasible action remains. The next checkpoint re-solves the enriched LP.':'No positive reduced cost in this period. Exact pricing checks every feasible action.';
    }
    install(root,`<div class="toolbar">${range('Checkpoint','checkpoint',0,0,3)}${select('Period','period',[[0,'0'],[1,'1']])}${reset()}</div><div class="body"></div><div class="status" aria-live="polite"></div><p class="hint">Prepared research-code replay · no solver runs in the browser</p>`,render,(n,e)=>{if(n==='reset'){k=0;t=0;}if(n==='checkpoint')k=+e.value;if(n==='period')t=+e.value;render();});
  }
  function boundary(root){let s=0,a=0,g=7;function render(){const r=M.inventory(s,a,g);['state','order','demand'].forEach((n,i)=>{output(root,n,[s,a,g][i]);$(root,`[data-input="${n}"]`).value=[s,a,g][i];});$(root,'.status').textContent=`${s} + ${a} − ${g} = ${r.raw} before limits → next state ${r.next}. Backlog ${r.backlog}; lost sales ${r.lost}; disposal ${r.disposal}.`;}
    install(root,`<div class="toolbar">${range('State','state',0,-4,12)}${range('Order','order',0,0,6)}${range('Demand','demand',7,0,10)}${reset()}</div><div class="status" aria-live="polite"></div>`,render,(n,e)=>{if(n==='reset'){s=0;a=0;g=7;}if(n==='state')s=+e.value;if(n==='order')a=+e.value;if(n==='demand')g=+e.value;render();});}
  const presets=[[2,-2],[0,-1],[5,-3]];
  function paintHeat(canvas,values,table,gibbs=false,points=[]){
    const ctx=canvas.getContext('2d'), w=canvas.width,h=canvas.height,nx=table.states.length,ny=table.actions.length;
    const lo=Math.min(...values),hi=Math.max(...values);ctx.clearRect(0,0,w,h);
    for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
      const v=values[i*ny+j],q=gibbs?v/hi:1-Math.log1p(v-lo)/Math.log1p(hi-lo);
      const pale=[241,247,249],dark=[34,106,133];ctx.fillStyle=`rgb(${pale.map((p,k)=>Math.round(p+(dark[k]-p)*q)).join(',')})`;
      ctx.fillRect(i*w/nx,(ny-1-j)*h/ny,Math.ceil(w/nx)+1,Math.ceil(h/ny)+1);
    }
    points.forEach(([i,j])=>{ctx.beginPath();ctx.arc((i+.5)*w/nx,(ny-j-.5)*h/ny,4,0,Math.PI*2);ctx.fillStyle='#efac6d';ctx.fill();ctx.strokeStyle='#182c3e';ctx.stroke();});
  }
  function heatmap(root){const isGibbs=root.dataset.mode==='gibbs',table=D.inventory;let preset=0,b0=1500,lambda=100,si=48,ai=3;
    function render(){const [b1,b2]=presets[preset],f=M.landscape(table,b1,b2),weights=M.gibbs(f,lambda),value=f[si*table.actions.length+ai],min=Math.min(...f);paintHeat($(root,'canvas'),isGibbs?weights:f,table,isGibbs,[[si,ai]]);
      output(root,'lambda',lambda);output(root,'intercept',b0);$(root,'[data-input="state"]').value=table.states[si].toFixed(1);$(root,'[data-input="action"]').value=table.actions[ai].toFixed(2);
      $(root,'.readout').innerHTML=isGibbs?`<span class="label">Fixed β₁ = 2, β₂ = −2</span><strong>λ = ${lambda}</strong><p class="small">Dark regions receive more probability.<br>Grid-cell mass at selected pair: ${(weights[si*table.actions.length+ai]*100).toFixed(2)}%</p><p class="small">Smaller λ: more concentrated.<br>Larger λ: more diffuse.</p>`:`<span class="label">β₁ = ${b1}, β₂ = ${b2} · β₀ = ${b0}</span><strong>f = ${num(value)}</strong><p>β₀ − f = ${num(b0-value)}<br><b>${value<b0?'Violated':'Satisfied'}</b> at this grid point.</p><p class="small">Grid minimum f: ${num(min)}.<br>Darker = smaller f, not automatically violated.</p>`;
      $(root,'.status').textContent=`Inspect s = ${num(table.states[si])}, a = ${num(table.actions[ai],2)}. Grid illustration; not a continuous feasibility certificate.`;
    }
    const controls=isGibbs?range('Concentration λ','lambda',100,50,200,25):select('Coefficients','preset',presets.map((p,i)=>[i,`β₁=${p[0]}, β₂=${p[1]}`]))+range('Intercept β₀','intercept',1500,0,3000,100);
    install(root,`<div class="toolbar">${controls}${reset()}</div><div class="heat-layout"><div><div class="heat-axes"><span>Order a: 6 ↑</span><span>${isGibbs?'Relative probability density':'Constraint threshold f'}</span></div><canvas width="486" height="246" role="img" aria-label="Inventory state-action heatmap; use state and order inputs to inspect values"></canvas><div class="heat-axes"><span>0 · Inventory s: −4</span><span>12 →</span></div></div><div class="readout"></div></div><div class="toolbar"><label>Inspect state<input data-input="state" type="number" min="-4" max="12" step="0.2" value="5.6"></label><label>Inspect order<input data-input="action" type="number" min="0" max="6" step="0.15" value="0.45"></label></div><div class="status fine" aria-live="polite"></div>`,render,(n,e)=>{if(n==='reset'){preset=0;b0=1500;lambda=100;si=48;ai=3;root.querySelectorAll('select').forEach(s=>s.value='0');if($(root,'[data-input="lambda"]'))$(root,'[data-input="lambda"]').value=100;if($(root,'[data-input="intercept"]'))$(root,'[data-input="intercept"]').value=1500;}if(n==='preset')preset=+e.value;if(n==='lambda')lambda=+e.value;if(n==='intercept')b0=+e.value;if(n==='state')si=M.clamp(Math.round((+e.value+4)/.2),0,80);if(n==='action')ai=M.clamp(Math.round(+e.value/.15),0,40);render();});
    $(root,'canvas').addEventListener('click',e=>{const r=e.target.getBoundingClientRect();si=M.clamp(Math.floor((e.clientX-r.left)/r.width*81),0,80);ai=M.clamp(40-Math.floor((e.clientY-r.top)/r.height*41),0,40);render();});
  }
  function sampling(root){let seed=7;function render(){const table=D.inventory,f=M.landscape(table),random=M.rng(seed),points=Array.from({length:20},()=>[Math.floor(random()*81),Math.floor(random()*41)]);const hits=points.filter(([i,j])=>f[i*41+j]<1500).length;$(root,'.sample-result').textContent=`${hits} of 20 grid samples violate β₀ ≤ f at β₀ = 1500. A sample can miss a violating region.`;}
    install(root,`<div class="toolbar">${button('Draw another fixed-size sample','draw')}${reset()}</div><div class="status sample-result" aria-live="polite"></div><p class="hint">20 uniformly sampled grid pairs · quadratic coefficients (2, −2) · deterministic seeds</p>`,render,n=>{seed=n==='reset'?7:seed+1;render();});}
  function density(root){let p=.5;const vals=[2,6,9];function render(){output(root,'mass',p.toFixed(2));$(root,'input').value=p;const w=[p,(1-p)/2,(1-p)/2],mean=w.reduce((a,b,i)=>a+b*vals[i],0);$(root,'.plot').innerHTML=svg(vals.map((v,i)=>`<rect x="${70+i*180}" y="${230-v*20}" width="75" height="${v*20}" fill="${i===0?'#e9bb97':'#9ac5c2'}"/>`+text(107+i*180,255,`f = ${v}`,'text-anchor="middle"')+text(107+i*180,40,`weight ${w[i].toFixed(2)}`,'text-anchor="middle"')).join(''),'Three values and their sampling weights');$(root,'.status').textContent=`Weighted average = ${mean.toFixed(2)} ≥ minimum = 2.`;}
    install(root,`<div class="toolbar">${range('Mass on smallest value','mass',.5,0,1,.05)}${reset()}</div><div class="plot"></div><div class="status" aria-live="polite"></div>`,render,(n,e)=>{p=n==='reset'?.5:+e.value;render();});}
  function steps(root,labels,descriptions){let k=0;function render(){root.querySelectorAll('[data-action="step"]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===k)));$(root,'.status').textContent=descriptions[k];}install(root,`<div class="toolbar">${labels.map((t,i)=>button(t,'step',`data-index="${i}"`)).join('')}${reset()}</div><div class="status" aria-live="polite"></div>`,render,(n,e)=>{k=n==='reset'?0:+e.dataset.index;render();});}
  function features(root){let count=3;const random=M.rng(17),params=Array.from({length:12},()=>[random()*Math.PI*2,.15+random()*1.2]);function render(){output(root,'features',count);$(root,'input').value=count;let b=line(45,140,590,140);for(let n=0;n<count;n++){const [phase,freq]=params[n],points=Array.from({length:101},(_,i)=>{const s=-4+i*.16;return `${45+i*5.4},${140-80*Math.cos(phase+freq*s)}`;}).join(' ');b+=`<polyline points="${points}" fill="none" stroke="${['#267f77','#226a85','#b76a35','#9c81a8'][n%4]}" stroke-width="2" opacity=".75"/>`;}b+=text(45,260,'−4')+text(580,260,'12')+text(310,278,'Inventory s','text-anchor="middle"');$(root,'.plot').innerHTML=svg(b,`${count} fixed-seed random cosine features over inventory`);}
    install(root,`<div class="toolbar">${range('Features','features',3,1,12)}${reset()}</div><div class="plot"></div><p class="hint">Fixed seed 17 · nested illustrative features · coefficients are not fitted in this widget</p>`,render,(n,e)=>{count=n==='reset'?3:+e.value;render();});}

  // Group the shared Markdown content into reading sections where Pandoc leaves it flat.
  const reading=document.querySelector('main[aria-label="Tutorial reading view"]');
  if(reading){[...reading.querySelectorAll(':scope > h2')].forEach(h=>{const section=document.createElement('section');section.className='level2 '+h.className;section.id=h.id;h.removeAttribute('id');h.className='';reading.insertBefore(section,h);section.append(h);while(section.nextSibling&&section.nextSibling.nodeName!=='H2')section.append(section.nextSibling);});
    const jump=document.querySelector('#reading-jump');reading.querySelectorAll('section.level2').forEach((s,i)=>{const o=document.createElement('option');o.value=s.id;o.textContent=`${i+1}. ${s.querySelector('h2').textContent}`;jump.append(o);});
    jump.addEventListener('change',()=>{
      const section=document.getElementById(jump.value);
      if(!section)return;
      history.replaceState(history.state,'','#'+section.id);
      section.scrollIntoView({behavior:'instant'});
      const slideView=document.querySelector('[data-slide-view]');
      if(slideView)slideView.hash='/'+section.id;
    });
  }
  const deck=document.querySelector('.reveal');
  if(deck){const original=deck.querySelector('.logo-strip');if(original){const footer=original.cloneNode(true);footer.classList.add('projected-footer');footer.querySelectorAll('img').forEach(img=>{if(img.dataset.src)img.src=img.dataset.src;img.removeAttribute('data-src');img.loading='eager';});deck.append(footer);}}
  const controllers={inventory,notation,scale,methods,flow,products,marginals,network,support,allocation,boundary,heatmap,sampling,density,features,
    psmd:r=>steps(r,['Sample','Update coefficients','Update density'],['Sample constraints using the current density and simulate next states.','Use gradient information to adjust the coefficients; the feature class stays fixed.','Redirect sampling as the violation landscape changes. This is adaptation within optimize.']),
    guide:r=>steps(r,['Add features','Keep the guide','Solve again'],['Retain the previous features and add a new batch.','Require the new value function to lie above the previous one, state by state.','Satisfy the Bellman inequalities as well as the guide. Zero new coefficients recover the previous solution.'])};
  document.querySelectorAll('[data-widget]').forEach(root=>{try{controllers[root.dataset.widget](root);}catch(error){console.error('Widget failed:',root.dataset.widget,error);root.dataset.error=error.message;}});
  document.querySelectorAll('.cor-fit[data-fit-start]').forEach(animateCorFit);
  window.TUTORIAL_READY=true;
})();
