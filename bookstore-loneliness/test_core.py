from src.crawler.bookstore_review_spider import BookstoreReviewSpider
from src.model.solitude_index import SolitudeIndexCalculator
from src.classify.bookstore_type import BookstoreClassifier, TYPE_NAMES_CN

def test_core_modules():
    print("=" * 60)
    print("1. 测试爬虫模块 - 生成模拟数据")
    print("=" * 60)

    spider = BookstoreReviewSpider()
    bookstores = spider._generate_mock_bookstores("上海")
    print(f"生成书店数量: {len(bookstores)}")
    
    all_bs_info = []
    for idx, bs in enumerate(bookstores[:5]):
        bookstore_id = f"bs_{idx:03d}"
        reviews = spider._generate_mock_reviews(bookstore_id, 30)
        
        class BookstoreInfo:
            pass
        info = type('BookstoreInfo', (), {
            'bookstore_id': bookstore_id,
            'name': bs['name'],
            'address': bs['address'],
            'avg_rating': bs['rating'],
            'review_count': bs['review_count'],
            'reviews': reviews
        })()
        all_bs_info.append(info)
        print(f"  - {bs['name']} - {len(reviews)} 条评论")

    print()
    print("=" * 60)
    print("2. 测试孤独指数计算")
    print("=" * 60)

    calculator = SolitudeIndexCalculator(use_jieba=False)
    results = calculator.calculate_batch(all_bs_info)

    for r in results:
        print(f"  {r.bookstore_name}")
        print(f"    归一化孤独指数: {r.normalized_solitude:.4f}")
        print(f"    独处得分: {r.solitude_score} | 亲子: {r.family_score} | 学生: {r.student_score} | 网红: {r.internet_famous_score}")

    print()
    print("=" * 60)
    print("3. 测试书店分类")
    print("=" * 60)

    classifier = BookstoreClassifier()
    classifications = classifier.classify_batch(results)

    for c in classifications:
        print(f"  {c.bookstore_name} -> {TYPE_NAMES_CN[c.primary_type]}")
        print(f"    置信度: {c.confidence:.4f}")

    print()
    print("=" * 60)
    print("4. 测试相似网络构建")
    print("=" * 60)

    edges = classifier.build_similarity_network(classifications, similarity_threshold=0.3)
    print(f"生成连线数: {len(edges)}")
    for e in edges[:5]:
        print(f"  {e['source']} <-> {e['target']} 相似度: {e['value']} 同类型: {e['same_type']}")

    print()
    print("=" * 60)
    print("5. 城市统计")
    print("=" * 60)

    city_stats = calculator.analyze_city_solitude(results)
    print(f"  平均孤独指数: {city_stats['avg_solitude']:.4f}")
    print(f"  高独处书店: {city_stats['high_solitude_count']}")
    print(f"  分布: 高={city_stats['distribution']['high']} 中={city_stats['distribution']['medium']} 低={city_stats['distribution']['low']}")

    type_stats = classifier.get_type_statistics(classifications)
    print(f"  类型统计: {type_stats}")

    print()
    print("✅ 所有核心模块测试通过!")

if __name__ == "__main__":
    test_core_modules()
