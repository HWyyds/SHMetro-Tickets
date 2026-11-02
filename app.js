/* All fares come from the endpoint used by service.shmetro.com/cphc/index.htm. */
const D=window.METRO_DATA, $=s=>document.querySelector(s);
const state={origin:null,destination:null,trips:[]};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=s=>s?`${s.name} · ${s.line}`:'';
const lines=[...new Set(D.stations.map(s=>s.line))];
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const sourceLink=`<a href="${D.source}" target="_blank" rel="noopener">申通官方路径与票价查询 ↗</a>`;
function picker(kind,title){return `<div class="picker"><label for="${kind}Search">${title} · 中文 / 首字母 / 全拼</label><input id="${kind}Search" autocomplete="off" placeholder="如 dsh、淀山湖、hs hc"><label for="${kind}Line">线路筛选</label><select id="${kind}Line"><option>全部线路</option>${lines.map(l=>`<option>${esc(l)}</option>`).join('')}</select><div id="${kind}Candidates" class="candidates" role="group" aria-label="${title}候选"></div><p id="${kind}Selected">尚未选择</p></div>`}
async function boot(){
  $('.top-meta').textContent='官方实时票价 · 全站拼音检索';
  $('.hero-pills').innerHTML='<span>官方接口直查</span><span>全站拼音搜索</span><span>纯静态部署</span>';
  $('#planner').innerHTML=`<div class="section-heading"><div><p class="eyebrow">01 / OFFICIAL FARE</p><h2>站点选准，票价查实。</h2></div>${sourceLink}</div><div class="planner-grid"><div class="panel input-panel"><div class="field-grid"><label>日期<input id="tripDate" type="date" value="${today()}"></label><label>预计进站时间<input id="tripTime" type="time" value="13:00"></label></div>${picker('origin','起点站')}<button id="swapStations" class="ghost-btn">交换起终点 ⇄</button>${picker('destination','终点站')}<button class="primary-btn" id="addTrip">查询官方票价并加入行程</button><p class="hint">使用官方页面相同的 oneWay 单程票查询参数。不同路径可能有不同票价，详情逐项保留。网络失败时不估价。</p><p id="queryStatus" role="status" aria-live="polite"></p></div><div class="panel trip-panel"><div class="panel-head"><h3>你的行程</h3><span id="tripCount">0 段</span></div><div id="tripList"></div></div></div><div class="section-heading result-heading"><h2>单程票合计</h2></div><div id="results" class="results-grid"></div>`;
  $('#rules').innerHTML=`<div class="panel input-panel"><h2>票价来源与数据覆盖</h2><p>${sourceLink}</p><p>本站不按站数、虚构里程或人工覆盖表计算票价。每次查询直接读取官方响应 pathList 中每条路径的 price；总额使用所选路径。</p><p>官方站点记录 ${D.stations.filter(s=>s.queryable).length} 条；搜索索引 ${D.stations.length} 条，全部含首字母与全拼。同名不同线路保留独立编号。</p><p>站点同步时间：${esc(D.updatedAt)}</p><p>磁浮线、金山铁路保留搜索条目，但本次官方站点接口未提供其编号，因此显示票价不可用。不会将其当作免费行程。</p><p>日票与交通卡优化暂不输出：原优化器未正确处理跨日窗口与特殊线路。当前只汇总真实查询到的单程票价。</p></div>`;
  $('#about').innerHTML=`<div class="panel input-panel"><h2>使用说明</h2><p>依旧感谢GPT-6开源。</p><p>输入中文、首字母或全拼，从候选中选择具体线路。也可清空输入后通过线路筛选浏览全部站点。输入 dsh 可查滴水湖与淀山湖大道；hshc可查鹤沙航城。</p><p>只显示官方接口返回的价格；失败可重试或打开官方页面核对。该公开网页接口并非承诺长期稳定的开发者 API。</p><p>HTML、JavaScript 与站点快照可直接发布到 GitHub Pages / Cloudflare Pages，无应用后端。更新站名可运行 update-data.py。</p><p>项目地址：https://github.com/HWyyds/SHMetro-Tickets</p></div>`;
  for(const kind of ['origin','destination']){
    $('#'+kind+'Search').oninput=()=>{state[kind]=null;$('#'+kind+'Selected').textContent='请重新选择候选站点';renderCandidates(kind)};
    $('#'+kind+'Line').onchange=()=>renderCandidates(kind);
    renderCandidates(kind);
  }
  $('#swapStations').onclick=()=>{[state.origin,state.destination]=[state.destination,state.origin];for(const k of ['origin','destination']){ $('#'+k+'Search').value=state[k]?.name||'';$('#'+k+'Line').value='全部线路';$('#'+k+'Selected').textContent=label(state[k])||'尚未选择';renderCandidates(k)}};
  $('#addTrip').onclick=add;
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active')});
  renderTrips();
  installTickets();
}
function renderCandidates(kind){
  const result=MetroFare.search(D.stations,$('#'+kind+'Search').value,$('#'+kind+'Line').value);
  const box=$('#'+kind+'Candidates');
  box.innerHTML=result.length?result.map(s=>`<button data-id="${esc(s.id)}" type="button"><b>${esc(s.name)}</b><small>${esc(s.line)} · ${esc(s.initials)}${s.queryable?'':' · 票价接口未覆盖'}</small></button>`).join(''):'<p>没有匹配站点</p>';
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>{const s=D.stations.find(s=>s.id===b.dataset.id);state[kind]=s;$('#'+kind+'Search').value=s.name;$('#'+kind+'Selected').textContent='已选：'+label(s);box.innerHTML=''});
}
async function add(){
  const button=$('#addTrip'),status=$('#queryStatus');
  if(!state.origin||!state.destination){status.textContent='请从候选列表选择起点和终点（含线路）。';return}
  const from=state.origin,to=state.destination,date=$('#tripDate').value,time=$('#tripTime').value;
  if(!date||!time){status.textContent='请填写日期与进站时间';return}
  button.disabled=true;status.textContent='正在向申通官方接口查询…';
  try{
    const result=await MetroFare.query(from,to,date);
    const trip={from,to,date,time,result,path:0,cardPrices:[],cardError:''};
    try{const card=await MetroFare.query(from,to,date,fetch,'oneCard');trip.cardPrices=result.paths.map(p=>MetroFare.matchCardPath(p,card));}
    catch(e){trip.cardError=e.message}
    state.trips.push(trip);renderTrips();status.textContent='已获取官方单程票价；交通卡基础价'+(trip.cardPrices.some(Number.isFinite)?'已匹配':'未匹配，可重试')+'（'+new Date(result.queriedAt).toLocaleTimeString('zh-CN')+'）';
  }
  catch(e){status.textContent='票价未获取：'+(e.name==='AbortError'?'查询超时，请重试':e.message)+'。未加入费用合计。'}
  finally{button.disabled=false}
}
function renderTrips(){
  $('#tripCount').textContent=state.trips.length+' 段';
  $('#tripList').innerHTML=state.trips.map((t,i)=>`<article class="trip-record"><b>${esc(label(t.from))} → ${esc(label(t.to))}</b><p>${t.date} ${t.time}</p><label>官方返回路径<select data-path="${i}">${t.result.paths.map((p,j)=>`<option value="${j}" ${j===t.path?'selected':''}>路径 ${j+1} · ${esc(p.type)} · ¥${p.price.toFixed(2)}</option>`).join('')}</select></label><details><summary>查看所选路径 / 来源</summary><p>${t.result.paths[t.path].stations.map(esc).join(' → ')}</p><p>${sourceLink} · 查询时间 ${esc(t.result.queriedAt)}</p></details><button class="ghost-btn" data-remove="${i}">删除此段</button></article>`).join('')||'<p>选择起终点后查询官方单程票价。</p>';
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.trips.splice(Number(b.dataset.remove),1);renderTrips()});
  document.querySelectorAll('[data-path]').forEach(s=>s.onchange=()=>{state.trips[Number(s.dataset.path)].path=Number(s.value);renderTrips()});
  const total=state.trips.reduce((sum,t)=>sum+Math.round(t.result.paths[t.path].price*100),0)/100;
  $('#results').innerHTML=`<article class="panel result-card"><h3>已查询行程 · 所选路径单程票总额</h3><div class="result-cost">${state.trips.length?'¥'+total.toFixed(2):'—'}</div><p>共 ${state.trips.length} 段；不含未获取票价的行程。</p></article>`;
  if($('#ticketSettings')){attachTripTimes();renderTickets()}
}
function installTickets(){
  document.querySelectorAll('[data-tab="network"],#network,#networkTab').forEach(e=>e.remove());
  $('#results').insertAdjacentHTML('afterend',`<section class="panel input-panel" id="ticketSettings" style="margin-top:24px"><h2>多日通票组合优化</h2><p>算法按全部行程时间自动比较刷卡、启用一日票、启用三日票，并决定需要购买几张票。</p><div class="field-grid"><label>交通卡优惠资格<select id="cardEligible"><option value="yes">上海公共交通卡 / 随申码（有资格）</option><option value="no">不符合70元累计优惠条件</option></select></label><label>已有累计金额所属月份<input id="cardMonth" type="month" value="${today().slice(0,7)}"></label><label>规划首程前累计金额（元）<input id="cardCumulative" type="number" min="0" step="0.01" value="0"></label><div><button class="ghost-btn" id="already70">该月已满70元</button></div></div><p id="ticketWindows"></p><p>每张通票从算法选中的进站时刻启用，分别覆盖之后24小时或72小时。满70元当笔起九折，次月首次进站时清零。</p></section><section style="margin-top:28px"><h2>方案比较与逐段用票</h2><div id="ticketComparisons" class="results-grid"></div><label>查看方案明细<select id="detailPlan"></select></label><div id="ticketDetails" class="panel input-panel" style="margin-top:12px;overflow:auto"></div><p>特殊线路当前按官方单程票另付，公交联乘和虚拟换乘不在此次优化范围内。</p></section>`);
  $('#rules .input-panel p:last-child').outerHTML=`<h3>通票与累计优惠</h3><p><a href="https://service.shmetro.com/cpxz/index.htm" target="_blank" rel="noopener">官方车票使用须知</a>：一日票/三日票从首次进站起24/72小时内运营时段有效；磁浮及2024年起开通的市域线除外。</p><p><a href="https://service.shmetro.com/pwyh/index.htm" target="_blank" rel="noopener">官方票务优惠</a>：满70元的当笔即享9折，次月首次进站时清零。67元+3元的乘次扣2.70元。价格18/45元沿用项目指定票价；这两页正文未列出售价格。</p>`;
  for(const id of ['cardEligible','cardMonth','cardCumulative'])$('#'+id).oninput=renderTickets;
  $('#already70').onclick=()=>{$('#cardCumulative').value='70';renderTickets()};
  $('#detailPlan').onchange=renderTickets;
  attachTripTimes();renderTickets();
}
function attachTripTimes(){
  document.querySelectorAll('.trip-record').forEach((e,i)=>{
    const t=state.trips[i];
    e.insertAdjacentHTML('beforeend',`<label>调整预计进站时间<input type="datetime-local" data-time="${i}" value="${t.date}T${t.time}"></label><button class="ghost-btn" data-retry="${i}">重新查询该段单程 / 交通卡票价</button><small>修改日期后须重查对应星期票价。</small>`);
  });
  document.querySelectorAll('[data-time]').forEach(input=>input.onchange=()=>{
    if(!input.value)return;
    const t=state.trips[Number(input.dataset.time)],parts=input.value.split('T');
    if(t.date!==parts[0])t.needsRefresh=true;
    [t.date,t.time]=parts;renderTickets();
  });
  document.querySelectorAll('[data-retry]').forEach(b=>b.onclick=async()=>{
    const t=state.trips[Number(b.dataset.retry)];b.disabled=true;b.textContent='查询中…';
    try{
      const result=await MetroFare.query(t.from,t.to,t.date);
      const card=await MetroFare.query(t.from,t.to,t.date,fetch,'oneCard');
      t.result=result;t.path=0;t.cardPrices=result.paths.map(p=>MetroFare.matchCardPath(p,card));t.needsRefresh=false;renderTrips();
    }catch(e){b.textContent='重试失败，请再次点击';b.disabled=false}
  });
}
function renderTickets(){
  if(!$('#ticketSettings'))return;
  const money=c=>c===null?'待查询':'¥'+(c/100).toFixed(2);
  const time=ms=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(ms);
  try{
    if(!$('#cardCumulative').value||!$('#cardMonth').value)throw Error('请填写累计金额和所属月份');
    const settings={month:$('#cardMonth').value,cumulative:Number($('#cardCumulative').value),cardEligible:$('#cardEligible').value==='yes'};
    const plans=MetroTickets.compare(state.trips,settings);
    const windows=plans.slice(1).flatMap(p=>p.passes||[]).map(p=>`${p.name} ${time(p.start)}–${time(p.end)}`);
    $('#ticketWindows').textContent=windows.length?'候选通票窗口：'+windows.join('；'):'加入行程后显示实际启用窗口';
    if(state.trips.some(t=>t.needsRefresh))throw Error('有行程更改了日期，请重新查询该段票价后再比较');
    if(!state.trips.length){$('#ticketComparisons').textContent='加入行程后显示方案成本和逐段使用方式。';$('#ticketDetails').textContent='暂无行程';return}
    const best=Math.min(...plans.filter(p=>p.complete).map(p=>p.total));
    $('#ticketComparisons').innerHTML=plans.map(p=>`<article class="panel result-card ${p.complete&&p.total===best?'best':''}"><h3>${p.name}</h3><div class="result-cost">${money(p.total)}</div><p>一日票 ${p.passes.filter(x=>x.kind==='day').length} 张 · 三日票 ${p.passes.filter(x=>x.kind==='three').length} 张<br>通票 ${money(p.passes.reduce((s,x)=>s+x.price,0))} + 另付 ${p.complete?money(p.rows.reduce((s,r)=>s+r.charge,0)):'有未匹配票价'}</p>${p.passes.map(x=>`<small>${x.name} ${time(x.start)} 启用</small>`).join('；')} ${p.complete&&p.total===best?'<small>当前完整可算方案中费用最低</small>':''}</article>`).join('');
    const choice=$('#detailPlan').value||'1';
    $('#detailPlan').innerHTML=plans.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');$('#detailPlan').value=choice;
    const chosen=plans[Number(choice)];
    $('#ticketDetails').innerHTML=`<table><thead><tr><th>进站时间 / 行程</th><th>使用票种</th><th>另付金额</th><th>原因 / 累计状态</th></tr></thead><tbody>${chosen.rows.map(r=>`<tr><td>${esc(r.trip.date+' '+r.trip.time)}<br>${esc(label(r.trip.from))} → ${esc(label(r.trip.to))}</td><td>${r.method}</td><td>${money(r.charge)}</td><td>${esc(r.reason)}${r.reset?'<br>跨月，累计清零':''}<br>合格累计：${money(r.before)} → ${money(r.after)}（达标后显示70元）</td></tr>`).join('')}</tbody></table>`;
  }catch(e){$('#ticketComparisons').textContent=e.message;$('#ticketDetails').textContent='请修正设置后再计算';$('#ticketWindows').textContent=''}
}
const style=document.createElement('style');style.textContent='.picker{margin:18px 0}.picker label{display:block;margin-top:8px}.candidates{max-height:190px;overflow:auto;border:1px solid #dfe7e9;border-radius:8px;margin-top:7px}.candidates button{display:block;width:100%;padding:10px;text-align:left;border:0;border-bottom:1px solid #eef3f3;background:white;cursor:pointer}.candidates button:hover,.candidates button:focus{background:#e7f5f3}.candidates small{display:block;color:#526775}.picker p,.trip-record p{font-size:12px;color:#526775}.trip-record{padding:18px 0;border-bottom:1px solid #dde4e4}.trip-record b{font-size:13px}.trip-record details{margin:12px 0;overflow-wrap:anywhere}button:disabled{opacity:.5;cursor:wait}#queryStatus{font-size:13px;line-height:1.7}a{color:#056b66}';document.head.append(style);
const engine=document.createElement('script');engine.src='fare-engine.js';engine.onload=()=>{const tickets=document.createElement('script');tickets.src='ticket-engine.js';tickets.onload=boot;tickets.onerror=()=>{$('#planner').textContent='票卡模块加载失败，请刷新页面'};document.head.append(tickets)};engine.onerror=()=>{$('#planner').textContent='票价查询模块加载失败，请刷新页面'};document.head.append(engine);
