#!/usr/bin/env python3
import requests
import json

response = requests.get("http://127.0.0.1:5001/api/pois")
data = response.json()
pois = data.get('data', [])

print(f'总POI数量: {len(pois)}')

friendly_count = sum(1 for p in pois if p.get('is_pet_friendly'))
forbidden_count = sum(1 for p in pois if p.get('is_pet_friendly') is False)
unknown_count = sum(1 for p in pois if p.get('is_pet_friendly') is None)

print(f'宠物友好: {friendly_count}')
print(f'宠物不友好: {forbidden_count}')
print(f'未知: {unknown_count}')

print('\n位置限制分布:')
restrictions = {}
for p in pois:
    r = p.get('location_restriction', 'unknown')
    restrictions[r] = restrictions.get(r, 0) + 1
for k, v in sorted(restrictions.items()):
    print(f'  {k}: {v}')

print('\n设施统计:')
facilities = {}
for p in pois:
    f = p.get('pet_facility', {})
    for k, v in f.items():
        if v:
            facilities[k] = facilities.get(k, 0) + 1
for k, v in sorted(facilities.items()):
    print(f'  {k}: {v}')

print('\n前5个商家详情:')
for p in pois[:5]:
    print(f"\n  {p['name']}")
    print(f"    宠物友好: {p.get('is_pet_friendly')}")
    print(f"    位置限制: {p.get('location_restriction')}")
    print(f"    设施: {p.get('pet_facility')}")
    print(f"    态度: {p.get('attitude')}")

print('\n态度分布:')
attitudes = {}
for p in pois:
    a = p.get('attitude', 'none')
    attitudes[a] = attitudes.get(a, 0) + 1
for k, v in sorted(attitudes.items()):
    print(f'  {k}: {v}')
