// Offline browser smoke test: fixtures are synthetic, never published as fares.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.TEST_BROWSER||'chrome'});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://m.shmetro.com/interface/plantrip/**',route=>{const u=new URL(route.request().url()),a=u.searchParams.get('startId'),b=u.searchParams.get('endId');return route.fulfill({json:{startId:a,endId:b,pathList:[{price:'6',transferStationList:[{line:'11'}],passStationList:[{stationId:a,stationName:'测试起点'},{stationId:b,stationName:'测试终点'}]}]}})});
 await page.goto('http://127.0.0.1:4173/');
 // The shortcut uses Shanghai time and keeps a separately planned date.
 await page.clock.install({time:new Date('2026-11-25T16:07:00Z')});
 await page.locator('#tripDate').fill('2026-12-05');
 await page.locator('#setTripTimeNow').click();
 assert.equal(await page.locator('#tripTime').inputValue(),'00:07');
 assert.equal(await page.locator('#tripDate').inputValue(),'2026-12-05');
 await page.locator('#tripTime').fill('13:00');
 await page.locator('#originSearch').fill('嘉定新城');await page.locator('#originCandidates button').first().click();
 await page.locator('#destinationSearch').fill('新天地');await page.locator('#destinationCandidates button').first().click();
 await page.locator('#tripDate').fill('2026-12-05');await page.locator('#addTrip').click();
 await page.locator('#tripCount').filter({hasText:'1 段'}).waitFor();
 await page.getByText('固定路线通勤往返',{exact:true}).click();
 await page.locator('#commuteMode').selectOption('days');await page.locator('#commuteStart').fill('2026-12-01');
 await page.locator('#cardMonth').fill('2026-12');await page.locator('#addCommute').click();
 await page.locator('#commuteStatus').filter({hasText:'40程'}).waitFor({timeout:30000});
 assert.equal(await page.locator('.trip-record').count(),41);
 assert.equal(await page.locator('.trip-record:visible').count(),1);
 assert((await page.locator('#tripList > .commute-group h3').innerText()).includes('20天 40程'));
 assert((await page.locator('#commuteSummary').innerText()).includes('240.00'));
 assert((await page.locator('#commuteSummary').innerText()).includes('225.00'));
 assert.equal(await page.locator('[data-pack-choice="0"]').inputValue(),'separate');
 await page.locator('[data-pack-choice="0"]').selectOption('pack');
 await page.locator('#detailPlan').selectOption('3');
 assert((await page.locator('#ticketDetails tbody tr:visible').innerText()).includes('45次票'));
 await page.locator('[data-pack-choice="0"]').selectOption('separate');
 assert.equal(await page.locator('#ticketDetails tbody tr:visible').count(),0);
 assert(!(await page.locator('#separateDetails').innerText()).includes('次票'));
 assert.equal(await page.locator('#separateComparisons .result-card').count(),4);
 assert.equal(await page.locator('#separateComparisons .result-cost').first().innerText(),'¥6.00');
 assert(!(await page.locator('#separateComparisons').innerText()).includes('次票'));
 assert.equal(await page.locator('#ticketComparisons .result-cost').nth(3).innerText(),'¥210.00');
 for(const choice of ['pack','separate','pack','separate']){
   await page.locator('[data-pack-choice="0"]').selectOption(choice);
   assert.equal(await page.locator('#tripCount').innerText(),'41 段');
   assert.equal(await page.locator('#tripList .commute-group .trip-record').count(),40);
   assert.equal(await page.locator('#tripList > .trip-record').count(),1);
   if(choice==='pack'){
     assert((await page.locator('#ticketDetails tbody tr:visible').innerText()).includes('45次票'));
     assert.equal(await page.locator('#separateDetails').innerText(),'暂无行程');
     assert.equal(await page.locator('#results .result-cost').first().innerText(),'¥246.00');
   }else{
     assert.equal(await page.locator('#ticketDetails tbody tr:visible').count(),0);
     assert.equal(await page.locator('#separateDetails tbody tr:visible').count(),1);
     assert.equal(await page.locator('#results .result-cost').first().innerText(),'¥240.00');
     assert.equal(await page.locator('#results .result-cost').nth(1).innerText(),'¥6.00');
     assert.equal(await page.locator('#ticketComparisons .result-cost').nth(3).innerText(),'¥210.00');
   }
 }
 assert((await page.locator('#ticketDetails .commute-group h3').innerText()).includes('40程'));
 assert.equal(await page.locator('#separateDetails tbody tr:visible').count(),1);
 // Grouping changes DOM order: editing the extra trip must still address index 0.
 await page.locator('[data-time="0"]').fill('2026-12-05T14:00');
 assert((await page.locator('#separateDetails').innerText()).includes('14:00'));
 page.once('dialog',d=>d.dismiss());await page.locator('#clearAllTrips').click();
 assert.equal(await page.locator('#tripCount').innerText(),'41 段');
 await page.locator('#clearCommute').click();assert.equal(await page.locator('.trip-record').count(),1);
 assert.equal(await page.locator('#ticketComparisons .result-card').count(),0);
 assert.equal(await page.locator('#separateComparisons .result-card').count(),4);
 assert(!(await page.locator('#separateComparisons').innerText()).includes('次票'));
 // Weekly schedule and visual date overrides, including a different month.
 await page.locator('[data-weekday="6"]').check();
 await page.locator('[data-weekday="0"]').check();
 assert((await page.locator('#calendarCount').innerText()).includes('20 个上班日'));
 await page.locator('[data-date="2026-12-02"]').click();
 await page.locator('[data-date="2026-12-26"]').click();
 assert.equal(await page.locator('[data-date="2026-12-02"]').getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('[data-date="2026-12-26"]').getAttribute('aria-pressed'),'true');
 await page.locator('#calendarNext').click();
 await page.locator('[data-date="2027-01-02"]').click();
 assert((await page.locator('#calendarCount').innerText()).includes('21 个上班日'));
 await page.locator('#calendarPrev').click();
 assert.equal(await page.locator('[data-date="2026-12-02"]').getAttribute('aria-pressed'),'false');
 await page.locator('#addCommute').click();
 await page.locator('#commuteStatus').filter({hasText:'42程'}).waitFor({timeout:30000});
 assert.equal(await page.locator('.trip-record:visible').count(),1);
 await page.locator('#tripList > .commute-group > details > summary').click();
 assert.equal(await page.locator('.trip-record:visible').count(),43);
 // Clear-all removes both kinds and refreshes summaries; cancel above kept both.
 page.once('dialog',d=>d.accept());await page.locator('#clearAllTrips').click();
 assert.equal(await page.locator('#tripCount').innerText(),'0 段');
 assert.equal(await page.locator('.trip-record').count(),0);
 assert((await page.locator('#commuteSummary').innerText()).includes('尚未设置通勤'));
 assert.equal(await page.locator('#ticketDetails').innerText(),'暂无行程');
 assert(await page.locator('#clearAllTrips').isDisabled());
 // All seven weekdays support a month without rest days.
 await page.locator('#commuteDays').fill('31');
 assert((await page.locator('#calendarCount').innerText()).includes('31 个上班日'));
 for(const c of await page.locator('[data-weekday]').all())await c.uncheck();
 assert((await page.locator('#calendarCount').innerText()).includes('至少选择'));
 await page.locator('[data-weekday="1"]').check();
 // Nov 25 extra-trip date must not set the start of a December monthly commute.
 for(const n of [2,3,4,5])await page.locator(`[data-weekday="${n}"]`).check();
 await page.locator('#tripDate').fill('2026-11-25');
 await page.locator('#commuteMode').selectOption('month');
 await page.locator('#commutePlanMonth').fill('2026-12');
 assert((await page.locator('#calendarCount').innerText()).includes('23 个上班日'));
 await page.locator('#addCommute').click();
 await page.locator('#commuteStatus').filter({hasText:'46程'}).waitFor();
 const monthlyDates=await page.locator('#tripList [data-time]').evaluateAll(inputs=>inputs.map(x=>x.value.slice(0,10)));
 assert.equal(monthlyDates[0],'2026-12-01');assert.equal(monthlyDates.at(-1),'2026-12-31');
 assert(monthlyDates.every(d=>d.startsWith('2026-12')));
 // Changing an extra ride's date leaves the commute calendar intact.
 await page.locator('#tripDate').fill('2026-11-26');
 assert((await page.locator('#calendarCount').innerText()).includes('23 个上班日'));
 await page.locator('#tripDate').fill('2026-12-05');await page.locator('#addTrip').click();
 await page.locator('#tripCount').filter({hasText:'47 段'}).waitFor();
 assert.equal(await page.locator('[data-pack-choice="46"]').inputValue(),'separate');
 await page.locator('[data-pack-choice="46"]').selectOption('pack');
 await page.locator('#detailPlan').selectOption('3');
 assert((await page.locator('#ticketDetails tbody tr:visible').innerText()).includes('45次票'));
 await page.locator('[data-path="46"]').selectOption('0');
 assert.equal(await page.locator('[data-pack-choice="46"]').inputValue(),'pack','Choice survives rerender');
 await page.locator('#commutePlanMonth').fill('2027-05');
 assert.equal(await page.locator('[data-date="2027-05-01"]').getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('[data-date="2027-05-03"]').getAttribute('aria-pressed'),'true');
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:__dirname+'/ui-calendar-mobile.png',fullPage:true});
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS UI: reversible extra-trip pack selection without deleting any trips, Shanghai current-time shortcut, independent subtotals and plan comparisons with no packs for separate trips, monthly commute and mobile layout.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
