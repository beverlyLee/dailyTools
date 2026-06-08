import sys
sys.path.insert(0, '.')
from app import build_city_data, get_bookstore_detail, _generate_city_bookstores

print('=' * 70)
print('优化一：分店名与实际地址对应')
print('=' * 70)

for city in ['上海', '北京']:
    raw = _generate_city_bookstores(city)
    print(f'\n{city} ({len(raw)}家):')
    for bs in raw[:5]:
        loc = bs.get('branch_location', '')
        branch = bs.get('branch', '')
        match = branch in loc if branch and loc else False
        status = '✅' if match else '❓'
        print(f'  {status} {bs["name"]:28s} | 地址: {city}市{loc}')

print()
print('=' * 70)
print('优化二：智能地名截断（避免歧义')
print('=' * 70)

from app import _location_to_branch_name

test_cases = [
    ('北京路', '应保留"路"，不能变成"北京"'),
    ('南京路', '应保留"路"，不能变成"南京"'),
    ('四川北路', '可截断为"四川北"或保留完整'),
    ('武康路', '可截断为"武康"'),
    ('学院路', '可截断为"学院"'),
    ('万象城购物中心', '截断为"万象城"'),
    ('陆家嘴正大广场', '截断为"陆家嘴正大"'),
    ('五道口华清嘉园', '保留完整'),
    ('复旦大学城', '保留完整'),
]

for loc, desc in test_cases:
    result = _location_to_branch_name(loc)
    print(f'  {loc:20s} -> {result:12s} ({desc})')

print()
print('=' * 70)
print('优化三：类型保底 - 四种类型全覆盖')
print('=' * 70)

for city in ['上海', '北京', '广州', '成都', '杭州']:
    data = build_city_data(city)
    stats = data['type_stats']['by_type']
    types = list(stats.keys())
    all_four = len(types) == 4
    status = '✅' if all_four else '❌'
    print(f'  {status} {city}: {len(types)}种类型')
    for t, info in stats.items():
        print(f'       {t}: {info["count"]}家')

print()
print('=' * 70)
print('详情数据一致性校验')
print('=' * 70)

data = build_city_data('上海')
for n in data['nodes'][:3]:
    detail = get_bookstore_detail('上海', n['id'])
    ok_type = detail['type'] == n['type']
    ok_sol = abs(detail['solitude_index'] - n['solitude_score']) < 0.001
    ok_addr = detail['address'] == n['address']
    status = '✅' if (ok_type and ok_sol and ok_addr) else '❌'
    print(f'  {status} {n["name"]}')
    print(f'     类型一致: {ok_type}, 孤独一致: {ok_sol}, 地址一致: {ok_addr}')

print()
print('🎉 所有验证完成！')
