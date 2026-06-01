import pandas as pd
import random

industries = ['互联网', '金融', '制造业', '教育', '医疗健康', '房地产', '消费零售', '企业服务', '物流运输', '能源化工']

companies = {
    '互联网': ['字节跳动', '阿里巴巴', '腾讯', '美团', '百度', '京东', '网易', '小米', '拼多多', '快手', '滴滴出行', '携程', '知乎', '小红书', 'B站', '华为云', 'OPPO', 'VIVO', '荣耀', '爱奇艺', '得物', '贝壳', '商汤科技', '旷视科技', '蚂蚁集团'],
    '金融': ['招商银行', '平安银行', '中信证券', '工商银行', '国泰君安', '建设银行', '中国人寿', '华泰证券', '光大银行', '中国人保', '浦发银行', '民生银行', '交通银行', '兴业银行', '平安普惠', '陆金所', '东方财富', '同花顺', '天天基金', '蚂蚁财富'],
    '制造业': ['比亚迪', '华为', '富士康', '格力电器', '宁德时代', '美的', '上汽集团', '海尔集团', '长城汽车', '三一重工', '徐工集团', '吉利汽车', '广汽集团', '长安汽车', '中芯国际', '立讯精密', '工业富联', '蓝思科技', '歌尔股份', '汇川技术'],
    '教育': ['新东方', '好未来', '猿辅导', '作业帮', '高途课堂', '中公教育', '华图教育', '学而思', 'VIPKID', '掌门1对1', '粉笔教育', '一起作业', '网易有道', '腾讯课堂', '淘宝教育'],
    '医疗健康': ['阿里健康', '平安好医生', '微医', '京东健康', '丁香园', '好大夫在线', '春雨医生', '健客网', '1药网', '美年大健康', '爱康国宾', '瑞尔齿科', '泰康医生', '众安保险', '轻松筹'],
    '房地产': ['万科', '碧桂园', '恒大', '融创中国', '保利地产', '中海地产', '龙湖集团', '华润置地', '新城控股', '世茂集团', '旭辉集团', '绿城中国', '阳光城', '金地集团', '华夏幸福'],
    '消费零售': ['永辉超市', '盒马鲜生', '沃尔玛', '家乐福', '大润发', '华润万家', '苏宁易购', '国美', '屈臣氏', '名创优品', '优衣库', 'H&M', 'ZARA', '无印良品', '完美日记'],
    '企业服务': ['用友网络', '金山软件', '金蝶国际', '钉钉', '企业微信', '飞书', 'Teambition', '石墨文档', '腾讯会议', 'Zoom', '北森', '肯耐珂萨', '销售易', '纷享销客', '红圈营销'],
    '物流运输': ['顺丰速运', '京东物流', '菜鸟网络', '圆通速递', '中通快递', '申通快递', '韵达快递', '德邦物流', '安能物流', '壹米滴答', '货拉拉', '快狗打车', '满帮集团', '达达', '闪送'],
    '能源化工': ['中石油', '中石化', '中海油', '国家电网', '南方电网', '中国核电', '中国广核', '华能国际', '大唐发电', '国电电力', '中国神华', '中煤能源', '陕西煤业', '兖州煤业', '紫金矿业']
}

positions = {
    '互联网': ['高级Python工程师', 'Java开发工程师', '前端开发工程师', '产品经理', '算法工程师', '数据分析师', '游戏开发工程师', 'Android开发工程师', 'iOS开发工程师', '运营专员', '短视频运营', '社区运营', '内容运营', '电商运营', '云原生工程师', 'AI算法工程师', '用户体验设计师', '测试工程师', '视频编解码工程师', '地图算法工程师'],
    '金融': ['风控分析师', 'Java开发工程师', '量化研究员', '区块链工程师', '客户经理', '投资顾问', '数据开发工程师', '精算师', 'IT开发工程师', '需求分析师', '理赔专员', '大数据工程师', '网络安全工程师', '金融产品经理', '信贷审批员'],
    '制造业': ['机械工程师', '硬件工程师', '工业工程师', '结构工程师', '电气工程师', '工艺工程师', '汽车工程师', '嵌入式工程师', '测试工程师', '机器人工程师', '机械设计师', '电子工程师', '自动化工程师', '模具工程师', 'CNC工程师'],
    '教育': ['英语讲师', '数学老师', '在线班主任', '语文老师', '物理老师', '化学老师', '生物老师', '历史老师', '地理老师', '政治老师', '课程顾问', '学习规划师', '教研专员', '教学设计', '培训讲师'],
    '医疗健康': ['医药数据分析师', '前端工程师', '后端开发工程师', '产品经理', '医生助理', '药师', '护士', '健康管理师', '营养师', '心理咨询师', '医学编辑', '临床试验专员', '医药代表', '医院管理', '医疗AI工程师'],
    '房地产': ['项目经理', '土建工程师', '销售顾问', '策划专员', '设计师', '造价工程师', '监理工程师', '水电工程师', '暖通工程师', '景观设计师', '室内设计师', '开发报建', '招商运营', '物业经理', '投资分析师'],
    '消费零售': ['店长', '导购员', '营业员', '储备干部', '仓储管理', '物流专员', '采购专员', '商品运营', '品牌经理', '市场推广', '电商运营', '客服专员', '数据分析', '供应链管理', '质量管控'],
    '企业服务': ['销售经理', '实施顾问', '售前工程师', 'Java开发工程师', '前端开发工程师', '产品经理', '客户经理', '客户成功经理', '解决方案专家', '技术支持工程师', '运维工程师', 'SaaS产品运营', '渠道经理', '行业研究员', '项目经理'],
    '物流运输': ['物流专员', '仓储经理', '运输调度', '快递员', '分拣员', '货运司机', '供应链专员', '物流规划师', '运营经理', '客户经理', '数据分析', '质量管控', '安全管理', '报关员', '货代专员'],
    '能源化工': ['工程师', '技术员', '安全员', '质检员', '研发工程师', '工艺工程师', '设备工程师', '电气工程师', '仪表工程师', '环评工程师', '化工工程师', '石油工程师', '采矿工程师', '地质工程师', '热力工程师']
}

salary_ranges = ['8k-12k', '10k-15k', '12k-18k', '15k-25k', '18k-28k', '20k-35k', '22k-38k', '25k-40k', '25k-45k', '28k-48k', '30k-50k', '30k-55k', '35k-60k']

age_patterns = [
    {'text': '要求3年以上经验，90后优先考虑。', 'has_limit': True, 'max_age': 35, 'generation': '90后'},
    {'text': '年龄要求28-35岁，本科及以上学历。', 'has_limit': True, 'min_age': 28, 'max_age': 35},
    {'text': '要求35岁以下，3年以上相关工作经验。', 'has_limit': True, 'max_age': 35},
    {'text': '35岁以下优先，5年以上行业经验。', 'has_limit': True, 'max_age': 35},
    {'text': '年龄不超过35岁，博士优先考虑。', 'has_limit': True, 'max_age': 35},
    {'text': '要求30岁以下，硕士及以上学历。', 'has_limit': True, 'max_age': 30},
    {'text': '28岁以下优先，有相关经验者可放宽。', 'has_limit': True, 'max_age': 28},
    {'text': '要求25岁以下，应届毕业生优先。', 'has_limit': True, 'max_age': 25},
    {'text': '年龄要求25-35岁，有相关证书优先。', 'has_limit': True, 'min_age': 25, 'max_age': 35},
    {'text': '年龄不超过40岁，有5年以上经验。', 'has_limit': True, 'max_age': 40},
    {'text': '要求年龄22-30岁，应届生也可考虑。', 'has_limit': True, 'min_age': 22, 'max_age': 30},
    {'text': '要求年龄28-38岁，有大型项目经验。', 'has_limit': True, 'min_age': 28, 'max_age': 38},
    {'text': '30岁以下优先，能接受加班出差。', 'has_limit': True, 'max_age': 30},
    {'text': '85后优先考虑，有团队管理经验。', 'has_limit': True, 'max_age': 40, 'generation': '85后'},
    {'text': '年龄不做限制，有经验者优先。', 'has_limit': False},
    {'text': '欢迎应届生投递，提供培训。', 'has_limit': False},
    {'text': '有经验即可，年龄不是问题。', 'has_limit': False},
    {'text': '优秀人才可放宽年龄限制。', 'has_limit': False},
]

tech_stacks = {
    '互联网': ['Python、Django、MySQL', 'Java、SpringBoot、Redis', 'React、TypeScript、Node.js', 'Vue、ElementUI、Webpack', '机器学习、TensorFlow、PyTorch', 'SQL、Python、Pandas', 'Unity、C#、Unreal', 'Android、Kotlin、Jetpack', 'iOS、Swift、SwiftUI', '数据分析、Excel、SQL'],
    '金融': ['风控模型、Python、SAS', 'Java、Spring、Oracle', '量化策略、Python、R', 'Solidity、以太坊、Web3', '金融知识、销售技巧、客户管理', '投资分析、证券从业、基金从业', 'Hadoop、Spark、Hive', '精算模型、SAS、Excel'],
    '制造业': ['AutoCAD、SolidWorks、机械设计', '电路设计、Altium、Verilog', '精益生产、工业工程、CAD', '结构设计、ANSYS、力学分析', '电气设计、PLC、AutoCAD', '工艺流程、质量管理、ISO9001'],
    '其他': ['团队协作、沟通能力、执行能力']
}

sources = ['Boss直聘', '拉勾招聘']

def generate_job_description(industry, position, has_age_limit=True):
    base_text = f"岗位职责：负责{position}相关工作，"
    
    if has_age_limit:
        pattern = random.choice([p for p in age_patterns if p['has_limit']])
    else:
        pattern = random.choice([p for p in age_patterns if not p['has_limit']])
    
    age_text = pattern['text']
    
    stack_list = tech_stacks.get(industry, tech_stacks['其他'])
    tech_text = f"技术栈：{random.choice(stack_list)}。"
    
    locations = ['北京海淀', '上海浦东', '深圳南山', '杭州余杭', '广州天河', '成都高新', '武汉洪山', '南京雨花台', '西安雁塔', '苏州工业园']
    location_text = f"工作地点：{random.choice(locations)}。"
    
    return base_text + age_text + " " + tech_text + " " + location_text

def generate_dataset(num_records=500):
    records = []
    
    for i in range(1, num_records + 1):
        industry = random.choice(industries)
        company = random.choice(companies[industry])
        position = random.choice(positions[industry])
        salary = random.choice(salary_ranges)
        source = random.choice(sources)
        
        has_age_limit_prob = {
            '互联网': 0.85,
            '金融': 0.75,
            '制造业': 0.55,
            '教育': 0.65,
            '医疗健康': 0.50,
            '房地产': 0.45,
            '消费零售': 0.40,
            '企业服务': 0.50,
            '物流运输': 0.35,
            '能源化工': 0.30
        }
        
        has_limit = random.random() < has_age_limit_prob.get(industry, 0.5)
        job_desc = generate_job_description(industry, position, has_limit)
        
        records.append({
            'id': i,
            'industry': industry,
            'company': company,
            'position': position,
            'salary': salary,
            'job_description': job_desc,
            'source': source
        })
    
    return pd.DataFrame(records)

if __name__ == '__main__':
    df = generate_dataset(500)
    output_path = '/Users/liboyang/trae/dailyTools/age-bias-in-jobs/data/recruitment_data_500.csv'
    df.to_csv(output_path, index=False, encoding='utf-8')
    print(f"数据集已生成，共{len(df)}条记录")
    print(f"按来源统计：")
    print(df['source'].value_counts())
    print(f"\n按行业统计：")
    print(df['industry'].value_counts())
