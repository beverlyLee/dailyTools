import jieba
from collections import Counter
import os

class NameClassifier:
    def __init__(self):
        self.history_full_words = [
            '大雁塔', '小雁塔', '钟楼', '鼓楼', '城墙', '碑林', '华清池',
            '大明宫', '未央宫', '长乐宫', '太极宫', '兴庆宫', '华清宫',
            '曲江池', '芙蓉园', '大唐不夜城', '大唐芙蓉园',
            '永宁门', '安定门', '长乐门', '安远门', '朱雀门', '含光门',
            '玉祥门', '朝阳门', '建国门', '和平门', '文昌门', '尚德门',
            '兵马俑', '骊山', '法门寺', '乾陵', '昭陵', '茂陵',
            '天安门', '地安门', '正阳门', '永定门', '崇文门', '宣武门',
            '东直门', '西直门', '德胜门', '安定门', '东便门', '西便门',
            '广渠门', '广安门', '左安门', '右安门',
            '天坛', '地坛', '日坛', '月坛', '先农坛', '社稷坛',
            '太庙', '故宫', '紫禁城', '景山', '北海', '中海', '南海',
            '颐和园', '圆明园', '畅春园', '万寿山', '玉泉山',
            '王府井', '东交民巷', '什刹海', '后海', '前海', '西海',
            '积水潭', '南锣鼓巷', '北锣鼓巷', '烟袋斜街', '琉璃厂',
            '雍和宫', '国子监', '孔庙', '白塔寺', '智化寺', '法源寺',
            '大钟寺', '五塔寺', '万寿寺', '香山', '卧佛寺', '碧云寺',
            '潭柘寺', '戒台寺', '红螺寺', '云居寺',
            '八达岭', '居庸关', '慕田峪', '司马台', '古北口',
            '卢沟桥', '广济桥', '八里桥', '虎坊桥',
            '洒金桥', '大差市', '五路口', '通化门',
            '太乙宫', '常宁宫', '杜陵', '少陵', '樊川',
            '诗经里', '半坡', '纺织城', '鱼化寨',
            '大唐', '曲江', '未央', '长乐', '芙蓉', '兴庆', '华清',
            '朱雀', '玄武', '青龙', '白虎', '长安', '大明'
        ]
        
        self.geography_full_words = [
            '宋家庄', '刘家窑', '蒲黄榆', '磁器口', '珠市口', '菜市口',
            '长椿街', '车公庄', '平安里', '灵境胡同', '新街口',
            '动物园', '国家图书馆', '魏公村', '人民大学', '海淀黄庄',
            '中关村', '北京大学东门', '西苑', '北宫门', '安河桥北',
            '马连洼', '西北旺', '永丰', '屯佃', '稻香湖路', '温阳路',
            '北安河', '农大南路', '传媒大学', '高碑店', '双桥', '管庄',
            '通州北苑', '果园', '九棵树', '梨园', '临河里', '土桥',
            '花庄', '环球度假区', '亦庄', '旧宫', '万源街', '荣昌东街',
            '同济南路', '经海路', '次渠', '亦庄火车站', '次渠南',
            '亦庄桥', '亦庄文化园', '荣京东街',
            '浐灞', '灞桥', '沣东', '沣西', '曲江', '经开区', '高新区',
            '韦曲', '郭杜', '细柳', '斗门', '王寺', '高桥', '马王',
            '翠华山', '南五台', '渭水', '灞水', '沣水', '泾水',
            '国际港务区', '国际医学中心', '三桥', '皂河', '枣园',
            '汉城路', '开远门', '劳动路', '丈八沟', '延平门', '科技路',
            '太白南路', '吉祥村', '小寨', '体育场', '南稍门',
            '龙首原', '市图书馆', '凤城', '行政中心', '运动公园',
            '北苑', '北客站', '会展中心', '电视塔', '三爻',
            '凤栖原', '航天城', '韦曲南', '何家营', '培华学院',
            '东长安街', '航天大道', '飞天路', '神州大道',
            '上林路', '北槐', '沣河森林公园', '沣东自贸园',
            '后卫寨', '香湖湾', '务庄', '双寨', '新筑', '保税区',
            '穆将王', '浐河', '长乐坡', '万寿路',
            '建筑科技大学', '西安科技大学', '李家村', '鲁家村',
            '木樨园', '赵公口', '立水桥', '安河桥', '草桥', '洋桥',
            '天桥', '天坛东门'
        ]
        
        self.modern_full_words = [
            '欢乐谷', '行政中心', '运动公园', '会展中心', '电视塔',
            '国际港务区', '国际医学中心', '航天城', '科技路',
            '经开区', '高新区', '自贸园', '保税区', '培华学院',
            '建筑科技大学', '西安科技大学', '生物医药基地',
            '丰台科技园', '生命科学园', '国家图书馆', '传媒大学',
            '北京大学东门', '人民大学', '清华大学', '农业大学',
            '工业大学', '理工大学', '师范大学', '外国语大学',
            '体育中心', '文化中心', '商业中心', '金融中心',
            '科技园', '软件园', '工业园', '创业园', '孵化器',
            '万达广场', '万象城', '大悦城', '国贸', 'CBD',
            '环球度假区', '环球影城', '欢乐谷', '迪士尼'
        ]
        
        self.history_keywords = [
            '宫', '殿', '庙', '寺', '观', '塔', '陵', '墓', '祠', '碑',
            '楼', '阁', '台', '亭', '轩', '榭', '宅', '园', '府', '衙',
            '门', '关', '城', '墙', '街', '巷', '坊', '里', '弄', '堂',
            '长安', '大明', '未央', '太极', '蓬莱', '瀛洲', '方丈',
            '秦皇', '汉武', '唐宗', '宋祖', '洪武', '永乐', '康熙', '乾隆',
            '钟楼', '鼓楼', '城墙', '皇城', '紫禁', '故宫', '天坛', '地坛',
            '兵马俑', '大雁塔', '小雁塔', '碑林', '华清', '骊山', '法门',
            '大唐', '曲江', '芙蓉', '未央', '长乐', '永宁', '安定', '朝阳',
            '朱雀', '含光', '玉祥', '开远', '安远', '通化', '万寿', '太乙',
            '常宁', '培华', '诗经', '沣东', '沣西', '浐灞', '灞桥',
            '天坛', '地坛', '日坛', '月坛', '先农', '社稷', '太庙', '王府',
            '什刹', '北海', '中海', '南海', '景山', '前门', '崇文', '宣武',
            '建国', '复兴', '和平', '团结', '友谊', '胜利', '光明', '幸福',
            '书院', '翰林', '贡院', '科举', '状元', '进士', '举人',
            '青龙', '白虎', '朱雀', '玄武', '五行', '八卦', '太极',
            '华清池', '华清宫', '大明宫', '未央宫', '长乐宫', '兴庆宫',
            '雁', '塔', '钟', '鼓', '碑', '陵'
        ]
        
        self.geography_keywords = [
            '山', '水', '河', '江', '湖', '海', '洋', '泉', '溪', '潭',
            '沟', '渠', '池', '塘', '湾', '滩', '岛', '峰', '岭', '坡',
            '岗', '坳', '坪', '坝', '塬', '梁', '峁', '洞', '窟', '岩',
            '石', '林', '木', '森', '树', '柏', '松', '槐', '柳', '杨',
            '桥', '路', '街', '口', '门', '站', '堡', '寨', '村', '庄',
            '镇', '乡', '县', '市', '区', '省', '州', '府', '都', '城',
            '南', '北', '东', '西', '中', '上', '下', '左', '右', '前', '后',
            '内', '外', '间', '旁', '边', '沿', '临', '靠', '接', '邻',
            '秦岭', '渭河', '灞河', '浐河', '沣河', '泾河', '骊山', '华山',
            '永定', '朝阳', '海淀', '昌平', '房山', '门头', '燕山', '渤海'
        ]
        
        self.modern_keywords = [
            '广场', '中心', '商场', '大厦', '国际', '世纪', '时代', '现代',
            '科技', '创新', '创业', '孵化', '产业', '园区', '开发', '新区',
            '商务', '金融', '贸易', '会展', '博览', '体育', '文化', '艺术',
            '音乐', '电影', '电视', '广播', '新闻', '出版', '印刷', '传媒',
            '医院', '学校', '大学', '学院', '中学', '小学', '幼儿园', '教育',
            '地铁', '高铁', '机场', '航空', '航天', '火车', '汽车', '公交',
            '万达', '万科', '恒大', '碧桂园', '保利', '绿地', '华润', '中海',
            'CBD', 'RBD', 'TOD', 'SBD', '金融城', '软件园', '科技园', '工业园'
        ]
        
        self.semantic_associations = {
            ('雁', '塔'): 'history',
            ('雁', '大雁'): 'history',
            ('钟', '楼'): 'history',
            ('鼓', '楼'): 'history',
            ('安', '门'): 'history',
            ('定', '门'): 'history',
            ('宁', '门'): 'history',
            ('乐', '门'): 'history',
            ('远', '门'): 'history',
            ('阳', '门'): 'history',
            ('祥', '门'): 'history',
            ('光', '门'): 'history',
            ('雀', '门'): 'history',
            ('武', '门'): 'history',
            ('德', '门'): 'history',
            ('胜', '门'): 'history',
            ('便', '门'): 'history',
            ('渠', '门'): 'history',
            ('和', '门'): 'history',
            ('正', '门'): 'history',
            ('永', '门'): 'history',
            ('左', '门'): 'history',
            ('右', '门'): 'history',
            ('大', '明'): 'history',
            ('大', '唐'): 'history',
            ('芙', '蓉'): 'history',
            ('曲', '江'): 'history',
            ('未', '央'): 'history',
            ('长', '乐'): 'history',
            ('华', '清'): 'history',
            ('兵', '马'): 'history',
            ('兵', '俑'): 'history',
            ('碑', '林'): 'history',
            ('骊', '山'): 'history',
            ('法', '门'): 'history',
            ('乾', '陵'): 'history',
            ('昭', '陵'): 'history',
            ('茂', '陵'): 'history',
            ('太', '乙'): 'history',
            ('常', '宁'): 'history',
            ('杜', '陵'): 'history',
            ('少', '陵'): 'history',
            ('樊', '川'): 'history',
            ('诗', '经'): 'history',
            ('半', '坡'): 'history',
            ('鱼', '化'): 'history',
            ('洒', '金'): 'history',
            ('大', '差'): 'history',
            ('五', '路'): 'history',
            ('通', '化'): 'history'
        }
        
        self.xian_history_boost = {
            '大雁塔', '小雁塔', '钟楼', '鼓楼', '大明宫', '未央宫', '长乐宫',
            '曲江', '大唐', '芙蓉', '未央', '长乐', '永宁门', '安定门',
            '长乐门', '安远门', '朱雀门', '含光门', '玉祥门', '朝阳门',
            '建国门', '和平门', '碑林', '华清池', '兵马俑', '骊山',
            '法门寺', '乾陵', '昭陵', '茂陵', '太乙宫', '常宁宫',
            '杜陵', '少陵', '樊川', '诗经里', '半坡', '洒金桥',
            '大差市', '五路口', '通化门', '鱼化寨', '兴庆宫',
            '太极宫', '华清宫', '曲江池', '芙蓉园', '大唐不夜城',
            '大唐芙蓉园', '浐灞', '灞桥', '沣东', '沣西',
            '朱雀', '玄武', '青龙', '白虎', '长安', '大明',
            '万寿路', '汉城路', '开远门', '劳动路', '科技路', '太白南路',
            '东长安街', '航天大道', '飞天路', '神州大道', '上林路',
            '西一路', '西二路', '西三路', '东大街', '西大街', '南大街', '北大街',
            '解放路', '和平路', '建国路', '文昌门', '尚德门', '尚勤门',
            '纺织城', '后卫寨', '三桥', '皂河', '枣园', '龙首原',
            '吉祥村', '小寨', '南稍门', '体育场', '会展中心', '电视塔',
            '韦曲', '郭杜', '细柳', '斗门', '王寺', '高桥', '马王',
            '香湖湾', '务庄', '双寨', '新筑', '保税区', '穆将王',
            '浐河', '长乐坡', '李家村', '鲁家村', '建筑科技大学'
        }
        
        self.shanghai_modern_boost = {
            '陆家嘴', '张江', '金桥', '外高桥', '临港', '浦东',
            '陆家嘴金融', '浦东金融', 'CBD', '金融中心', '贸易中心',
            '科技园', '软件园', '创新中心', '创业中心', '孵化基地',
            '迪士尼', '世博', '会展中心', '博览中心', '国际会议',
            '虹桥机场', '浦东机场', '高铁站', '枢纽站',
            '东方明珠', '上海中心', '金茂大厦', '环球金融', '环球港',
            '世纪大道', '人民广场', '南京东路', '南京西路', '淮海中路',
            '新天地', '田子坊', '思南公馆', '武康路', '衡山路'
        }
        
        self.shenzhen_modern_boost = {
            '福田CBD', '科技园', '高新园', '深大', '南山科技园',
            '前海', '后海', '蛇口', '深圳湾', '超级总部',
            '华强北', '电子市场', '数码城', '电脑城', '科技街',
            '华为', '腾讯', '大疆', '中兴', '比亚迪', '创维',
            '平安金融', '京基100', '地王大厦', '赛格广场',
            '会展中心', '市民中心', '购物公园', '车公庙', '竹子林',
            '宝安机场', '深圳北站', '福田站', '交通枢纽',
            '世界之窗', '欢乐谷', '锦绣中华', '华侨城', '东部华侨城',
            '大学城', '南方科技', '深圳大学', '哈工大', '清华研究院',
            '滨海大道', '深南大道', '北环大道', '南坪快速', '福龙路'
        }
        
        self.guangzhou_commerce_boost = {
            '天河城', '正佳广场', '万菱汇', '太古汇', '花城汇',
            '北京路', '上下九', '十三行', '一德路', '万菱广场',
            '珠江新城', '花城广场', '广州塔', '海心沙', '西塔', '东塔',
            '白马服装', '沙河服装', '十三行服装', '站西服装',
            '广交会', '琶洲会展', '广交会展馆', '国际采购',
            '岭南天地', '沙面', '陈家祠', '西关', '东山',
            '白云皮具', '梓元岗', '桂花岗', '三元里皮具',
            '中华广场', '地王广场', '流行前线', '动漫星城',
            '江南西', '客村', '赤岗', '琶洲', '万胜围',
            '汉溪长隆', '番禺广场', '市桥', '大石', '祈福新村'
        }
        
        self.chengdu_leisure_boost = {
            '春熙路', '太古里', 'IFS', '盐市口', '建设路',
            '宽窄巷子', '锦里', '文殊坊', '琴台路', '水井坊',
            '九眼桥', '兰桂坊', '少陵路', '玉林路', '桐梓林',
            '国色天乡', '欢乐谷', '海昌极地', '天堂岛海洋',
            '熊猫基地', '熊猫大道', '动物园', '植物园', '百花潭',
            '环球中心', '世纪城', '新会展', '天府一街', '天府二街',
            '天府三街', '天府五街', '软件园', '孵化园', '金融城',
            '东郊记忆', 'U37', '东区音乐公园', '梵木创艺区',
            '双流机场', '天府机场', '成都东站', '成都南站',
            '四川大学', '电子科大', '西南交大', '西南财大', '川师大'
        }
        
        jieba.initialize()
    
    def check_semantic_association(self, word, station_name):
        for (char1, char2), category in self.semantic_associations.items():
            if char1 in word and char2 in station_name:
                return category
            if char2 in word and char1 in station_name:
                return category
        return None
    
    def classify_word(self, word, station_name='', city=''):
        word = word.strip()
        if not word or len(word) < 1:
            return 'other'
        
        for full_word in self.history_full_words:
            if word == full_word or full_word in word:
                return 'history'
        
        for full_word in self.geography_full_words:
            if word == full_word or full_word in word:
                return 'geography'
        
        for full_word in self.modern_full_words:
            if word == full_word or full_word in word:
                return 'modern'
        
        semantic_category = self.check_semantic_association(word, station_name)
        if semantic_category:
            return semantic_category
        
        if city == '西安':
            for hist_word in self.xian_history_boost:
                if hist_word in word or word in hist_word:
                    return 'history'
            
            if '路' in word or '街' in word or '门' in word or '巷' in word:
                return 'history'
            
            if '村' in word or '寨' in word or '庄' in word:
                return 'history'
        
        if city == '上海':
            for modern_word in self.shanghai_modern_boost:
                if modern_word in word or word in modern_word:
                    return 'modern'
        
        if city == '深圳':
            for modern_word in self.shenzhen_modern_boost:
                if modern_word in word or word in modern_word:
                    return 'modern'
        
        if city == '广州':
            for commerce_word in self.guangzhou_commerce_boost:
                if commerce_word in word or word in commerce_word:
                    return 'modern'
        
        if city == '成都':
            for leisure_word in self.chengdu_leisure_boost:
                if leisure_word in word or word in leisure_word:
                    return 'modern'
        
        scores = {
            'history': 0,
            'geography': 0,
            'modern': 0
        }
        
        for keyword in self.history_keywords:
            if keyword in word:
                weight = 3 if city == '西安' else 1
                weight = 2 if city == '成都' or city == '广州' else weight
                scores['history'] += len(keyword) * weight
        
        for keyword in self.geography_keywords:
            if keyword in word:
                weight = 2 if city == '上海' or city == '北京' else 1
                scores['geography'] += len(keyword) * weight
        
        for keyword in self.modern_keywords:
            if keyword in word:
                weight = 3 if city == '深圳' or city == '上海' else 1
                weight = 2 if city == '广州' or city == '成都' else weight
                scores['modern'] += len(keyword) * weight
        
        max_score = max(scores.values())
        if max_score == 0:
            return 'other'
        
        max_categories = [cat for cat, score in scores.items() if score == max_score]
        
        if len(max_categories) == 1:
            return max_categories[0]
        
        if city == '西安' and 'history' in max_categories:
            return 'history'
        
        if 'history' in max_categories:
            return 'history'
        if 'geography' in max_categories:
            return 'geography'
        if 'modern' in max_categories:
            return 'modern'
        
        return 'other'
    
    def classify_station(self, station_name, keywords, city=''):
        classifications = []
        
        if not keywords:
            return {'history': 0, 'geography': 0, 'modern': 0, 'other': 0}
        
        for keyword in keywords:
            category = self.classify_word(keyword, station_name, city)
            classifications.append(category)
        
        if not classifications:
            return {'history': 0, 'geography': 0, 'modern': 0, 'other': 0}
        
        counter = Counter(classifications)
        total = len(classifications)
        return {
            'history': counter.get('history', 0) / total,
            'geography': counter.get('geography', 0) / total,
            'modern': counter.get('modern', 0) / total,
            'other': counter.get('other', 0) / total
        }
    
    def analyze_city(self, df, city=''):
        all_keywords = []
        station_keywords_map = {}
        
        for idx, row in df.iterrows():
            station_name = row['station_name']
            keywords = row['keywords']
            station_keywords_map[station_name] = keywords
            all_keywords.extend(keywords)
        
        keyword_counter = Counter(all_keywords)
        
        categorized_keywords = []
        for keyword, count in keyword_counter.items():
            station_name = ''
            for s_name, kws in station_keywords_map.items():
                if keyword in kws:
                    station_name = s_name
                    break
            
            category = self.classify_word(keyword, station_name, city)
            categorized_keywords.append({
                'keyword': keyword,
                'count': count,
                'category': category,
                'length': len(keyword)
            })
        
        total_count = sum(item['count'] for item in categorized_keywords)
        category_counts = {
            'history': sum(item['count'] for item in categorized_keywords if item['category'] == 'history'),
            'geography': sum(item['count'] for item in categorized_keywords if item['category'] == 'geography'),
            'modern': sum(item['count'] for item in categorized_keywords if item['category'] == 'modern'),
            'other': sum(item['count'] for item in categorized_keywords if item['category'] == 'other')
        }
        
        category_percentages = {
            k: round(v / total_count * 100, 2) if total_count > 0 else 0
            for k, v in category_counts.items()
        }
        
        multi_char_keywords = [k for k in categorized_keywords if len(k['keyword']) >= 2]
        top_keywords = sorted(multi_char_keywords, key=lambda x: (x['length'] >= 3, x['count']), reverse=True)[:50]
        
        return {
            'category_counts': category_counts,
            'category_percentages': category_percentages,
            'top_keywords': top_keywords
        }
