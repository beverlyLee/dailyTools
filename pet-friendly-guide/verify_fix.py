#!/usr/bin/env python3
import requests

response = requests.get("http://127.0.0.1:5001/api/pois")
data = response.json()
pois = data.get('data', [])

print(f'总POI数量: {len(pois)}')

friendly_count = sum(1 for p in pois if p.get('is_pet_friendly'))
forbidden_count = sum(1 for p in pois if p.get('is_pet_friendly') is False)
unknown_count = sum(1 for p in pois if p.get('is_pet_friendly') is None)

print(f'宠物友好: {friendly_count}')
print(f'宠物不友好: {forbidden_count}')
print(f'未知 (None): {unknown_count}')

print('\n位置限制分布:')
restrictions = {}
for p in pois:
    r = p.get('location_restriction', 'unknown')
    restrictions[r] = restrictions.get(r, 0) + 1
for k, v in sorted(restrictions.items()):
    print(f'  {k}: {v}')

print('\n传统美食餐厅验证:')
traditional = next((p for p in pois if p['name'] == '传统美食餐厅'), None)
if traditional:
    print(f"  名称: {traditional['name']}")
    print(f"  宠物友好: {traditional['is_pet_friendly']}")
    print(f"  位置限制: {traditional['location_restriction']}")
    status = "✅" if traditional['is_pet_friendly'] is False else "❌"
    print(f"  判定结果: {status}")
else:
    print("  ❌ 未找到该商家")

print('\n仅限户外商家验证:')
outdoor_shops = [p for p in pois if p.get('location_restriction') == 'outdoor']
print(f"  仅限户外商家数量: {len(outdoor_shops)}")
for p in outdoor_shops[:3]:
    friendly_status = "✅ 宠物友好" if p['is_pet_friendly'] else "❌ 非友好"
    print(f"    - {p['name']}: {friendly_status}")

print('\n设施统计:')
facilities = {}
for p in pois:
    f = p.get('pet_facility', {})
    for k, v in f.items():
        if v:
            facilities[k] = facilities.get(k, 0) + 1
for k, v in sorted(facilities.items()):
    print(f'  {k}: {v}')
