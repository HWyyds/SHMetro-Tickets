const assert=require('node:assert/strict'),T=require('./ticket-engine.js');
function trip(date,time,price=3,lines=['16']){return {date,time,from:{name:'龙阳路',line:'16号线'},to:{name:'滴水湖',line:'16号线'},result:{paths:[{price,lines,stations:['龙阳路','滴水湖'],stationIds:['1621','1633']}]},path:0,cardPrices:[price]}}
const s={month:'2026-10',cumulative:0,cardEligible:true};
let a=T.optimize([trip('2026-10-31','12:00'),trip('2026-11-01','12:00')],s,{day:true,three:true});
assert.equal(a.passes.filter(x=>x.kind==='day').length,0);assert.equal(a.passes.filter(x=>x.kind==='three').length,0);assert.equal(a.total,600);
const tue=trip('2026-10-27','09:00',20),thu=trip('2026-10-29','09:00',20),fri=trip('2026-10-30','08:00',20);
a=T.optimize([tue,thu,fri],s,{day:true,three:true});assert.equal(a.passes.filter(x=>x.kind==='day').length,2);assert.equal(a.passes.filter(x=>x.kind==='three').length,0);assert.equal(a.total,3600,'Tue+Thu day passes, Fri covered by Thu pass');
a=T.optimize([trip('2026-10-27','09:00',20),trip('2026-10-27','18:00',20),trip('2026-10-28','09:00',20)],s,{day:true,three:false});assert.equal(a.passes.length,2);assert.equal(a.rows.filter(r=>r.pass==='day').length,3);
a=T.optimize([trip('2026-10-27','09:00',20),trip('2026-10-29','09:00',20),trip('2026-10-30','09:00',20)],s,{day:false,three:true});assert.equal(a.passes.filter(x=>x.kind==='three').length,0);assert.equal(a.total,6000);
const r=T.optimize([trip('2026-10-27','09:00',20),trip('2026-10-29','09:00',20),trip('2026-10-30','08:00',20)],{...s,cumulative:0},{day:true,three:false});assert.equal(r.total,3600); // two one-day passes cover Thu and Fri; Tue uses one
assert.throws(()=>T.optimize([trip('2026-10-27','09:00')],{...s,cumulative:-1}));
console.log('PASS: multi-day dynamic optimization, 24h overlap, 72h pass, pass counts, monthly card state.');
