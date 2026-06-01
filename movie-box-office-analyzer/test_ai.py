#!/usr/bin/env python3

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_review import VolcengineAI
from data_source import MovieDataSource

def test_ai_review():
    print("=" * 60)
    print("🎬 火山大模型AI影评测试")
    print("=" * 60)
    
    ai = VolcengineAI()
    ds = MovieDataSource()
    
    movies = ds.get_now_playing_movies()[:3]
    
    for i, movie in enumerate(movies, 1):
        print(f"\n📽️  测试电影 {i}: {movie['name']}")
        print("-" * 60)
        
        review = ai.generate_movie_review(
            movie_name=movie['name'],
            rating=movie['rating'],
            box_office=movie['box_office'],
            genre=movie['genre'],
            director=movie['director'],
            summary=movie['summary']
        )
        
        print(f"📊 评分: {movie['rating']}分")
        print(f"💰 票房: {movie['box_office']/10000:.1f}亿")
        print(f"🎭 类型: {movie['genre']}")
        print(f"\n🤖 AI影评:\n{review}")
        print(f"\n📝 字数: {len(review)}")
    
    print("\n" + "=" * 60)
    print("✅ 测试完成！")
    print("=" * 60)

if __name__ == '__main__':
    test_ai_review()
