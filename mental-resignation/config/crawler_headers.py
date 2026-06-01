CRAWLER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Referer": "https://maimai.cn/",
}

DATA_SOURCES = {
    "maimai": {
        "base_url": "https://maimai.cn/api",
        "endpoints": {
            "posts": "/feed/list",
            "comments": "/comment/list",
        },
        "rate_limit": 1,
    },
    "xiaohongshu": {
        "base_url": "https://edith.xiaohongshu.com/api",
        "endpoints": {
            "notes": "/web_api/sns/v10/search/notes",
        },
        "rate_limit": 1,
    },
}

KEYWORDS = [
    "不想上班", "摸鱼", "划水", "想退休", "精神离职",
    "躺平", "摆烂", "不想干活", "打工人", "社畜",
    "心累", "加班", "内卷", "996", "007",
    "通勤", "早八", "搬砖", "干不动", "想辞职",
    "咖啡续命", "带薪摸鱼", "工位", "打工魂",
    "emo", "精神状态", "内耗", "躺平摆烂",
]

MOUYU_TECHNIQUES = [
    "反复刷新邮件", "假装开会", "带薪如厕",
    "整理工位", "逛购物网站", "刷短视频",
    "假装思考", "接私人电话", "喝水中场休息",
    "来回溜达", "更新简历", "刷脉脉",
    "写博客", "学英语", "看股票",
    "发呆", "吐槽同事", "点外卖",
]
