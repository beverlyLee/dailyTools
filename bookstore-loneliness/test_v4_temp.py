import sys
sys.path.insert(0, '.')
from app import _generate_city_bookstores, _location_to_branch_name, _infer_bookstore_type

print('=== 地名截断测试 ===')
test_locs = [
    '北京路', '南京路', '四川北路', '淮海中路', 
    '五道口华清嘉园', '万象城购物中心', '陆家嘴正大广场', 
    '复旦大学城', '南锣鼓巷', '武康路', '学院路'
]
for loc in test_locs:
    print(f'  {loc:20s} -> {_location_to_branch_name(loc)}')

print()
print('=== 上海书店列表 ===')
bookstores = _generate_city_bookstores('上海')
print(f'共 {len(bookstores)} 家')
types_count = {}
for bs in bookstores:
    t = _infer_bookstore_type(bs['name'], bs.get('branch_location', ''))
    types_count[t] = types_count.get(t, 0) + 1
    guaranteed = ' [保底]' if bs.get('_type_guaranteed') else ''
    print(f'  {bs["name"]:32s} | {bs.get("branch_location", "N/A"):22s} | {t}{guaranteed}')

print(f'\n类型分布: {types_count}')
print(f'四种类型齐全: {len(types_count) == 4}')

print()
print('=== 北京书店列表 ===')
bookstores = _generate_city_bookstores('北京')
print(f'共 {len(bookstores)} 家')
types_count = {}
for bs in bookstores:
    t = _infer_bookstore_type(bs['name'], bs.get('branch_location', ''))
    types_count[t] = types_count.get(t, 0) + 1
    guaranteed = ' [保底]' if bs.get('_type_guaranteed') else ''
    print(f'  {bs["name"]:32s} | {bs.get("branch_location", "N/A"):22s} | {t}{guaranteed}')

print(f'\n类型分布: {types_count}')
print(f'四种类型齐全: {len(types_count) == 4}')

for city in ['广州', '成都', '杭州']:
    bookstores = _generate_city_bookstores(city)
    types_count = {}
    for bs in bookstores:
        t = _infer_bookstore_type(bs['name'], bs.get('branch_location', ''))
        types_count[t] = types_count.get(t, 0) + 1
    print(f'\n{city}: {len(bookstores)}家, 类型={dict(types_count)}, 齐全={len(types_count)==4}')
