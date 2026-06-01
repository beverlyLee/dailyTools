from typing import List, Dict
from src.geo.region_mapper import Anchor, Product


def get_mock_anchors() -> List[Anchor]:
    return [
        Anchor(id="A001", name="东北老嫂子", platform="抖音", hometown="黑龙江", followers=12500000, category="美食"),
        Anchor(id="A002", name="吉林小老铁", platform="抖音", hometown="吉林", followers=8900000, category="三农"),
        Anchor(id="A003", name="沈阳大妞", platform="快手", hometown="辽宁", followers=15600000, category="服饰"),
        Anchor(id="A004", name="成都幺妹", platform="抖音", hometown="四川", followers=21000000, category="美食"),
        Anchor(id="A005", name="重庆辣妹子", platform="快手", hometown="重庆", followers=18500000, category="美食"),
        Anchor(id="A006", name="广东靓仔哥", platform="抖音", hometown="广东", followers=9800000, category="美食"),
        Anchor(id="A007", name="西安老碗", platform="快手", hometown="陕西", followers=7200000, category="美食"),
        Anchor(id="A008", name="郑州中中", platform="抖音", hometown="河南", followers=6500000, category="三农"),
        Anchor(id="A009", name="杭州美厨娘", platform="抖音", hometown="浙江", followers=11200000, category="美食"),
        Anchor(id="A010", name="济南大强", platform="快手", hometown="山东", followers=8300000, category="三农"),
        Anchor(id="A011", name="长沙满哥", platform="抖音", hometown="湖南", followers=9600000, category="娱乐"),
        Anchor(id="A012", name="武汉热干面姐", platform="快手", hometown="湖北", followers=7100000, category="美食")
    ]


def get_mock_products() -> List[Product]:
    return [
        Product(id="P001", name="五常大米", origin="黑龙江", origin_city="五常", category="食品"),
        Product(id="P002", name="东北羽绒服", origin="辽宁", origin_city="盘锦", category="服饰"),
        Product(id="P003", name="重庆火锅底料", origin="重庆", origin_city="重庆", category="食品"),
        Product(id="P004", name="四川郫县豆瓣", origin="四川", origin_city="成都", category="食品"),
        Product(id="P005", name="广式腊肠", origin="广东", origin_city="广州", category="食品"),
        Product(id="P006", name="陕西苹果", origin="陕西", origin_city="西安", category="水果"),
        Product(id="P007", name="河南铁棍山药", origin="河南", origin_city="郑州", category="食品"),
        Product(id="P008", name="吉林人参", origin="吉林", origin_city="延边", category="保健品"),
        Product(id="P009", name="杭州西湖龙井", origin="浙江", origin_city="杭州", category="茶叶"),
        Product(id="P010", name="山东阿胶", origin="山东", origin_city="济南", category="保健品"),
        Product(id="P011", name="湖南酱板鸭", origin="湖南", origin_city="长沙", category="食品"),
        Product(id="P012", name="武汉热干面", origin="湖北", origin_city="武汉", category="食品")
    ]


def get_mock_subtitles() -> List[Dict]:
    return [
        {"anchor_id": "A001", "text": "老铁们，今天咱这五常大米，嘎嘎香！没毛病，赶紧整两袋回家！那嘎达的黑土地种出来的，老好了！"},
        {"anchor_id": "A002", "text": "干啥呢兄弟们！今天这吉林人参，老鼻子值钱了，贼拉靠谱，赶紧下单！"},
        {"anchor_id": "A003", "text": "咋整的啊！这羽绒服，老暖和了！东北冬天就靠它，得劲！"},
        {"anchor_id": "A004", "text": "巴适得板！今天这个火锅底料，安逸得很！搞啥子哦，快点抢撒！晓得不，正宗重庆味道！"},
        {"anchor_id": "A005", "text": "要得要得！这个四川豆瓣，做菜巴适惨了！雄起！赶紧买回去告一哈！"},
        {"anchor_id": "A006", "text": "多谢晒各位街坊！呢个广东腊肠好好食架！快点落单啦，唔好错过啦！"},
        {"anchor_id": "A007", "text": "嘹咋咧！咱这陕西苹果，美滴很！克里马擦赶紧下单！"},
        {"anchor_id": "A008", "text": "中中中！咱这河南铁棍山药，真得劲！不中你找我，绝对中！"},
        {"anchor_id": "A009", "text": "大家好呀！今天给大家带来正宗的西湖龙井，香气四溢，大家多多支持哦！"},
        {"anchor_id": "A010", "text": "家人们，咱这山东阿胶，正宗好货！补血益气，赶紧来看看！"},
        {"anchor_id": "A011", "text": "大家好咯！今天的湖南酱板鸭，辣得过瘾，香得流口水！"},
        {"anchor_id": "A012", "text": "拐子们！武汉热干面，香喷了！芝麻酱配碱水面，那叫一个到位！"}
    ]


def get_mock_sales_data() -> List[Dict]:
    return [
        {"anchor_id": "A001", "product_id": "P001", "sales_volume": 58000},
        {"anchor_id": "A002", "product_id": "P008", "sales_volume": 32000},
        {"anchor_id": "A003", "product_id": "P002", "sales_volume": 45000},
        {"anchor_id": "A004", "product_id": "P004", "sales_volume": 72000},
        {"anchor_id": "A005", "product_id": "P003", "sales_volume": 89000},
        {"anchor_id": "A006", "product_id": "P005", "sales_volume": 41000},
        {"anchor_id": "A007", "product_id": "P006", "sales_volume": 29000},
        {"anchor_id": "A008", "product_id": "P007", "sales_volume": 25000},
        {"anchor_id": "A009", "product_id": "P009", "sales_volume": 38000},
        {"anchor_id": "A010", "product_id": "P010", "sales_volume": 33000},
        {"anchor_id": "A011", "product_id": "P011", "sales_volume": 28000},
        {"anchor_id": "A012", "product_id": "P012", "sales_volume": 26000}
    ]
