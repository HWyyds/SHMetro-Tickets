/* Calendar generation is local; the caller queries existing fare APIs. */
(function(root){
function dates(start,days,custom=''){
 if(!Number.isInteger(days)||days<1||days>31)throw Error('通勤天数请输入1–31');
 if(custom.trim()){
  const list=[...new Set(custom.trim().split(/[\s,，]+/))].sort();
  if(list.length!==days)throw Error('指定日期数量须等于通勤天数');
  for(const d of list)if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||new Date(d+'T12:00:00Z').toISOString().slice(0,10)!==d)throw Error('日期格式或日期无效');
  return list;
 }
 const d=new Date(start+'T12:00:00Z'),list=[];if(!Number.isFinite(+d))throw Error('请选择通勤开始日期');
 while(list.length<days){if(d.getUTCDay()!==0&&d.getUTCDay()!==6)list.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1)}
 return list;
}
function schedule(start,days,weekdays=[1,2,3,4,5],overrides={}){
 if(!Number.isInteger(days)||days<1||days>31)throw Error('通勤天数请输入1–31');
 const d=new Date(start+'T12:00:00Z');
 if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==start)throw Error('请选择通勤开始日期');
 if(!weekdays.length||weekdays.some(n=>!Number.isInteger(n)||n<0||n>6))throw Error('请至少选择一个每周上班日');
 const base=[];
 while(base.length<days){if(weekdays.includes(d.getUTCDay()))base.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1)}
 const selected=new Set(base);
 for(const [date,work] of Object.entries(overrides)){
  const parsed=new Date(date+'T12:00:00Z');
  if(!Number.isFinite(+parsed)||parsed.toISOString().slice(0,10)!==date)throw Error('日期无效');
  if(date<start)continue;
  if(work)selected.add(date);else selected.delete(date);
 }
 return [...selected].sort();
}
function monthDates(month,weekdays=[1,2,3,4,5],overrides={}){
 if(!/^\d{4}-\d{2}$/.test(month))throw Error('请选择通勤月份');
 const d=new Date(month+'-01T12:00:00Z');
 if(!Number.isFinite(+d)||d.toISOString().slice(0,7)!==month)throw Error('请选择通勤月份');
 if(!weekdays.length||weekdays.some(n=>!Number.isInteger(n)||n<0||n>6))throw Error('请至少选择一个每周上班日');
 const list=[];
 while(d.toISOString().slice(0,7)===month){
  const date=d.toISOString().slice(0,10);
  if(overrides[date]??weekdays.includes(d.getUTCDay()))list.push(date);
  d.setUTCDate(d.getUTCDate()+1);
 }
 return list;
}
const api={dates,schedule,monthDates};if(typeof module!=='undefined')module.exports=api;else root.MetroCommute=api;
})(typeof window==='undefined'?globalThis:window);
