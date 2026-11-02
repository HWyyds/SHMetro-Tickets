# 当前版本数据与验证

本文件取代早期 README 中的估算算法说明。当前版本不存在本地估算票价。

官方页面：https://service.shmetro.com/cphc/index.htm

站点接口：https://m.shmetro.com/core/shmetro/mdstationinfoback_new.ashx?act=getAllStations

票价接口：https://m.shmetro.com/interface/plantrip/pt.aspx

沿用官方参数 func=plantrip、startId、endId、planTime=00:59、week=0..6、ticket=oneWay、type=0。读取 pathList[].price（顶层 price 实测可为0，不能使用），保留每条路径票价，默认官方第一条路径，可切换。

2026-10-31 实测官方响应允许跨域 Access-Control-Allow-Origin: *，静态网页直接查询，不需要应用后端。接口未来不可用时显示失败，绝不估价。

官方站点按线路编号独立保留。official-stations.raw.json 为原始响应；data.js 为全量拼音索引快照。磁浮、金山铁路的补充条目因该接口未提供编号，标记 queryable=false，搜索可见但票价不可用。

更新：安装 pypinyin 后运行 python update-data.py；网页运行不需要 Python。验证：node verify.cjs。

通票和交通卡方案已恢复，规则来自 https://service.shmetro.com/cpxz/index.htm 与 https://service.shmetro.com/pwyh/index.htm （2026-10-31读取）。首次进站起24/72小时，满70元当笔即9折，次月重置。交通卡基础价另用 ticket=oneCard 查询，仅匹配 stationIds 完全一致的路径，未匹配则不给总额。纯城市轨道交通适用通票和累计优惠；跨特殊系统行程暂按单程票另付，不擅自拆分优惠。

当前使用动态规划比较多日组合：对每个尚未被通票覆盖的行程，比较刷卡、此刻启用一日票、此刻启用三日票三种选择；已启用的票继续覆盖其24/72小时窗口。输出会显示实际购买的一日票/三日票数量、每张票启用时刻、逐段用票和总成本，因此可以处理周二、周四、周五这种中间隔天的行程。

18/45元沿用用户给定售价；上述两页未列明售价。以进站时刻判断有效、途中到期仍可出站沿用用户规则；到期瞬间不再覆盖是当前边界约定。所有时间固定Asia/Shanghai。方案比较范围为用户指定启用时间下各一张一日票、三日票及其组合，包含购票成本；不声称任意多张票全局最优。每段视为独立进出站，不模拟公交联乘或跨段虚拟换乘，同站冷却和运营时段可达性不在此计算器中校验。


