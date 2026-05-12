const PoiData = {
    cities: {
        "北京": {
            center: { lat: 39.9042, lng: 116.4074 },
            pois: [
                {
                    id: "bj_gugong",
                    name: "故宫博物院",
                    tags: ["历史", "古建筑"],
                    lat: 39.9163,
                    lng: 116.3972,
                    area: "中心区域",
                    cost: 60,
                    duration: 4,
                    rating: 4.9,
                    description: "世界上现存规模最大、保存最完整的木质结构古建筑群"
                },
                {
                    id: "bj_tiananmen",
                    name: "天安门广场",
                    tags: ["历史", "现代"],
                    lat: 39.9087,
                    lng: 116.3975,
                    area: "中心区域",
                    cost: 0,
                    duration: 1.5,
                    rating: 4.8,
                    description: "世界最大的城市广场，中国的象征"
                },
                {
                    id: "bj_nanluoguxiang",
                    name: "南锣鼓巷",
                    tags: ["历史", "美食", "购物"],
                    lat: 39.9373,
                    lng: 116.4037,
                    area: "东城区",
                    cost: 0,
                    duration: 2,
                    rating: 4.5,
                    description: "北京最古老的胡同之一，汇集了各种小吃和特色小店"
                },
                {
                    id: "bj_yonghegong",
                    name: "雍和宫",
                    tags: ["历史", "古建筑"],
                    lat: 39.9506,
                    lng: 116.4109,
                    area: "东城区",
                    cost: 25,
                    duration: 2,
                    rating: 4.7,
                    description: "北京市内最大的藏传佛教寺院"
                },
                {
                    id: "bj_gulou",
                    name: "鼓楼大街",
                    tags: ["历史", "美食", "古建筑"],
                    lat: 39.9470,
                    lng: 116.3956,
                    area: "东城区",
                    cost: 30,
                    duration: 1.5,
                    rating: 4.6,
                    description: "感受老北京的胡同文化，品尝地道小吃"
                },
                {
                    id: "bj_houhai",
                    name: "后海酒吧街",
                    tags: ["美食", "购物", "现代"],
                    lat: 39.9423,
                    lng: 116.3886,
                    area: "西城区",
                    cost: 0,
                    duration: 2,
                    rating: 4.4,
                    description: "北京最著名的夜生活区，湖光月色下的酒吧风情"
                },
                {
                    id: "bj_beihai",
                    name: "北海公园",
                    tags: ["历史", "自然", "古建筑"],
                    lat: 39.9256,
                    lng: 116.3827,
                    area: "西城区",
                    cost: 10,
                    duration: 2,
                    rating: 4.6,
                    description: "中国现存最古老、最完整的皇家园林"
                },
                {
                    id: "bj_yiheyuan",
                    name: "颐和园",
                    tags: ["历史", "自然", "古建筑"],
                    lat: 39.9999,
                    lng: 116.2755,
                    area: "海淀区",
                    cost: 30,
                    duration: 4,
                    rating: 4.8,
                    description: "中国现存规模最大、保存最完整的皇家园林"
                },
                {
                    id: "bj_yuanmingyuan",
                    name: "圆明园遗址公园",
                    tags: ["历史", "自然"],
                    lat: 40.0093,
                    lng: 116.2970,
                    area: "海淀区",
                    cost: 10,
                    duration: 2,
                    rating: 4.5,
                    description: "清代大型皇家园林遗址，见证历史沧桑"
                },
                {
                    id: "bj_tsinghua",
                    name: "清华大学",
                    tags: ["历史", "现代"],
                    lat: 40.0030,
                    lng: 116.3264,
                    area: "海淀区",
                    cost: 0,
                    duration: 2,
                    rating: 4.7,
                    description: "中国顶尖学府，美丽的校园风光"
                },
                {
                    id: "bj_beida",
                    name: "北京大学",
                    tags: ["历史", "现代"],
                    lat: 39.9929,
                    lng: 116.3104,
                    area: "海淀区",
                    cost: 0,
                    duration: 2,
                    rating: 4.7,
                    description: "百年名校，未名湖畔的人文气息"
                },
                {
                    id: "bj_xiangshan",
                    name: "香山公园",
                    tags: ["自然", "历史"],
                    lat: 39.9959,
                    lng: 116.1880,
                    area: "海淀区",
                    cost: 10,
                    duration: 3,
                    rating: 4.6,
                    description: "著名的皇家园林，秋天红叶美不胜收"
                },
                {
                    id: "bj_greatwall_badaling",
                    name: "八达岭长城",
                    tags: ["历史", "自然", "古建筑"],
                    lat: 40.3584,
                    lng: 116.0201,
                    area: "延庆区",
                    cost: 40,
                    duration: 4,
                    rating: 4.8,
                    description: "最著名的长城段落，雄伟壮观"
                },
                {
                    id: "bj_greatwall_mutianyu",
                    name: "慕田峪长城",
                    tags: ["历史", "自然", "古建筑"],
                    lat: 40.4341,
                    lng: 116.5699,
                    area: "怀柔区",
                    cost: 45,
                    duration: 4,
                    rating: 4.9,
                    description: "风景优美的长城段落，人少景美"
                },
                {
                    id: "bj_798",
                    name: "798艺术区",
                    tags: ["现代", "购物"],
                    lat: 39.9847,
                    lng: 116.4951,
                    area: "朝阳区",
                    cost: 0,
                    duration: 3,
                    rating: 4.5,
                    description: "北京最具代表性的艺术创意园区"
                },
                {
                    id: "bj_wangfujing",
                    name: "王府井大街",
                    tags: ["购物", "美食"],
                    lat: 39.9142,
                    lng: 116.4104,
                    area: "东城区",
                    cost: 0,
                    duration: 2,
                    rating: 4.3,
                    description: "北京最著名的商业街，汇集众多品牌和小吃"
                },
                {
                    id: "bj_qianmen",
                    name: "前门大街",
                    tags: ["历史", "购物", "美食"],
                    lat: 39.8980,
                    lng: 116.3942,
                    area: "东城区",
                    cost: 0,
                    duration: 2,
                    rating: 4.4,
                    description: "北京传统商业街，老字号云集"
                },
                {
                    id: "bj_tiantan",
                    name: "天坛公园",
                    tags: ["历史", "古建筑", "自然"],
                    lat: 39.8822,
                    lng: 116.4108,
                    area: "东城区",
                    cost: 15,
                    duration: 2,
                    rating: 4.7,
                    description: "明清两代皇帝祭天的场所，建筑精美"
                },
                {
                    id: "bj_guomao",
                    name: "国贸CBD",
                    tags: ["现代", "购物", "美食"],
                    lat: 39.9089,
                    lng: 116.4605,
                    area: "朝阳区",
                    cost: 0,
                    duration: 2,
                    rating: 4.5,
                    description: "北京中央商务区，现代都市的代表"
                },
                {
                    id: "bj_sanlitun",
                    name: "三里屯",
                    tags: ["购物", "美食", "现代"],
                    lat: 39.9371,
                    lng: 116.4537,
                    area: "朝阳区",
                    cost: 0,
                    duration: 2,
                    rating: 4.5,
                    description: "时尚潮流聚集地，夜生活丰富"
                }
            ]
        },
        "上海": {
            center: { lat: 31.2304, lng: 121.4737 },
            pois: [
                {
                    id: "sh_bund",
                    name: "外滩",
                    tags: ["历史", "现代", "建筑"],
                    lat: 31.2397,
                    lng: 121.4906,
                    area: "黄浦区",
                    cost: 0,
                    duration: 2,
                    rating: 4.8,
                    description: "上海地标，万国建筑博览群"
                },
                {
                    id: "sh_lujiazui",
                    name: "陆家嘴",
                    tags: ["现代", "购物", "美食"],
                    lat: 31.2397,
                    lng: 121.5058,
                    area: "浦东新区",
                    cost: 0,
                    duration: 2,
                    rating: 4.7,
                    description: "上海金融中心，东方明珠所在地"
                },
                {
                    id: "sh_oriental_pearl",
                    name: "东方明珠塔",
                    tags: ["现代", "建筑"],
                    lat: 31.2397,
                    lng: 121.4998,
                    area: "浦东新区",
                    cost: 160,
                    duration: 2,
                    rating: 4.6,
                    description: "上海标志性建筑，俯瞰城市美景"
                },
                {
                    id: "sh_yuyuan",
                    name: "豫园",
                    tags: ["历史", "古建筑", "美食"],
                    lat: 31.2272,
                    lng: 121.4925,
                    area: "黄浦区",
                    cost: 40,
                    duration: 2,
                    rating: 4.7,
                    description: "江南古典园林，城隍庙美食街"
                },
                {
                    id: "sh_nanjing_road",
                    name: "南京路步行街",
                    tags: ["购物", "美食", "现代"],
                    lat: 31.2365,
                    lng: 121.4754,
                    area: "黄浦区",
                    cost: 0,
                    duration: 2,
                    rating: 4.5,
                    description: "中国第一商业街"
                },
                {
                    id: "sh_xintiandi",
                    name: "新天地",
                    tags: ["历史", "美食", "购物"],
                    lat: 31.2219,
                    lng: 121.4720,
                    area: "黄浦区",
                    cost: 0,
                    duration: 2,
                    rating: 4.6,
                    description: "石库门建筑改造的时尚地标"
                },
                {
                    id: "sh_french_concession",
                    name: "武康路历史文化街",
                    tags: ["历史", "建筑"],
                    lat: 31.2120,
                    lng: 121.4440,
                    area: "徐汇区",
                    cost: 0,
                    duration: 2,
                    rating: 4.7,
                    description: "法租界风情，名人故居云集"
                },
                {
                    id: "sh_jingan_temple",
                    name: "静安寺",
                    tags: ["历史", "建筑"],
                    lat: 31.2249,
                    lng: 121.4485,
                    area: "静安区",
                    cost: 30,
                    duration: 1.5,
                    rating: 4.5,
                    description: "上海最古老的佛教寺院之一"
                },
                {
                    id: "sh_disney",
                    name: "上海迪士尼乐园",
                    tags: ["现代", "娱乐"],
                    lat: 31.1416,
                    lng: 121.6570,
                    area: "浦东新区",
                    cost: 435,
                    duration: 8,
                    rating: 4.8,
                    description: "中国大陆首座迪士尼主题乐园"
                },
                {
                    id: "sh_zhujiajiao",
                    name: "朱家角古镇",
                    tags: ["历史", "自然", "美食"],
                    lat: 31.1115,
                    lng: 121.0548,
                    area: "青浦区",
                    cost: 60,
                    duration: 3,
                    rating: 4.6,
                    description: "上海保存最完整的江南水乡古镇"
                },
                {
                    id: "sh_century_park",
                    name: "世纪公园",
                    tags: ["自然", "现代"],
                    lat: 31.2134,
                    lng: 121.5415,
                    area: "浦东新区",
                    cost: 10,
                    duration: 2,
                    rating: 4.5,
                    description: "上海最大的生态公园"
                },
                {
                    id: "sh_museum",
                    name: "上海博物馆",
                    tags: ["历史", "现代"],
                    lat: 31.2317,
                    lng: 121.4687,
                    area: "黄浦区",
                    cost: 0,
                    duration: 2,
                    rating: 4.7,
                    description: "中国最大的古代艺术博物馆之一"
                }
            ]
        },
        "杭州": {
            center: { lat: 30.2741, lng: 120.1551 },
            pois: [
                {
                    id: "hz_westlake",
                    name: "西湖风景区",
                    tags: ["自然", "历史", "古建筑"],
                    lat: 30.2439,
                    lng: 120.1445,
                    area: "西湖区",
                    cost: 0,
                    duration: 4,
                    rating: 4.9,
                    description: "世界文化遗产，人间天堂"
                },
                {
                    id: "hz_lingyin",
                    name: "灵隐寺",
                    tags: ["历史", "古建筑", "自然"],
                    lat: 30.2439,
                    lng: 120.1020,
                    area: "西湖区",
                    cost: 75,
                    duration: 2.5,
                    rating: 4.7,
                    description: "千年古刹，江南著名佛教圣地"
                },
                {
                    id: "hz_hefangjie",
                    name: "河坊街",
                    tags: ["历史", "美食", "购物"],
                    lat: 30.2375,
                    lng: 120.1572,
                    area: "上城区",
                    cost: 0,
                    duration: 2,
                    rating: 4.5,
                    description: "杭州历史文化街区，老字号云集"
                },
                {
                    id: "hz_songcheng",
                    name: "宋城",
                    tags: ["历史", "现代", "娱乐"],
                    lat: 30.1881,
                    lng: 120.0907,
                    area: "西湖区",
                    cost: 310,
                    duration: 4,
                    rating: 4.5,
                    description: "大型宋文化主题公园，《宋城千古情》"
                },
                {
                    id: "hz_qiantaohu",
                    name: "千岛湖",
                    tags: ["自然"],
                    lat: 29.6177,
                    lng: 119.0503,
                    area: "淳安县",
                    cost: 130,
                    duration: 6,
                    rating: 4.8,
                    description: "天下第一秀水，湖中有1078个岛屿"
                },
                {
                    id: "hz_jiuxi",
                    name: "九溪十八涧",
                    tags: ["自然", "历史"],
                    lat: 30.1870,
                    lng: 120.1087,
                    area: "西湖区",
                    cost: 0,
                    duration: 2,
                    rating: 4.7,
                    description: "龙井茶乡，清幽的自然景观"
                },
                {
                    id: "hz_baoshu",
                    name: "宝石山",
                    tags: ["自然", "历史"],
                    lat: 30.2610,
                    lng: 120.1450,
                    area: "西湖区",
                    cost: 0,
                    duration: 1.5,
                    rating: 4.6,
                    description: "俯瞰西湖全景的最佳地点"
                },
                {
                    id: "hz_xianghu",
                    name: "湘湖",
                    tags: ["自然", "历史"],
                    lat: 30.1729,
                    lng: 120.2535,
                    area: "萧山区",
                    cost: 0,
                    duration: 2,
                    rating: 4.5,
                    description: "西湖姐妹湖，风景秀丽"
                }
            ]
        },
        "成都": {
            center: { lat: 30.5728, lng: 104.0668 },
            pois: [
                {
                    id: "cd_panda",
                    name: "成都大熊猫繁育研究基地",
                    tags: ["自然", "现代"],
                    lat: 30.7329,
                    lng: 104.1445,
                    area: "成华区",
                    cost: 55,
                    duration: 3,
                    rating: 4.8,
                    description: "世界著名的大熊猫迁地保护基地"
                },
                {
                    id: "cd_jingli",
                    name: "锦里古街",
                    tags: ["历史", "美食", "购物"],
                    lat: 30.6444,
                    lng: 104.0472,
                    area: "武侯区",
                    cost: 0,
                    duration: 2,
                    rating: 4.6,
                    description: "成都最古老、最具商业气息的街道"
                },
                {
                    id: "cd_wuhouci",
                    name: "武侯祠",
                    tags: ["历史", "古建筑"],
                    lat: 30.6444,
                    lng: 104.0460,
                    area: "武侯区",
                    cost: 50,
                    duration: 2,
                    rating: 4.7,
                    description: "中国唯一的君臣合祀祠庙，纪念诸葛亮"
                },
                {
                    id: "cd_kuanzhai",
                    name: "宽窄巷子",
                    tags: ["历史", "美食", "购物"],
                    lat: 30.6723,
                    lng: 104.0584,
                    area: "青羊区",
                    cost: 0,
                    duration: 2,
                    rating: 4.6,
                    description: "老成都的缩影，体验成都慢生活"
                },
                {
                    id: "cd_chunxi",
                    name: "春熙路",
                    tags: ["购物", "美食", "现代"],
                    lat: 30.6568,
                    lng: 104.0822,
                    area: "锦江区",
                    cost: 0,
                    duration: 2,
                    rating: 4.5,
                    description: "成都最繁华的商业中心"
                },
                {
                    id: "cd_dujiangyan",
                    name: "都江堰",
                    tags: ["历史", "古建筑", "自然"],
                    lat: 31.0036,
                    lng: 103.6142,
                    area: "都江堰市",
                    cost: 80,
                    duration: 3,
                    rating: 4.8,
                    description: "世界文化遗产，千年水利工程"
                },
                {
                    id: "cd_qingchengshan",
                    name: "青城山",
                    tags: ["自然", "历史", "古建筑"],
                    lat: 30.9061,
                    lng: 103.5179,
                    area: "都江堰市",
                    cost: 80,
                    duration: 4,
                    rating: 4.8,
                    description: "道教名山，青城天下幽"
                },
                {
                    id: "cd_jinsha",
                    name: "金沙遗址博物馆",
                    tags: ["历史", "现代"],
                    lat: 30.6813,
                    lng: 104.0112,
                    area: "青羊区",
                    cost: 70,
                    duration: 2,
                    rating: 4.7,
                    description: "古蜀文明遗址，太阳神鸟的发现地"
                },
                {
                    id: "cd_tianfu",
                    name: "天府广场",
                    tags: ["现代", "历史"],
                    lat: 30.6636,
                    lng: 104.0630,
                    area: "锦江区",
                    cost: 0,
                    duration: 1,
                    rating: 4.4,
                    description: "成都市中心地标"
                },
                {
                    id: "cd_leshan",
                    name: "乐山大佛",
                    tags: ["历史", "古建筑", "自然"],
                    lat: 29.5456,
                    lng: 103.7711,
                    area: "乐山市",
                    cost: 80,
                    duration: 4,
                    rating: 4.8,
                    description: "世界最大的石刻弥勒佛坐像"
                }
            ]
        }
    },

    getCity(cityName) {
        return this.cities[cityName] || null;
    },

    getPois(cityName) {
        const city = this.getCity(cityName);
        return city ? city.pois : [];
    }
};
