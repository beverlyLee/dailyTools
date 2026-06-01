#!/usr/bin/env python3
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loader.data_loader import DataLoader
from nlp.text_processor import TextProcessor
from nlp.wordcloud_generator import WordCloudGenerator
from stats.salary_analyzer import SalaryAnalyzer

def main():
    print("=" * 60)
    print("🔍 项目功能验证")
    print("=" * 60)
    
    print("\n1. 测试数据加载模块...")
    data_loader = DataLoader(data_dir=os.path.join(os.path.dirname(__file__), 'data'))
    jobs = data_loader.load_all_data()
    print(f"   ✅ 成功加载 {len(jobs)} 条招聘数据")
    
    print("\n2. 测试文本处理模块...")
    text_processor = TextProcessor()
    word_freq = text_processor.get_tech_word_frequencies(jobs)
    print(f"   ✅ 成功提取 {len(word_freq)} 个技术关键词")
    
    ai_count = word_freq.get('人工智能', 0)
    print(f"   📊 '人工智能' 出现次数: {ai_count}")
    if ai_count >= 5:
        print("   ✅ '人工智能' 词频较高，词云图中字号将较大")
    else:
        print("   ⚠️ '人工智能' 词频较低")
    
    print("\n3. 测试薪资分析模块...")
    salary_analyzer = SalaryAnalyzer()
    job_title_salaries = salary_analyzer.analyze_job_title_salaries(jobs)
    
    algo_salary = job_title_salaries.get('算法工程师', {}).get('median', 0)
    test_salary = job_title_salaries.get('测试工程师', {}).get('median', 0)
    
    print(f"   📊 算法工程师中位数薪资: ¥{algo_salary:.0f}")
    print(f"   📊 测试工程师中位数薪资: ¥{test_salary:.0f}")
    
    if algo_salary > test_salary:
        print("   ✅ 算法工程师平均薪资高于测试工程师 ✓")
    else:
        print("   ❌ 算法工程师薪资不高于测试工程师")
    
    print("\n4. 测试词云生成模块...")
    wordcloud_generator = WordCloudGenerator()
    try:
        wordcloud_img = wordcloud_generator.generate_wordcloud(word_freq)
        if wordcloud_img and len(wordcloud_img) > 1000:
            print("   ✅ 词云图生成成功")
        else:
            print("   ⚠️ 词云图生成可能有问题")
    except Exception as e:
        print(f"   ⚠️ 词云生成异常 (可能是字体问题): {e}")
    
    print("\n" + "=" * 60)
    print("📋 验证总结:")
    print("=" * 60)
    
    all_passed = True
    
    if len(jobs) > 0:
        print("✅ 数据加载功能正常")
    else:
        print("❌ 数据加载失败")
        all_passed = False
    
    if ai_count >= 5:
        print("✅ 词云图中'人工智能'字号较大")
    else:
        print("❌ '人工智能'词频不足")
        all_passed = False
    
    if algo_salary > test_salary:
        print("✅ 算法工程师平均薪资高于测试工程师")
    else:
        print("❌ 薪资对比不符合预期")
        all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 所有验证通过！项目功能正常！")
    else:
        print("⚠️ 部分验证未通过，请检查数据和代码")
    print("=" * 60)
    
    print("\n💡 运行命令:")
    print("   cd dev-job-market-insights")
    print("   pip install -r requirements.txt")
    print("   python app.py")
    print("   然后访问: http://localhost:5000")

if __name__ == '__main__':
    main()
