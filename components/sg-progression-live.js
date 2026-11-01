(() => {
 const root=document.querySelector('[data-demo-id="feature-sequences"]');if(!root)return;
 const editor=root.querySelector('[data-demo-editor]'),run=root.querySelector('[data-demo-run]'),previous=root.querySelector('[data-progression-previous]'),next=root.querySelector('[data-progression-next]'),label=root.querySelector('[data-progression-count]');let current=0;
 function update(){const busy=root.getAttribute('aria-busy')==='true';previous.disabled=busy||current===0;next.disabled=busy||current>=3;label.textContent='N = '+current;}
 function compute(n){editor.value='num_features = '+n+'\nplot_self_guided_progression(num_features)';run.click();update();}
 root.addEventListener('demo-next-request',event=>{if(current<3){event.preventDefault();compute(current+1);}});
 previous.addEventListener('click',()=>{if(current>0)compute(current-1);});next.addEventListener('click',()=>{if(current<3)compute(current+1);});
 root.addEventListener('demo-images-ready',()=>{current=Number(editor.value.match(/num_features = (\d+)/)?.[1]||0);update();});
 new MutationObserver(update).observe(root,{attributes:true,attributeFilter:['aria-busy']});update();
})();
