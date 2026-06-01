import pandas as pd
import re
import os
import jieba

class StationListProcessor:
    def __init__(self, data_dir='data'):
        self.data_dir = data_dir
        self.suffixes = ['站', '地铁站']
        
        self.direction_words = ['东', '南', '西', '北', '中', '上', '下', '前', '后', '左', '右', '内', '外']
        
        self.landmark_markers = [
            '门', '桥', '街', '路', '口', '巷', '胡同', '里', '坊', '弄', '堂',
            '楼', '阁', '台', '亭', '轩', '榭', '宅', '园', '府', '衙',
            '宫', '殿', '庙', '寺', '观', '塔', '陵', '墓', '祠', '碑',
            '山', '河', '江', '湖', '海', '湾', '岛', '峰', '岭', '坡',
            '泉', '溪', '潭', '沟', '渠', '池', '塘',
            '广场', '中心', '公园', '机场', '火车站', '汽车站',
            '大道', '大街', '村', '庄', '镇', '乡', '堡', '寨'
        ]
        
        self.place_name_database = {
            '西安': [
                '大雁塔', '小雁塔', '钟楼', '鼓楼', '城墙', '碑林', '华清池',
                '大明宫', '未央宫', '长乐宫', '太极宫', '兴庆宫', '华清宫',
                '曲江池', '芙蓉园', '大唐不夜城', '大唐芙蓉园',
                '永宁门', '安定门', '长乐门', '安远门', '朱雀门', '含光门',
                '玉祥门', '朝阳门', '建国门', '和平门', '文昌门', '尚德门',
                '兵马俑', '骊山', '法门寺', '乾陵', '昭陵', '茂陵',
                '浐灞', '灞桥', '沣东', '沣西', '曲江', '经开区', '高新区',
                '韦曲', '郭杜', '细柳', '斗门', '王寺', '高桥', '马王',
                '太乙宫', '翠华山', '南五台', '朱雀', '玄武', '青龙', '白虎',
                '常宁宫', '杜陵', '少陵', '樊川', '渭水', '灞水', '沣水', '泾水',
                '诗经里', '欢乐谷', '国际港务区', '国际医学中心',
                '洒金桥', '大差市', '五路口', '通化门', '万寿路',
                '半坡', '纺织城', '三桥', '皂河', '枣园', '汉城路',
                '开远门', '劳动路', '鱼化寨', '丈八沟', '延平门', '科技路',
                '太白南路', '吉祥村', '小寨', '体育场', '南稍门',
                '龙首原', '市图书馆', '凤城', '行政中心', '运动公园',
                '北苑', '北客站', '会展中心', '电视塔', '三爻',
                '凤栖原', '航天城', '韦曲南', '何家营', '培华学院',
                '东长安街', '航天大道', '飞天路', '神州大道',
                '上林路', '北槐', '沣河森林公园', '沣东自贸园',
                '后卫寨', '香湖湾', '务庄', '双寨', '新筑', '保税区',
                '穆将王', '浐河', '长乐坡', '万寿路', '通化门',
                '建筑科技大学', '西安科技大学', '李家村', '鲁家村',
                '大雁塔北', '大雁塔南', '省体育场', '北大街',
                '大唐', '未央', '长乐', '芙蓉', '曲江'
            ],
            '北京': [
                '天安门', '地安门', '正阳门', '永定门', '崇文门', '宣武门',
                '东直门', '西直门', '朝阳门', '阜成门', '德胜门', '安定门',
                '东便门', '西便门', '广渠门', '广安门', '左安门', '右安门',
                '天坛', '地坛', '日坛', '月坛', '先农坛', '社稷坛',
                '太庙', '故宫', '紫禁城', '景山', '北海', '中海', '南海',
                '颐和园', '圆明园', '畅春园', '万寿山', '玉泉山',
                '王府井', '东单', '西单', '东四', '西四', '东交民巷',
                '什刹海', '后海', '前海', '西海', '积水潭',
                '南锣鼓巷', '北锣鼓巷', '烟袋斜街', '琉璃厂',
                '雍和宫', '国子监', '孔庙', '白塔寺', '智化寺', '法源寺',
                '大钟寺', '五塔寺', '万寿寺', '香山', '卧佛寺', '碧云寺',
                '潭柘寺', '戒台寺', '红螺寺', '云居寺',
                '八达岭', '居庸关', '慕田峪', '司马台', '古北口',
                '卢沟桥', '广济桥', '八里桥', '虎坊桥', '天桥', '立水桥',
                '安河桥', '草桥', '洋桥', '木樨园', '赵公口',
                '刘家窑', '宋家庄', '蒲黄榆', '天坛东门', '磁器口',
                '珠市口', '虎坊桥', '菜市口', '长椿街', '复兴门',
                '阜成门', '车公庄', '平安里', '西四', '灵境胡同',
                '新街口', '西直门', '动物园', '国家图书馆', '魏公村',
                '人民大学', '海淀黄庄', '中关村', '北京大学东门',
                '圆明园', '西苑', '北宫门', '安河桥北',
                '马连洼', '西北旺', '永丰', '屯佃', '稻香湖路',
                '温阳路', '北安河', '农大南路',
                '传媒大学', '高碑店', '双桥', '管庄', '通州北苑',
                '果园', '九棵树', '梨园', '临河里', '土桥', '花庄',
                '环球度假区', '亦庄', '旧宫', '万源街', '荣昌东街',
                '同济南路', '经海路', '次渠', '亦庄火车站', '次渠南',
                '亦庄桥', '亦庄文化园', '荣京东街'
            ],
            '上海': [
                '陆家嘴', '徐家汇', '豫园', '外滩', '龙华', '静安寺',
                '人民广场', '南京东路', '南京西路', '淮海中路', '四川北路',
                '城隍庙', '豫园', '九曲桥', '城隍庙', '老西门',
                '新天地', '田子坊', '思南公馆', '武康路', '衡山路',
                '东方明珠', '上海中心', '金茂大厦', '环球金融中心',
                '迪士尼', '浦东国际机场', '虹桥机场', '虹桥火车站',
                '上海动物园', '上海植物园', '上海科技馆', '上海博物馆',
                '朱家角', '七宝', '南翔', '嘉定', '松江', '青浦',
                '周浦', '康桥', '张江', '金桥', '外高桥', '洋山',
                '五角场', '江湾', '新江湾城', '复旦大学', '同济大学',
                '交通大学', '华东师范', '上海大学', '外国语大学',
                '世纪公园', '世纪大道', '东方体育中心', '上海图书馆',
                '上海火车站', '上海南站', '莘庄', '人民广场',
                '大世界', '音乐厅', '文化广场', '上海大剧院',
                '世博园', '世博轴', '世博文化中心', '梅赛德斯奔驰',
                '滴水湖', '临港', '奉贤', '金山', '崇明', '长兴岛'
            ],
            '深圳': [
                '福田', '罗湖', '南山', '宝安', '盐田', '龙岗', '龙华',
                '坪山', '光明', '大鹏', '蛇口', '前海', '后海',
                '华强北', '东门', '国贸', '老街', '大剧院', '科学馆',
                '世界之窗', '欢乐谷', '锦绣中华', '华侨城', '海上世界',
                '科技园', '高新园', '深大', '深南大道', '滨海大道',
                '宝安机场', '深圳北站', '深圳东站', '福田站',
                '市民中心', '会展中心', '购物公园', '车公庙', '竹子林',
                '蛇口港', '太子湾', '深圳湾', '红树林', '莲花山',
                '梧桐山', '七娘山', '凤凰山', '羊台山', '塘朗山',
                '西丽', '留仙洞', '大学城', '南方科技', '深圳大学',
                '华为', '腾讯', '大疆', '中兴', '比亚迪', '创维',
                '平安金融', '京基100', '地王大厦', '赛格广场',
                '大梅沙', '小梅沙', '东部华侨城', '茶溪谷', '大侠谷',
                '观澜湖', '观澜版画', '甘坑客家', '大鹏所城', '南澳'
            ],
            '广州': [
                '天河', '越秀', '荔湾', '海珠', '白云', '黄埔', '番禺',
                '花都', '南沙', '增城', '从化', '珠江新城', '花城广场',
                '广州塔', '海心沙', '花城汇', '天河城', '正佳广场',
                '北京路', '上下九', '十三行', '沙面', '陈家祠',
                '中山纪念堂', '黄花岗', '农讲所', '烈士陵园', '三元里',
                '广州火车站', '广州东站', '广州南站', '广州北站',
                '白云机场', '新白云', '白云新城', '白云公园',
                '体育西路', '体育中心', '珠江新城', '客村', '赤岗塔',
                '五羊邨', '杨箕', '东山口', '公园前', '西门口',
                '长寿路', '黄沙', '芳村', '花地湾', '坑口', '西朗',
                '汉溪长隆', '番禺广场', '市桥', '大石', '石壁',
                '蕉门', '金洲', '黄阁', '东涌', '庆盛',
                '白云山', '越秀山', '荔枝湾', '荔湾湖', '海珠湖',
                '黄埔军校', '南海神庙', '琶洲', '广交会展馆',
                '华南理工', '中山大学', '暨南大学', '华南师范', '广州大学'
            ],
            '成都': [
                '春熙', '武侯', '锦里', '青羊', '宽窄', '锦江', '成华',
                '金牛', '武侯', '青羊', '高新', '天府', '华阳',
                '春熙路', '太古里', 'IFS', '盐市口', '天府广场',
                '武侯祠', '锦里古街', '宽窄巷子', '文殊院', '昭觉寺',
                '杜甫草堂', '青羊宫', '金沙遗址', '三星堆', '都江堰',
                '青城山', '峨眉山', '乐山大佛', '九寨沟', '黄龙',
                '成都东站', '成都南站', '成都西站', '成都北站',
                '双流机场', '天府机场', '天府大道', '人民南路',
                '环球中心', '世纪城', '新会展', '金融城', '孵化园',
                '天府三街', '天府五街', '软件园', '科技园', '孵化园',
                '四川大学', '电子科技', '西南交大', '西南财经', '四川师大',
                '熊猫基地', '熊猫大道', '动物园', '植物园', '欢乐谷',
                '国色天乡', '温江', '郫县', '都江堰', '青城山',
                '龙泉驿', '双流', '温江', '新都', '青白江', '新津',
                '简阳', '资阳', '眉山', '乐山', '绵阳', '德阳',
                '建设路', '东郊记忆', '339电视塔', '兰桂坊', '九眼桥'
            ]
        }
        
        self.valid_words = set()
        self._init_valid_words()
        
        jieba.initialize()
    
    def _init_valid_words(self):
        for city_places in self.place_name_database.values():
            for place in city_places:
                self.valid_words.add(place)
        
        common_valid = [
            '广场', '中心', '公园', '机场', '火车站', '汽车站', '地铁站',
            '大道', '大街', '大学', '学院', '医院', '体育场', '体育馆',
            '会展', '博览', '商务', '金融', '科技', '创业', '产业',
            '文化', '艺术', '音乐', '电影', '电视', '广播', '新闻',
            '门', '桥', '街', '路', '口', '巷', '胡同', '里', '坊',
            '宫', '殿', '庙', '寺', '观', '塔', '陵', '园', '府',
            '山', '河', '江', '湖', '海', '湾', '岛', '峰', '岭'
        ]
        for word in common_valid:
            self.valid_words.add(word)
    
    def load_stations(self, city):
        filename = f'{city}_stations.csv'
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            raise FileNotFoundError(f'数据文件不存在: {filepath}')
        return pd.read_csv(filepath)
    
    def clean_name(self, name):
        if pd.isna(name):
            return ''
        name = str(name).strip()
        
        for suffix in self.suffixes:
            if name.endswith(suffix):
                name = name[:-len(suffix)]
        
        name = re.sub(r'\s+', '', name)
        return name
    
    def extract_core_place_name(self, name):
        cleaned = self.clean_name(name)
        core_name = cleaned
        
        direction_pattern = r'(.+?)([东南西北中上下前后左右内外])$'
        match = re.match(direction_pattern, cleaned)
        if match:
            base = match.group(1)
            if any(base.endswith(marker) for marker in self.landmark_markers):
                core_name = base
        
        gate_pattern = r'(.+门)([东南西北])站?'
        gate_match = re.match(gate_pattern, cleaned)
        if gate_match:
            core_name = gate_match.group(1)
        
        return core_name
    
    def is_valid_word(self, word, station_name=''):
        if len(word) < 2:
            return False
        
        if word in self.valid_words:
            return True
        
        if any(marker in word for marker in self.landmark_markers):
            if len(word) >= 2:
                return True
        
        if len(word) >= 2 and len(word) <= 4:
            for marker in self.landmark_markers:
                if word.endswith(marker) and len(word) > len(marker):
                    return True
        
        if len(word) >= 3:
            for city_places in self.place_name_database.values():
                for place in city_places:
                    if word in place or place in word:
                        return True
        
        return False
    
    def extract_keywords(self, name, city=''):
        cleaned = self.clean_name(name)
        core_name = self.extract_core_place_name(name)
        keywords = set()
        
        city_places = self.place_name_database.get(city, [])
        for place in city_places:
            if place in cleaned and len(place) >= 2:
                keywords.add(place)
        
        jieba_words = jieba.lcut(cleaned)
        for word in jieba_words:
            if self.is_valid_word(word, cleaned):
                keywords.add(word)
        
        if len(core_name) >= 2 and self.is_valid_word(core_name, cleaned):
            keywords.add(core_name)
        
        for marker in self.landmark_markers:
            if len(marker) >= 2 and marker in cleaned:
                keywords.add(marker)
        
        result = list(keywords)
        result.sort(key=lambda x: (-len(x), x))
        
        return result
    
    def process_city(self, city):
        df = self.load_stations(city)
        if 'station_name' not in df.columns:
            raise ValueError('CSV文件必须包含 station_name 列')
            
        df['cleaned_name'] = df['station_name'].apply(self.clean_name)
        df['core_name'] = df['station_name'].apply(self.extract_core_place_name)
        df['keywords'] = df['station_name'].apply(lambda x: self.extract_keywords(x, city))
        return df
    
    def get_all_cities(self):
        cities = []
        for filename in os.listdir(self.data_dir):
            if filename.endswith('_stations.csv'):
                city = filename.replace('_stations.csv', '')
                cities.append(city)
        return cities
