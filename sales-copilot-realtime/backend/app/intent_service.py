from typing import List, Dict, Optional
import re

INTENT_PATTERNS: Dict[str, List[str]] = {
    "price_concern": [
        r"太贵了",
        r"价格太高",
        r"能不能便宜点",
        r"优惠",
        r"太贵",
        r"价格有点高",
        r"超出预算",
        r"买不起",
        r"贵了",
    ],
    "product_query": [
        r"什么功能",
        r"有什么用",
        r"怎么用",
        r"使用方法",
        r"功能",
        r"怎么操作",
    ],
    "competitor": [
        r"你们和别家比",
        r"别家更便宜",
        r"比你们好",
        r"竞争对手",
    ],
    "objection": [
        r"不需要",
        r"不感兴趣",
        r"考虑考虑",
        r"再想想",
        r"以后再说",
    ],
    "positive": [
        r"不错",
        r"可以",
        r"挺好",
        r"试试",
        r"怎么买",
        r"怎么下单",
    ],
}

SCRIPT_RECOMMENDATIONS: Dict[str, List[str]] = {
    "price_concern": [
        "您说的对，我们的定价确实不低。但您看，我们的产品能帮您节省大量时间，平均下来每个月只需要几百块，却能带来几万的回报。",
        "我理解您的顾虑。其实很多客户刚开始也这么觉得，但后来都发现这是最划算的投资。要不我给您算一笔账？",
        "关于价格，我有个特别的方案给您。如果今天下单的话，我们可以给您一个专属优惠，还能免费试用30天。",
    ],
    "product_query": [
        "这个产品核心功能有三个：第一是自动化跟进，第二是智能分析，第三是团队协作。您最关心哪方面？",
        "它主要帮您解决三个痛点：客户跟进不及时、销售数据难统计、团队协作效率低。具体来说...",
        "使用非常简单，3分钟就能上手。我们还有专属的客户经理全程陪跑，确保您用得好。",
    ],
    "competitor": [
        "您说得对，市场上确实有类似产品。但我们的优势在于：第一是技术领先，第二是服务贴心，第三是数据安全。",
        "我非常理解您会做对比。其实我们很多客户之前也用过别家，后来选择我们是因为...",
        "与其听我说，不如您亲身体验一下。我们免费试用30天，您可以亲自比较看看。",
    ],
    "objection": [
        "我理解，毕竟不是每个人都马上需要。但我还是想请教一下，您主要顾虑是什么呢？",
        "没关系，您可以慢慢考虑。不过有个好消息，我们的免费试用随时可以开始，先体验一下？",
        "您说的对，不着急做决定。但我建议您先保存一下这个链接，等需要的时候随时可以回来。",
    ],
    "positive": [
        "太好了！您可以先注册一个账号，我们有30天免费试用期，不需要信用卡。",
        "没问题！现在就可以开始使用，我给您发一个快速上手指南。",
        "恭喜您做出明智的选择！我帮您开通账号，您现在就可以体验了。",
    ],
    "unknown": [
        "感谢您的分享。我理解您的意思，您希望我重点帮您解决什么问题呢？",
        "很有价值的反馈。您能不能再详细说说，您最关心的是什么？",
        "我明白了。基于您说的，我建议我们可以先看看这个方案...",
    ],
}

def detect_intent(text: str) -> str:
    text = text.lower()
    for intent, patterns in INTENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text):
                return intent
    return "unknown"

def get_recommendations(intent: str) -> List[str]:
    return SCRIPT_RECOMMENDATIONS.get(intent, SCRIPT_RECOMMENDATIONS["unknown"])
