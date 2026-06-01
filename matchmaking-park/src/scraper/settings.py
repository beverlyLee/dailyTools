BOT_NAME = 'matchmaking_scraper'

SPIDER_MODULES = ['src.scraper.spiders']
NEWSPIDER_MODULE = 'src.scraper.spiders'

ROBOTSTXT_OBEY = True

CONCURRENT_REQUESTS = 16

DOWNLOAD_DELAY = 1
RANDOMIZE_DOWNLOAD_DELAY = True

COOKIES_ENABLED = False

TELNETCONSOLE_ENABLED = False

DEFAULT_REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

ITEM_PIPELINES = {
    'src.scraper.pipelines.DuplicatesPipeline': 100,
    'src.scraper.pipelines.OCRValidationPipeline': 200,
    'src.scraper.pipelines.MatchmakingPipeline': 300,
}

AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 5
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0

HTTPCACHE_ENABLED = True
HTTPCACHE_EXPIRATION_SECS = 0
HTTPCACHE_DIR = 'httpcache'
