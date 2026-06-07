import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import json
from app import app

def test_flask_api():
    print("=" * 60)
    print("测试 Flask API 接口")
    print("=" * 60)

    client = app.test_client()

    print("\n1. GET /api/bookstores")
    print("-" * 60)
    resp = client.get('/api/bookstores?city=上海')
    assert resp.status_code == 200
    data = json.loads(resp.data)
    print(f"状态码: {resp.status_code}")
    print(f"节点数: {len(data['nodes'])}")
    print(f"连线数: {len(data['links'])}")
    print(f"平均孤独指数: {data['city_stats']['avg_solitude']}")
    print(f"高独处书店数: {data['city_stats']['high_solitude_count']}")
    print(f"类型分布:")
    for t, info in data['type_stats']['by_type'].items():
        print(f"  {t}: {info['count']}家 ({info['percentage']}%)")

    print("\n前5个书店:")
    for n in data['nodes'][:5]:
        print(f"  • {n['name']}")
        print(f"    类型: {n['type_name_cn']} | 孤独指数: {n['solitude_score']:.3f}")

    print("\n2. GET /api/bookstore/<id>")
    print("-" * 60)
    bs_id = data['nodes'][0]['id']
    resp2 = client.get(f'/api/bookstore/{bs_id}')
    assert resp2.status_code == 200
    detail = json.loads(resp2.data)
    print(f"状态码: {resp2.status_code}")
    print(f"书店ID: {detail['bookstore_id']}")
    print(f"孤独指数: {detail['solitude_score']}")
    print(f"评论数: {detail['total_reviews']}")
    print(f"四维得分: {detail['detailed_scores']}")
    print(f"关键词数量: {len(detail['keyword_counts'])}")

    print("\n3. GET /api/city-stats")
    print("-" * 60)
    resp3 = client.get('/api/city-stats?city=北京')
    assert resp3.status_code == 200
    stats = json.loads(resp3.data)
    print(f"状态码: {resp3.status_code}")
    print(f"城市: {stats['city']}")
    print(f"平均孤独指数: {stats['solitude']['avg_solitude']}")

    print("\n4. POST /api/trigger-crawl")
    print("-" * 60)
    resp4 = client.post('/api/trigger-crawl', json={'city': '成都'})
    assert resp4.status_code == 200
    crawl = json.loads(resp4.data)
    print(f"状态码: {resp4.status_code}")
    print(f"状态: {crawl['status']}")
    print(f"消息: {crawl['message']}")

    print("\n" + "=" * 60)
    print("✅ 所有 Flask API 测试通过!")
    print("=" * 60)

    print("\n📊 验证项目假设:")
    print("-" * 60)
    deep_reading_high = [n for n in data['nodes'] if n['type'] == 'deep_reading' and n['solitude_score'] > 0.4]
    family_low = [n for n in data['nodes'] if n['type'] == 'family_friendly' and n['solitude_score'] < 0.3]

    print(f"深度阅读型且高孤独指数: {len(deep_reading_high)} 家")
    for n in deep_reading_high:
        print(f"  ✓ {n['name']} (指数: {n['solitude_score']:.3f})")

    print(f"\n亲子型且低孤独指数: {len(family_low)} 家")
    for n in family_low:
        print(f"  ✓ {n['name']} (指数: {n['solitude_score']:.3f})")

    if len(deep_reading_high) >= 1 and len(family_low) >= 1:
        print("\n🎉 验证成功：大学周边独立书店深度阅读型且孤独指数高；商场书店亲子型且孤独指数低。")

if __name__ == "__main__":
    test_flask_api()
