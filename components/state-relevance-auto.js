(() => {
 const root=document.querySelector('[data-demo-id="state-relevance"]');if(!root)return;
 const run=root.querySelector('[data-demo-run]'),output=root.querySelector('[data-demo-output]');let observer;
 function start(){if(!root.closest('section').classList.contains('present')||root.dataset.autoRequested)return;if(run.disabled){observer??=new MutationObserver(start);observer.observe(run,{attributes:true,attributeFilter:['disabled']});return;}observer?.disconnect();root.dataset.autoRequested='true';run.click();}
 function bind(){Reveal.on('slidechanged',start);start();}if(window.Reveal?.isReady())bind();else window.Reveal?.on('ready',bind);
})();
