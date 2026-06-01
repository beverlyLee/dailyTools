import random
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional


INDUSTRIES = {
    "IT互联网": {"weight": 1.5, "keywords": ["996", "007", "内卷", "加班", "PUA", "需求变更", "代码", "产品经理"]},
    "广告营销": {"weight": 1.4, "keywords": ["乙方", "甲方爸爸", "改方案", "熬夜", "提案", "brief", "创意", "campaign"]},
    "金融投资": {"weight": 1.2, "keywords": ["KPI", "业绩", "客户", "熬夜", "加班", "风控", "合规", "净值"]},
    "教育行业": {"weight": 1.0, "keywords": ["学生", "家长", "备课", "教研", "升学率", "课件", "双减", "辅导班"]},
    "医疗健康": {"weight": 0.9, "keywords": ["值班", "手术", "夜班", "查房", "病历", "医患", "门诊", "急诊"]},
    "制造业": {"weight": 0.8, "keywords": ["流水线", "倒班", "加班", "产能", "质量", "物料", "工位", "品管"]},
    "房地产": {"weight": 0.7, "keywords": ["卖房", "客户", "踩盘", "带看", "佣金", "楼盘", "房贷", "中介"]},
    "餐饮服务": {"weight": 0.6, "keywords": ["客人", "后厨", "盘点", "排班", "备餐", "外卖", "翻台", "收银"]},
}

CITIES = {
    "北京": {"weight": 1.4},
    "上海": {"weight": 1.35},
    "深圳": {"weight": 1.5},
    "杭州": {"weight": 1.25},
    "广州": {"weight": 1.15},
    "成都": {"weight": 1.05},
    "南京": {"weight": 1.0},
    "武汉": {"weight": 0.95},
    "西安": {"weight": 0.85},
    "重庆": {"weight": 0.8},
}

TOP_10_KEYWORDS = [
    "不想上班", "摸鱼", "划水", "想退休", "精神离职",
    "躺平", "摆烂", "不想干活", "打工人", "社畜",
]

PLATFORM_TONE = {
    "脉脉": {
        "suffixes": [
            " #打工人# #职场# #精神离职#",
            " 大家怎么看？",
            " 有没有同款？",
            " 求安慰",
            " 无语了家人们",
            "",
            " 💔",
            " 累了累了",
        ],
        "style": "professional, more industry-specific, uses hashtags",
    },
    "小红书": {
        "suffixes": [
            " #职场日常 #打工人 #摸鱼",
            " #不想上班 #精神状态",
            " 谁懂啊家人们！",
            " 真的会谢",
            " 谁还不是个打工人呢",
            "",
            " 😮‍💨😮‍💨😮‍💨",
            " 咱就是说一整个emo住了",
            " 大数据请把我推给同款打工人",
        ],
        "style": "casual, emotional, uses xiaohongshu slang",
    },
}

KEYWORD_VARIATIONS: Dict[str, List[str]] = {
    "不想上班": [
        "今天又是不想上班的一天，坐在工位上感觉灵魂已经飘走了",
        "早上闹钟响的那一刻，我真的不想上班不想上班不想上班",
        "周一早上的地铁，每一张脸都写着'不想上班'",
        "不想上班的念头在看到工作群消息的那一刻达到顶峰",
        "每天早上睁开眼第一个念头：不想上班，想退休",
        "大雨天还要通勤，真的不想上班啊谁懂",
        "假期综合症还没过去，完全不想上班",
        "如果不是穷，谁会想上班呢，今天也是不想上班的一天",
        "刚休完假回来，一百个不想上班",
        "看着窗外的好天气，我不想上班只想出去玩",
        "不想上班的心情在周五下午达到临界点",
        "今天的我和工位八字不合，就是不想上班",
        "连续加班一周，我真的不想上班了",
        "老板又安排新任务，不想上班的情绪溢出屏幕",
        "开完早会的我：不想上班想逃班",
    ],
    "摸鱼": [
        "摸鱼摸到老板过来倒水，假装在看报表，其实在刷小红书",
        "今日摸鱼时长3小时，带薪如厕20分钟，刷手机40分钟",
        "摸鱼的最高境界：让所有人都以为你很忙",
        "带薪摸鱼是打工人最后的倔强",
        "今天摸鱼发现一个新的摸鱼网站，偷偷收藏了",
        "摸鱼摸得太认真，老板喊我三声才听到",
        "工位上的我看起来在思考，实际上在摸鱼算彩票中奖怎么花",
        "周五下午不摸鱼，简直对不起自己",
        "开会就是集体摸鱼的最好时机",
        "摸鱼的时候时间过得特别快，认真工作每一秒都是煎熬",
        "今天摸鱼不小心笑出声，全办公室都看我",
        "带薪摸鱼，工资就是我摸鱼赚来的精神损失费",
        "摸鱼指南：屏幕一半是工作文档，一半是购物网站",
        "摸鱼的时候顺便投了几份简历，万一呢",
        "假装在写代码，实际上在刷脉脉看八卦",
    ],
    "划水": [
        "划水划到被同事提醒，尴尬地敲了两下键盘",
        "今天的工作状态就是划水划水再划水",
        "划水的快乐谁懂啊，假装很忙实则很闲",
        "会议中我一直点头，实际上在划水想今晚吃什么",
        "划水划到被老板点名，还好我反应快",
        "周一划水，周二划水，周三划水，等待周五",
        "同事都在卷，我选择划水保平安",
        "划水技术哪家强，我称第二没人敢称第一",
        "键盘敲得噼里啪啦响，其实在划水聊天",
        "划水的关键：工位要乱，表情要凝重",
        "假装在整理文档，实际上在划水刷短视频",
        "今天划水一整天，假装很忙的样子真累",
        "划水划到快下班，发现一天什么都没干",
        "上班划水，下班精神，当代打工人实录",
        "划水也是工作的一部分，毕竟脑子需要休息",
    ],
    "想退休": [
        "想退休想退休想退休，每天默念一百遍",
        "25岁的身体，60岁的心态，我真的想退休",
        "想退休，每天跳广场舞养养花的那种",
        "想退休的念头在加班到十点的深夜愈发强烈",
        "算了一下存款，好像还不能退休，但我真的想退休",
        "如果现在退休，我每天的日程就是睡觉吃饭旅游",
        "想退休，不想再跟奇葩同事打交道了",
        "今天也是为了退休工资努力搬砖的一天，想退休",
        "工作三年已经在规划退休生活了，谁懂",
        "想退休想环游世界，不想再上班了",
        "每天都在算还有多少年能退休，越算越绝望",
        "想退休，想过不用看老板脸色的日子",
        "想退休，不用开早会不用写周报不用改方案",
        "什么时候才能退休啊，每天都在问自己",
        "想退休带孙子，哦不对我连对象都没有",
    ],
    "精神离职": [
        "精神离职状态启动，身体在工位灵魂在家",
        "精神离职的最高境界：人来了，但心没来",
        "精神离职之后，工作轻松多了，不再内耗",
        "自从精神离职，老板说什么我都左耳进右耳出",
        "精神离职不是摆烂，是不再为不值得的事焦虑",
        "精神离职状态，每天到点就走绝不加班",
        "精神离职之后，终于明白工作只是生活的一部分",
        "建议所有打工人都尝试一下精神离职，真的很爽",
        "精神离职的快乐：老板PUA不到我了",
        "身体在上班，灵魂在度假，这就是精神离职",
        "精神离职后，再也不为工作的事发脾气了",
        "精神离职不是消极，是另一种自我保护",
        "精神离职，工资照拿，情绪稳定",
        "自从精神离职，整个人的精神状态都好了很多",
        "精神离职的核心：工作而已，没必要搭上自己",
    ],
    "躺平": [
        "这个项目谁爱做谁做，我只想躺平摆烂",
        "卷不动了，真的卷不动了，选择躺平",
        "躺平不是放弃，是放过自己",
        "躺平的快乐谁懂啊，我只想当条咸鱼",
        "同事都在卷升职加薪，我选择躺平保健康",
        "躺平之后，发现天也蓝了水也清了，心情也好了",
        "努力不一定有结果，但躺平一定很舒服",
        "卷了三年一无所获，现在只想躺平",
        "躺平不是懒，是看清现实后的清醒选择",
        "每天只想躺平，不想努力了",
        "躺平一时爽，一直躺平一直爽",
        "年轻人为什么躺平？因为努力了也买不起房",
        "我选择躺平，不再为老板的梦想拼命",
        "躺平之后，终于有时间做自己喜欢的事了",
        "卷到怀疑人生，现在只想躺平歇一歇",
    ],
    "摆烂": [
        "摆烂的最高境界：老板急我不急",
        "摆烂不是我的错，是工资配不上我的工作量",
        "既然努力没用，那不如摆烂",
        "摆烂的一天从假装没看到工作群消息开始",
        "摆烂也是一种生活态度，总比抑郁强",
        "摆烂摆到老板都放弃我了，终于清静了",
        "摆烂的快乐：不用改方案不用想KPI",
        "摆烂吧，反正努力也不会被看见",
        "摆烂的日子，每天都很开心",
        "摆烂之后，再也不用担心做不好了",
        "摆烂也是需要技术的，要烂得不明显",
        "不想卷了，只想摆烂过日子",
        "摆烂的人运气都不会太差，因为没什么期待",
        "当你开始摆烂，世界就变得温柔了",
        "摆烂不是消极，是对抗内卷的方式",
    ],
    "不想干活": [
        "不想干活不想干活不想干活，重要的事情说三遍",
        "今天就是不想干活，看着电脑发呆",
        "不想干活的心情从周一早上延续到周五下午",
        "不想干活，只想当一条没有梦想的咸鱼",
        "堆积如山的工作，但我就是不想干活",
        "假期结束了，完全不想干活",
        "不想干活的时候，连喝水都觉得累",
        "看着待办清单，我真的不想干活啊",
        "今天的我，只想摸鱼不想干活",
        "不想干活，只想睡觉睡到天昏地暗",
        "每次开会开久了就不想干活了",
        "不想干活，只想发呆放空自己",
        "工资那么少，我凭什么想干活",
        "老板又画饼，我更加不想干活了",
        "周末玩太嗨，周一完全不想干活",
    ],
    "打工人": [
        "打工人的心酸谁懂，天天被画大饼",
        "打工人打工魂，打工就是人上人？才不是",
        "打工人的日常：早八打卡，晚八下班，中间摸鱼",
        "打工人的一天：咖啡续命，摸鱼精神，下班复活",
        "打工人永远在通勤的路上，从一个地铁站到另一个地铁站",
        "打工人的周末：只想躺平哪里都不想去",
        "打工人的委屈：打碎了牙往肚子里咽",
        "打工人的快乐：发工资的那一天",
        "打工人的梦想：早点退休不用打工",
        "打工人的倔强：到点就走绝不加班",
        "打工人的精神支柱：下班后的美食和剧集",
        "打工人的无奈：明明不想干了但不敢裸辞",
        "打工人的自我安慰：再熬熬就熬出头了",
        "打工人的觉悟：工作而已，不值得生气",
        "打工人永远的痛：假期永远不够用",
    ],
    "社畜": [
        "社畜的日常：被老板骂被客户虐被同事坑",
        "社畜的命也是命啊，能不能别再加班了",
        "社畜的周末：用来恢复工作日的伤害",
        "社畜的悲哀：连请假都要看老板脸色",
        "社畜的眼泪：在深夜无人的时候才敢流",
        "社畜的快乐源泉：带薪拉屎带薪摸鱼带薪发呆",
        "社畜的悲哀：24小时待机随时要回复消息",
        "社畜的一天：从挤地铁开始，以挤地铁结束",
        "社畜的觉悟：拿多少钱干多少活，多一分都不干",
        "社畜的无奈：上有老下有小不敢辞职",
        "社畜的日常：表面光鲜亮丽，实则口袋空空",
        "社畜的精神状态：时而清醒时而崩溃",
        "社畜的终极梦想：财务自由早日退休",
        "社畜的自我修养：左耳进右耳出，不往心里去",
        "社畜的午餐：外卖凑单是每天的必修课",
    ],
}

ADDITIONAL_TEMPLATES = [
    "996真的不是福报，是折寿，每天下班都感觉身体被掏空",
    "通勤两小时，工作八小时，睡觉六小时，剩下两小时发呆，这就是打工人的一天",
    "又被甲方爸爸要求改方案，我已经麻了，改到第18版了",
    "老板说年轻人要多加班积累经验，我只想说你先涨工资",
    "今天午休时间偷偷投了几份简历，看看外面的世界",
    "部门又双叒叕开会，开了三小时什么都没决定，浪费时间",
    "早上不想起，晚上不想睡，工作日的精神状态be like",
    "今天又被PUA了，说我工作不够饱和，呵呵，那你招人啊",
    "咖啡已经是我唯一的精神支柱了，一天三杯起步",
    "真的干不动了，感觉随时会猝死，保命要紧",
    "想换工作但是又怕下一份更坑，纠结到脱发",
    "今天的KPI没完成，明天再说吧，反正也完不成",
    "心累，感觉内耗越来越严重了，再这样下去要出问题",
    "内卷到怀疑人生，007的节奏谁受得了，谁爱卷谁卷",
    "打工魂在燃烧，可惜是虚火，一点就灭",
    "搬砖搬砖，日复一日的搬砖，什么时候是个头",
    "想辞职想辞职想辞职，每天都在想这个问题，但是不敢",
    "emo了，看着窗外发了半小时呆，不知道自己在干什么",
    "工位是我的第二个家，可惜没有床，不然直接睡在这",
    "老板又在画饼，这次的饼有点大噎住了，能不能来点实在的",
    "周五综合征，下午三点准时进入摸鱼模式，心已经在周末了",
    "加班到十点，看着空荡荡的办公室，感觉人生没有意义",
    "又被领导当着所有人的面批评，面子挂不住但还要赔笑",
    "想裸辞，但看了看银行卡余额，又默默坐下了",
    "同事甩锅给我，我居然还要笑着说没关系，心累",
    "每天都在算退休工资还有多少年，越算越绝望",
    "工作五年，存款为零，身体垮了，值得吗",
    "今天带薪如厕20分钟，躲在厕所刷手机，是我最放松的时刻",
    "假装很忙其实在刷脉脉，看看有没有好机会准备跑路",
    "又要写周报了，根本没干什么事怎么编出500字",
    "客户又提了一个奇葩需求，我已经不想反驳了照做吧",
    "产品经理又改需求了，这个功能我已经写了第四遍",
    "凌晨两点还在改bug，这种日子什么时候是个头",
    "周末还要参加团建，比上班还累，能不能放过我",
    "跟同事吐槽完老板，转头就要去开会汇报，太真实了",
    "每天都在辞职和继续之间反复横跳，这就是成年人的崩溃",
    "领导说要培养我，结果活越来越多工资一分没涨",
    "今天又要跨部门沟通，每个部门都在甩锅，心累",
    "绩效考核又来了，不知道这次会被打什么等级，无所谓了",
    "学会了拒绝之后，工作终于轻松一点了，早该这样",
]

TIME_SLOTS = [
    "09:00-10:00", "10:00-11:00", "11:00-12:00",
    "12:00-13:00", "13:00-14:00", "14:00-15:00",
    "15:00-16:00", "16:00-17:00", "17:00-18:00",
    "18:00-19:00", "19:00-20:00", "20:00-21:00",
]

WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]


def _seeded_rand(seed: int) -> random.Random:
    return random.Random(seed)


def _generate_unique_text(
    rng: random.Random,
    platform: str,
    industry: str,
    target_keyword: Optional[str] = None,
) -> str:
    """生成多样化的文本，确保同关键词跨平台/场景有差异化表述"""
    base_texts: List[str] = []

    if target_keyword and target_keyword in KEYWORD_VARIATIONS:
        base_texts = KEYWORD_VARIATIONS[target_keyword].copy()
    else:
        for kw_variations in KEYWORD_VARIATIONS.values():
            base_texts.extend(kw_variations)
        base_texts.extend(ADDITIONAL_TEMPLATES)

    text = rng.choice(base_texts)

    if rng.random() < 0.4:
        industry_keywords = INDUSTRIES[industry]["keywords"]
        extra_kw = rng.choice(industry_keywords)
        connect_phrases = [
            f"，尤其是{extra_kw}这方面真的",
            f"，再加上{extra_kw}的压力，",
            f"，毕竟做{industry}的谁没经历过{extra_kw}呢，",
            f"，每次遇到{extra_kw}我就",
            f"，想到还要应付{extra_kw}就",
            f"，尤其是最近{extra_kw}特别多，",
        ]
        text = text + rng.choice(connect_phrases) + "累了"

    if rng.random() < 0.5:
        suffixes = PLATFORM_TONE[platform]["suffixes"]
        text = text + rng.choice(suffixes)

    return text


def generate_posts(count: int = 500, seed: int = 42) -> List[Dict[str, Any]]:
    """生成多样化的职场话题数据，确保数据不重复，关键词覆盖均匀"""
    rng = _seeded_rand(seed)
    posts = []
    base_time = datetime(2026, 5, 18, 0, 0, 0)

    keyword_assignment_pool: List[str] = []
    for kw in TOP_10_KEYWORDS:
        keyword_assignment_pool.extend([kw] * max(30, count // 12))
    rng.shuffle(keyword_assignment_pool)

    used_texts = set()

    for i in range(count):
        hour = rng.randint(8, 22)
        minute = rng.randint(0, 59)
        weekday_offset = rng.randint(0, 4)
        post_time = base_time + timedelta(days=weekday_offset, hours=hour, minutes=minute)

        industry = rng.choices(
            list(INDUSTRIES.keys()),
            weights=[INDUSTRIES[k]["weight"] for k in INDUSTRIES],
            k=1,
        )[0]
        city = rng.choices(
            list(CITIES.keys()),
            weights=[CITIES[k]["weight"] for k in CITIES],
            k=1,
        )[0]
        platform = rng.choice(["脉脉", "小红书"])

        target_kw = None
        if i < len(keyword_assignment_pool):
            target_kw = keyword_assignment_pool[i]

        max_attempts = 10
        text = None
        for _ in range(max_attempts):
            candidate = _generate_unique_text(rng, platform, industry, target_kw)
            if candidate not in used_texts:
                text = candidate
                used_texts.add(candidate)
                break

        if text is None:
            text = _generate_unique_text(rng, platform, industry, target_kw) + f" #{i}"

        time_biases = {
            "周五": 1.3 if 15 <= hour < 18 else 1.0,
            "周一": 0.9 if 9 <= hour < 11 else 1.0,
        }
        weekday = WEEKDAYS[post_time.weekday()]
        base_likes = rng.randint(0, 300) * time_biases.get(weekday, 1.0)

        engagement = {
            "likes": int(base_likes),
            "comments": rng.randint(0, 80),
            "shares": rng.randint(0, 40),
        }

        posts.append({
            "id": f"post_{i:05d}",
            "platform": platform,
            "industry": industry,
            "city": city,
            "content": text,
            "timestamp": post_time.isoformat(),
            "weekday": weekday,
            "hour": post_time.hour,
            "engagement": engagement,
        })

    return posts


def generate_time_heat_data(seed: int = 42) -> Dict[str, List[float]]:
    rng = _seeded_rand(seed)
    result = {}

    for weekday in WEEKDAYS:
        base = []
        for slot in TIME_SLOTS:
            hour = int(slot.split("-")[0].split(":")[0])
            if 9 <= hour < 12:
                val = rng.uniform(30, 60)
            elif 12 <= hour < 14:
                val = rng.uniform(80, 120)
            elif 14 <= hour < 15:
                val = rng.uniform(40, 70)
            elif 15 <= hour < 17:
                if weekday == "周五":
                    val = rng.uniform(130, 180)
                else:
                    val = rng.uniform(70, 110)
            elif 17 <= hour < 19:
                val = rng.uniform(60, 100)
            else:
                val = rng.uniform(10, 40)
            base.append(round(val, 1))
        result[weekday] = base

    return result


def generate_industry_index(seed: int = 42) -> List[Dict[str, Any]]:
    rng = _seeded_rand(seed)
    results = []

    for industry, info in INDUSTRIES.items():
        base_score = info["weight"] * 65
        variance = rng.uniform(-8, 8)
        score = round(base_score + variance, 1)
        score = max(30, min(95, score))

        risk = "高" if score >= 75 else ("中" if score >= 55 else "低")

        keyword_freq = {}
        for kw in info["keywords"]:
            keyword_freq[kw] = rng.randint(20, 200)

        results.append({
            "industry": industry,
            "resignation_index": score,
            "risk_level": risk,
            "top_keywords": keyword_freq,
            "sample_size": rng.randint(300, 2000),
        })

    results.sort(key=lambda x: x["resignation_index"], reverse=True)
    return results


def generate_city_index(seed: int = 42) -> List[Dict[str, Any]]:
    rng = _seeded_rand(seed)
    results = []

    for city, info in CITIES.items():
        base_score = info["weight"] * 62
        variance = rng.uniform(-10, 10)
        score = round(base_score + variance, 1)
        score = max(25, min(92, score))

        results.append({
            "city": city,
            "resignation_index": score,
            "sample_size": rng.randint(200, 1500),
        })

    results.sort(key=lambda x: x["resignation_index"], reverse=True)
    return results


def generate_mouyu_ranking(seed: int = 42) -> List[Dict[str, Any]]:
    rng = _seeded_rand(seed)
    from config.crawler_headers import MOUYU_TECHNIQUES

    results = []
    for technique in MOUYU_TECHNIQUES:
        freq = rng.randint(20, 500)
        efficiency = round(rng.uniform(0.3, 0.95), 2)
        results.append({
            "technique": technique,
            "frequency": freq,
            "efficiency_score": efficiency,
            "industry_bias": rng.choice(list(INDUSTRIES.keys())),
        })

    results.sort(key=lambda x: x["frequency"], reverse=True)
    return results[:10]


def validate_data_integrity(
    posts: List[Dict[str, Any]],
    min_freq_per_kw: int = 30,
) -> Dict[str, Any]:
    """校验数据完整性：关键词覆盖频次、跨平台去重、数据唯一性

    Args:
        posts: generate_posts 返回的帖子列表
        min_freq_per_kw: 每个核心关键词最低出现次数

    Returns:
        包含各项校验结果的字典
    """
    issues: List[str] = []
    passed: List[str] = []

    # 1. 数据唯一性
    contents = [p["content"] for p in posts]
    unique_contents = set(contents)
    dup_count = len(contents) - len(unique_contents)
    if dup_count == 0:
        passed.append(f"数据唯一性: {len(posts)} 条全部唯一")
    else:
        issues.append(f"数据重复: 发现 {dup_count} 条重复内容")

    # 2. 跨平台无交叉重复
    maimai_contents = set(
        p["content"] for p in posts if p["platform"] == "脉脉"
    )
    xhs_contents = set(
        p["content"] for p in posts if p["platform"] == "小红书"
    )
    cross_dup = maimai_contents & xhs_contents
    if not cross_dup:
        passed.append("跨平台去重: 脉脉与小红书无交叉重复")
    else:
        issues.append(f"跨平台重复: 发现 {len(cross_dup)} 条两平台共有的内容")

    # 3. 前10关键词覆盖频次
    all_text = " ".join(contents)
    keyword_counts = {}
    for kw in TOP_10_KEYWORDS:
        count = all_text.count(kw)
        keyword_counts[kw] = count

    all_covered = True
    for kw, count in keyword_counts.items():
        if count >= min_freq_per_kw:
            passed.append(f"关键词覆盖: {kw} 出现 {count} 次 ≥ {min_freq_per_kw}")
        else:
            all_covered = False
            issues.append(f"关键词不足: {kw} 仅出现 {count} 次 < {min_freq_per_kw}")

    # 4. 平台分布合理性
    maimai_count = sum(1 for p in posts if p["platform"] == "脉脉")
    xhs_count = sum(1 for p in posts if p["platform"] == "小红书")
    if maimai_count > 0 and xhs_count > 0:
        passed.append(
            f"平台分布: 脉脉 {maimai_count} 条 / 小红书 {xhs_count} 条"
        )
    else:
        issues.append(f"平台分布异常: 脉脉 {maimai_count} / 小红书 {xhs_count}")

    return {
        "valid": len(issues) == 0,
        "total_posts": len(posts),
        "unique_count": len(unique_contents),
        "duplicate_count": dup_count,
        "cross_platform_duplicates": len(cross_dup),
        "keyword_counts": keyword_counts,
        "all_keywords_covered": all_covered,
        "passed": passed,
        "issues": issues,
    }
