const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/data.js','utf8'),ctx);
const stations=ctx.window.METRO_DATA.stations,F=require('./fare-engine.js');
for(const s of stations){assert(s.initials);assert(F.search(stations,s.initials).some(r=>r.id===s.id),s.name)}
for(const [q,name] of [['dsh','滴水湖'],['dsh','淀山湖大道'],['hshc','鹤沙航城'],['qhl','祁华路'],['xz','莘庄']])assert(F.search(stations,q).some(s=>s.name===name),q);
assert(F.search(stations,'虹桥2号航站楼').filter(s=>s.queryable).length>=3);
assert.throws(()=>F.parse({startId:'1621',endId:'1633',price:'0',pathList:[]},'1621','1633'));
assert.equal(F.parse({startId:'1621',endId:'1633',price:'0',pathList:[{price:'9'},{price:'10'}]},'1621','1633').price,9);
assert.throws(()=>F.parse({startId:'bad',endId:'1633',pathList:[{price:9}]},'1621','1633'));
console.log('PASS: '+stations.length+' searchable records; minor stations, disambiguation, response validation.');
