/* Rules checked against service.shmetro.com/{cpxz,pwyh}/index.htm, 2026-10-31.
   All monetary calculations use cents. Inputs are Shanghai local times. */
(function(root){
  const products={day:{name:'一日票',hours:24,price:1800},three:{name:'三日票',hours:72,price:4500}};
  function stamp(local){
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local||''))throw Error('请填写完整的北京时间');
    const value=Date.parse(local+':00+08:00');
    if(!Number.isFinite(value))throw Error('时间无效');
    return value;
  }
  function metroOnly(trip){
    const path=trip.result.paths[trip.path];
    const codes=[...(path.lines||[]),...(path.stationIds||[]).map(id=>id.slice(0,2))];
    const stationOK=s=>/^(?:[1-9]|1[0-8])号线$/.test(s.line)||s.line==='浦江线';
    return stationOK(trip.from)&&stationOK(trip.to)&&codes.length>0&&codes.every(c=>{const n=Number(c);return (n>=1&&n<=18)||n===41||n===61});
  }
  function windowFor(kind,start){return {kind,...products[kind],start:stamp(start),end:stamp(start)+products[kind].hours*3600000}}
  function plan(trips,settings,passes){
    const sorted=trips.map((t,index)=>({...t,index,at:stamp(t.date+'T'+t.time)})).sort((a,b)=>a.at-b.at||a.index-b.index);
    let month='',cumulative=0,total=passes.reduce((s,p)=>s+p.price,0),complete=true;
    const rows=[];
    for(const t of sorted){
      const nextMonth=t.date.slice(0,7);
      const reset=!!month&&month!==nextMonth;
      if(month!==nextMonth){month=nextMonth;cumulative=month===settings.month?Math.round(settings.cumulative*100):0}
      const before=cumulative,eligible=metroOnly(t),path=t.result.paths[t.path];
      const pass=eligible&&passes.find(p=>t.at>=p.start&&t.at<p.end);
      let charge=null,method='',reason='',discount=false;
      if(pass){charge=0;method=pass.name;reason='进站时处于有效期内';}
      else{
        const base=Number.isFinite(t.cardPrices?.[t.path])?Math.round(t.cardPrices[t.path]*100):null;
        reason=!eligible?'包含特殊线路或缺少线路信息，通票不可整程覆盖':passes.length?(passes.some(p=>t.at<p.start)?'未启用 / 不在有效窗口内':'通票已到期'):'未使用通票';
        if(!eligible){method='另购单程票';charge=Math.round(path.price*100);reason+='；按官方单程票另付（跨系统优惠未拆分）';}
        else if(base===null){method='交通卡票价待查';complete=false;reason+='；未取得相同路径交通卡基础价';}
        else if(settings.cardEligible){
          discount=cumulative+base>=7000;
          charge=discount?Math.round(base*0.9):base;
          cumulative=Math.min(7000,cumulative+base);
          method=discount?'交通卡 · 9折':'交通卡 · 原价';
          if(discount&&before<7000)reason+='；本笔达到70元，即享9折';
        }else{charge=base;method='交通卡 · 无累计优惠资格';}
      }
      if(charge!==null)total+=charge;
      rows.push({index:t.index,trip:t,charge,method,reason,discount,before,after:cumulative,reset,eligible,pass:pass?.kind||null});
    }
    return {rows,passes,total:complete?total:null,knownTotal:total,complete};
  }
  function compare(trips,settings){
    if(!Number.isFinite(settings.cumulative)||settings.cumulative<0)throw Error('累计金额应为不小于0的数字');
    const day=windowFor('day',settings.dayStart),three=windowFor('three',settings.threeStart);
    return [
      {name:'交通卡 / 特殊线路另购票',...plan(trips,settings,[])},
      {name:'一日票 + 交通卡',...plan(trips,settings,[day])},
      {name:'三日票 + 交通卡',...plan(trips,settings,[three])},
      {name:'一日票 + 三日票 + 交通卡',...plan(trips,settings,[day,three])}
    ];
  }
  const api={products,stamp,metroOnly,windowFor,plan,compare};
  if(typeof module!=='undefined')module.exports=api;else root.MetroTickets=api;
})(typeof window==='undefined'?globalThis:window);
