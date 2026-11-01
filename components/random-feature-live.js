(() => {
 const root=document.querySelector('[data-demo-id="random-features"]');if(!root)return;
 const counts=[1,3,5,12,24,48],editor=root.querySelector('[data-demo-editor]'),run=root.querySelector('[data-demo-run]'),previous=root.querySelector('[data-feature-previous]'),next=root.querySelector('[data-feature-next]');
 function current(){return Number(editor.value.match(/^num_features\s*=\s*(\d+)/m)?.[1]||1);}
 function update(){const n=current(),busy=root.getAttribute('aria-busy')==='true';previous.disabled=busy||n<=counts[0];next.disabled=busy||n>=counts[counts.length-1];}
 function change(direction){const n=current();const values=direction>0?counts.filter(v=>v>n):counts.filter(v=>v<n).reverse();if(!values.length)return;editor.value=editor.value.replace(/^num_features\s*=.*$/m,'num_features = '+values[0]);editor.dispatchEvent(new Event('input',{bubbles:true}));run.click();update();}
 root.addEventListener('demo-next-request',event=>{if(current()<counts[counts.length-1]){event.preventDefault();change(1);}});
 previous.addEventListener('click',()=>change(-1));next.addEventListener('click',()=>change(1));editor.addEventListener('input',update);root.querySelector('[data-demo-reset]').addEventListener('click',update);new MutationObserver(update).observe(root,{attributes:true,attributeFilter:['aria-busy']});update();
})();
