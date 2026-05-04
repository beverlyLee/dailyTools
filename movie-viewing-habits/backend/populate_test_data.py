import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'movie_viewing_habits.settings')
django.setup()

from movies.models import Media, UserRating, TasteProfile


def create_test_data():
    print("🎬 开始创建测试数据...")

    sample_media = [
        {
            'tmdb_id': 1,
            'title': '盗梦空间',
            'original_title': 'Inception',
            'media_type': 'movie',
            'overview': '一个能够进入他人梦境窃取机密的盗贼。',
            'release_date': '2010-07-16',
            'vote_average': 8.4,
            'vote_count': 30000,
            'popularity': 85.5,
            'genres': [{'id': 28, 'name': '动作'}, {'id': 878, 'name': '科幻'}, {'id': 12, 'name': '冒险'}],
            'runtime': 148,
            'imdb_id': 'tt1375666'
        },
        {
            'tmdb_id': 2,
            'title': '肖申克的救赎',
            'original_title': 'The Shawshank Redemption',
            'media_type': 'movie',
            'overview': '两个囚犯在监狱中建立了深厚的友谊。',
            'release_date': '1994-09-23',
            'vote_average': 8.7,
            'vote_count': 25000,
            'popularity': 90.0,
            'genres': [{'id': 18, 'name': '剧情'}, {'id': 80, 'name': '犯罪'}],
            'runtime': 142,
            'imdb_id': 'tt0111161'
        },
        {
            'tmdb_id': 3,
            'title': '黑暗骑士',
            'original_title': 'The Dark Knight',
            'media_type': 'movie',
            'overview': '蝙蝠侠与小丑的终极对决。',
            'release_date': '2008-07-18',
            'vote_average': 8.5,
            'vote_count': 28000,
            'popularity': 88.0,
            'genres': [{'id': 28, 'name': '动作'}, {'id': 80, 'name': '犯罪'}, {'id': 18, 'name': '剧情'}],
            'runtime': 152,
            'imdb_id': 'tt0468569'
        },
        {
            'tmdb_id': 4,
            'title': '低俗小说',
            'original_title': 'Pulp Fiction',
            'media_type': 'movie',
            'overview': '几个相互纠缠的洛杉矶犯罪故事。',
            'release_date': '1994-10-14',
            'vote_average': 8.3,
            'vote_count': 22000,
            'popularity': 78.0,
            'genres': [{'id': 80, 'name': '犯罪'}, {'id': 18, 'name': '剧情'}],
            'runtime': 154,
            'imdb_id': 'tt0110912'
        },
        {
            'tmdb_id': 5,
            'title': '阿甘正传',
            'original_title': 'Forrest Gump',
            'media_type': 'movie',
            'overview': '一个男人不平凡的一生。',
            'release_date': '1994-07-06',
            'vote_average': 8.2,
            'vote_count': 20000,
            'popularity': 82.0,
            'genres': [{'id': 18, 'name': '剧情'}, {'id': 10749, 'name': '爱情'}],
            'runtime': 142,
            'imdb_id': 'tt0109830'
        },
        {
            'tmdb_id': 6,
            'title': '星际穿越',
            'original_title': 'Interstellar',
            'media_type': 'movie',
            'overview': '一队探险家穿越虫洞寻找人类新家园。',
            'release_date': '2014-11-07',
            'vote_average': 8.1,
            'vote_count': 24000,
            'popularity': 80.0,
            'genres': [{'id': 878, 'name': '科幻'}, {'id': 12, 'name': '冒险'}, {'id': 18, 'name': '剧情'}],
            'runtime': 169,
            'imdb_id': 'tt0816692'
        },
        {
            'tmdb_id': 7,
            'title': '复仇者联盟',
            'original_title': 'The Avengers',
            'media_type': 'movie',
            'overview': '地球最强英雄们联合起来对抗外星威胁。',
            'release_date': '2012-05-04',
            'vote_average': 7.7,
            'vote_count': 35000,
            'popularity': 95.0,
            'genres': [{'id': 28, 'name': '动作'}, {'id': 12, 'name': '冒险'}, {'id': 878, 'name': '科幻'}],
            'runtime': 143,
            'imdb_id': 'tt0848228'
        },
        {
            'tmdb_id': 8,
            'title': '泰坦尼克号',
            'original_title': 'Titanic',
            'media_type': 'movie',
            'overview': '一艘豪华邮轮上发生的悲剧爱情故事。',
            'release_date': '1997-12-19',
            'vote_average': 7.8,
            'vote_count': 18000,
            'popularity': 75.0,
            'genres': [{'id': 18, 'name': '剧情'}, {'id': 10749, 'name': '爱情'}, {'id': 12, 'name': '冒险'}],
            'runtime': 194,
            'imdb_id': 'tt0120338'
        }
    ]

    created_media = []
    for media_data in sample_media:
        media, created = Media.objects.get_or_create(
            tmdb_id=media_data['tmdb_id'],
            defaults=media_data
        )
        created_media.append(media)
        if created:
            print(f"✅ 创建电影: {media.title}")
        else:
            print(f"⏭️ 电影已存在: {media.title}")

    print("\n👤 创建用户评分数据...")

    user_ratings_data = [
        {'user_id': 1, 'media_title': '盗梦空间', 'rating': 9.0},
        {'user_id': 1, 'media_title': '肖申克的救赎', 'rating': 8.5},
        {'user_id': 1, 'media_title': '黑暗骑士', 'rating': 9.5},
        {'user_id': 1, 'media_title': '低俗小说', 'rating': 7.0},
        {'user_id': 1, 'media_title': '阿甘正传', 'rating': 8.0},
        {'user_id': 1, 'media_title': '星际穿越', 'rating': 8.5},
        {'user_id': 1, 'media_title': '复仇者联盟', 'rating': 6.5},
        {'user_id': 1, 'media_title': '泰坦尼克号', 'rating': 6.0},
        
        {'user_id': 2, 'media_title': '盗梦空间', 'rating': 8.0},
        {'user_id': 2, 'media_title': '肖申克的救赎', 'rating': 9.5},
        {'user_id': 2, 'media_title': '黑暗骑士', 'rating': 8.0},
        {'user_id': 2, 'media_title': '低俗小说', 'rating': 8.5},
        {'user_id': 2, 'media_title': '阿甘正传', 'rating': 9.0},
        {'user_id': 2, 'media_title': '星际穿越', 'rating': 7.5},
        {'user_id': 2, 'media_title': '复仇者联盟', 'rating': 7.0},
        {'user_id': 2, 'media_title': '泰坦尼克号', 'rating': 8.5},
        
        {'user_id': 3, 'media_title': '盗梦空间', 'rating': 9.5},
        {'user_id': 3, 'media_title': '肖申克的救赎', 'rating': 7.5},
        {'user_id': 3, 'media_title': '黑暗骑士', 'rating': 9.0},
        {'user_id': 3, 'media_title': '低俗小说', 'rating': 6.5},
        {'user_id': 3, 'media_title': '阿甘正传', 'rating': 7.0},
        {'user_id': 3, 'media_title': '星际穿越', 'rating': 9.0},
        {'user_id': 3, 'media_title': '复仇者联盟', 'rating': 8.5},
        {'user_id': 3, 'media_title': '泰坦尼克号', 'rating': 5.0},
    ]

    for rating_data in user_ratings_data:
        media = Media.objects.filter(title=rating_data['media_title']).first()
        if media:
            user_rating, created = UserRating.objects.get_or_create(
                user_id=rating_data['user_id'],
                media=media,
                defaults={'rating': rating_data['rating']}
            )
            if created:
                print(f"✅ 用户 {rating_data['user_id']} 评分: {rating_data['media_title']} = {rating_data['rating']}")
            else:
                print(f"⏭️ 评分已存在: {rating_data['media_title']}")

    print("\n✅ 测试数据创建完成！")
    print("\n📊 数据统计:")
    print(f"   - 电影数量: {Media.objects.count()}")
    print(f"   - 评分数量: {UserRating.objects.count()}")
    print(f"   - 用户数量: {UserRating.objects.values('user_id').distinct().count()}")
    print("\n🎯 用户ID对应:")
    print("   - 用户 1: 电影爱好者小明 (喜欢动作/科幻片，评分较严格)")
    print("   - 用户 2: 文艺青年小红 (喜欢剧情/爱情片，评分较宽松)")
    print("   - 用户 3: 动作片迷小刚 (喜欢动作/科幻片，评分差异大)")


if __name__ == '__main__':
    create_test_data()
