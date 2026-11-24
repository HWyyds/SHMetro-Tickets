# 当前版本数据与验证

本文件取代早期 README 中的估算算法说明。当前版本不存在本地估算票价。

官方页面：https://service.shmetro.com/cphc/index.htm

站点接口：https://m.shmetro.com/core/shmetro/mdstationinfoback_new.ashx?act=getAllStations

票价接口：https://m.shmetro.com/interface/plantrip/pt.aspx

沿用官方参数 func=plantrip、startId、endId、planTime=00:59、week=0..6、ticket=oneWay、type=0。读取 pathList[].price（顶层 price 实测可为0，不能使用），保留每条路径票价，默认官方第一条路径，可切换。

2026-10-31 实测官方响应允许跨域 Access-Control-Allow-Origin: *，静态网页直接查询，不需要应用后端。接口未来不可用时显示失败，绝不估价。

官方站点按线路编号独立保留。official-stations.raw.json 为原始响应；data.js 为全量拼音索引快照。磁浮、金山铁路的补充条目因该接口未提供编号，标记 queryable=false，搜索可见但票价不可用。

更新：安装 pypinyin 后运行 python update-data.py；网页运行不需要 Python。验证：node verify.cjs。

优惠规则（2026-11-24核对）：https://service.shmetro.com/yygg/5747.htm
计次票细则：https://service.shmetro.com/wzsywt/5744.htm

12月1日起日票24元/24小时、三日票60元/72小时，普通地铁计次35/45/60/90次售价190/210/270/390元。计次票激活当日及之后30自然日有效（实现为激活日00:00起31日，运营尾班跨午夜未细分）。同身份证仅一份套餐，当前每个候选方案只购买一份，不模拟续购、退票及余额折现。普通日票可多次购买，按所选行程进站时刻启用。

满额优惠按同渠道同自然月累计，12月1日起门槛90元，按公告“后续票价9折”处理为达到门槛后的下一程九折；11月旧规则为满70元当笔九折。市域线参加新满额优惠，不参加普通计次票与日票。磁浮、金山不参加。购买票款和用计次抵扣不计累计。此版本未模拟公交联乘、退票、跨段虚拟换乘及同站冷却；混合市域行程无法分段抵扣普通计次权益，按整程同渠道支付计算。

优化在所选路径、同一支付渠道、指定计次激活日和一份套餐的范围内比较。每程可选计次、通票、另付，计次有效但可不用。已启用通票在特殊线路另付期间继续保留。缺少交通卡价不给完整合计，未知不计为0。

测试：node verify.cjs、node ticket-tests.cjs、node new-rules-tests.cjs。


