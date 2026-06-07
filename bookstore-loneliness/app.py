import os
import sys
import asyncio
from flask import Flask, jsonify, render_template, request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.crawler.bookstore_review_spider import BookstoreReviewSpider
from src.model.solitude_index import SolitudeIndexCalculator
from src.classify.bookstore_type import (
    BookstoreClassifier,
    TYPE_NAMES_CN,
    TYPE_COLORS
)

app = Flask(__name__, static_folder="static", template_folder="static")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def _infer_bookstore_type(name, address):
    deep_reading_kw = ["先锋", "三联", "大学", "高校", "独立", "人文", "学术"]
    family_kw = ["万象城", "万达", "大悦城", "SM广场", "商场", "购物中心", "广场"]
    internet_kw = ["钟书阁", "言几又", "方所", "PAGE ONE", "猫的天空", "十点", "网红", "打卡"]
    study_kw = ["教辅", "考试", "教材", "考研", "考试"]

    for kw in deep_reading_kw:
        if kw in name or kw in address:
            return "deep_reading"
    for kw in study_kw:
        if kw in name or kw in address:
            return "student"
    for kw in family_kw:
        if kw in name or kw in address:
            return "family"
    for kw in internet_kw:
        if kw in name:
            return "internet_famous"
    return "mixed"


def _generate_typed_reviews(spider, bookstore_id, bookstore_type, count=30):
    import random

    type_templates = {
        "deep_reading": [
            "一个人在这里安静地待了一下午，看看书发发呆，很享受这种独处的时光。环境很安静，适合深度阅读。",
            "独自来的，很喜欢这里的氛围，安静得能听见翻书的声音。可以沉浸在书里一整天。",
            "周末自己一个人过来，找个角落坐着看书，时间过得特别快。清净的好去处。",
            "最喜欢一个人来这里放空，书架之间慢慢逛，能淘到不少好书。静谧的空间让人放松。",
            "独自看书的好去处，人不多很安静，适合独处。点一杯咖啡可以坐一下午。",
            "孤独的人适合来这里，一个人静静地看书，没人打扰。与世隔绝的感觉。",
            "周末常独自来这里打发时间，看看书发发呆，很治愈。",
            "一个人逛书店是最好的放松方式，这里的氛围很适合独处。",
        ],
        "family": [
            "带孩子过来的，亲子阅读区很不错，小朋友很喜欢。绘本种类也很多。",
            "周末全家一起来的，孩子在儿童区看书，大人在旁边也能看看自己的书。",
            "带娃打卡，里面有专门的儿童绘本区，小朋友玩得很开心。适合亲子活动。",
            "陪孩子来的，儿童书籍很丰富，还有阅读角。一家三口消磨了一上午。",
            "带宝宝过来读绘本，环境不错，孩子很喜欢。亲子阅读的好地方。",
            "周末带孩子来这里看书，儿童区很大，孩子玩得很开心。",
            "适合带小朋友来，有很多绘本和儿童读物。亲子时光的好去处。",
        ],
        "student": [
            "学生党常来写作业，环境安静，适合学习。复习备考的好去处。",
            "在这里上自习，看书学习效率很高。写论文写作业都很合适。",
            "考研党表示很喜欢这里，安静有学习氛围。做功课复习都不错。",
            "放假就来这里看书学习，做做作业，比在家效率高多了。学生的福音。",
            "大学附近的书店，经常来自习。学习氛围很好，适合看书写作业。",
            "考试周经常来这里复习，安静有学习的氛围。学生很多。",
        ],
        "internet_famous": [
            "网红书店打卡，装修很有设计感，拍照特别出片。适合拍照发朋友圈。",
            "ins风满满的书店，颜值很高，适合拍照。文艺青年必打卡之地。",
            "慕名而来，环境很漂亮，很适合拍照下午茶。网红店名不虚传。",
            "装修很有特色，设计感十足，拍照很好看。咖啡店和书店的结合很棒。",
            "文艺青年聚集地，拍照很出片。适合和朋友一起来打卡拍照。",
            "氛围感满满的书店，适合拍照打卡。下午茶的好去处。",
        ],
        "mixed": [
            "环境还可以，书的种类比较多。有时候带孩子来看看绘本，自己也能翻翻书。",
            "挺不错的书店，学习的人不少，也有来拍照的。整体氛围还行。",
            "周末人有点多，有学生在看书学习，也有带孩子的。书的种类丰富。",
            "路过进来逛逛，书挺多的，适合随便看看。有时间可以多待一会儿。",
            "整体感觉不错，可以安静看书，也适合随便逛逛。选择很多样。",
        ]
    }

    extra_phrases = [
        "书的种类很丰富。",
        "服务态度不错。",
        "环境很舒适。",
        "值得推荐。",
        "下次还会来。",
        "性价比还可以。",
        "位置很好找。",
        "交通便利。"
    ]

    primary_templates = type_templates.get(bookstore_type, type_templates["mixed"])
    mixed_templates = type_templates["mixed"]

    from src.crawler.bookstore_review_spider import BookstoreReview

    reviews = []
    for i in range(count):
        if random.random() < 0.75:
            template = random.choice(primary_templates)
        else:
            template = random.choice(mixed_templates)

        content = template + " " + random.choice(extra_phrases)

        review = BookstoreReview(
            bookstore_id=bookstore_id,
            bookstore_name="",
            address="",
            review_id=f"{bookstore_id}_rev_{i}",
            user_name=f"用户_{random.randint(1000, 9999)}",
            content=content,
            rating=round(random.uniform(3.5, 5.0), 1),
            review_time=f"2024-{random.randint(1,12):02d}-{random.randint(1,28):02d}"
        )
        reviews.append(review)

    return reviews


def get_default_data():
    spider = BookstoreReviewSpider(headless=True)
    calculator = SolitudeIndexCalculator(use_jieba=False)
    classifier = BookstoreClassifier()

    mock_bookstores = spider._generate_mock_bookstores("上海")
    bookstores_data = []

    for idx, bs in enumerate(mock_bookstores):
        bookstore_id = f"bs_{idx:03d}"
        bs_type = _infer_bookstore_type(bs["name"], bs["address"])
        reviews = _generate_typed_reviews(spider, bookstore_id, bs_type, count=30)

        info = type("BookstoreInfo", (), {
            "bookstore_id": bookstore_id,
            "name": bs["name"],
            "address": bs["address"],
            "avg_rating": bs["rating"],
            "review_count": bs["review_count"],
            "reviews": reviews
        })()
        bookstores_data.append(info)

    solitude_results = calculator.calculate_batch(bookstores_data)
    classifications = classifier.classify_batch(solitude_results)
    edges = classifier.build_similarity_network(classifications, similarity_threshold=0.3)
    city_stats = calculator.analyze_city_solitude(solitude_results)
    type_stats = classifier.get_type_statistics(classifications)

    nodes = []
    for i, (sol, cls) in enumerate(zip(solitude_results, classifications)):
        nodes.append({
            "id": sol.bookstore_id,
            "name": sol.bookstore_name,
            "address": bookstores_data[i].address,
            "rating": bookstores_data[i].avg_rating,
            "review_count": sol.total_reviews,
            "solitude_score": sol.normalized_solitude,
            "solitude_raw": sol.solitude_score,
            "family_score": sol.family_score,
            "student_score": sol.student_score,
            "internet_famous_score": sol.internet_famous_score,
            "type": cls.primary_type,
            "type_name_cn": TYPE_NAMES_CN[cls.primary_type],
            "type_color": TYPE_COLORS[cls.primary_type],
            "type_scores": cls.type_scores,
            "confidence": cls.confidence,
            "group": cls.primary_type
        })

    return {
        "nodes": nodes,
        "links": edges,
        "city_stats": city_stats,
        "type_stats": type_stats
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/bookstores")
def api_bookstores():
    city = request.args.get("city", "上海")
    data = get_default_data()
    data["city"] = city
    return jsonify(data)


@app.route("/api/bookstore/<bookstore_id>")
def api_bookstore_detail(bookstore_id):
    spider = BookstoreReviewSpider()
    calculator = SolitudeIndexCalculator(use_jieba=False)

    reviews = spider._generate_mock_reviews(bookstore_id, count=20)
    result = calculator.calculate_from_reviews(reviews, bookstore_id=bookstore_id)

    return jsonify({
        "bookstore_id": bookstore_id,
        "solitude_score": result.normalized_solitude,
        "detailed_scores": {
            "solitude": result.solitude_score,
            "family": result.family_score,
            "student": result.student_score,
            "internet_famous": result.internet_famous_score
        },
        "keyword_counts": result.keyword_counts,
        "total_reviews": result.total_reviews,
        "reviews": [
            {"id": r.review_id, "content": r.content, "rating": r.rating, "time": r.review_time}
            for r in reviews[:10]
        ]
    })


@app.route("/api/city-stats")
def api_city_stats():
    city = request.args.get("city", "上海")
    data = get_default_data()
    return jsonify({
        "city": city,
        "solitude": data["city_stats"],
        "types": data["type_stats"]
    })


@app.route("/api/trigger-crawl", methods=["POST"])
def api_trigger_crawl():
    city = request.json.get("city", "上海") if request.is_json else "上海"
    return jsonify({
        "status": "started",
        "city": city,
        "message": "Crawl task started (mock mode)",
        "estimated_time": "~5 minutes"
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
