/* All fares come from the endpoint used by service.shmetro.com/cphc/index.htm. */
const D=window.METRO_DATA, $=s=>document.querySelector(s);
const state={origin:null,destination:null,trips:[],revision:0};
const commuteCalendar={month:'',overrides:{},dates:[]};
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
  $('#about').innerHTML=`<div class="panel input-panel"><h2>使用说明</h2><p>依旧感谢GPT-6开源。</p><p>现阶段目标主打一个基础功能能用就行，美化什么的慢慢再说吧。</p><p>输入中文、首字母或全拼，从候选中选择具体线路。也可清空输入后通过线路筛选浏览全部站点。输入 dsh 可查滴水湖与淀山湖大道；hshc可查鹤沙航城。</p><p>只显示官方接口返回的价格；失败可重试或打开官方页面核对。该公开网页接口并非承诺长期稳定的开发者 API。</p><p>HTML、JavaScript 与站点快照可直接发布到 GitHub Pages / Cloudflare Pages，无应用后端。更新站名可运行 update-data.py。</p><p>项目地址：https://github.com/HWyyds/SHMetro-Tickets</p></div>`;
  for(const kind of ['origin','destination']){
    $('#'+kind+'Search').oninput=()=>{state[kind]=null;$('#'+kind+'Selected').textContent='请重新选择候选站点';renderCandidates(kind)};
    $('#'+kind+'Line').onchange=()=>renderCandidates(kind);
    renderCandidates(kind);
  }
  $('#swapStations').onclick=()=>{[state.origin,state.destination]=[state.destination,state.origin];for(const k of ['origin','destination']){ $('#'+k+'Search').value=state[k]?.name||'';$('#'+k+'Line').value='全部线路';$('#'+k+'Selected').textContent=label(state[k])||'尚未选择';renderCandidates(k)}};
  $('#addTrip').onclick=add;
  $('#tripTime').insertAdjacentHTML('afterend','<button id="setTripTimeNow" type="button" class="ghost-btn" style="margin-top:8px">设为现在</button>');
  $('#setTripTimeNow').onclick=()=>{
    $('#tripTime').value=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
  };
  $('#tripCount').insertAdjacentHTML('afterend','<button id="clearAllTrips" class="ghost-btn" disabled>删除全部行程</button>');
  $('#clearAllTrips').onclick=()=>{
    if(!state.trips.length||!window.confirm('确定删除全部行程吗？这会同时删除通勤计划和额外行程。'))return;
    state.revision++;state.trips=[];renderTrips();
    $('#queryStatus').textContent='已删除全部行程。';$('#commuteStatus').textContent='已删除全部行程。';
  };
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab,.view').forEach(x=>x.classList.remove('active'));b.classList.add('active');$('#'+b.dataset.tab).classList.add('active')});
  renderTrips();
  installTickets();
  installCommute();
}
function installCommute(){
  $('#addTrip').insertAdjacentHTML('beforebegin',`<details class="panel input-panel commute-editor" style="margin:18px 0"><summary>固定路线通勤往返</summary><p>上方起点为住处、终点为单位。通勤月份与额外行程日期分别设置。</p><label>通勤范围<select id="commuteMode"><option value="month">整月通勤</option><option value="days">自定义开始日期与天数</option></select></label><label id="commutePlanMonthField">通勤月份<input id="commutePlanMonth" type="month" value="${today().slice(0,7)}"></label><div id="commuteCustomFields" hidden><label>通勤开始日期<input id="commuteStart" type="date" value="${today()}"></label><label>基础通勤天数<input id="commuteDays" type="number" min="1" max="31" value="20"></label></div><fieldset class="weekdays"><legend>每周哪几天上班（可多选）</legend>${[1,2,3,4,5,6,0].map((n,i)=>`<label><input type="checkbox" data-weekday="${n}" ${i<5?'checked':''}>周${'一二三四五六日'[i]}</label>`).join('')}</fieldset><div class="field-grid"><label>去程时间<input id="commuteOut" type="time" value="08:00"></label><label>回程时间<input id="commuteBack" type="time" value="18:00"></label></div><p class="hint">整月模式按所选月份的每周上班日生成，自定义模式按开始日期与基础天数生成；再点击日历增减上班日。取消一天会减少一天，补班会增加一天；节假日与调休请自行调整。</p><div class="calendar-nav"><button id="calendarPrev" class="ghost-btn" aria-label="上个月">‹</button><label>查看月份<input id="commuteMonth" type="month"></label><button id="calendarNext" class="ghost-btn" aria-label="下个月">›</button></div><div id="commuteCalendar" class="commute-calendar" role="group" aria-label="上班日期日历"></div><p id="calendarCount" role="status"></p><button id="previewDates" class="ghost-btn">按每周设置重新生成日期</button><button id="addCommute" class="primary-btn">查询双向票价并替换通勤计划</button><button id="clearCommute" class="ghost-btn">移除通勤，保留额外行程</button><p id="commuteStatus" role="status"></p></details>`);
  $('#results').insertAdjacentHTML('afterend','<section id="commuteSummary" class="panel input-panel" style="margin-top:18px"></section>');
  const regenerate=()=>{
    const monthly=$('#commuteMode').value==='month';
    $('#commutePlanMonthField').hidden=!monthly;$('#commuteCustomFields').hidden=monthly;
    commuteCalendar.overrides={};commuteCalendar.month=monthly?$('#commutePlanMonth').value:$('#commuteStart').value.slice(0,7);renderCommuteCalendar();
  };
  $('#previewDates').onclick=regenerate;
  $('#commuteDays').oninput=regenerate;
  for(const id of ['commuteMode','commutePlanMonth','commuteStart'])$('#'+id).onchange=regenerate;
  document.querySelectorAll('[data-weekday]').forEach(c=>c.onchange=regenerate);
  $('#commuteMonth').onchange=()=>{commuteCalendar.month=$('#commuteMonth').value;renderCommuteCalendar()};
  for(const [id,delta] of [['calendarPrev',-1],['calendarNext',1]])$('#'+id).onclick=()=>{const d=new Date(commuteCalendar.month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);commuteCalendar.month=d.toISOString().slice(0,7);renderCommuteCalendar()};
  regenerate();
  $('#clearCommute').onclick=()=>{state.revision++;state.trips=state.trips.filter(t=>!t.commute);renderTrips()};
  $('#addCommute').onclick=async()=>{
    const button=$('#addCommute'),status=$('#commuteStatus'),from=state.origin,to=state.destination;
    if(!from||!to){status.textContent='请先选择住处和单位站点';return}
    button.disabled=true;const revision=state.revision;
    try{
      const dates=selectedCommuteDates(),out=$('#commuteOut').value,back=$('#commuteBack').value;
      if(!dates.length)throw Error('请至少选择一个上班日期');
      if(!out||!back||back<=out)throw Error('回程时间需晚于去程时间');
      const cache=new Map(),generated=[];
      for(const date of dates)for(const [a,b,time] of [[from,to,out],[to,from,back]]){
        const weekday=new Date(date+'T12:00:00+08:00').getUTCDay(),key=a.id+'|'+b.id+'|'+weekday;
        if(!cache.has(key)){
          status.textContent='查询 '+label(a)+' → '+label(b)+'（星期'+weekday+'）…';
          const result=await MetroFare.query(a,b,date),entry={result,cardPrices:[]};
          try{const card=await MetroFare.query(a,b,date,fetch,'oneCard');entry.cardPrices=result.paths.map(p=>MetroFare.matchCardPath(p,card))}catch(e){entry.cardError=e.message}
          cache.set(key,entry);
        }
        generated.push({...cache.get(key),from:a,to:b,date,time,path:0,commute:true,usePack:true});
      }
      if(revision!==state.revision)return;
      state.trips=[...state.trips.filter(t=>!t.commute),...generated];
      $('#packStart').value=dates[0]<'2026-12-01'?'2026-12-01':dates[0];
      renderTrips();status.textContent=dates.length+'个通勤日，'+generated.length+'程；额外行程已保留。';
    }catch(e){status.textContent='未替换原通勤计划：'+e.message}finally{button.disabled=false}
  };
}
function selectedCommuteDates(){
  const weekdays=[...document.querySelectorAll('[data-weekday]:checked')].map(c=>Number(c.dataset.weekday));
  return $('#commuteMode').value==='month'
    ?MetroCommute.monthDates($('#commutePlanMonth').value,weekdays,commuteCalendar.overrides)
    :MetroCommute.schedule($('#commuteStart').value,Number($('#commuteDays').value),weekdays,commuteCalendar.overrides);
}
function renderCommuteCalendar(){
  try{
    commuteCalendar.dates=selectedCommuteDates();
    const monthly=$('#commuteMode').value==='month',planMonth=$('#commutePlanMonth').value;
    const month=commuteCalendar.month||(monthly?planMonth:$('#commuteStart').value.slice(0,7));
    const first=new Date(month+'-01T12:00:00Z');
    if(!Number.isFinite(+first))throw Error('请选择查看月份');
    $('#commuteMonth').value=month;
    const count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
    const offset=(first.getUTCDay()+6)%7,selected=new Set(commuteCalendar.dates);
    $('#commuteCalendar').innerHTML=[...'一二三四五六日'].map(n=>`<span class="calendar-weekday">${n}</span>`).join('')+'<span></span>'.repeat(offset)+Array.from({length:count},(_,i)=>{
      const date=month+'-'+String(i+1).padStart(2,'0'),work=selected.has(date);
      return `<button type="button" data-date="${date}" aria-pressed="${work}" aria-label="${date} ${work?'上班':'休息'}" ${(monthly?month!==planMonth:date<$('#commuteStart').value)?'disabled':''} class="calendar-day ${work?'workday':''}"><b>${i+1}</b><small>${work?'上班':'休息'}</small></button>`;
    }).join('');
    $('#calendarCount').textContent=`已选 ${selected.size} 个上班日，共 ${selected.size*2} 程；绿色为上班日，点击日期切换。`;
    document.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{commuteCalendar.overrides[b.dataset.date]=!selected.has(b.dataset.date);renderCommuteCalendar()});
  }catch(e){commuteCalendar.dates=[];$('#commuteCalendar').innerHTML='';$('#calendarCount').textContent=e.message}
}
function renderCommuteSummary(settings){
  if(!$('#commuteSummary'))return;
  const trips=state.trips.filter(t=>t.commute);
  if(!trips.length){$('#commuteSummary').textContent='尚未设置通勤。通勤与额外出行可同时规划。';return}
  const raw=trips.reduce((s,t)=>s+t.result.paths[t.path].price,0),card=MetroTickets.optimize(trips,settings,{day:false,three:false});
  const money=c=>c===null?'待查询':'¥'+(c/100).toFixed(2);
  $('#commuteSummary').innerHTML=`<h3>仅通勤对比 · ${trips.length}程</h3><p>接口原价合计 ¥${raw.toFixed(2)} · 满额优惠支付 ${money(card.total)}</p><table><thead><tr><th>套餐＋另付（不使用日票）</th><th>总支出</th><th>相对满额支付</th><th>剩余次数</th></tr></thead><tbody>${MetroTickets.packs.map(pack=>{const p=MetroTickets.optimize(trips,settings,{day:false,three:false},pack);return `<tr><td>${pack.count}次 / ¥${pack.price/100}</td><td>${money(p.total)}</td><td>${p.total!==null&&card.total!==null?(p.total<=card.total?'省':'多付')+money(Math.abs(card.total-p.total)):'待查询'}</td><td>${p.remaining??'—'}</td></tr>`}).join('')}</tbody></table><p>下方“通勤与计入次票的行程”只合并通勤及选择计入的额外行程；单独成行另列比较。</p>`;
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
  button.disabled=true;const revision=state.revision;status.textContent='正在向申通官方接口查询…';
  try{
    const result=await MetroFare.query(from,to,date);
    const trip={from,to,date,time,result,path:0,cardPrices:[],cardError:'',usePack:false};
    try{const card=await MetroFare.query(from,to,date,fetch,'oneCard');trip.cardPrices=result.paths.map(p=>MetroFare.matchCardPath(p,card));}
    catch(e){trip.cardError=e.message}
    if(revision!==state.revision)return;
    state.trips.push(trip);renderTrips();status.textContent='已获取官方单程票价；交通卡基础价'+(trip.cardPrices.some(Number.isFinite)?'已匹配':'未匹配，可重试')+'（'+new Date(result.queriedAt).toLocaleTimeString('zh-CN')+'）';
  }
  catch(e){status.textContent='票价未获取：'+(e.name==='AbortError'?'查询超时，请重试':e.message)+'。未加入费用合计。'}
  finally{button.disabled=false}
}
function renderTrips(){
  $('#tripCount').textContent=state.trips.length+' 段';
  $('#clearAllTrips').disabled=!state.trips.length;
  const record=(t,i)=>`<article class="trip-record" data-trip-index="${i}"><b>${esc(label(t.from))} → ${esc(label(t.to))}</b><p>${t.date} ${t.time}</p><label>官方返回路径<select data-path="${i}">${t.result.paths.map((p,j)=>`<option value="${j}" ${j===t.path?'selected':''}>路径 ${j+1} · ${esc(p.type)} · ¥${p.price.toFixed(2)}</option>`).join('')}</select></label><details><summary>查看所选路径 / 来源</summary><p>${t.result.paths[t.path].stations.map(esc).join(' → ')}</p><p>${sourceLink} · 查询时间 ${esc(t.result.queriedAt)}</p></details><button class="ghost-btn" data-remove="${i}">删除此段</button></article>`;
  const commute=state.trips.filter(t=>t.commute),extra=state.trips.map((t,i)=>t.commute?'':record(t,i)).join('');
  $('#tripList').innerHTML=(commute.length?`<article class="commute-group"><h3>通勤计划 · ${new Set(commute.map(t=>t.date)).size}天 ${commute.length}程</h3><p>${esc(label(commute[0].from))} ⇄ ${esc(label(commute[0].to))}</p><p>${commute.map(t=>t.date).sort()[0]} 至 ${commute.map(t=>t.date).sort().at(-1)} · 单程票合计 ¥${commute.reduce((sum,t)=>sum+t.result.paths[t.path].price,0).toFixed(2)}</p><details><summary>展开通勤逐程详情 / 调整</summary>${state.trips.map((t,i)=>t.commute?record(t,i):'').join('')}</details></article>`:'')+extra||'<p>选择起终点后查询官方单程票价。</p>';
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.trips.splice(Number(b.dataset.remove),1);renderTrips()});
  document.querySelectorAll('[data-path]').forEach(s=>s.onchange=()=>{state.trips[Number(s.dataset.path)].path=Number(s.value);renderTrips()});
  renderFareTotals();
  if($('#ticketSettings')){attachTripTimes();renderTickets()}
}
function installTickets(){
  document.querySelectorAll('[data-tab="network"],#network,#networkTab').forEach(e=>e.remove());
  $('#results').insertAdjacentHTML('afterend',`<section class="panel input-panel" id="ticketSettings" style="margin-top:24px"><h2>多日通票组合优化</h2><p>算法按全部行程时间自动比较刷卡、启用一日票、启用三日票，并决定需要购买几张票。</p><div class="field-grid"><label>交通卡优惠资格<select id="cardEligible"><option value="yes">同一支付渠道（交通卡／银行卡／数字人民币／三类乘车码）</option><option value="no">不符合累计优惠条件</option></select></label><label>已有累计金额所属月份<input id="cardMonth" type="month" value="${today().slice(0,7)}"></label><label>规划首程前累计金额（元）<input id="cardCumulative" type="number" min="0" step="0.01" value="0"></label><div><button class="ghost-btn" id="already70">该月已满90元</button></div></div><label>计次票手动激活日期<input id="packStart" type="date" value="2026-12-01"></label><p>计次票35/45/60/90次分别190/210/270/390元，激活当日及之后30个自然日有效。每个方案购买一份套餐，剩余次数不折现，超过次数或有效期另付；额外行程默认不使用计次票；可在每段额外行程的用票方式中随时切换“计入通勤计次票”或“单独成行”，有效期内且有剩余次数时按你的选择扣次。</p><p id="ticketWindows"></p><p>每张通票从算法选中的进站时刻启用，分别覆盖之后24小时或72小时。12月1日起一日票24元、三日票60元；当月累计满90元后的后续行程九折，次月清零，市域线也参加满额优惠。12月1日前按原规则。接口返回价不作改写，新规则搭配当前接口价仅供方案测算。</p></section><section style="margin-top:28px"><h2>通勤与计入次票的行程 · 方案比较</h2><div id="ticketComparisons" class="results-grid"></div><label>查看方案明细<select id="detailPlan"></select></label><div id="ticketDetails" class="panel input-panel" style="margin-top:12px;overflow:auto"></div><section id="separateTickets"><h2>单独成行 · 方案比较</h2><p>只计算选择“单独成行”的额外行程，比较刷卡、一日票与三日票。各组按所填月度累计金额独立测算。</p><div id="separateComparisons" class="results-grid"></div><label>查看单独成行方案明细<select id="separatePlan"></select></label><p id="separateWindows"></p><div id="separateDetails" class="panel input-panel" style="margin-top:12px;overflow:auto"></div></section><p>特殊线路当前按官方单程票另付，公交联乘和虚拟换乘不在此次优化范围内。</p></section>`);
  $('#rules .input-panel p:last-child').outerHTML='<h3>2026年12月1日新优惠</h3><p>一日票24元、三日票60元；新增35次190元、45次210元、60次270元、90次390元套餐。计次票不含市域、磁浮、金山；满额90元优惠含市域，不含磁浮和金山。同一支付渠道累计，不跨渠道合并；计次票购票和抵扣不参与累计。</p><p><a href="https://service.shmetro.com/yygg/5747.htm" target="_blank" rel="noopener">官方公告</a> · <a href="https://service.shmetro.com/wzsywt/5744.htm" target="_blank" rel="noopener">计次票细则</a></p><p>按“满90元后续票价9折”实现为下一笔开始折扣。计次票窗口为激活当日及之后30个自然日；到期日凌晨后的运营尾班边界暂未建模。比较一份所选计次套餐加多张日票，不模拟退票、连续续购或市域计次票。每段须是独立乘次，虚拟换乘请合并规划。</p>';
  for(const id of ['cardEligible','cardMonth','cardCumulative','packStart'])$('#'+id).oninput=renderTickets;
  $('#already70').onclick=()=>{$('#cardCumulative').value='90';renderTickets()};
  $('#detailPlan').onchange=renderTickets;
  $('#separatePlan').onchange=renderTickets;
  attachTripTimes();renderTickets();
}
function attachTripTimes(){
  document.querySelectorAll('.trip-record').forEach(e=>{
    const i=Number(e.dataset.tripIndex),t=state.trips[i];
    e.insertAdjacentHTML('beforeend',`${t.commute?`<label class="check-row"><input type="checkbox" data-pack="${i}" ${t.usePack===true?'checked':''}>此段允许使用计次票（通勤）</label>`:`<label>额外行程用票方式<select data-pack-choice="${i}"><option value="separate" ${!t.usePack?'selected':''}>单独成行 · 不使用计次票</option><option value="pack" ${t.usePack?'selected':''}>计入通勤计次票</option></select></label><p data-pack-status="${i}" role="status">${t.usePack?'已计入计次票；可随时改回单独成行。':'已单独成行；可随时改回计入通勤计次票。'}两种方式均保留此行程。</p>`}<label>调整预计进站时间<input type="datetime-local" data-time="${i}" value="${t.date}T${t.time}"></label><button class="ghost-btn" data-retry="${i}">重新查询该段单程 / 交通卡票价</button><small>修改日期后须重查对应星期票价。</small>`);
  });
  document.querySelectorAll('[data-pack]').forEach(c=>c.onchange=()=>{state.trips[Number(c.dataset.pack)].usePack=c.checked;renderTickets()});
  document.querySelectorAll('[data-pack-choice]').forEach(select=>select.onchange=()=>{
    const i=Number(select.dataset.packChoice);state.trips[i].usePack=select.value==='pack';
    document.querySelector(`[data-pack-status="${i}"]`).textContent=state.trips[i].usePack?'已计入计次票；可随时改回单独成行。两种方式均保留此行程。':'已单独成行；可随时改回计入通勤计次票。两种方式均保留此行程。';
    renderTickets();
  });
  document.querySelectorAll('[data-time]').forEach(input=>input.onchange=()=>{
    if(!input.value)return;
    const t=state.trips[Number(input.dataset.time)],parts=input.value.split('T');
    if(t.date!==parts[0])t.needsRefresh=true;
    [t.date,t.time]=parts;renderTickets();
  });
  document.querySelectorAll('[data-retry]').forEach(b=>b.onclick=async()=>{
    const revision=state.revision,t=state.trips[Number(b.dataset.retry)];b.disabled=true;b.textContent='查询中…';
    try{
      const result=await MetroFare.query(t.from,t.to,t.date);
      const card=await MetroFare.query(t.from,t.to,t.date,fetch,'oneCard');
      if(revision!==state.revision||!state.trips.includes(t))return;
      t.result=result;t.path=0;t.cardPrices=result.paths.map(p=>MetroFare.matchCardPath(p,card));t.needsRefresh=false;renderTrips();
    }catch(e){b.textContent='重试失败，请再次点击';b.disabled=false}
  });
}
function renderFareTotals(){
  const groups=MetroTickets.splitTrips(state.trips);
  $('#results').innerHTML=[['通勤与计入次票的行程',groups.shared],['单独成行',groups.separate]].map(([name,trips])=>`<article class="panel result-card"><h3>${name} · 单程票原价合计</h3><div class="result-cost">${trips.length?'¥'+(trips.reduce((sum,t)=>sum+Math.round(t.result.paths[t.path].price*100),0)/100).toFixed(2):'—'}</div><p>共 ${trips.length} 段；实际用票支出见对应方案比较。</p></article>`).join('');
}
function renderTickets(){
  if(!$('#ticketSettings'))return;
  renderFareTotals();
  try{
    if(!$('#cardCumulative').value||!$('#cardMonth').value)throw Error('请填写累计金额和所属月份');
    const settings={month:$('#cardMonth').value,cumulative:Number($('#cardCumulative').value),cardEligible:$('#cardEligible').value==='yes',packStart:$('#packStart').value};
    renderCommuteSummary(settings);
    const groups=MetroTickets.splitTrips(state.trips);
    renderTicketGroup(groups.shared,settings,{comparisons:'#ticketComparisons',details:'#ticketDetails',windows:'#ticketWindows',select:'#detailPlan'},MetroTickets.compare);
    renderTicketGroup(groups.separate,settings,{comparisons:'#separateComparisons',details:'#separateDetails',windows:'#separateWindows',select:'#separatePlan'},MetroTickets.compareSeparate);
  }catch(e){
    for(const ids of [['#ticketComparisons','#ticketDetails','#ticketWindows'],['#separateComparisons','#separateDetails','#separateWindows']]){
      $(ids[0]).textContent=e.message;$(ids[1]).textContent='请修正设置后再计算';$(ids[2]).textContent='';
    }
  }
}
function renderTicketGroup(trips,settings,ids,compare){
  const money=c=>c===null?'待查询':'¥'+(c/100).toFixed(2);
  const time=ms=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(ms);
  const comparisons=$(ids.comparisons),details=$(ids.details),windows=$(ids.windows),select=$(ids.select);
  if(!trips.length){comparisons.textContent='暂无此类行程';details.textContent='暂无行程';windows.textContent='';select.innerHTML='';return}
  if(trips.some(t=>t.needsRefresh)){comparisons.textContent='日期变更后请重查票价';details.textContent='请重查本组行程后再计算';windows.textContent='';select.innerHTML='';return}
  const plans=compare(trips,settings),best=Math.min(...plans.filter(p=>p.complete).map(p=>p.total)),baseline=plans[0].total;
  comparisons.innerHTML=plans.map(p=>`<article class="panel result-card ${p.complete&&p.total===best?'best':''}"><h3>${p.name}</h3><div class="result-cost">${money(p.total)}</div><p>一日票 ${p.passes.filter(x=>x.kind==='day').length} 张 · 三日票 ${p.passes.filter(x=>x.kind==='three').length} 张</p><p>${p.pack?'计次票已用 '+(p.pack.count-p.remaining)+' 次 / 剩余 '+p.remaining+' 次':''}</p><p>${p.complete&&baseline!==null?'较本组全程刷卡'+(p.total<=baseline?'省 ':'多付 ')+money(Math.abs(baseline-p.total)):esc(p.error||'')}</p>${p.complete&&p.total===best?'<small>本组比较方案中最低</small>':''}</article>`).join('');
  const previous=Number(select.value||0),choice=previous<plans.length?previous:0;
  select.innerHTML=plans.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('');select.value=String(choice);
  const chosen=plans[choice];
  windows.textContent=chosen.passes.map(p=>p.name+'：'+time(p.start)+' 至 '+time(p.end)+'（到期时刻不含）').join('；');
  if(!chosen.complete){details.textContent=chosen.error||'票价待查询';return}
  const row=r=>`<tr><td>${esc(r.trip.date+' '+r.trip.time)}<br>${esc(label(r.trip.from))} → ${esc(label(r.trip.to))}</td><td>${r.method}</td><td>${money(r.charge)}</td><td>${esc(r.reason)}${r.reset?'<br>跨月，累计清零':''}<br>合格累计：${money(r.before)} → ${money(r.after)}（达标后封顶显示当月门槛）</td></tr>`;
  const table=rows=>`<table><thead><tr><th>进站时间 / 行程</th><th>使用票种</th><th>另付金额</th><th>原因 / 累计状态</th></tr></thead><tbody>${rows.map(row).join('')}</tbody></table>`;
  const commuteRows=chosen.rows.filter(r=>r.trip.commute),methods=new Map();
  for(const r of commuteRows)methods.set(r.method,(methods.get(r.method)||0)+1);
  details.innerHTML=(commuteRows.length?`<div class="commute-group"><h3>通勤 · ${new Set(commuteRows.map(r=>r.trip.date)).size}天 ${commuteRows.length}程</h3><p>${[...methods].map(([method,count])=>esc(method)+' '+count+'程').join(' · ')} · 另付合计 ${money(commuteRows.reduce((sum,r)=>sum+r.charge,0))}</p><details><summary>展开通勤逐程用票明细</summary>${table(commuteRows)}</details></div>`:'')+(chosen.rows.some(r=>!r.trip.commute)?table(chosen.rows.filter(r=>!r.trip.commute)):'');
}
const style=document.createElement('style');style.textContent='.picker{margin:18px 0}.picker label{display:block;margin-top:8px}.candidates{max-height:190px;overflow:auto;border:1px solid #dfe7e9;border-radius:8px;margin-top:7px}.candidates button{display:block;width:100%;padding:10px;text-align:left;border:0;border-bottom:1px solid #eef3f3;background:white;cursor:pointer}.candidates button:hover,.candidates button:focus{background:#e7f5f3}.candidates small{display:block;color:#526775}.picker p,.trip-record p{font-size:12px;color:#526775}.trip-record{padding:18px 0;border-bottom:1px solid #dde4e4}.trip-record b{font-size:13px}.trip-record details{margin:12px 0;overflow-wrap:anywhere}button:disabled{opacity:.5;cursor:wait}#queryStatus{font-size:13px;line-height:1.7}a{color:#056b66}';document.head.append(style);
const engine=document.createElement('script');engine.src='fare-engine.js';engine.onload=()=>{const tickets=document.createElement('script');tickets.src='ticket-engine.js';tickets.onload=()=>{const commute=document.createElement('script');commute.src='commute.js';commute.onload=boot;document.head.append(commute)};tickets.onerror=()=>{$('#planner').textContent='票卡模块加载失败，请刷新页面'};document.head.append(tickets)};engine.onerror=()=>{$('#planner').textContent='票价查询模块加载失败，请刷新页面'};document.head.append(engine);
