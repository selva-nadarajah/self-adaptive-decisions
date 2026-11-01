(() => {
 const root=document.querySelector('[data-demo-id="gibbs-density"]');if(!root)return;
 let frames=[], index=0;
 const controls=root.querySelector('.demo-controls');
 const previous=document.createElement('button');previous.type='button';previous.textContent='Previous Density';
 const next=document.createElement('button');next.type='button';next.textContent='Next Density';
 const count=document.createElement('span');count.className='gibbs-frame-count';
 const run=controls.querySelector('[data-demo-run]');run.after(previous,next,count);
 function render(){frames.forEach((f,i)=>f.hidden=i!==index);previous.disabled=!frames.length||index===0;next.disabled=!frames.length||index===frames.length-1;count.textContent=frames.length?`${index+1} / ${frames.length}`:'';}
 previous.addEventListener('click',()=>{if(index>0){index--;render();}});
 next.addEventListener('click',()=>{if(index<frames.length-1){index++;render();}});
 root.addEventListener('demo-next-request',event=>{if(index<frames.length-1){event.preventDefault();index++;render();}});
 root.addEventListener('demo-clear',()=>{frames=[];index=0;render();});
 root.addEventListener('demo-images-ready',()=>{frames=[...root.querySelectorAll('.demo-output img')];index=0;render();});
 render();
 function bind(){Reveal.on('fragmentshown',event=>{if(event.fragment.contains(root)&&!root.dataset.completed&&root.getAttribute('aria-busy')!=='true')root.querySelector('[data-demo-run]').click();});}
 if(window.Reveal?.isReady())bind();else window.Reveal?.on('ready',bind);
})();
