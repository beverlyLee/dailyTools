import schedule
import time
import sys
import os
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
import threading

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from src.spiders.jd_spider import JDBaijiuSpider
from src.spiders.tm_spider import TMBaijiuSpider
from config.settings import settings


class CrawlerScheduler:
    def __init__(self):
        self.interval = settings.CRAWLER_INTERVAL
        self.jd_enabled = settings.CRAWLER_JD_ENABLED
        self.tm_enabled = settings.CRAWLER_TM_ENABLED
        self.use_mock = settings.USE_MOCK_DATA
        self.is_running = False
        self.thread = None

    def run_crawlers(self):
        print(f"开始执行爬虫任务...")
        process = CrawlerProcess(settings={
            "LOG_LEVEL": "INFO",
            "USER_AGENT": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        })

        if self.jd_enabled:
            print("启动京东爬虫...")
            process.crawl(JDBaijiuSpider, use_mock=self.use_mock)

        if self.tm_enabled:
            print("启动天猫爬虫...")
            process.crawl(TMBaijiuSpider, use_mock=self.use_mock)

        process.start()
        print(f"爬虫任务执行完成，下次执行将在{self.interval}秒后...")

    def _scheduler_loop(self):
        schedule.every(self.interval).seconds.do(self.run_crawlers)
        self.run_crawlers()

        while self.is_running:
            schedule.run_pending()
            time.sleep(1)

    def start(self, run_once=False):
        if run_once:
            self.run_crawlers()
            return

        self.is_running = True
        self.thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self.thread.start()
        print(f"爬虫调度器已启动，每{self.interval}秒执行一次")

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("爬虫调度器已停止")


if __name__ == "__main__":
    scheduler = CrawlerScheduler()
    scheduler.start(run_once=True)
