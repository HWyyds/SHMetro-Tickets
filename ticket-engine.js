/* Pure optimizer: cents, Shanghai time; fare/station APIs are untouched. */
(function(root){
const EFFECTIVE='2026-12-01', DAY=86400000;
const products={day:{name:'一日票',hours:24,price:2400},three:{name:'三日票',hours:72,price:6000}};
const packs=[{count:35,price:19000},{count:45,price:21000},{count:60,price:27000},{count:90,price:39000}];
function stamp(s){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s||''))throw Error('请填写完整北京时间');const v=Date.parse(s+':00+08:00');if(!Number.isFinite(v))throw Error('时间无效');return v}
function rule(date){return date>=EFFECTIVE?{threshold:9000,day:2400,three:6000,new:true}:{threshold:7000,day:1800,three:4500,new:false}}
function scope(t){
 const p=t.result.paths[t.path],codes=[...(p.lines||[]),...(p.stationIds||[]).map(id=>id.slice(0,2))].map(Number);
 const ordinary=s=>/^(?:[1-9]|1[0-8])号线$/.test(s.line)||s.line==='浦江线';
 const excluded=s=>/磁浮|金山/.test(s.line);
 const metro=ordinary(t.from)&&ordinary(t.to)&&codes.length>0&&codes.every(n=>n>=1&&n<=18||n===41||n===61);
 const card=!excluded(t.from)&&!excluded(t.to)&&codes.length>0&&codes.every(n=>n>=1&&n<=18||n===41||n===61||n===51);
 return {metro,card:metro||(t.date>=EFFECTIVE&&card)};
}
function windowFor(kind,start){return {kind,...products[kind],price:rule(start.slice(0,10))[kind],start:stamp(start),end:stamp(start)+products[kind].hours*3600000}}
function optimize(trips,settings,allowed={day:true,three:true},pack=null){
 if(!Number.isFinite(settings.cumulative)||settings.cumulative<0)throw Error('累计金额无效');
 const sorted=trips.map((t,index)=>({...t,index,at:stamp(t.date+'T'+t.time)})).sort((a,b)=>a.at-b.at||a.index-b.index);
 if(!sorted.length)return {total:0,complete:true,rows:[],passes:[],remaining:0};
 const startDate=settings.packStart||sorted[0].date;
 if(pack&&startDate<EFFECTIVE)return {total:null,complete:false,rows:[],passes:[],error:'计次票须在2026-12-01及以后激活'};
 const packStart=pack?stamp(startDate+'T00:00'):0,packEnd=packStart+31*DAY;
 // One selected pack is bought in full. Never assume refunds or resale of unused rides.
 let states=new Map([['initial',{cost:pack?pack.price:0,cum:0,end:0,remaining:pack?pack.count:0,prev:null}]]),previousMonth='';
 for(const t of sorted){
  if(t.needsRefresh)return {total:null,complete:false,rows:[],passes:[],error:'日期更改后需重查票价'};
  const r=rule(t.date),sc=scope(t),path=t.result.paths[t.path],month=t.date.slice(0,7),next=new Map();
  function put(prev,cost,cum,end,remaining,method,charge,reason,purchase=null){
   const row={index:t.index,trip:t,method,charge,reason,before:prev.normalCum,after:cum,reset:!!previousMonth&&previousMonth!==month};
   const key=[cum,end,remaining].join('|'),candidate={cost:prev.cost+cost,cum,end,remaining,prev,row,purchase};
   if(!next.has(key)||candidate.cost<next.get(key).cost)next.set(key,candidate);
  }
  for(const original of states.values()){
   const s={...original,normalCum:previousMonth!==month?(month===settings.month?Math.min(r.threshold,Math.round(settings.cumulative*100)):0):original.cum};
   const cum=s.normalCum,end=s.end>t.at?s.end:0;
   const canUsePack=sc.metro&&pack&&t.at>=packStart&&t.at<packEnd&&s.remaining>0;
   // An extra ride uses a pack only by explicit user choice. Honor that choice
   // whenever the selected pack still covers the ride, even if another fare is cheaper.
   if(canUsePack&&!t.commute&&t.usePack===true){
    put(s,0,cum,end,s.remaining-1,pack.count+'次票',0,'按用户选择扣1次，不计满额累计');
    continue;
   }
   if(sc.metro&&end)put(s,0,cum,end,s.remaining,'已启用通票',0,'进站时处于通票有效期内');
   // Card remains an option while a pass is active: threshold progress can affect later trips.
   const base=sc.card?(Number.isFinite(t.cardPrices?.[t.path])?Math.round(t.cardPrices[t.path]*100):null):Math.round(path.price*100);
   if(base!==null){
    const discount=sc.card&&settings.cardEligible&&(r.new?cum>=r.threshold:cum+base>=r.threshold);
    const charge=discount?Math.round(base*.9):base,newCum=sc.card&&settings.cardEligible?Math.min(r.threshold,cum+charge):cum;
    put(s,charge,newCum,end,s.remaining,sc.card?(discount?'同渠道支付 · 九折':'同渠道支付 · 原价'):'单程票另付',charge,
      discount?'已达到当月满额门槛':sc.card?'本程按接口基础价支付':'不参加满额优惠');
   }
   if(canUsePack&&t.commute&&t.usePack!==false)
    put(s,0,cum,end,s.remaining-1,pack.count+'次票',0,'扣1次，不计满额累计');
   if(sc.metro&&!end)for(const kind of ['day','three'])if(allowed[kind]){
    const p={kind,...products[kind],price:r[kind],start:t.at,end:t.at+products[kind].hours*3600000};
    put(s,p.price,cum,p.end,s.remaining,p.name,0,'本程启用通票',p);
   }
  }
  if(!next.size)return {total:null,complete:false,rows:[],passes:[],error:'部分路径缺少匹配交通卡票价，请重新查询'};
  states=next;previousMonth=month;
 }
 const best=[...states.values()].reduce((a,b)=>a.cost<=b.cost?a:b);
 const rows=[],passes=[];let node=best;
 while(node?.row){rows.push(node.row);if(node.purchase)passes.push(node.purchase);node=node.prev}
 rows.reverse();passes.reverse();
 if(pack)passes.unshift({kind:'count',name:pack.count+'次票',price:pack.price,start:packStart,end:packEnd});
 return {total:best.cost,knownTotal:best.cost,complete:true,rows,passes,remaining:best.remaining,pack,packStart,packEnd};
}
function compare(trips,settings){
 const plain=optimize(trips,settings,{day:false,three:false});
 return [{...plain,name:'同渠道支付 · 满额优惠'},{...optimize(trips,settings),name:'一日 / 三日票＋满额优惠'},
 ...packs.map(pack=>({...optimize(trips,settings,{day:true,three:true},pack),name:pack.count+'次票＋通票 / 另付'}))];
}
function compareSeparate(trips,settings){
 return [
  {...optimize(trips,settings,{day:false,three:false}),name:'刷卡 · 满额优惠'},
  {...optimize(trips,settings,{day:true,three:false}),name:'一日票＋刷卡'},
  {...optimize(trips,settings,{day:false,three:true}),name:'三日票＋刷卡'},
  {...optimize(trips,settings),name:'一日 / 三日票＋刷卡'}
 ];
}
function splitTrips(trips){
 return {shared:trips.filter(t=>t.commute||t.usePack===true),separate:trips.filter(t=>!t.commute&&t.usePack!==true)};
}
const api={products,packs,rule,stamp,windowFor,metroOnly:t=>scope(t).metro,scope,optimize,compare,compareSeparate,splitTrips};
if(typeof module!=='undefined')module.exports=api;else root.MetroTickets=api;
})(typeof window==='undefined'?globalThis:window);
