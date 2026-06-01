#!/usr/bin/env python3

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_source.real_movie_data import RealMovieDataSource
from ai_review import VolcengineAI

def test_data_consistency():
    print("=" * 60)
    print("🔍 测试1: 数据一致性验证")
    print("=" * 60)
    
    ds = RealMovieDataSource()
    movies = ds.get_now_playing_movies()
    
    all_passed = True
    for movie in movies:
        is_consistent, msg = ds.verify_data_consistency(movie['id'])
        status = "✅ PASS" if is_consistent else "❌ FAIL"
        print(f"{status} {movie['name']}: {msg}")
        if not is_consistent:
            all_passed = False
    
    print()
    return all_passed

def test_box_office_sum():
    print("=" * 60)
    print("📊 测试2: 票房走势总和验证")
    print("=" * 60)
    
    ds = RealMovieDataSource()
    movies = ds.get_now_playing_movies()
    
    all_passed = True
    for movie in movies:
        trend = ds.get_box_office_trend(movie['id'], 30)
        trend_total = sum(d['box_office'] for d in trend)
        movie_total = movie['box_office']
        
        diff = abs(trend_total - movie_total)
        is_equal = diff <= 1
        
        status = "✅ PASS" if is_equal else "❌ FAIL"
        print(f"{status} {movie['name']}: 累计票房={movie_total/10000:.1f}亿, 走势总和={trend_total/10000:.1f}亿, 差值={diff}")
        
        if not is_equal:
            all_passed = False
    
    print()
    return all_passed

def test_ai_review():
    print("=" * 60)
    print("🤖 测试3: AI影评生成验证")
    print("=" * 60)
    
    ai = VolcengineAI()
    ds = RealMovieDataSource()
    movies = ds.get_now_playing_movies()[:3]
    
    all_passed = True
    for movie in movies:
        review = ai.generate_movie_review(
            movie_name=movie['name'],
            rating=movie['rating'],
            box_office=movie['box_office'],
            genre=movie['genre'],
            director=movie['director'],
            summary=movie['summary']
        )
        
        has_emoji = any(c in review for c in ['🎬', '🌟', '✨', '🔥', '💫', '🎥'])
        has_rating = str(movie['rating']) in review
        has_box_office = f"{movie['box_office']/10000:.1f}" in review.replace('亿', '')
        length_ok = 50 <= len(review) <= 150
        
        print(f"\n📽️  {movie['name']}:")
        print(f"   影评: {review}")
        print(f"   字数: {len(review)}")
        print(f"   ✅ 包含emoji: {has_emoji}")
        print(f"   ✅ 包含评分: {has_rating}")
        print(f"   ✅ 包含票房: {has_box_office}")
        print(f"   ✅ 字数合理: {length_ok}")
        
        if not (has_emoji and length_ok):
            all_passed = False
    
    print()
    return all_passed

def main():
    print("\n🚀 开始运行所有测试...\n")
    
    test1 = test_data_consistency()
    test2 = test_box_office_sum()
    test3 = test_ai_review()
    
    print("=" * 60)
    print("📋 测试结果汇总")
    print("=" * 60)
    print(f"测试1 - 数据一致性: {'✅ 通过' if test1 else '❌ 失败'}")
    print(f"测试2 - 票房总和验证: {'✅ 通过' if test2 else '❌ 失败'}")
    print(f"测试3 - AI影评生成: {'✅ 通过' if test3 else '❌ 失败'}")
    print()
    
    all_passed = test1 and test2 and test3
    if all_passed:
        print("🎉 所有测试通过！问题已全部解决！")
    else:
        print("⚠️  部分测试未通过，请检查相关代码。")
    
    return all_passed

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
