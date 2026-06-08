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


def _generate_city_bookstores(city: str) -> list:
    seed = _city_seed(city)
    rng = random.Random(seed)

    base_chains = [
        "西西弗书店", "钟书阁", "言几又", "方所",
        "先锋书店", "三联韬奋书店", "PAGE ONE", "猫的天空之城",
        "大众书局", "十点书店", "考试教材书店", "考研之家书店",
        "教辅新华书店", "学而优书店",
    ]

    if city in CITY_LOCATIONS:
        locs = CITY_LOCATIONS[city]
        all_locations = (locs.get("family_friendly", []) + locs.get("internet_famous", []) +
                        locs.get("deep_reading", []) + locs.get("study_oriented", []) + locs.get("mixed", []))
    else:
        all_locations = ["中心店", "旗舰店", "一号店", "二号店"]

    selected = []
    num_shops = rng.randint(10, 14)
    used_names = set()

    chain_loc_map = {}

    for chain in base_chains:
        if len(selected) >= num_shops:
            break

        is_family_brand = chain in BRAND_TYPE_MAP.get("family_brand", [])

        if all_locations:
            if is_family_brand and locs.get("family_friendly") and rng.random() < 0.6:
                branch_loc = rng.choice(locs["family_friendly"])
            else:
                branch_loc = rng.choice(all_locations)
            branch_name = _location_to_branch_name(branch_loc)
        else:
            branch_name = f"中心店"

        full_name = f"{chain}({branch_name}店)"
        if full_name not in used_names:
            used_names.add(full_name)
            selected.append({
                "name": full_name,
                "chain": chain,
                "branch": branch_name,
                "rating": round(rng.uniform(3.8, 4.9), 1),
                "review_count": rng.randint(800, 9000)
            })

    for i in range(max(0, num_shops - len(selected))):
        names = ["独立书店", "人文书店", "街角书店", "旧书店", "新知书店", "光影书店"]
        if all_locations:
            branch_loc = rng.choice(all_locations)
            branch_name = _location_to_branch_name(branch_loc)
        else:
            branch_name = f"第{i+1}分店"
        name = rng.choice(names) + f"({branch_name}店)"
        selected.append({
            "name": name,
            "chain": "独立",
            "branch": branch_name,
            "rating": round(rng.uniform(4.0, 4.8), 1),
            "review_count": rng.randint(500, 3000)
        })

    rng.shuffle(selected)
    return selected[:num_shops]


def _location_to_branch_name(location: str) -> str:
    short = location
    suffixes = ["购物中心", "创意园", "文创园", "文化街", "步行街", "历史街区",
                "大学城", "校区旁", "校区", "附近", "地铁站", "购物广场",
                "广场", "商城", "大街", "路", "街", "区", "巷", "胡同", "里"]
    for suffix in suffixes:
        if location.endswith(suffix):
            short = location[:-len(suffix)]
            break
    if len(short) > 8:
        short = short[:8]
    return short if short else location


BRAND_TYPE_MAP = {
    "deep_reading": ["先锋书店", "三联韬奋书店", "独立书店", "人文书店", "旧书店", "新知书店"],
    "internet_famous": ["钟书阁", "言几又", "方所", "PAGE ONE", "猫的天空之城", "十点书店", "光影书店"],
    "study_oriented": ["考试教材书店", "考研之家书店", "教辅新华书店", "学而优书店"],
    "family_brand": ["西西弗书店", "大众书局"]
}

NEGATIVE_TYPE_RULES = {
    "西西弗书店": ["internet_famous"],
    "大众书局": ["internet_famous"],
    "考试教材书店": ["family_friendly", "internet_famous"],
    "考研之家书店": ["family_friendly", "internet_famous"],
    "学而优书店": ["family_friendly", "internet_famous"],
    "教辅新华书店": ["family_friendly", "internet_famous"],
    "先锋书店": ["internet_famous", "family_friendly"],
    "三联韬奋书店": ["internet_famous", "family_friendly"],
}

CITY_LOCATIONS = {
    "上海": {
        "family_friendly": ["万象城购物中心", "陆家嘴正大广场", "徐家汇港汇恒隆", "静安嘉里中心", "长宁龙之梦", "五角场万达广场"],
        "deep_reading": ["复旦大学城", "同济大学附近", "华山路老洋房区", "多伦路文化街", "M50创意园", "1933老场坊"],
        "study_oriented": ["复旦南区", "交大闵行校区旁", "华师大东门", "同济赤峰路", "松江大学城"],
        "internet_famous": ["新天地", "田子坊", "武康路", "愚园路", "思南公馆", "外滩源"],
        "mixed": ["南京东路", "淮海中路", "四川北路", "曹杨新村"]
    },
    "北京": {
        "family_friendly": ["朝阳大悦城", "西单大悦城", "国贸商城", "三里屯太古里", "万达广场", "合生汇购物中心"],
        "deep_reading": ["海淀大学城", "五道口", "学院路", "北大东门附近", "清华西门", "国子监街"],
        "study_oriented": ["海淀黄庄", "北师大东门", "人大西门", "学院路考研一条街", "五道口华清嘉园"],
        "internet_famous": ["南锣鼓巷", "什刹海", "798艺术区", "三里屯", "杨梅竹斜街", "五道营胡同"],
        "mixed": ["王府井大街", "西单北大街", "东单", "中关村大街"]
    },
    "广州": {
        "family_friendly": ["天河城", "正佳广场", "太古汇", "万菱汇", "万达广场", "白云汇"],
        "deep_reading": ["天河五山大学城", "中山大学南校区", "小洲村", "红专厂创意园", "TIT创意园"],
        "study_oriented": ["华师地铁站", "中大西门", "华工五山", "广外北门", "大学城北"],
        "internet_famous": ["沙面", "永庆坊", "北京路", "上下九", "珠江新城", "太古仓"],
        "mixed": ["天河路", "中山五路", "农林下路", "江南西"]
    },
    "成都": {
        "family_friendly": ["春熙路IFS", "太古里", "万象城", "大悦城", "万达广场", "凯德广场"],
        "deep_reading": ["川大望江校区", "电子科大沙河", "宽窄巷子旁", "东郊记忆", "U37创意仓库"],
        "study_oriented": ["川大南门", "川师北门", "财大南门", "犀浦大学城", "温江大学城"],
        "internet_famous": ["宽窄巷子", "锦里", "春熙路", "太古里", "九眼桥", "玉林路"],
        "mixed": ["总府路", "人民南路", "建设路", "光华村"]
    },
    "杭州": {
        "family_friendly": ["万象城", "湖滨银泰in77", "西湖银泰", "大悦城", "万达广场", "西溪印象城"],
        "deep_reading": ["浙大紫金港", "中国美院象山", "文三路", "小河直街", "馒头山社区"],
        "study_oriented": ["浙大玉泉", "杭师大仓前", "下沙大学城", "滨江高教园", "小和山高教园"],
        "internet_famous": ["西湖湖滨", "河坊街", "南宋御街", "武林路", "南山路", "龙井村"],
        "mixed": ["延安路", "庆春路", "凤起路", "文一路"]
    }
}

DEFAULT_LOCATIONS = {
    "family_friendly": ["市中心商场", "商业综合体", "购物中心"],
    "deep_reading": ["老城区", "文化街", "大学旁"],
    "study_oriented": ["教育区", "高校旁", "考研街"],
    "internet_famous": ["历史街区", "文创园", "网红打卡地"],
    "mixed": ["市区沿街", "社区底商"]
}

LOCATION_FAMILY_KW = ["万象城", "万达", "大悦城", "SM广场", "商场", "购物中心", "银泰", "龙湖天街", "万象天地", "国贸", "广场", "正大广场", "港汇", "嘉里", "龙之梦", "合生汇", "天河城", "正佳", "太古汇", "万菱汇", "凯德", "IFS", "印象城"]

LOCATION_DEEP_READING_KW = ["大学城", "高校", "大学路", "学院路", "老门店", "文创园", "老街", "文教区", "M50", "1933", "红专厂", "TIT", "东郊记忆", "U37", "小河直街", "馒头山"]

LOCATION_STUDY_KW = ["教育学院", "师大", "华师", "附中", "考研基地", "科教园区", "考研一条街", "大学城西区", "东区", "华工", "广外", "北师大", "人大", "同济", "复旦", "交大"]

LOCATION_INTERNET_KW = ["太古里", "三里屯", "南锣鼓巷", "平江路", "宽窄巷子", "湖滨", "星光大道", "历史街区", "步行街", "新天地", "田子坊", "武康路", "愚园路", "思南公馆", "外滩源", "什刹海", "798", "杨梅竹斜街", "五道营", "沙面", "永庆坊", "北京路", "上下九", "珠江新城", "太古仓", "锦里", "九眼桥", "玉林路", "西湖湖滨", "河坊街", "南宋御街", "武林路", "南山路", "龙井村"]


def _infer_bookstore_type(name: str, address: str) -> str:
    """
    类型推断优先级：
    1. 教辅型品牌（明确的教辅类书店品牌）
    2. 深度阅读型品牌（独立/人文/学术品牌）
    3. 网红品牌（网红打卡品牌，即使在商场里也按网红算）
    4. 亲子型品牌 + 商场位置 = 亲子型；不在商场 = 深度阅读型（大众向）
    5. 位置特征推断（教辅区、文教区、网红街区、商场）
    """

    for btype, brands in BRAND_TYPE_MAP.items():
        for brand in brands:
            if brand in name:
                if btype == "family_brand":
                    for loc_kw in LOCATION_FAMILY_KW:
                        if loc_kw in name or loc_kw in address:
                            return "family_friendly"
                    return "deep_reading"
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
    分类合理性校验：
    1. 正向映射：典型品牌应归类为对应的类型
    2. 反向排除：某些品牌不应是某些类型
    返回校验结果字典。
    """
    expected_type = None
    brand_found = None
    reasons = []

    for btype, brands in BRAND_TYPE_MAP.items():
        for brand in brands:
            if brand in name:
                if btype == "family_brand":
                    has_mall = any(kw in name or kw in address for kw in LOCATION_FAMILY_KW)
                    expected_type = "family_friendly" if has_mall else "deep_reading"
                else:
                    expected_type = btype
                brand_found = brand
                break
        if expected_type:
            break

    if brand_found and brand_found in NEGATIVE_TYPE_RULES:
        forbidden_types = NEGATIVE_TYPE_RULES[brand_found]
        if classified_type in forbidden_types:
            reasons.append(f"反向规则不匹配：{brand_found} 不应是 {classified_type}")

    is_valid = True
    if expected_type and expected_type != classified_type:
        is_valid = False
        reasons.append(f"正向映射不匹配：期望 {expected_type}，实际 {classified_type}")
    if reasons:
        is_valid = False

    return {
        "valid": is_valid,
        "brand_found": brand_found,
        "expected_type": expected_type,
        "actual_type": classified_type,
        "reasons": reasons
    }


def _force_correct_classification(name: str, address: str, node: dict) -> dict:
    """
    如果品牌对应的分类与算法分类不一致，强制修正为品牌对应的类型。
    确保典型品牌归类正确。
    """
    validation = _validate_bookstore_classification(name, address, node["type"])

    if not validation["valid"]:
        if validation["expected_type"]:
            expected = validation["expected_type"]
            node["type"] = expected
            node["type_name_cn"] = TYPE_NAMES_CN.get(expected, node["type_name_cn"])
            node["type_color"] = TYPE_COLORS.get(expected, node["type_color"])
            node["group"] = expected
            node["_classification_corrected"] = True
            node["_correction_reason"] = "正向映射"
        else:
            brand = validation["brand_found"]
            if brand and brand in NEGATIVE_TYPE_RULES:
                forbidden = NEGATIVE_TYPE_RULES[brand]
                if node["type"] in forbidden:
                    fallback_types = [t for t in ["deep_reading", "family_friendly", "study_oriented", "internet_famous"]
                                      if t not in forbidden]
                    if fallback_types:
                        best_type = fallback_types[0]
                        node["type"] = best_type
                        node["type_name_cn"] = TYPE_NAMES_CN.get(best_type, node.get("type_name_cn", ""))
                        node["type_color"] = TYPE_COLORS.get(best_type, node.get("type_color", "#666"))
                        node["group"] = best_type
                        node["_classification_corrected"] = True
                        node["_correction_reason"] = "反向排除"

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
    type_key = bookstore_type if bookstore_type != "mixed" else "mixed"

    if city in CITY_LOCATIONS and type_key in CITY_LOCATIONS[city]:
        locations = CITY_LOCATIONS[city][type_key]
    else:
        type_map_key = bookstore_type if bookstore_type in DEFAULT_LOCATIONS else "mixed"
        locations = DEFAULT_LOCATIONS.get(type_map_key, DEFAULT_LOCATIONS["mixed"])

    location = rng.choice(locations)
    suffixes = ["", "B1层", "1楼", "2楼", "3楼", "负一层", "L2层", "L3层"]
    suffix = rng.choice(suffixes) if bookstore_type == "family_friendly" else ""

    return f"{city}市{location}{suffix}"


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
