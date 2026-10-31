"""Build static station data from the exact endpoint used by the official fare page.
Run: python update-data.py (requires pypinyin). No Python needed to serve the site.
"""
import json, urllib.request, pathlib, datetime
from pypinyin import lazy_pinyin, load_phrases_dict

load_phrases_dict({'莘庄': [['xin'], ['zhuang']], '七莘路': [['qi'], ['xin'], ['lu']], '莘庄站': [['xin'], ['zhuang'], ['zhan']], '行知路': [['xing'], ['zhi'], ['lu']], '大行宫': [['da'], ['xing'], ['gong']]})
url = 'https://m.shmetro.com/core/shmetro/mdstationinfoback_new.ashx?act=getAllStations'
raw = urllib.request.urlopen(url, timeout=30).read().decode('utf-8-sig')
rows = json.loads(raw)
assert len(rows) > 400
stations = []
for row in rows:
    code, name = row['key'], row['value']
    prefix = code[:2]
    line = {'41':'浦江线', '51':'市域机场线', '61':'浦江线', '50':'磁浮线'}.get(prefix, str(int(prefix))+'号线')
    syllables = lazy_pinyin(name)
    initials = ''.join(x[0] if x.isascii() and x.isalpha() else x for x in syllables)
    import re
    stations.append({'id':code, 'name':name, 'line':line,
        'initials':re.sub('[^a-z0-9]', '', initials.lower()),
        'pinyin':re.sub('[^a-z0-9]', '', ''.join(syllables).lower()), 'queryable':True})
# Outside this official endpoint: retain searchable entries, never invent fare IDs.
extras = {'磁浮线':'龙阳路|浦东1号2号航站楼', '金山铁路':'上海南站|莘庄|春申|新桥|车墩|叶榭|亭林|金山园区|金山卫'}
for line, names in extras.items():
    if any(s['line']==line for s in stations): continue
    for i,name in enumerate(names.split('|')):
        py=lazy_pinyin(name)
        stations.append({'id':f'extra-{line}-{i}', 'name':name, 'line':line,
            'initials':re.sub('[^a-z0-9]','',''.join(x[0] if x.isascii() and x.isalpha() else x for x in py)),
            'pinyin':re.sub('[^a-z0-9]','',''.join(py)), 'queryable':False})
assert all(s['initials'] for s in stations)
data={'source':'https://service.shmetro.com/cphc/index.htm','stationSource':url,
      'updatedAt':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(), 'stations':stations}
root=pathlib.Path(__file__).parent
(root/'data.js').write_text('window.METRO_DATA = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
(root/'official-stations.raw.json').write_text(raw,encoding='utf-8')
print(f'{len(rows)} official station/line records; {len(stations)} indexed records; all have initials')
