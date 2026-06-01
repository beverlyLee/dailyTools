XHS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": "https://www.xiaohongshu.com",
    "Referer": "https://www.xiaohongshu.com/",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "Connection": "keep-alive"
}

JIKE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh-Hans;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": "https://web.okjike.com",
    "Referer": "https://web.okjike.com/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "Connection": "keep-alive"
}

CRAWLER_CONFIG = {
    "xhs_base_url": "https://www.xiaohongshu.com",
    "jike_base_url": "https://web.okjike.com",
    "request_delay": 2,
    "max_retries": 3,
    "timeout": 30,
    "use_proxy": False,
    "proxy_pool": []
}

SEARCH_KEYWORDS = [
    "饭搭子",
    "健身搭子", 
    "游戏搭子",
    "旅游搭子",
    "看展搭子",
    "学习搭子",
    "电影搭子",
    "逛街搭子",
    "宠物搭子",
    "酒搭子"
]

CITIES = ["北京", "上海", "广州", "深圳", "成都", "长沙"]