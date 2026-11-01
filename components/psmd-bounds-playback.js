(() => {
 document.querySelectorAll('[data-static-sequence]').forEach(root=>{
  const frames=[...root.querySelectorAll('.static-plot-frames img')];let index=0;
  const previous=root.querySelector('[data-sequence-previous]'),next=root.querySelector('[data-sequence-next]');
  function render(){frames.forEach((f,i)=>f.hidden=i!==index);previous.disabled=index===0;next.disabled=index===frames.length-1;root.querySelector('[data-sequence-status]').textContent=`${index+1} / ${frames.length}`;}
  root.addEventListener('demo-next-request',event=>{if(index<frames.length-1){event.preventDefault();index++;render();}});
  previous.addEventListener('click',()=>{if(index>0){index--;render();}});next.addEventListener('click',()=>{if(index<frames.length-1){index++;render();}});render();
 });
})();
