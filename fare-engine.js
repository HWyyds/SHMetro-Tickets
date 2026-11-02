(function(root){
  const endpoint='https://m.shmetro.com/interface/plantrip/pt.aspx';
  function search(stations,query,line='全部线路'){
    const q=query.trim().toLowerCase().replace(/[\s·•]/g,'');
    return stations.filter(s=>(line==='全部线路'||s.line===line)&&(!q||s.name.replace(/[·•]/g,'').includes(q)||s.initials.includes(q)||s.pinyin.includes(q)));
  }
  function url(from,to,week,ticket='oneWay'){
    return endpoint+'?'+new URLSearchParams({func:'plantrip',startId:from,endId:to,planTime:'00:59',week:String(week),ticket,type:'0'});
  }
  function parse(data,from,to){
    if(String(data.startId)!==from||String(data.endId)!==to)throw Error('官方返回站点与请求不一致');
    const paths=(data.pathList||[]).map(p=>{
      const price=String(p.price??'').trim();
      if(!/^\d+(\.\d+)?$/.test(price)||Number(price)<=0) return null;
      return {price:Number(price),type:p.type||'路径',stations:(p.passStationList||[]).map(s=>s.stationName),stationIds:(p.passStationList||[]).map(s=>String(s.stationId)),lines:(p.transferStationList||[]).map(s=>String(s.line))};
    }).filter(Boolean);
    if(!paths.length)throw Error('官方未返回可用单程票价');
    return {price:paths[0].price,paths,queriedAt:new Date().toISOString()};
  }
  async function query(from,to,date,fetcher=fetch,ticket='oneWay'){
    if(!from?.queryable||!to?.queryable)throw Error('此线路未被当前官方接口覆盖，票价暂不可用');
    if(from.id===to.id)throw Error('请选择不同的起终点；同站进出不按普通行程计算');
    const week=new Date(date+'T12:00:00+08:00').getUTCDay();
    if(!Number.isInteger(week))throw Error('请选择有效日期');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetcher(url(from.id,to.id,week,ticket),{signal:controller.signal,credentials:'omit'});
      if(!response.ok)throw Error('官方接口 HTTP '+response.status);
      return parse(await response.json(),from.id,to.id);
    }finally{clearTimeout(timer)}
  }
  function matchCardPath(path,cardResult){
    if(!path.stationIds?.length)return null;
    const matches=cardResult.paths.filter(p=>p.stationIds?.join('|')===path.stationIds.join('|'));
    return matches.length && matches.every(p=>p.price===matches[0].price)?matches[0].price:null;
  }
  const api={search,url,parse,query,matchCardPath};
  if(typeof module!=='undefined')module.exports=api;else root.MetroFare=api;
})(typeof window==='undefined'?globalThis:window);
