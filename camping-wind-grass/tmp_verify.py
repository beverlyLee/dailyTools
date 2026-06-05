
import json

with open('data/processed_sites.json') as f:
    sites = json.load(f)

print('评分分布:')
grades = {}
for s in sites:
    g = s['comfort']['grade']
    grades[g] = grades.get(g, 0) + 1
for g in ['S', 'A', 'B', 'C', 'D']:
    cnt = grades.get(g, 0)
    pct = cnt / len(sites) * 100
    print(f'  {g}: {cnt} ({pct:.1f}%)')

print('\n评论验证:')
no_reviews = [s['name'] for s in sites if len(s.get('reviews', [])) < 2]
print(f'评论不足2条的营地: {len(no_reviews)}个')

print('\n海口营地:')
for s in sites:
    if '海口' in s['name']:
        print(f'  {s["name"]}: lng={s["lng"]:.4f}, lat={s["lat"]:.4f}')
        print(f'    地址: {s["location"]}')

print('\n颜色分布:')
colors = {}
for s in sites:
    c = s['comfort']['color']
    colors[c] = colors.get(c, 0) + 1
for c, cnt in colors.items():
    print(f'  {c}: {cnt}个')
