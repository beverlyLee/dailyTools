import sys
sys.path.insert(0, '.')
from app import _generate_city_bookstores, _infer_bookstore_type, BRAND_TYPE_MAP, CITY_LOCATIONS, LOCATION_FAMILY_KW

print('=== 成都详细分析 ===')
bookstores = _generate_city_bookstores('成都')
print(f'共 {len(bookstores)} 家')
for i, bs in enumerate(bookstores):
    t = _infer_bookstore_type(bs['name'], bs.get('branch_location', ''))
    guaranteed = ' [保底]' if bs.get('_type_guaranteed') else ''
    print(f'  {i:2d}. {bs["name"]:30s} | loc={bs.get("branch_location", "N/A"):20s} | type={t}{guaranteed}')

print()
print('成都 family_friendly 位置:', CITY_LOCATIONS['成都']['family_friendly'])
print('LOCATION_FAMILY_KW:', LOCATION_FAMILY_KW)

print()
print('测试 family_brand 在不同位置的推断:')
for loc in CITY_LOCATIONS['成都']['family_friendly']:
    t = _infer_bookstore_type('西西弗书店(测试店)', loc)
    print(f'  {loc:20s} -> {t}')
