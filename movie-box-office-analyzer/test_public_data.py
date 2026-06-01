#!/usr/bin/env python3

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_source.public_movie_data import PublicMovieDataSource

def test_data_source():
    print("=" * 70)
    print("🔍 测试公开数据源 - 真实热映电影数据")
    print("=" * 70)
    
    ds = PublicMovieDataSource()
    info = ds.get_data_source_info()
    
    print(f"\n📊 数据源信息:")
    print(f"   来源: {info['source']}")
    print(f"   获取时间: {info['fetch_time']}")
    print(f"   电影数量: {info['movie_count']} 部")
    print(f"   真实数据: {'✅ 是' if info['is_real_data'] else '❌ 否'}")
    
    print(f"\n🎬 热映电影列表:")
    print("-" * 70)
    
    movies = ds.get_now_playing_movies()
    
    for i, movie in enumerate(movies, 1):
        print(f"\n{i}. {movie['name']}")
        print(f"   评分: ⭐ {movie['rating']} 分")
        print(f"   票房: 💰 {movie['box_office']/10000:.1f} 亿")
        print(f"   导演: 🎬 {movie['director']}")
        print(f"   主演: 👥 {movie['actors']}")
        print(f"   类型: 🎭 {movie['genre']}")
        print(f"   片长: ⏱ {movie['duration']} 分钟")
        print(f"   上映: 📅 {movie['release_date']}")
        if movie['poster']:
            print(f"   海报: 🖼 {movie['poster'][:80]}...")
    
    print(f"\n" + "-" * 70)
    print(f"📈 测试票房走势数据一致性:")
    print("-" * 70)
    
    all_consistent = True
    for movie in movies:
        is_consistent, msg = ds.verify_data_consistency(movie['id'])
        status = "✅" if is_consistent else "❌"
        print(f"   {status} {movie['name']}: {msg}")
        if not is_consistent:
            all_consistent = False
    
    print(f"\n" + "=" * 70)
    print(f"📋 测试结果汇总")
    print("=" * 70)
    print(f"   数据源获取: {'✅ 成功' if movies else '❌ 失败'}")
    print(f"   数据一致性: {'✅ 全部通过' if all_consistent else '❌ 存在问题'}")
    print(f"   电影数量: {len(movies)} 部")
    
    if len(movies) > 0:
        print(f"\n🎉 公开数据源测试完成！")
        print(f"   已成功获取 {len(movies)} 部真实热映电影数据！")
        return True
    else:
        print(f"\n⚠️  未能获取到实时数据，已使用备用经典电影数据")
        return False

if __name__ == '__main__':
    success = test_data_source()
    sys.exit(0 if success else 1)
