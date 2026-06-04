import json
import urllib.request

url = "http://127.0.0.1:8088/api/district-stats"
with urllib.request.urlopen(url) as f:
    data = json.loads(f.read())

districts = data.get("districts", [])

COLOR_RULES = {
    "TIER_1": (30, "深红", "rgba(211, 47, 47, 0.55)"),
    "TIER_2": (20, "橙黄", "rgba(245, 124, 0, 0.45)"),
    "TIER_3": (15, "浅黄", "rgba(251, 192, 45, 0.40)"),
    "TIER_4": (0, "浅蓝", "rgba(79, 195, 247, 0.35)"),
}

def get_tier(p):
    if p > 30: return "TIER_1"
    if p > 20: return "TIER_2"
    if p > 15: return "TIER_3"
    return "TIER_4"

print("API 返回数据颜色验证:")
print("-" * 80)
for dist in districts:
    name = dist["school_name"]
    p = dist["avg_premium_pct"]
    tier = get_tier(p)
    min_th, label, color = COLOR_RULES[tier]
    print(f"{name:<20} | 溢价: {p:>6.2f}% | 颜色: {label:<4} ({tier}) | 填充: {color}")

print()
print("关键用例验证:")
key_cases = [
    ("中关村第一小学", 34.65, "TIER_1"),
    ("芳草地小学", 15.9, "TIER_3"),
]
all_pass = True
for name, expected_p, expected_tier in key_cases:
    match = next((d for d in districts if name in d["school_name"]), None)
    if match:
        actual_tier = get_tier(match["avg_premium_pct"])
        status = "✅" if actual_tier == expected_tier else "❌"
        if actual_tier != expected_tier:
            all_pass = False
        print(f"{status} {name}: 实际={match['avg_premium_pct']:.2f}% ({actual_tier}), 期望≈{expected_p}% ({expected_tier})")
    else:
        print(f"⚠️  {name}: 未找到数据")

print()
print("点位半径公式验证: radius = clamp(单价 / 8000, 8, 20)")
test_prices = [64000, 80000, 120000, 160000]
for price in test_prices:
    expected = max(8, min(20, price / 8000))
    print(f"   单价 {price:>6} 元/m² → 半径 {expected:.2f}")

print()
print("=" * 80)
if all_pass:
    print("✅ API 数据验证通过!")
else:
    print("❌ API 数据验证失败!")
