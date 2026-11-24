const assert=require('node:assert/strict'),T=require('./ticket-engine'),C=require('./commute');
const settings={month:'2026-12',cumulative:0,cardEligible:true,packStart:'2026-12-01'};
function trip(date='2026-12-01',time='08:00',price=6,line='16号线',code='16'){
 return {from:{line},to:{line},date,time,path:0,result:{paths:[{price,lines:[code],stationIds:[code+'21',code+'22']}]},cardPrices:[price]};
}
const noPass={day:false,three:false};
assert.equal(T.rule('2026-11-30').threshold,7000);assert.equal(T.rule('2026-12-01').threshold,9000);
assert.equal(T.optimize([trip()],{...settings,cumulative:84},noPass).total,600);
assert.equal(T.optimize([trip()],{...settings,cumulative:90},noPass).total,540);
assert.equal(T.optimize([trip()],{...settings,cumulative:90,cardEligible:false},noPass).total,600);
assert.equal(T.optimize([trip('2027-01-01')],{...settings,cumulative:90},noPass).total,600);
assert.equal(T.optimize([trip('2026-12-01','08:00',20,'市域机场线','51')],{...settings,cumulative:90},noPass).total,1800);
assert.equal(T.optimize([trip('2026-12-01','08:00',50,'磁浮线','50')],{...settings,cumulative:90},noPass).total,5000);
const dates=C.dates('2026-12-01',20);assert.equal(dates.length,20);assert.equal(dates[0],'2026-12-01');
assert.deepEqual(C.schedule('2026-12-01',20),dates);
assert.equal(C.schedule('2026-12-01',31,[0,1,2,3,4,5,6]).at(-1),'2026-12-31');
assert.deepEqual(C.schedule('2026-12-01',2,[1],{'2026-12-07':false,'2026-12-05':true}),['2026-12-05','2026-12-14']);
assert.deepEqual(C.schedule('2026-12-31',2,[0,1,2,3,4,5,6],{'2027-01-01':false,'2027-01-02':true}),['2026-12-31','2027-01-02']);
assert.throws(()=>C.schedule('2026-12-01',20,[]));
assert.throws(()=>C.schedule('2026-02-30',20));
assert.throws(()=>C.dates('2026-12-01',20,'2026-12-01'));assert.throws(()=>C.dates('2026-12-01',0));
const december=C.monthDates('2026-12');
assert.equal(december.length,23);assert.equal(december[0],'2026-12-01');assert.equal(december.at(-1),'2026-12-31');
assert.equal(C.monthDates('2027-05')[0],'2027-05-03');
assert.equal(C.monthDates('2028-02',[0,1,2,3,4,5,6]).length,29);
assert(!C.monthDates('2026-12',[1,2,3,4,5],{'2026-12-01':false}).includes('2026-12-01'));
assert(C.monthDates('2026-12',[1,2,3,4,5],{'2026-12-05':true}).includes('2026-12-05'));
assert.throws(()=>C.monthDates('2026-13'));assert.throws(()=>C.monthDates('2026-12',[]));
const commute=dates.flatMap(d=>[trip(d,'08:00'),trip(d,'18:00')]).map(t=>({...t,commute:true,usePack:true}));assert.equal(commute.length,40);
assert.equal(T.optimize(commute,settings,noPass).total,22500); // 15*6 + 25*5.4
let p=T.optimize(commute,settings,noPass,T.packs[1]);assert.equal(p.total,21000);assert.equal(p.remaining,5);
p=T.optimize(commute,settings,noPass,T.packs[0]);assert.equal(p.total,22000);assert.equal(p.remaining,0);
const unknown=trip();unknown.cardPrices=[];assert.equal(T.optimize([unknown],settings,noPass).complete,false);
assert.equal(T.optimize([trip('2027-01-01')],settings,noPass,T.packs[1]).total,21600);
const weekend=['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'].map(time=>({...trip('2026-12-05',time,9),usePack:false}));
console.time('commute plus weekend');p=T.optimize([...commute,...weekend],settings,{day:true,three:true},T.packs[1]);console.timeEnd('commute plus weekend');
assert(p.passes.some(x=>x.kind==='day'));assert(p.rows.filter(r=>r.trip.usePack===false).every(r=>!r.method.includes('次票')));
assert(p.remaining>=5);assert.equal(p.total,p.passes.reduce((a,x)=>a+x.price,0)+p.rows.reduce((a,r)=>a+r.charge,0));
assert(p.passes.every(x=>Number.isFinite(x.price)));
const extra=trip('2026-12-05','13:00');
assert.equal(T.optimize([extra],settings,noPass,T.packs[1]).remaining,45,'Extra rides require an explicit choice');
assert.equal(T.optimize([{...extra,usePack:false}],settings,noPass,T.packs[1]).remaining,45);
assert.equal(T.optimize([{...extra,usePack:true}],settings,noPass,T.packs[1]).remaining,44);
// A free active day pass must not override the user choosing to spend a count.
const withPass=[{...trip('2026-12-05','08:00',50),commute:true,usePack:false},{...extra,usePack:true}];
assert(T.optimize(withPass,settings,{day:true,three:false},T.packs[1]).rows[1].method.includes('次票'));
assert.equal(T.optimize([{...trip('2027-01-01'),usePack:true}],settings,noPass,T.packs[1]).remaining,45,'Expired pack falls back to payment');
assert.equal(T.optimize(Array.from({length:36},(_,i)=>({...trip('2026-12-05',`${String(Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`),usePack:true})),settings,noPass,T.packs[0]).remaining,0);
console.log('PASS: effective date, 90-yuan threshold, city rail, exclusions, 20 days/40 trips, pack exhaustion/expiry, weekend opt-out and pass combination.');
// Separate outings must never include the commuting pack purchase or its rides.
const split=T.splitTrips([...commute,{...extra,usePack:false}]);
assert.equal(split.shared.length,40);assert.equal(split.separate.length,1);
assert.equal(T.compare(split.shared,settings)[3].total,21000);
let separatePlans=T.compareSeparate(split.separate,settings);
assert.equal(separatePlans.length,4);assert.equal(separatePlans[0].total,600);
assert(separatePlans.every(plan=>!plan.pack&&plan.passes.every(pass=>pass.kind!=='count')));
const joined=T.splitTrips([...commute,{...extra,usePack:true}]);
assert.equal(joined.shared.length,41);assert.equal(joined.separate.length,0);
assert.equal(T.compare(joined.shared,settings)[3].remaining,4);
// Multiple independent rides may benefit from a new day/three-day pass.
const outings=['09:00','10:00','11:00','12:00','13:00'].map(time=>({...trip('2026-12-05',time,9),usePack:false}));
separatePlans=T.compareSeparate(outings,settings);
assert.equal(separatePlans[0].total,4500);assert.equal(separatePlans[1].total,2400);
assert.equal(separatePlans[1].passes[0].kind,'day');
assert.equal(T.compare(split.shared,settings)[3].total,21000,'Separate rides leave commute costs unchanged');
console.log('PASS: split membership, independent costs, no pack in separate comparisons, day passes for separate outings.');
