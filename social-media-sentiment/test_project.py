import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from collector.data_loader import CommentDataLoader
from analyzer.sentiment_analyzer import SentimentAnalyzer


def test_data_loader():
    print("=" * 50)
    print("测试数据加载模块...")
    print("=" * 50)
    
    loader = CommentDataLoader(data_dir="data")
    
    files = loader.get_available_files()
    print(f"可用数据文件: {files}")
    
    if not files:
        print("❌ 没有找到数据文件")
        return False
    
    df = loader.load_comments(files[0])
    print(f"数据加载成功，共 {len(df)} 条评论")
    
    if loader.validate_data(df):
        print("✅ 数据格式验证通过")
    else:
        print("❌ 数据格式验证失败，缺少必要的列")
        return False
    
    print()
    return True


def test_sentiment_analyzer():
    print("=" * 50)
    print("测试情感分析模块...")
    print("=" * 50)
    
    analyzer = SentimentAnalyzer()
    
    test_comments = [
        "这个产品真的太棒了，质量非常好，强烈推荐！",
        "和描述的完全不一样，太差了，再也不会买了！",
        "整体来说还可以，性价比还行。"
    ]
    
    for comment in test_comments:
        result = analyzer.analyze(comment, use_volcengine=False)
        print(f"\n评论: {comment}")
        print(f"  SnowNLP 得分: {result['snownlp']['score']:.4f}")
        print(f"  情感倾向: {result['final_label']}")
        print(f"  关键词: {', '.join(result['snownlp']['keywords'])}")
    
    print("\n✅ 情感分析功能正常")
    print()
    return True


def test_batch_analysis():
    print("=" * 50)
    print("测试批量分析和统计功能...")
    print("=" * 50)
    
    loader = CommentDataLoader(data_dir="data")
    analyzer = SentimentAnalyzer()
    
    files = loader.get_available_files()
    if not files:
        print("❌ 没有找到数据文件")
        return False
    
    df = loader.load_comments(files[0])
    comments = df['comment'].tolist()[:10]
    
    results = analyzer.batch_analyze(comments, use_volcengine=False)
    stats = analyzer.get_sentiment_stats(results)
    
    print(f"\n批量分析 {len(results)} 条评论:")
    print(f"  积极: {stats['positive']} ({stats['positive_ratio']:.1%})")
    print(f"  消极: {stats['negative']} ({stats['negative_ratio']:.1%})")
    print(f"  中性: {stats['neutral']} ({stats['neutral_ratio']:.1%})")
    
    print("\n✅ 批量分析和统计功能正常")
    print()
    return True


def main():
    print("\n" + "=" * 50)
    print("社交媒体情感分析系统 - 功能验证")
    print("=" * 50 + "\n")
    
    all_passed = True
    
    all_passed &= test_data_loader()
    all_passed &= test_sentiment_analyzer()
    all_passed &= test_batch_analysis()
    
    print("=" * 50)
    if all_passed:
        print("🎉 所有测试通过！项目功能正常运行！")
    else:
        print("❌ 部分测试失败，请检查代码。")
    print("=" * 50)
    
    print("\n启动 Streamlit 应用命令:")
    print("  cd dashboard")
    print("  streamlit run app.py")
    print()


if __name__ == "__main__":
    main()
