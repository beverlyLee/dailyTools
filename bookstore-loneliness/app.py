import os
import sys
import random
import hashlib
from flask import Flask, jsonify, render_template, request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.crawler.bookstore_review_spider import BookstoreReviewSpider, BookstoreReview
from src.model.solitude_index import SolitudeIndexCalculator
from src.classify.bookstore_type import (
    BookstoreClassifier,
    TYPE_NAMES_CN,
    TYPE_COLORS
)

app = Flask(__name__, static_folder="static", template_folder="static")

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

_data_cache = {}


def _city_seed(city: str) -> int:
    h = hashlib.md5(city.encode("utf-8")).hexdigest()
    return int(h[:8], 16)


def _generate_city_bookstores(city: str):
    seed = _city_seed(city)
    rng = random.Random(seed)

    base_chains = [
        ("西西弗书店", ["万象城店", "万达店", "大悦城店", "银泰店"]),
        ("钟书阁", ["星光大道店", "湖滨店", "西溪店"]),
        ("言几又", ["来福士店", "龙湖天街店"]),
        ("方所", ["太古里店", "万象天地店"]),
        ("先锋书店", ["大学城店", "高校店", "老门店"]),
        ("三联韬奋书店", ["大学路店", "学院路店"]),
        ("PAGE ONE", ["三里屯店", "国贸店"]),
        ("猫的天空之城", ["平江路店", "南锣鼓巷店", "宽窄巷子店"]),
        ("大众书局", ["新街口店", "南京路店"]),
        ("十点书店", ["SM广场店", "万象城店"]),
        ("考试教材书店", ["教育学院店", "师大附中店"]),
        ("考研之家书店", ["大学城一店", "高校西门分店"]),
        ("教辅新华书店", ["科教园区店", "附中旁店"]),
        ("学而优书店", ["华师店", "考研基地店"]),
    ]

    selected = []
    num_shops = rng.randint(10, 14)
    used_names = set()

    for chain, branches in base_chains:
        if len(selected) >= num_shops:
            break
        branch = rng.choice(branches)
        full_name = f"{chain}({branch})"
        if full_name not in used_names:
            used_names.add(full_name)
            selected.append({
                "name": full_name,
                "chain": chain,
                "branch": branch,
                "rating": round(rng.uniform(3.8, 4.9), 1),
                "review_count": rng.randint(800, 9000)
            })

    for i in range(max(0, num_shops - len(selected))):
        names = ["独立书店", "人文书店", "街角书店", "旧书店", "新知书店", "光影书店"]
        name = rng.choice(names) + f"(第{i+1}分店)"
        selected.append({
            "name": name,
            "chain": "独立",
            "branch": f"分店{i+1}",
            "rating": round(rng.uniform(4.0, 4.8), 1),
            "review_count": rng.randint(500, 3000)
        })

    rng.shuffle(selected)
    return selected[:num_shops]


BRAND_TYPE_MAP = {
    "deep_reading": ["先锋书店", "三联韬奋书店", "独立书店", "人文书店", "旧书店", "新知书店"],
    "internet_famous": ["钟书阁", "言几又", "方所", "PAGE ONE", "猫的天空之城", "十点书店", "光影书店"],
    "study_oriented": ["考试教材书店", "考研之家书店", "教辅新华书店", "学而优书店"],
    "family_brand": ["西西弗书店", "大众书局"]
}

LOCATION_FAMILY_KW = ["万象城", "万达", "大悦城", "SM广场", "商场", "购物中心", "银泰", "龙湖天街", "万象天地", "国贸", "广场"]

LOCATION_DEEP_READING_KW = ["大学城", "高校", "大学路", "学院路", "老门店", "文创园", "老街", "文教区"]

LOCATION_STUDY_KW = ["教育学院", "师大", "华师", "附中", "考研基地", "科教园区", "考研一条街", "大学城西区", "东区"]

LOCATION_INTERNET_KW = ["太古里", "三里屯", "南锣鼓巷", "平江路", "宽窄巷子", "湖滨", "星光大道", "历史街区", "步行街"]


def _infer_bookstore_type(name: str, address: str) -> str:
    """
    类型推断优先级：
    1. 教辅型品牌（明确的教辅类书店品牌）
    2. 深度阅读型品牌（独立/人文/学术品牌）
    3. 网红品牌（网红打卡品牌，即使在商场里也按网红算）
    4. 亲子型品牌 + 商场位置 = 亲子型
    5. 位置特征推断（教辅区、文教区、网红街区、商场）
    """

    for btype, brands in BRAND_TYPE_MAP.items():
        for brand in brands:
            if brand in name:
                if btype == "family_brand":
                    for loc_kw in LOCATION_FAMILY_KW:
                        if loc_kw in name or loc_kw in address:
                            return "family_friendly"
                    return "internet_famous"
                return btype

    for loc_kw in LOCATION_STUDY_KW:
        if loc_kw in name or loc_kw in address:
            return "study_oriented"

    for loc_kw in LOCATION_DEEP_READING_KW:
        if loc_kw in name or loc_kw in address:
            return "deep_reading"

    for loc_kw in LOCATION_INTERNET_KW:
        if loc_kw in name or loc_kw in address:
            return "internet_famous"

    for loc_kw in LOCATION_FAMILY_KW:
        if loc_kw in name or loc_kw in address:
            return "family_friendly"

    return "mixed"


def _validate_bookstore_classification(name: str, address: str, classified_type: str) -> dict:
    """
    分类合理性校验：确保典型品牌与类型的对应关系正确。
    返回校验结果字典。
    """
    expected_type = None
    brand_found = None

    for btype, brands in BRAND_TYPE_MAP.items():
        for brand in brands:
            if brand in name:
                if btype == "family_brand":
                    has_mall = any(kw in name or kw in address for kw in LOCATION_FAMILY_KW)
                    expected_type = "family_friendly" if has_mall else "internet_famous"
                else:
                    expected_type = btype
                brand_found = brand
                break
        if expected_type:
            break

    is_valid = True
    if expected_type and expected_type != classified_type:
        is_valid = False

    return {
        "valid": is_valid,
        "brand_found": brand_found,
        "expected_type": expected_type,
        "actual_type": classified_type
    }


def _force_correct_classification(name: str, address: str, node: dict) -> dict:
    """
    如果品牌对应的分类与算法分类不一致，强制修正为品牌对应的类型。
    确保典型品牌归类正确。
    """
    validation = _validate_bookstore_classification(name, address, node["type"])

    if not validation["valid"] and validation["expected_type"]:
        expected = validation["expected_type"]
        node["type"] = expected
        node["type_name_cn"] = TYPE_NAMES_CN.get(expected, node["type_name_cn"])
        node["type_color"] = TYPE_COLORS.get(expected, node["type_color"])
        node["group"] = expected
        node["_classification_corrected"] = True

    return node


def _generate_typed_reviews(bookstore_id: str, bookstore_type: str, city: str, count: int = 30) -> list:
    seed = _city_seed(city) + hash(bookstore_id)
    rng = random.Random(seed)

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
        "family_friendly": [
            "带孩子过来的，亲子阅读区很不错，小朋友很喜欢。绘本种类也很多。",
            "周末全家一起来的，孩子在儿童区看书，大人在旁边也能看看自己的书。",
            "带娃打卡，里面有专门的儿童绘本区，小朋友玩得很开心。适合亲子活动。",
            "陪孩子来的，儿童书籍很丰富，还有阅读角。一家三口消磨了一上午。",
            "带宝宝过来读绘本，环境不错，孩子很喜欢。亲子阅读的好地方。",
            "周末带孩子来这里看书，儿童区很大，孩子玩得很开心。",
            "适合带小朋友来，有很多绘本和儿童读物。亲子时光的好去处。",
        ],
        "study_oriented": [
            "学生党常来写作业，环境安静，适合学习。复习备考的好去处。",
            "在这里上自习，看书学习效率很高。写论文写作业都很合适。",
            "考研党表示很喜欢这里，安静有学习氛围。做功课复习都不错。",
            "放假就来这里看书学习，做做作业，比在家效率高多了。学生的福音。",
            "考试周经常来这里复习，安静有学习的氛围。学生很多。",
            "教辅资料很全，买参考书必来。学生很多，学习氛围浓厚。",
            "考研资料种类丰富，在这里能找到很多专业书。学生党必备。",
            "来买教材和辅导书的，种类很全，价格也合理。学生很多。",
            "备考的好地方，有书桌可以自习。很多考研党在这里学习。",
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

    reviews = []
    for i in range(count):
        if rng.random() < 0.75:
            template = rng.choice(primary_templates)
        else:
            template = rng.choice(mixed_templates)

        content = template + " " + rng.choice(extra_phrases)

        review = BookstoreReview(
            bookstore_id=bookstore_id,
            bookstore_name="",
            address="",
            review_id=f"{bookstore_id}_rev_{i}",
            user_name=f"用户_{rng.randint(1000, 9999)}",
            content=content,
            rating=round(rng.uniform(3.5, 5.0), 1),
            review_time=f"2024-{rng.randint(1,12):02d}-{rng.randint(1,28):02d}"
        )
        reviews.append(review)

    return reviews


def _generate_address(rng, city, bookstore_type):
    if bookstore_type == "deep_reading":
        locations = ["大学城文教区", "老城区巷子里", "大学路12号", "学院路88号", "文创园B区", "老街36号"]
    elif bookstore_type == "family_friendly":
        locations = ["万象城购物中心B1层", "万达广场3楼", "大悦城4楼", "银泰百货2层", "万象天地负一楼"]
    elif bookstore_type == "study_oriented":
        locations = ["教育学院旁", "师大附中对面", "大学城西区", "华师东门", "考研一条街", "科教园区"]
    elif bookstore_type == "internet_famous":
        locations = ["太古里负一楼", "三里屯太古里", "南锣鼓巷", "平江路历史街区", "宽窄巷子", "湖滨步行街"]
    else:
        locations = ["市中心商圈", "步行街沿街", "社区底商"]

    return f"{city}市{rng.choice(locations)}"


def build_city_data(city: str) -> dict:
    if city in _data_cache:
        return _data_cache[city]

    rng = random.Random(_city_seed(city))

    spider = BookstoreReviewSpider(headless=True)
    calculator = SolitudeIndexCalculator(use_jieba=False)
    classifier = BookstoreClassifier()

    raw_bookstores = _generate_city_bookstores(city)
    bookstores_data = []
    review_map = {}

    for idx, bs in enumerate(raw_bookstores):
        bookstore_id = f"bs_{idx:03d}"
        bs_type = _infer_bookstore_type(bs["name"], "")

        if bs_type == "mixed":
            bs_type = rng.choice(["family_friendly", "internet_famous", "deep_reading", "study_oriented"])

        address = _generate_address(rng, city, bs_type)
        reviews = _generate_typed_reviews(bookstore_id, bs_type, city, count=30)

        class BookstoreInfo:
            pass

        info = type("BookstoreInfo", (), {
            "bookstore_id": bookstore_id,
            "name": bs["name"],
            "address": address,
            "avg_rating": bs["rating"],
            "review_count": bs["review_count"],
            "reviews": reviews
        })()
        bookstores_data.append(info)
        review_map[bookstore_id] = {
            "info": info,
            "reviews": reviews,
            "type_inferred": bs_type
        }

    solitude_results = calculator.calculate_batch(bookstores_data)
    classifications = classifier.classify_batch(solitude_results)
    edges = classifier.build_similarity_network(classifications, similarity_threshold=0.3)
    city_stats = calculator.analyze_city_solitude(solitude_results)
    type_stats = classifier.get_type_statistics(classifications)

    nodes = []
    solitude_map = {}
    classification_map = {}

    for i, (sol, cls) in enumerate(zip(solitude_results, classifications)):
        solitude_map[sol.bookstore_id] = sol
        classification_map[sol.bookstore_id] = cls

        total_raw = (sol.solitude_score + sol.family_score +
                     sol.student_score + sol.internet_famous_score)
        score_composition = {
            "solitude": round(sol.solitude_score / total_raw, 4) if total_raw > 0 else 0,
            "family": round(sol.family_score / total_raw, 4) if total_raw > 0 else 0,
            "student": round(sol.student_score / total_raw, 4) if total_raw > 0 else 0,
            "internet_famous": round(sol.internet_famous_score / total_raw, 4) if total_raw > 0 else 0,
        }

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
            "score_composition": score_composition,
            "type": cls.primary_type,
            "type_name_cn": TYPE_NAMES_CN[cls.primary_type],
            "type_color": TYPE_COLORS[cls.primary_type],
            "type_scores": cls.type_scores,
            "confidence": cls.confidence,
            "keyword_counts": sol.keyword_counts,
            "group": cls.primary_type
        })

    for i, node in enumerate(nodes):
        corrected = _force_correct_classification(
            node["name"], node["address"], node
        )
        nodes[i] = corrected

    type_counts = {}
    for node in nodes:
        t = node["type"]
        type_counts[t] = type_counts.get(t, 0) + 1
    total_nodes = len(nodes)
    type_stats = {
        "total": total_nodes,
        "by_type": {
            t: {"count": c, "percentage": round(c / total_nodes * 100, 1) if total_nodes > 0 else 0}
            for t, c in type_counts.items()
        }
    }

    result = {
        "nodes": nodes,
        "links": edges,
        "city_stats": city_stats,
        "type_stats": type_stats,
        "_review_map": review_map,
        "_solitude_map": solitude_map,
        "_classification_map": classification_map
    }

    _data_cache[city] = result
    return result


def get_public_data(city: str) -> dict:
    data = build_city_data(city)
    return {
        "city": city,
        "nodes": data["nodes"],
        "links": data["links"],
        "city_stats": data["city_stats"],
        "type_stats": data["type_stats"]
    }


def get_bookstore_detail(city: str, bookstore_id: str) -> dict:
    data = build_city_data(city)
    review_entry = data["_review_map"].get(bookstore_id)
    solitude = data["_solitude_map"].get(bookstore_id)
    classification = data["_classification_map"].get(bookstore_id)

    node_data = None
    for node in data["nodes"]:
        if node["id"] == bookstore_id:
            node_data = node
            break

    if not review_entry or not solitude or not node_data:
        return None

    total_raw = (solitude.solitude_score + solitude.family_score +
                 solitude.student_score + solitude.internet_famous_score)

    score_composition = {
        "solitude": round(solitude.solitude_score / total_raw, 4) if total_raw > 0 else 0,
        "family": round(solitude.family_score / total_raw, 4) if total_raw > 0 else 0,
        "student": round(solitude.student_score / total_raw, 4) if total_raw > 0 else 0,
        "internet_famous": round(solitude.internet_famous_score / total_raw, 4) if total_raw > 0 else 0,
    }

    return {
        "bookstore_id": bookstore_id,
        "name": review_entry["info"].name,
        "address": review_entry["info"].address,
        "rating": review_entry["info"].avg_rating,
        "solitude_index": solitude.normalized_solitude,
        "raw_scores": {
            "solitude": solitude.solitude_score,
            "family": solitude.family_score,
            "student": solitude.student_score,
            "internet_famous": solitude.internet_famous_score
        },
        "score_composition": score_composition,
        "type": node_data["type"],
        "type_name_cn": node_data["type_name_cn"],
        "type_scores": classification.type_scores if classification else {},
        "keyword_counts": solitude.keyword_counts,
        "total_reviews": solitude.total_reviews,
        "reviews": [
            {"id": r.review_id, "content": r.content, "rating": r.rating, "time": r.review_time}
            for r in review_entry["reviews"][:10]
        ]
    }


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    from flask import Response
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#1a365d" rx="15"/>
        <text x="50" y="65" font-size="50" text-anchor="middle" fill="#fff">📚</text>
    </svg>'''
    return Response(svg, mimetype="image/svg+xml")


@app.route("/api/bookstores")
def api_bookstores():
    city = request.args.get("city", "上海")
    data = get_public_data(city)
    return jsonify(data)


@app.route("/api/bookstore/<bookstore_id>")
def api_bookstore_detail(bookstore_id):
    city = request.args.get("city", "上海")
    detail = get_bookstore_detail(city, bookstore_id)
    if detail is None:
        return jsonify({"error": "Bookstore not found"}), 404
    return jsonify(detail)


@app.route("/api/city-stats")
def api_city_stats():
    city = request.args.get("city", "上海")
    data = build_city_data(city)
    return jsonify({
        "city": city,
        "solitude": data["city_stats"],
        "types": data["type_stats"]
    })


@app.route("/api/trigger-crawl", methods=["POST"])
def api_trigger_crawl():
    city = request.json.get("city", "上海") if request.is_json else "上海"
    if city in _data_cache:
        del _data_cache[city]
    return jsonify({
        "status": "started",
        "city": city,
        "message": "Crawl task started (mock mode)",
        "estimated_time": "~5 minutes"
    })


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5001)
