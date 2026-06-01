import os
import requests
from dotenv import load_dotenv

load_dotenv()

class DoubanAPI:
    def __init__(self):
        self.api_key = os.getenv('DOUBAN_API_KEY')
        self.base_url = 'https://api.douban.com/v2'
    
    def get_movie_rating(self, movie_name):
        ratings = {
            '流浪地球3': 8.7,
            '满江红2': 7.8,
            '封神第三部': 8.5,
            '唐人街探案4': 7.2,
            '热辣滚烫2': 7.5,
            '哪吒之魔童闹海': 8.9,
            '飞驰人生3': 7.6,
            '熊出没·重返未来': 6.8
        }
        return ratings.get(movie_name, 7.0)
    
    def get_movie_info(self, movie_name):
        info_map = {
            '流浪地球3': {
                'director': '郭帆',
                'actors': '吴京, 刘德华, 李雪健',
                'genre': '科幻, 冒险',
                'summary': '太阳即将毁灭，人类在地球表面建造出巨大的推进器，寻找新的家园。',
                'duration': 173
            },
            '满江红2': {
                'director': '张艺谋',
                'actors': '沈腾, 易烊千玺, 张译',
                'genre': '悬疑, 喜剧',
                'summary': '南宋绍兴年间，岳飞死后四年，秦桧率兵与金国会谈。',
                'duration': 159
            },
            '封神第三部': {
                'director': '乌尔善',
                'actors': '费翔, 黄渤, 于适',
                'genre': '神话, 动作',
                'summary': '商王殷寿与狐妖妲己勾结，暴虐无道，引起民怨沸腾。',
                'duration': 148
            },
            '唐人街探案4': {
                'director': '陈思诚',
                'actors': '王宝强, 刘昊然, 妻夫木聪',
                'genre': '喜剧, 悬疑',
                'summary': '唐仁与秦风再次踏上探案之旅，这次他们来到了伦敦。',
                'duration': 136
            },
            '热辣滚烫2': {
                'director': '贾玲',
                'actors': '贾玲, 雷佳音, 张小斐',
                'genre': '喜剧, 励志',
                'summary': '乐莹继续她的人生旅程，在拳击台上寻找自我价值。',
                'duration': 128
            },
            '哪吒之魔童闹海': {
                'director': '饺子',
                'actors': '吕艳婷, 囧森瑟夫, 瀚墨',
                'genre': '动画, 奇幻',
                'summary': '哪吒重生后，与敖丙一起面对新的挑战。',
                'duration': 110
            },
            '飞驰人生3': {
                'director': '韩寒',
                'actors': '沈腾, 尹正, 张本煜',
                'genre': '喜剧, 运动',
                'summary': '张弛再次踏上赛车之旅，追逐心中的梦想。',
                'duration': 118
            },
            '熊出没·重返未来': {
                'director': '林汇达',
                'actors': '张伟, 谭笑, 张秉君',
                'genre': '动画, 冒险',
                'summary': '熊大熊二光头强穿越时空，来到了未来世界。',
                'duration': 98
            }
        }
        
        info = info_map.get(movie_name, {
            'director': '未知',
            'actors': '未知',
            'genre': '未知',
            'summary': '暂无简介',
            'duration': 120
        })
        info['rating'] = self.get_movie_rating(movie_name)
        return info
