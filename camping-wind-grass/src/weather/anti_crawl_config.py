import random
import time
from typing import Dict
from fake_useragent import UserAgent


class AntiCrawlConfig:
    def __init__(self):
        self.ua = UserAgent()
        self.request_count = 0
        self.last_request_time = 0

        self.delay_range = {
            "min": 1,
            "max": 3,
        }

        self.user_agents = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ]

        self.referers = [
            "https://www.baidu.com/",
            "https://www.google.com/",
            "https://www.bing.com/",
            "https://www.sogou.com/",
        ]

    def get_headers(self, target: str = "default") -> Dict[str, str]:
        headers = {
            "User-Agent": self._get_user_agent(),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": self._get_referer(),
            "DNT": "1",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }

        if target == "xiaohongshu":
            headers.update({
                "Origin": "https://www.xiaohongshu.com",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
            })

        return headers

    def _get_user_agent(self) -> str:
        return random.choice(self.user_agents)

    def _get_referer(self) -> str:
        return random.choice(self.referers)

    def random_delay(self) -> None:
        delay = random.uniform(self.delay_range["min"], self.delay_range["max"])
        time.sleep(delay)

    def adaptive_delay(self) -> None:
        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < 0.5:
            additional_delay = random.uniform(0.5, 1.5)
            time.sleep(additional_delay)
        elif self.request_count > 10:
            additional_delay = random.uniform(2, 4)
            time.sleep(additional_delay)
            self.request_count = 0
        else:
            self.random_delay()

        self.last_request_time = time.time()
        self.request_count += 1

    def get_proxy(self) -> Dict[str, str]:
        return {}

    def should_rotate_ip(self) -> bool:
        return self.request_count > 50

    def reset_counters(self):
        self.request_count = 0
        self.last_request_time = 0


anti_crawl = AntiCrawlConfig()
