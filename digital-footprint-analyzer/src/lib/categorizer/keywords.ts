export interface KeywordRule {
  level1: string;
  level2: string;
  keywords: string[];
}

export interface BrandRule {
  level1: string;
  level2: string;
  brand: string;
  keywords: string[];
}

export const keywordRules: KeywordRule[] = [
  {
    level1: '餐饮美食',
    level2: '咖啡茶饮',
    keywords: ['星巴克', 'starbucks', '瑞幸', 'luckin', 'costa', '咖啡', '奶茶', '喜茶', '奈雪', '茶百道', '蜜雪冰城', '古茗', '一点点']
  },
  {
    level1: '餐饮美食',
    level2: '快餐简餐',
    keywords: ['麦当劳', 'mcdonald', '肯德基', 'kfc', '汉堡王', 'burger king', '德克士', '必胜客', 'pizza hut', '华莱士', '吉野家', '沙县', '兰州拉面']
  },
  {
    level1: '餐饮美食',
    level2: '正餐宴请',
    keywords: ['海底捞', '西贝', '外婆家', '绿茶', '餐厅', '饭店', '酒家', '酒楼', '大酒店', '川菜', '粤菜', '湘菜', '日料', '寿司', '烤肉', '火锅']
  },
  {
    level1: '餐饮美食',
    level2: '食品生鲜',
    keywords: ['超市', '便利店', '7-eleven', '全家', '罗森', '永辉', '沃尔玛', '盒马', '生鲜', '菜市场', '买菜', '水果', '粮油']
  },
  {
    level1: '交通出行',
    level2: '公共交通',
    keywords: ['地铁', 'metro', '轨道交通', '公交', '巴士', 'bus', '有轨电车', '轻轨']
  },
  {
    level1: '交通出行',
    level2: '打车出行',
    keywords: ['滴滴', 'didi', '高德打车', '网约车', '出租车', '的士', 't3出行', '首汽约车', '曹操出行']
  },
  {
    level1: '交通出行',
    level2: '火车出行',
    keywords: ['火车票', '高铁', '动车', '12306', '铁路']
  },
  {
    level1: '交通出行',
    level2: '航空出行',
    keywords: ['机票', '飞机票', '航空', '南航', '国航', '东航', '海航', '春秋航空']
  },
  {
    level1: '交通出行',
    level2: '私家车',
    keywords: ['加油', '油费', '中石油', '中石化', '壳牌', '停车费', '停车', '过路费', '高速费', '保养', '维修', '车险']
  },
  {
    level1: '购物消费',
    level2: '服饰鞋包',
    keywords: ['优衣库', 'uniqlo', 'zara', 'h&m', 'nike', '耐克', 'adidas', '阿迪达斯', '李宁', '安踏', '海澜之家', '太平鸟', 'ur']
  },
  {
    level1: '购物消费',
    level2: '数码电子',
    keywords: ['苹果', 'apple', '华为', 'huawei', '小米', 'xiaomi', 'oppo', 'vivo', '京东', 'jd.com', '天猫', '淘宝', '拼多多', '苏宁', '国美']
  },
  {
    level1: '购物消费',
    level2: '美妆护肤',
    keywords: ['丝芙兰', 'sephora', '屈臣氏', 'watsons', '兰蔻', 'lancome', '雅诗兰黛', 'estee lauder', '欧莱雅', 'loreal', '资生堂', 'shiseido', 'sk-ii']
  },
  {
    level1: '居住生活',
    level2: '房屋租金',
    keywords: ['房租', '租金', '房东', '公寓', '自如', '蛋壳']
  },
  {
    level1: '居住生活',
    level2: '水电燃气',
    keywords: ['水费', '电费', '燃气费', '水电费', '煤气费', '暖气费', '物业费', '物业']
  },
  {
    level1: '居住生活',
    level2: '家居家装',
    keywords: ['宜家', 'ikea', '居然之家', '红星美凯龙', '家具', '家电', '装修', '建材']
  },
  {
    level1: '休闲娱乐',
    level2: '电影演出',
    keywords: ['猫眼', '淘票票', '万达影城', '电影院', '电影票', '演出', '演唱会', '话剧', '音乐剧']
  },
  {
    level1: '休闲娱乐',
    level2: '视频音乐',
    keywords: ['腾讯视频', '爱奇艺', '优酷', '芒果tv', 'b站', 'bilibili', '网易云音乐', 'qq音乐', '酷狗音乐', '会员', 'vip']
  },
  {
    level1: '休闲娱乐',
    level2: '运动健身',
    keywords: ['健身', '健身房', '游泳', '瑜伽', '舞蹈', '羽毛球', '篮球', '足球', '网球', '滑雪', '迪卡侬']
  },
  {
    level1: '休闲娱乐',
    level2: '旅游度假',
    keywords: ['酒店', 'hotel', '民宿', '机票', '门票', '景区', '携程', '去哪儿', '飞猪', '途牛', '旅游', '旅行']
  },
  {
    level1: '医疗健康',
    level2: '看病就医',
    keywords: ['医院', '挂号', '门诊', '住院', '手术', '医药费', '药费', '药店', '药房', '体检']
  },
  {
    level1: '医疗健康',
    level2: '保健美容',
    keywords: ['美容院', '美甲', '美发', '理发', '整容', '整形', 'spa', '按摩', '足浴', '保健品']
  },
  {
    level1: '教育培训',
    level2: '学校教育',
    keywords: ['学费', '报名费', '培训费', '教材费', '学校', '大学', '中小学', '幼儿园']
  },
  {
    level1: '教育培训',
    level2: '在线学习',
    keywords: ['网课', '在线课程', '得到', '喜马拉雅', '樊登读书', '知识付费', '会员']
  },
  {
    level1: '人情往来',
    level2: '红包送礼',
    keywords: ['红包', '礼金', '送礼', '礼物', '生日', '节日', '婚庆', '婚礼', '随礼']
  },
  {
    level1: '人情往来',
    level2: '慈善捐赠',
    keywords: ['捐款', '捐赠', '公益', '慈善', '红十字', '壹基金']
  },
  {
    level1: '金融理财',
    level2: '还款转账',
    keywords: ['还款', '信用卡', '花呗', '借呗', '白条', '贷款', '转账', '汇款']
  },
  {
    level1: '金融理财',
    level2: '保险保障',
    keywords: ['保险', '保费', '人寿保险', '平安保险', '太平洋保险', '医保', '社保']
  }
];

export const brandRules: BrandRule[] = [
  {
    level1: '餐饮美食',
    level2: '咖啡茶饮',
    brand: '星巴克',
    keywords: ['星巴克', 'starbucks']
  },
  {
    level1: '餐饮美食',
    level2: '咖啡茶饮',
    brand: '瑞幸咖啡',
    keywords: ['瑞幸', 'luckin']
  },
  {
    level1: '餐饮美食',
    level2: '咖啡茶饮',
    brand: 'Costa咖啡',
    keywords: ['costa']
  },
  {
    level1: '餐饮美食',
    level2: '快餐简餐',
    brand: '麦当劳',
    keywords: ['麦当劳', 'mcdonald', 'm记']
  },
  {
    level1: '餐饮美食',
    level2: '快餐简餐',
    brand: '肯德基',
    keywords: ['肯德基', 'kfc', '开封菜']
  },
  {
    level1: '餐饮美食',
    level2: '正餐宴请',
    brand: '海底捞',
    keywords: ['海底捞']
  },
  {
    level1: '餐饮美食',
    level2: '正餐宴请',
    brand: '西贝莜面村',
    keywords: ['西贝']
  },
  {
    level1: '交通出行',
    level2: '打车出行',
    brand: '滴滴出行',
    keywords: ['滴滴', 'didi']
  },
  {
    level1: '交通出行',
    level2: '打车出行',
    brand: '高德打车',
    keywords: ['高德打车']
  },
  {
    level1: '购物消费',
    level2: '服饰鞋包',
    brand: '优衣库',
    keywords: ['优衣库', 'uniqlo']
  },
  {
    level1: '购物消费',
    level2: '数码电子',
    brand: 'Apple',
    keywords: ['苹果', 'apple', 'app store']
  },
  {
    level1: '购物消费',
    level2: '数码电子',
    brand: '华为',
    keywords: ['华为', 'huawei']
  },
  {
    level1: '购物消费',
    level2: '数码电子',
    brand: '小米',
    keywords: ['小米', 'xiaomi']
  },
  {
    level1: '购物消费',
    level2: '数码电子',
    brand: '京东',
    keywords: ['京东', 'jd.com']
  },
  {
    level1: '购物消费',
    level2: '数码电子',
    brand: '淘宝',
    keywords: ['淘宝', 'taobao', '天猫']
  }
];

export const incomeKeywords = ['收入', '工资', '薪资', '奖金', '红包收入', '转账收入', '退款', '返利', '理财收益', '利息'];
