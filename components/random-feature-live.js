(() => {
 const root=document.querySelector('[data-demo-id="random-features"]');if(!root)return;
 const counts=[1,3,5],editor=root.querySelector('[data-demo-editor]'),run=root.querySelector('[data-demo-run]'),previous=root.querySelector('[data-feature-previous]'),next=root.querySelector('[data-feature-next]');
 function current(){return Number(editor.value.match(/^num_features\s*=\s*(\d+)/m)?.[1]||1);}
 function update(){const n=current(),busy=root.getAttribute('aria-busy')==='true';previous.disabled=busy||n<=counts[0];next.disabled=busy||n>=counts[counts.length-1];}
 function showParameters(details) {
  root.querySelector('.random-feature-results')?.remove();
  if (!details) return;
  const results = document.createElement('div');
  results.className = 'random-feature-results';
  const tables = document.createElement('div');
  tables.className = 'random-feature-tables';
  for (const family of details.families) {
   const scroll = document.createElement('div');
   scroll.className = 'random-feature-table-scroll';
   scroll.tabIndex = 0;
   scroll.setAttribute('role', 'region');
   scroll.setAttribute('aria-label', `${family.name} parameters for ${details.numFeatures} features`);
   const table = document.createElement('table');
   const caption = table.createCaption();
   caption.textContent = `${family.name} · RMSE = ${family.rmse.toPrecision(4)}`;
   const header = table.createTHead().insertRow();
   for (const label of ['Feature', 'b', 'ω']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    header.append(cell);
   }
   const body = table.createTBody();
   for (const feature of family.features) {
    const row = body.insertRow();
    const index = document.createElement('th');
    index.scope = 'row';
    index.textContent = String(feature.index);
    row.append(index);
    for (const value of [feature.b, feature.omega]) {
     const cell = row.insertCell();
     cell.textContent = value.toFixed(4);
    }
   }
   scroll.append(table);
   tables.append(scroll);
  }
  results.append(tables);
  const output = root.querySelector('[data-demo-output]');
  output.insertBefore(results, output.querySelector('.continuous-python-log'));
 }
 root.addEventListener('demo-images-ready', event => showParameters(event.detail?.randomFeatureFit));
 root.addEventListener('demo-clear', () => root.querySelector('.random-feature-results')?.remove());
 function change(direction){const n=current();const values=direction>0?counts.filter(v=>v>n):counts.filter(v=>v<n).reverse();if(!values.length)return;editor.value=editor.value.replace(/^num_features\s*=.*$/m,'num_features = '+values[0]);editor.dispatchEvent(new Event('input',{bubbles:true}));run.click();update();}
 root.addEventListener('demo-next-request',event=>{if(current()<counts[counts.length-1]){event.preventDefault();change(1);}});
 previous.addEventListener('click',()=>change(-1));next.addEventListener('click',()=>change(1));editor.addEventListener('input',update);root.querySelector('[data-demo-reset]').addEventListener('click',update);new MutationObserver(update).observe(root,{attributes:true,attributeFilter:['aria-busy']});update();
})();
