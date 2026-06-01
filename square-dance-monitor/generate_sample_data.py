import csv
import random
import math
from datetime import datetime, timedelta
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

PARK_NAMES = [
    "天坛公园", "景山公园", "北海公园", "中山公园", "颐和园", "圆明园", "香山公园", "玉渊潭公园",
    "紫竹院公园", "陶然亭公园", "龙潭公园", "地坛公园", "日坛公园", "月坛公园", "奥林匹克森林公园",
    "朝阳公园", "海淀公园", "丰台公园", "石景山游乐园", "八大处公园", "北京动物园", "北京植物园",
    "恭王府花园", "什刹海公园", "后海公园", "南锣鼓巷社区公园", "元大都城垣遗址公园", "明城墙遗址公园",
    "皇城根遗址公园", "菖蒲河公园", "劳动人民文化宫", "中山公园", "团结湖公园", "红领巾公园",
    "朝阳公园", "望京公园", "将府公园", "东坝郊野公园", "古塔公园", "兴隆公园", "京城森林公园",
    "太阳宫公园", "四得公园", "丽都公园", "东风公园", "平房公园", "京城梨园", "鸿博公园",
    "镇海寺公园", "老君堂公园", "海棠公园", "金田公园", "杜仲公园", "白鹿公园", "官庄公园",
    "小武基公园", "北焦公园", "万丰公园", "莲花池公园", "万芳亭公园", "南苑公园", "和义公园",
    "世界公园", "长辛店公园", "云岗森林公园", "鹰山森林公园", "北宫国家森林公园", "青龙湖公园",
    "南宫体育公园", "永定河休闲森林公园", "园博园", "世纪森林公园", "天元公园", "小屯公园",
    "玉泉郊野公园", "老山城市休闲公园", "国际雕塑公园", "石景山公园", "八大处公园", "法海寺森林公园",
    "模式口公园", "永定河森林公园", "莲石湖公园", "门城湖公园", "龙泉雾公园", "军庄公园",
    "妙峰山森林公园", "潭柘寺公园", "戒台寺公园", "百花山公园", "灵山公园", "小龙门公园",
    "云蒙山国家森林公园", "黑龙潭公园", "京都第一瀑公园", "桃源仙谷公园", "清凉谷公园", "雾灵山公园",
    "古北口湿地公园", "司马台长城公园", "金山岭公园", "白龙潭公园", "蟠龙山公园", "五座楼公园",
    "密云水库公园", "京东大峡谷公园", "京东大溶洞公园", "金海湖公园", "石林峡公园", "湖洞水公园",
    "飞龙谷公园", "丫髻山公园", "老象峰公园", "轩辕台公园", "平谷青龙山公园", "顺义公园",
    "潮白河森林公园", "汉石桥湿地公园", "奥林匹克水上公园", "仁和公园", "怡园公园", "减河公园",
    "卧龙公园", "马坡公园", "牛栏山公园", "赵全营公园", "木林公园", "龙湾屯公园",
    "张镇公园", "大孙各庄公园", "北务公园", "李遂公园", "南彩公园", "北小营公园",
    "通州运河公园", "西海子公园", "梨园主题公园", "燃灯佛舍利塔公园", "三教庙公园", "大运河森林公园",
    "宋庄公园", "台湖公园", "马驹桥公园", "永乐店公园", "于家务公园", "漷县公园",
    "张家湾公园", "潞城公园", "宋庄文化公园", "顺义奥林匹克公园", "昌平公园", "亢山广场公园",
    "永安公园", "蟒山国家森林公园", "银山塔林公园", "十三陵水库公园", "居庸关长城公园", "虎峪公园",
    "沟崖自然公园", "天龙潭公园", "敕赐和平寺公园", "大杨山国家森林公园", "静之湖公园", "红螺湖公园",
    "雁栖湖公园", "青龙峡公园", "幽谷神潭公园", "云蒙山公园", "天池峡谷公园", "喇叭沟门森林公园",
    "孙栅子公园", "汤河口公园", "宝山寺公园", "琉璃庙公园", "怀北公园", "桥梓公园",
    "桥艺术中心公园", "大兴滨河公园", "康庄公园", "街心公园", "兴城广场公园", "兴旺公园",
    "枣林公园", "高米店公园", "翡翠公园", "南海子公园", "念坛公园", "清源公园",
    "黄村公园", "亦庄公园", "瀛海公园", "旧宫公园", "西红门公园", "青云店公园",
    "安定公园", "礼贤公园", "榆垡公园", "庞各庄公园", "北臧村公园", "魏善庄公园",
    "采育公园", "长子营公园", "门头沟滨河公园", "黑山公园", "龙泉公园", "永定公园",
    "葡山公园", "石门营公园", "冯村公园", "东辛房公园", "城子公园", "大峪公园",
    "房山迎宾公园", "房山公园", "长阳公园", "良乡公园", "昊天公园", "琉璃河湿地公园",
    "窦店公园", "韩村河公园", "十渡公园", "云居寺公园", "石花洞公园", "银狐洞公园",
    "百花山公园", "百草畔公园", "霞云岭公园", "蒲洼公园", "张坊公园", "大石窝公园",
    "长沟公园", "韩村河公园", "周口店公园", "城关公园", "新镇公园", "东风公园"
]

DISTRICT_INFO = {
    "东城区": {"lat_range": (39.85, 39.97), "lon_range": (116.35, 116.45), "population": 700000},
    "西城区": {"lat_range": (39.86, 39.98), "lon_range": (116.28, 116.40), "population": 1100000},
    "朝阳区": {"lat_range": (39.80, 40.10), "lon_range": (116.30, 116.70), "population": 3400000},
    "海淀区": {"lat_range": (39.80, 40.15), "lon_range": (116.10, 116.40), "population": 3100000},
    "丰台区": {"lat_range": (39.70, 39.95), "lon_range": (116.20, 116.50), "population": 2000000},
    "石景山区": {"lat_range": (39.85, 39.95), "lon_range": (116.10, 116.25), "population": 560000},
    "通州区": {"lat_range": (39.70, 40.00), "lon_range": (116.50, 116.90), "population": 1800000},
    "顺义区": {"lat_range": (40.00, 40.30), "lon_range": (116.50, 116.90), "population": 1200000},
    "昌平区": {"lat_range": (40.00, 40.50), "lon_range": (115.90, 116.50), "population": 2200000},
    "大兴区": {"lat_range": (39.50, 39.85), "lon_range": (116.20, 116.70), "population": 1800000},
    "房山区": {"lat_range": (39.50, 39.85), "lon_range": (115.70, 116.30), "population": 1300000},
    "门头沟区": {"lat_range": (39.80, 40.20), "lon_range": (115.50, 116.20), "population": 390000},
    "怀柔区": {"lat_range": (40.20, 40.80), "lon_range": (116.30, 116.80), "population": 440000},
    "平谷区": {"lat_range": (40.00, 40.40), "lon_range": (116.80, 117.30), "population": 450000},
    "密云区": {"lat_range": (40.20, 40.80), "lon_range": (116.50, 117.20), "population": 520000},
    "延庆区": {"lat_range": (40.30, 40.80), "lon_range": (115.70, 116.40), "population": 340000}
}

RESIDENTIAL_NAMES = [
    "阳光花园", "幸福家园", "和谐家园", "平安小区", "温馨家园", "康乐小区", "繁荣小区",
    "吉祥小区", "如意小区", "富贵小区", "荣华小区", "昌盛小区", "永安小区", "永泰小区",
    "永乐小区", "永宁小区", "永和小区", "永远小区", "永兴小区", "永盛小区",
    "华清嘉园", "东升园", "水清木华园", "蓝旗营", "荷清苑", "紫荆公寓", "桃李园",
    "绿园小区", "梅园小区", "兰园小区", "竹园小区", "菊园小区", "松园小区",
    "枫丹丽舍", "流星花园", "龙泽苑", "回龙观小区", "天通苑", "北苑家园",
    "望京西园", "望京新城", "大西洋新城", "东湖湾", "丽都水岸", "阳光上东",
    "棕榈泉国际公寓", "泛海国际", "星河湾", "朝阳园", "万科城市花园", "龙湖滟澜山",
    "世纪城", "万柳小区", "万城华府", "西山华府", "橡树湾", "领袖硅谷",
    "金融街小区", "西单小区", "宣武门小区", "崇文门小区", "前门小区", "和平门小区",
    "东直门小区", "西直门小区", "建国门小区", "复兴门小区", "朝阳门小区", "阜成门小区",
    "德胜门小区", "安定门小区", "广渠门小区", "左安门小区", "右安门小区", "永定门小区",
    "方庄小区", "劲松小区", "潘家园小区", "十里河小区", "双井小区", "大望路小区",
    "国贸小区", "CBD小区", "燕莎小区", "三元桥小区", "亮马桥小区", "东直门小区",
    "工体小区", "三里屯小区", "东大桥小区", "呼家楼小区", "金台路小区", "红庙小区",
    "四惠小区", "高碑店小区", "传媒大学小区", "管庄小区", "双桥小区", "定福庄小区",
    "通州北苑小区", "梨园小区", "九棵树小区", "果园小区", "新华大街小区", "中仓小区",
    "顺义城区小区", "后沙峪小区", "天竺小区", "新国展小区", "中央别墅区", "高丽营小区",
    "昌平城区小区", "回龙观小区", "天通苑小区", "沙河小区", "高教园区", "南邵小区",
    "大兴城区小区", "黄村小区", "亦庄小区", "旧宫小区", "西红门小区", "高米店小区",
    "房山城区小区", "良乡小区", "长阳小区", "窦店小区", "燕山小区", "周口店小区",
    "门头沟城区小区", "大峪小区", "城子小区", "东辛房小区", "龙泉小区", "永定小区",
    "怀柔城区小区", "雁栖小区", "庙城小区", "桥梓小区", "怀北小区", "汤河口小区",
    "平谷城区小区", "渔阳小区", "兴谷小区", "滨河小区", "王辛庄小区", "山东庄小区",
    "密云城区小区", "鼓楼小区", "果园小区", "檀营小区", "十里堡小区", "河南寨小区",
    "延庆城区小区", "儒林小区", "香水园小区", "百泉小区", "永宁小区", "康庄小区"
]

COMPLAINT_TITLES = [
    "广场舞噪音扰民", "深夜广场舞音乐过大", "公园音响噪音扰民", "广场舞占用公共空间",
    "早晨广场舞影响休息", "节假日广场舞噪音", "广场舞音量超标", "广场舞影响居民生活",
    "公园噪音投诉", "广场舞时间过长", "广场舞靠近居民区", "广场舞音响设备扰民",
    "广场舞人群聚集影响通行", "广场舞影响老人休息", "广场舞影响学生学习",
    "广场舞噪音影响睡眠", "广场舞音乐分贝过高", "广场舞管理问题", "广场舞缺乏规范",
    "广场舞扰民投诉"
]

COMPLAINT_CONTENTS = [
    "每天晚上公园广场舞音乐声音太大，严重影响居民休息，希望相关部门能管一管。",
    "公园内广场舞队伍使用大功率音响，音量超标，距离居民区不足100米。",
    "早晨6点就开始跳广场舞，音乐声很大，影响上班族和学生休息。",
    "节假日期间广场舞全天播放，音量很大，无法正常休息和学习。",
    "广场舞队伍占据了公园主要通道，影响其他市民正常通行。",
    "广场舞音乐播放到晚上10点以后，严重影响周边居民夜间休息。",
    "广场舞音响设备音量过大，家中关闭窗户仍能清晰听到音乐。",
    "公园内有多支广场舞队伍，音乐声此起彼伏，噪音叠加效应明显。",
    "广场舞靠近居民楼，每天定时播放音乐，影响居民正常生活作息。",
    "广场舞活动缺乏管理，音量和时间都没有限制，扰民严重。"
]


def generate_random_point(center_lat, center_lon, radius_km):
    radius_deg = radius_km / 111.0
    u = random.random()
    v = random.random()
    w = radius_deg * math.sqrt(u)
    t = 2 * math.pi * v
    x = w * math.cos(t)
    y = w * math.sin(t)
    lat = center_lat + y
    lon = center_lon + x / math.cos(math.radians(center_lat))
    return round(lat, 6), round(lon, 6)


def generate_parks(num_parks=500):
    parks = []
    
    tiantan_lat, tiantan_lon = 39.8822, 116.4108
    parks.append({
        "park_id": "P001",
        "park_name": "天坛公园",
        "district": "东城区",
        "lat": tiantan_lat,
        "lon": tiantan_lon,
        "area_sqm": 2730000,
        "has_square_dance": True
    })
    
    park_id_counter = 2
    for district, info in DISTRICT_INFO.items():
        district_parks = max(10, int(num_parks * info["population"] / 22000000))
        
        for i in range(district_parks):
            if park_id_counter > num_parks:
                break
                
            center_lat = random.uniform(*info["lat_range"])
            center_lon = random.uniform(*info["lon_range"])
            
            park_name = random.choice(PARK_NAMES) if park_id_counter >= len(PARK_NAMES) else PARK_NAMES[park_id_counter - 1]
            
            parks.append({
                "park_id": f"P{park_id_counter:03d}",
                "park_name": f"{park_name}{park_id_counter}",
                "district": district,
                "lat": round(center_lat, 6),
                "lon": round(center_lon, 6),
                "area_sqm": random.randint(5000, 500000),
                "has_square_dance": random.choice([True, True, True, False])
            })
            park_id_counter += 1
        
        if park_id_counter > num_parks:
            break
    
    return parks


def generate_residential_areas(num_residential=300, parks=None):
    residential = []
    res_id_counter = 1
    
    if parks:
        for park in parks[:150]:
            if random.random() < 0.7:
                lat, lon = generate_random_point(park["lat"], park["lon"], 0.5)
                residential.append({
                    "residential_id": f"R{res_id_counter:03d}",
                    "residential_name": f"{random.choice(RESIDENTIAL_NAMES)}{res_id_counter}",
                    "lat": lat,
                    "lon": lon,
                    "population": random.randint(500, 5000),
                    "building_count": random.randint(5, 50)
                })
                res_id_counter += 1
    
    for district, info in DISTRICT_INFO.items():
        if res_id_counter > num_residential:
            break
            
        district_res = max(10, int(num_residential * info["population"] / 22000000))
        
        for i in range(district_res):
            if res_id_counter > num_residential:
                break
                
            lat = random.uniform(*info["lat_range"])
            lon = random.uniform(*info["lon_range"])
            
            residential.append({
                "residential_id": f"R{res_id_counter:03d}",
                "residential_name": f"{random.choice(RESIDENTIAL_NAMES)}{res_id_counter}",
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "population": random.randint(500, 5000),
                "building_count": random.randint(5, 50)
            })
            res_id_counter += 1
    
    return residential


def generate_complaints(num_complaints=200, parks=None):
    complaints = []
    comp_id_counter = 1
    
    if parks:
        high_risk_parks = [p for p in parks if p["park_id"] in ["P001", "P002", "P003", "P004", "P005"]]
        
        for park in high_risk_parks:
            num_comp = random.randint(5, 15)
            for i in range(num_comp):
                if comp_id_counter > num_complaints:
                    break
                    
                days_ago = random.randint(0, 30)
                complaint_datetime = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S")
                
                lat, lon = generate_random_point(park["lat"], park["lon"], 0.3)
                
                complaints.append({
                    "complaint_id": f"C{comp_id_counter:04d}",
                    "title": random.choice(COMPLAINT_TITLES),
                    "content": random.choice(COMPLAINT_CONTENTS),
                    "datetime": complaint_datetime,
                    "lat": lat,
                    "lon": lon,
                    "complaint_type": "噪音扰民",
                    "status": random.choice(["已处理", "处理中", "待处理"])
                })
                comp_id_counter += 1
    
    for i in range(num_complaints - comp_id_counter + 1):
        if not parks:
            break
            
        park = random.choice(parks)
        days_ago = random.randint(0, 90)
        complaint_datetime = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d %H:%M:%S")
        
        lat, lon = generate_random_point(park["lat"], park["lon"], 0.5)
        
        complaints.append({
            "complaint_id": f"C{comp_id_counter:04d}",
            "title": random.choice(COMPLAINT_TITLES),
            "content": random.choice(COMPLAINT_CONTENTS),
            "datetime": complaint_datetime,
            "lat": lat,
            "lon": lon,
            "complaint_type": "噪音扰民",
            "status": random.choice(["已处理", "处理中", "待处理"])
        })
        comp_id_counter += 1
    
    return complaints


def save_to_csv(data, filename, fieldnames):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(data)
    print(f"✅ 已生成 {len(data)} 条数据: {filename}")


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    print("=" * 60)
    print("生成广场舞噪音监测系统样本数据")
    print("数据来源：模拟北京公园、居民区及12345热线投诉数据")
    print("=" * 60)
    
    parks = generate_parks(500)
    save_to_csv(parks, "parks.csv", 
                ["park_id", "park_name", "district", "lat", "lon", "area_sqm", "has_square_dance"])
    
    residential = generate_residential_areas(300, parks)
    save_to_csv(residential, "residential_areas.csv",
                ["residential_id", "residential_name", "lat", "lon", "population", "building_count"])
    
    complaints = generate_complaints(200, parks)
    save_to_csv(complaints, "complaints.csv",
                ["complaint_id", "title", "content", "datetime", "lat", "lon", "complaint_type", "status"])
    
    print("=" * 60)
    print("数据生成完成！")
    print(f"公园数据: {len(parks)} 条")
    print(f"居民区数据: {len(residential)} 条")
    print(f"投诉数据: {len(complaints)} 条")
    print("=" * 60)
    
    source_file = os.path.join(DATA_DIR, "DATA_SOURCE.md")
    with open(source_file, 'w', encoding='utf-8') as f:
        f.write("# 数据来源说明\n\n")
        f.write("## 公园数据 (parks.csv)\n")
        f.write("- 数据来源：模拟北京市16个区县的公园分布\n")
        f.write("- 包含：公园ID、名称、所属区县、坐标、面积、是否有广场舞活动\n")
        f.write("- 样本数量：500条\n\n")
        f.write("## 居民区数据 (residential_areas.csv)\n")
        f.write("- 数据来源：模拟北京市居民区分布\n")
        f.write("- 包含：居民区ID、名称、坐标、人口数量、楼栋数\n")
        f.write("- 样本数量：300条\n\n")
        f.write("## 投诉数据 (complaints.csv)\n")
        f.write("- 数据来源：模拟12345市民服务热线噪音投诉工单\n")
        f.write("- 包含：投诉ID、标题、内容、时间、坐标、类型、处理状态\n")
        f.write("- 样本数量：200条\n\n")
        f.write("## 说明\n")
        f.write("本数据为模拟生成的样本数据，用于系统演示和测试。\n")
        f.write("实际应用中应接入：\n")
        f.write("1. 高德地图/百度地图 POI 数据获取真实公园位置\n")
        f.write("2. 政务公开数据获取真实居民区信息\n")
        f.write("3. 12345热线官方API获取真实投诉数据\n")
    
    print(f"✅ 数据来源说明已保存: DATA_SOURCE.md")


if __name__ == "__main__":
    main()
