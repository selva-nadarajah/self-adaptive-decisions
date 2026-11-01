/* A real SciPy solve in a worker. No runtime download until the participant runs it. */
(() => {
  const workerURL = new URL('python-worker.js', document.currentScript.src);
  document.querySelectorAll('[data-python-lab]').forEach(root => {
    const editor = root.querySelector('textarea'), original = editor.value;
    const status = root.querySelector('[data-python-status]');
    const output = root.querySelector('[data-python-output]');
    const run = root.querySelector('[data-python-run]'), stop = root.querySelector('[data-python-stop]');
    let worker, timer;
    function busy(value) {run.disabled=value;stop.disabled=!value;root.setAttribute('aria-busy',String(value));}
    function terminate(message) {worker?.terminate();worker=null;clearTimeout(timer);busy(false);status.textContent=message;}
    function line(parent, tag, text, className) {
      const element=document.createElement(tag);element.textContent=text;
      if(className)element.className=className;parent.append(element);return element;
    }
    function show(data) {
      if(!Number.isFinite(data.objective)||!Array.isArray(data.weights)||data.weights.length!==2)
        throw new Error('result must contain the solution returned by solve_display_lp.');
      output.replaceChildren();
      line(output,'span','Solved LP · expected net profit','python-caption');
      line(output,'strong',`$${data.objective.toFixed(2)}`,'python-objective');
      data.weights.forEach((rows,t)=>{
        const period=line(output,'div','', 'python-period');line(period,'b',`Period ${t}`);
        rows.filter(r=>r.probability>1e-7).forEach(r=>{
          const row=line(period,'div','', 'python-weight');line(row,'span',r.name);
          line(row,'strong',`${(100*r.probability).toFixed(0)}%`);
          const bar=line(row,'i','');bar.style.width=`${Math.max(0,Math.min(100,100*r.probability))}%`;
        });
      });
      line(output,'p',`Randomized-policy net profit: $${data.policy_profit.toFixed(2)}`,'python-policy');
      line(output,'small',`Display costs: $${data.costs.join(' / $')} · ${data.variables} variables`);
    }
    run.addEventListener('click',()=>{
      busy(true);output.replaceChildren();status.textContent=worker?'Solving…':'Starting Python and loading the local solver…';
      if(!worker) {
        worker=new Worker(workerURL);
        worker.onmessage=({data})=>{
          if(data.type==='status'){status.textContent=data.text;return;}
          if(data.type==='stdout')return;
          clearTimeout(timer);busy(false);
          if(data.type==='error'){status.textContent='Python error — edit the code and run again.';line(output,'pre',data.text,'python-error');return;}
          try {show(data.value);status.textContent='Optimal · solved in your browser with SciPy / HiGHS.';}
          catch(error){status.textContent=error.message;}
        };
        worker.onerror=event=>{event.preventDefault();terminate('Python could not start. Check the local runtime files and try again.');};
      }
      worker.postMessage({code:editor.value});
      timer=setTimeout(()=>terminate('Stopped after 90 seconds. You can edit the code and try again.'),90000);
    });
    stop.addEventListener('click',()=>terminate('Stopped. Run again to restart Python.'));
    root.querySelector('[data-python-reset]').addEventListener('click',()=>{
      terminate('Ready · first run loads Python and SciPy.');editor.value=original;
      output.replaceChildren();line(output,'p','Run the code to see the optimized display weights.');
    });
    editor.addEventListener('input',()=>{if(!run.disabled)status.textContent='Code changed · run to update the solution.';});
    editor.addEventListener('keydown',event=>{
      if(event.key==='Escape'){editor.blur();event.stopPropagation();}
      else event.stopPropagation();
    });
    root.dataset.ready='true';
  });
  window.PYTHON_LAB_READY=true;
})();
