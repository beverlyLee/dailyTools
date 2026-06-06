from src.metric.vitality_scorer import VitalityScorer

scorer = VitalityScorer()
scorer.load_from_file('mock_markets.json')
results = scorer.calculate_all()
results.sort(key=lambda x: x['vitality_index'], reverse=True)

levels = {}
for m in results:
    lvl = m['vitality_level']
    levels.setdefault(lvl, 0)
    levels[lvl] += 1

print('=== 活力等级分布 ===')
order = ['高活力', '中高活力', '中等活力', '较低活力', '低活力']
for lvl in order:
    if lvl in levels:
        bar = '#' * levels[lvl]
        print(f'  {lvl}: {levels[lvl]:2d} 家  {bar}')

print()
print('=== TOP10 市场 ===')
for i, m in enumerate(results[:10]):
    print(f'  {i+1}. {m["name"]:20s} 指数:{m["vitality_index"]:.2f}  {m["vitality_level"]:6s}  {m["business_hours"]}')

print()
print('=== 最低分 5 家 ===')
for i, m in enumerate(results[-5:]):
    idx = len(results) - 4 + i
    print(f'  {idx}. {m["name"]:20s} 指数:{m["vitality_index"]:.2f}  {m["vitality_level"]:6s}  {m["category"]}')

has_perfect = any(m['vitality_index'] >= 1.0 for m in results)
print()
print(f'是否有满分(>=1.0): {has_perfect}')
print(f'最高分: {results[0]["vitality_index"]}')
print(f'最低分: {results[-1]["vitality_index"]}')
