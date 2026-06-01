import scrapy


class MatchmakingItem(scrapy.Item):
    item_id = scrapy.Field()
    city = scrapy.Field()
    park_name = scrapy.Field()
    image_url = scrapy.Field()
    ocr_raw_text = scrapy.Field()
    ocr_confidence = scrapy.Field()
    parsed_gender = scrapy.Field()
    parsed_age = scrapy.Field()
    parsed_height = scrapy.Field()
    parsed_education = scrapy.Field()
    parsed_hukou = scrapy.Field()
    parsed_house = scrapy.Field()
    parsed_income = scrapy.Field()
    parsed_requirements = scrapy.Field()
    crawl_timestamp = scrapy.Field()
    data_source = scrapy.Field()
