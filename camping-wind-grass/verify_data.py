
import json
import urllib.request

url = "http://localhost:8000/api/sites"
response = urllib.request.urlopen(url)
data = json.loads(response.read().decode())
sites = data["data"]

print("=" * 50)
print("验证评分分布")
print("=" * 50)
grades = {}
for s in sites:
    g = s["comfort"]["grade"]
    grades[g] = grades.get(g, 0) + 1

for g in ["S", "A", "B", "C", "D"]:
    cnt = grades.get(g, 0)
    pct = cnt / len(sites) * 100
    print(f"  {g}: {cnt} ({pct:.1f}%)")

print("\n" + "=" * 50)
print("验证用户评论")
print("=" * 50)
no_reviews = [s['name'] for s in sites if len(s.get('reviews', [])) < 2]
if no_reviews:
    print(f"评论不足2条的营地: {len(no_reviews)}个")
    for name in no_reviews[:5]:
        print(f"  - {name}")
else:
    print("✓ 所有营地都有至少2条评论")

print("\n" + "=" * 50)
print("用户评论样例")
print("=" * 50)
for s in sites[:3]:
    print(f"\n{s['name']}:")
    for r in s.get('reviews', [])[:2]:
        print(f"  [{r['rating']}星] {r['content'][:60]}...")

print("\n" + "=" * 50)
print("验证海口营地坐标")
print("=" * 50)
for s in sites:
    if '海口' in s['name']:
        print(f"\n{s['name']}:")
        print(f"  坐标: lng={s['lng']:.4f}, lat={s['lat']:.4f}")
        print(f"  地址: {s['location']}")

print("\n" + "=" * 50)
print("验证颜色分布")
print("=" * 50)
colors = {}
for s in sites:
    c = s["comfort"]["color"]
    colors[c] = colors.get(c, 0) + 1
for c, cnt in colors.items():
    print(f"  {c}: {cnt}个")
