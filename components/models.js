/* Pure teaching models. No DOM, network requests, or solver backend. */
(function (root) {
  'use strict';
  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
  function inventory(s, a, demand) {
    const raw = s + a - demand;
    const next = clamp(raw, -4, 12);
    return {next, raw, stock:Math.max(next,0), backlog:Math.max(-next,0),
      lost:Math.max(-4-raw,0), disposal:Math.max(raw-12,0)};
  }
  function inventoryCosts(s, a, demand, bounded=true) {
    // The introductory timeline carries all unmet demand forward. Later model
    // demonstrations retain the manuscript's storage and backlog limits.
    const raw=s+a-demand;
    const result=bounded?inventory(s,a,demand):{
      raw,next:raw,stock:Math.max(raw,0),backlog:Math.max(-raw,0),lost:0,disposal:0
    };
    const purchase=20*a, holding=result.stock, stockout=25*result.backlog+3000*result.lost;
    const disposal=5*result.disposal;
    return {...result,purchase,holding,stockout,disposal,total:purchase+holding+stockout+disposal};
  }
  // Small discrete teaching distributions; later slides use the full model.
  function sampleInventoryDemand(period, random=Math.random) {
    return (period===0?3:1)+Math.floor(random()*3);
  }
  const resources = a => [2*a[0]+10*a[1]+8*a[2],3*a[0]+18*a[1]+15*a[2]];
  const feasible = a => {const r=resources(a);return r[0]<=14 && r[1]<=20;};
  const actions = Array.from({length:8},(_,i)=>[i>>2,(i>>1)&1,i&1]).filter(feasible);
  function rng(seed=17) {
    let n=seed>>>0;
    return () => {n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};
  }
  function landscape(table, b1=2, b2=-2) {
    return table.moments.map(([cost,m1,m2],i)=>{
      const s=table.states[Math.floor(i/table.actions.length)];
      return (cost-b1*(s-table.gamma*m1)-b2*(s*s-table.gamma*m2))/(1-table.gamma);
    });
  }
  function gibbs(values, lambda) {
    if (!(lambda>0)) throw new Error('lambda must be positive');
    const min=Math.min(...values);
    const weights=values.map(v=>Math.exp(-(v-min)/lambda));
    const total=weights.reduce((a,b)=>a+b,0);
    return weights.map(w=>w/total);
  }
  const model={clamp,inventory,inventoryCosts,sampleInventoryDemand,resources,feasible,actions,rng,landscape,gibbs};
  if(typeof module!=='undefined' && module.exports) module.exports=model;
  root.TutorialModels=model;
})(typeof window!=='undefined'?window:globalThis);
