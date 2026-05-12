export class NewsFetcher {
    constructor(algorithmConfig) {
        this.algorithmConfig = algorithmConfig;
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000;
        this.newsIdCounter = 1;
        
        this.apiProviders = {
            juhe: {
                name: '聚合数据API',
                baseUrl: 'http://v.juhe.cn/toutiao/index',
                testUrl: 'http://v.juhe.cn/toutiao/index?type=top&key=',
                normalize: this.normalizeJuheData.bind(this)
            },
            tianapi: {
                name: '天行数据API',
                baseUrl: 'https://apis.tianapi.com/guonei/index',
                testUrl: 'https://apis.tianapi.com/guonei/index?key=',
                normalize: this.normalizeTianapiData.bind(this)
            },
            gnews: {
                name: 'GNews API',
                baseUrl: 'https://gnews.io/api/v4/top-headlines',
                testUrl: 'https://gnews.io/api/v4/top-headlines?token=',
                normalize: this.normalizeGnewsData.bind(this)
            },
            custom: {
                name: '自定义API',
                baseUrl: '',
                testUrl: '',
                normalize: this.normalizeCustomData.bind(this)
            }
        };
        
        this.categoryMapping = {
            top: '综合',
            shehui: '社会',
            guonei: '国内',
            guoji: '国际',
            yule: '娱乐',
            tiyu: '体育',
            junshi: '军事',
            keji: '科技',
            caijing: '财经',
            shishang: '时尚'
        };
    }

    setProvider(provider, apiKey = '', apiEndpoint = '') {
        this.algorithmConfig?.set('api.provider', provider);
        if (apiKey) {
            this.algorithmConfig?.set('api.apiKey', apiKey);
        }
        if (apiEndpoint) {
            this.algorithmConfig?.set('api.apiEndpoint', apiEndpoint);
        }
        this.cache.clear();
    }

    getCurrentProvider() {
        return {
            provider: this.algorithmConfig?.get('api.provider') || 'fallback',
            apiKey: this.algorithmConfig?.get('api.apiKey') || '',
            apiEndpoint: this.algorithmConfig?.get('api.apiEndpoint') || ''
        };
    }

    async testConnection(provider, apiKey, apiEndpoint = '') {
        if (provider === 'fallback') {
            return {
                success: true,
                message: '本地数据模式，无需连接测试',
                newsCount: 55
            };
        }

        const providerConfig = this.apiProviders[provider];
        if (!providerConfig) {
            return {
                success: false,
                message: '未知的API供应商'
            };
        }

        try {
            let testUrl = providerConfig.testUrl;
            
            if (provider === 'custom') {
                if (!apiEndpoint) {
                    return {
                        success: false,
                        message: '请输入自定义API的Endpoint地址'
                    };
                }
                testUrl = apiEndpoint;
                if (apiKey) {
                    testUrl += (testUrl.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(apiKey);
                }
            } else {
                if (!apiKey) {
                    return {
                        success: false,
                        message: '请输入API Key'
                    };
                }
                testUrl += encodeURIComponent(apiKey);
            }

            console.log('[NewsFetcher] 测试连接:', testUrl);
            
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return {
                    success: false,
                    message: `HTTP错误: ${response.status} ${response.statusText}`
                };
            }

            const data = await response.json();
            console.log('[NewsFetcher] API响应:', data);

            const normalized = providerConfig.normalize(data);
            
            return {
                success: normalized.length > 0,
                message: normalized.length > 0 
                    ? `连接成功！获取到 ${normalized.length} 条新闻` 
                    : 'API返回数据为空或格式错误',
                newsCount: normalized.length,
                sampleNews: normalized.slice(0, 2)
            };

        } catch (error) {
            console.error('[NewsFetcher] 连接测试失败:', error);
            return {
                success: false,
                message: `连接失败: ${error.message || '未知错误'}\n提示：部分API可能因跨域(CORS)限制无法直接在浏览器中测试`
            };
        }
    }

    async fetchNews(options = {}) {
        const { 
            category = 'all',
            keyword = '',
            limit = 20,
            useFallback = true
        } = options;

        const { provider, apiKey, apiEndpoint } = this.getCurrentProvider();

        const cacheKey = `${provider}_${category}_${keyword}_${limit}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            console.log('[NewsFetcher] 使用缓存数据');
            return cached;
        }

        let news = null;

        if (provider !== 'fallback' && apiKey) {
            news = await this.fetchFromProvider(provider, apiKey, apiEndpoint, category, keyword, limit);
        }

        if (!news || news.length === 0) {
            if (useFallback) {
                console.log('[NewsFetcher] 使用本地数据');
                news = await this.fetchFromFallback(category, keyword, limit);
            }
        }

        this.setToCache(cacheKey, news);
        return news;
    }

    async fetchFromProvider(provider, apiKey, apiEndpoint, category, keyword, limit) {
        try {
            const providerConfig = this.apiProviders[provider];
            if (!providerConfig) {
                return null;
            }

            let url = providerConfig.baseUrl;
            
            if (provider === 'custom') {
                if (!apiEndpoint) return null;
                url = apiEndpoint;
            }

            const params = [];
            
            if (provider === 'juhe') {
                params.push(`type=${category === 'all' ? 'top' : this.mapCategoryToJuhe(category)}`);
                params.push(`key=${encodeURIComponent(apiKey)}`);
            } else if (provider === 'tianapi') {
                params.push(`key=${encodeURIComponent(apiKey)}`);
                params.push('num=30');
            } else if (provider === 'gnews') {
                params.push(`token=${encodeURIComponent(apiKey)}`);
                params.push('max=30');
                params.push('lang=zh');
            } else if (provider === 'custom') {
                if (apiKey) {
                    params.push(`key=${encodeURIComponent(apiKey)}`);
                }
            }

            if (params.length > 0) {
                url += (url.includes('?') ? '&' : '?') + params.join('&');
            }

            console.log('[NewsFetcher] 请求:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            let normalized = providerConfig.normalize(data);
            
            if (keyword) {
                const keywordLower = keyword.toLowerCase();
                normalized = normalized.filter(n => 
                    n.title.toLowerCase().includes(keywordLower) ||
                    n.tags.some(t => t.toLowerCase().includes(keywordLower))
                );
            }

            if (normalized.length > limit) {
                normalized = normalized.slice(0, limit);
            }

            return normalized;

        } catch (error) {
            console.error('[NewsFetcher] 从API获取失败:', error);
            return null;
        }
    }

    normalizeJuheData(data) {
        if (!data || !data.result || !Array.isArray(data.result.data)) {
            return [];
        }

        const result = [];
        for (const item of data.result.data) {
            const category = this.categoryMapping[item.category] || '综合';
            const tags = this.extractTags(item.title, category);
            
            result.push({
                id: this.newsIdCounter++,
                title: item.title || '',
                content: item.digest || item.title || '',
                category: this.normalizeCategory(category),
                tags: tags,
                source: item.author_name || item.source || '未知',
                url: item.url || ''
            });
        }
        return result;
    }

    normalizeTianapiData(data) {
        if (!data || data.code !== 200 || !Array.isArray(data.newslist)) {
            return [];
        }

        const result = [];
        for (const item of data.newslist) {
            const category = item.channelName || '综合';
            const tags = this.extractTags(item.title, category);
            
            result.push({
                id: this.newsIdCounter++,
                title: item.title || '',
                content: item.description || item.title || '',
                category: this.normalizeCategory(category),
                tags: tags,
                source: item.source || '未知',
                url: item.url || ''
            });
        }
        return result;
    }

    normalizeGnewsData(data) {
        if (!data || !Array.isArray(data.articles)) {
            return [];
        }

        const result = [];
        for (const item of data.articles) {
            const title = item.title || '';
            const category = this.guessCategory(title);
            const tags = this.extractTags(title, category);
            
            result.push({
                id: this.newsIdCounter++,
                title: title,
                content: item.description || item.content || title,
                category: this.normalizeCategory(category),
                tags: tags,
                source: item.source?.name || '未知',
                url: item.url || ''
            });
        }
        return result;
    }

    normalizeCustomData(data) {
        if (!data) return [];
        
        if (Array.isArray(data)) {
            return data.map((item, index) => ({
                id: this.newsIdCounter++,
                title: item.title || item.name || '',
                content: item.content || item.description || item.summary || item.title || '',
                category: this.normalizeCategory(item.category || item.type || this.guessCategory(item.title || '')),
                tags: item.tags || item.keywords || this.extractTags(item.title || item.content || '', this.guessCategory(item.title || '')),
                source: item.source || item.author || '未知',
                url: item.url || item.link || ''
            }));
        }

        if (data.articles) {
            return this.normalizeGnewsData(data);
        }

        if (data.result && data.result.data) {
            return this.normalizeJuheData(data);
        }

        if (data.newslist) {
            return this.normalizeTianapiData(data);
        }

        return [];
    }

    mapCategoryToJuhe(category) {
        const mapping = {
            '体育': 'tiyu',
            '科技': 'keji',
            '财经': 'caijing',
            '娱乐': 'yule',
            '生活': 'shehui',
            '社会': 'shehui',
            '军事': 'junshi',
            '时尚': 'shishang',
            '国际': 'guoji',
            '国内': 'guonei'
        };
        return mapping[category] || 'top';
    }

    normalizeCategory(category) {
        const mapping = {
            '体育': '体育',
            '足球': '体育',
            '篮球': '体育',
            '科技': '科技',
            '互联网': '科技',
            '财经': '财经',
            '金融': '财经',
            '经济': '财经',
            '娱乐': '娱乐',
            '明星': '娱乐',
            '音乐': '娱乐',
            '电影': '娱乐',
            '生活': '生活',
            '健康': '生活',
            '旅游': '生活',
            '美食': '生活',
            '社会': '生活',
            '军事': '体育',
            '时尚': '娱乐',
            '国际': '科技',
            '国内': '科技',
            '综合': '科技'
        };
        return mapping[category] || '科技';
    }

    guessCategory(title) {
        const keywords = {
            '体育': ['足球', '篮球', '比赛', '联赛', '冠军', '运动员', '体育', '世界杯', '奥运会', 'NBA'],
            '科技': ['科技', '互联网', 'AI', '人工智能', '芯片', '5G', '手机', '计算机', '软件', '技术'],
            '财经': ['股票', '股市', '财经', '金融', '经济', '投资', '银行', '货币', '基金', '债券'],
            '娱乐': ['明星', '电影', '音乐', '演唱会', '综艺', '娱乐', '演员', '歌手', '票房'],
            '生活': ['健康', '旅游', '美食', '生活', '家居', '时尚', '育儿', '职场', '教育']
        };

        for (const [category, words] of Object.entries(keywords)) {
            for (const word of words) {
                if (title.includes(word)) {
                    return category;
                }
            }
        }

        return '科技';
    }

    extractTags(title, category) {
        const tags = [];
        
        const allKeywords = [
            { tag: '人工智能', keywords: ['AI', '人工智能', '大模型', 'GPT', '机器学习'] },
            { tag: '科技', keywords: ['科技', '互联网', '技术', '创新'] },
            { tag: '足球', keywords: ['足球', '世界杯', '欧洲杯', '欧冠', '梅西', 'C罗', '姆巴佩', '哈兰德'] },
            { tag: '篮球', keywords: ['篮球', 'NBA', 'CBA', '詹姆斯', '库里'] },
            { tag: '股票', keywords: ['股票', '股市', 'A股', '上证', '创业板', '基金'] },
            { tag: '房地产', keywords: ['房地产', '楼市', '房价', '买房'] },
            { tag: '电影', keywords: ['电影', '票房', '导演', '演员'] },
            { tag: '音乐', keywords: ['音乐', '演唱会', '专辑', '歌手'] },
            { tag: '旅游', keywords: ['旅游', '旅行', '景点', '酒店'] },
            { tag: '健康', keywords: ['健康', '医疗', '医院', '医生'] }
        ];

        for (const item of allKeywords) {
            for (const keyword of item.keywords) {
                if (title.includes(keyword)) {
                    if (!tags.includes(item.tag)) {
                        tags.push(item.tag);
                    }
                    break;
                }
            }
        }

        if (tags.length === 0) {
            tags.push(category);
        }

        return tags;
    }

    async fetchFromFallback(category, keyword, limit) {
        const allNews = this.generateRichNewsData();
        
        let filtered = [...allNews];
        
        if (category && category !== 'all') {
            filtered = filtered.filter(n => n.category === category);
        }
        
        if (keyword) {
            const keywordLower = keyword.toLowerCase();
            filtered = filtered.filter(n => 
                n.title.toLowerCase().includes(keywordLower) ||
                n.tags.some(t => t.toLowerCase().includes(keywordLower))
            );
        }
        
        if (filtered.length > limit) {
            filtered = filtered.slice(0, limit);
        }
        
        return filtered;
    }

    generateRichNewsData() {
        this.newsIdCounter = 1;
        const news = [];

        const techNews = [
            {
                title: "人工智能大模型竞争加剧，GPT-5震撼发布",
                content: "OpenAI正式发布GPT-5大模型，在推理能力、编程能力和多模态理解方面取得重大突破。专家认为这标志着AGI（通用人工智能）的重要里程碑。",
                category: "科技",
                tags: ["人工智能", "大模型", "GPT", "AI", "OpenAI"],
                source: "科技日报"
            },
            {
                title: "特斯拉发布全新自动驾驶技术FSD 4.0",
                content: "特斯拉在年度投资者日上发布了FSD 4.0版本自动驾驶技术，宣称将实现完全无人驾驶，预计明年开始向用户推送。",
                category: "科技",
                tags: ["特斯拉", "自动驾驶", "新能源汽车", "AI", "马斯克"],
                source: "36氪"
            },
            {
                title: "量子计算机突破1000量子比特，IBM创造历史",
                content: "IBM宣布其最新量子计算机实现了1000量子比特的突破，这一进展将为密码学、药物研发等领域带来革命性变化。",
                category: "科技",
                tags: ["量子计算", "IBM", "科技突破", "计算机", "芯片"],
                source: "Nature"
            },
            {
                title: "5G网络覆盖率突破90%，用户数超6亿",
                content: "工信部最新数据显示，我国5G网络覆盖率已突破90%，用户数超过6亿，5G应用场景持续扩展，工业互联网成为新增长点。",
                category: "科技",
                tags: ["5G", "通信", "工信部", "互联网", "工业互联网"],
                source: "新华网"
            },
            {
                title: "苹果Vision Pro销量超预期，元宇宙概念升温",
                content: "苹果Vision Pro头显开售以来销量超预期，推动VR/AR技术再次成为资本市场关注焦点，元宇宙概念股集体上涨。",
                category: "科技",
                tags: ["元宇宙", "VR", "AR", "苹果", "Vision Pro"],
                source: "界面新闻"
            },
            {
                title: "芯片产业链复苏，台积电英伟达业绩亮眼",
                content: "全球芯片市场需求回暖，台积电、英伟达等巨头业绩超预期，AI芯片需求旺盛，半导体行业迎来新一轮增长周期。",
                category: "科技",
                tags: ["芯片", "台积电", "英伟达", "半导体", "AI芯片"],
                source: "第一财经"
            },
            {
                title: "华为发布新一代Mate 80系列，5G功能全面回归",
                content: "华为正式发布Mate 80系列旗舰手机，搭载最新麒麟芯片，5G功能全面回归，市场反响热烈，首日预售破百万。",
                category: "科技",
                tags: ["华为", "Mate 80", "5G", "手机", "麒麟芯片"],
                source: "新浪科技"
            },
            {
                title: "微信小程序生态突破1亿开发者",
                content: "微信宣布小程序生态开发者数量突破1亿，覆盖超过200个行业，小程序日活跃用户突破6亿，成为重要的互联网基础设施。",
                category: "科技",
                tags: ["微信", "小程序", "腾讯", "开发者", "互联网"],
                source: "腾讯科技"
            },
            {
                title: "新能源汽车智能化加速，自动驾驶成标配",
                content: "国内新能源汽车市场竞争加剧，自动驾驶功能逐渐成为中高端车型标配，智能化成为各大车企竞争的核心战场。",
                category: "科技",
                tags: ["新能源汽车", "自动驾驶", "智能化", "比亚迪", "小鹏"],
                source: "汽车之家"
            },
            {
                title: "生成式AI席卷游戏产业，内容生产效率提升10倍",
                content: "AI技术正在深刻改变游戏产业，生成式AI可自动生成场景、角色和剧情，大幅提升内容生产效率，降低开发成本。",
                category: "科技",
                tags: ["AI", "游戏", "生成式AI", "内容生产", "AIGC"],
                source: "游戏日报"
            }
        ];

        const financeNews = [
            {
                title: "美联储暂停加息，全球市场迎来喘息",
                content: "美联储宣布暂停加息，市场预计这标志着本轮加息周期的结束，全球股市债市应声上涨，市场情绪明显改善。",
                category: "财经",
                tags: ["美联储", "加息", "货币政策", "美股", "全球市场"],
                source: "华尔街见闻"
            },
            {
                title: "A股市场震荡上行，科技新能源领涨",
                content: "上证指数本周累计上涨2.3%，创业板指表现更为强势，科技、新能源板块领涨两市，外资持续净流入。",
                category: "财经",
                tags: ["A股", "股票", "上证指数", "创业板", "外资"],
                source: "东方财富"
            },
            {
                title: "房地产政策持续优化，一线城市限购松绑",
                content: "多个一线城市出台房地产市场调控新政策，包括降低首付比例、放宽限购等措施，市场信心逐步恢复。",
                category: "财经",
                tags: ["房地产", "楼市", "政策", "限购", "首付"],
                source: "经济日报"
            },
            {
                title: "国际油价突破每桶90美元，能源板块受益",
                content: "受地缘政治因素和OPEC+减产影响，国际原油价格近期持续上涨，布伦特原油期货价格突破每桶90美元。",
                category: "财经",
                tags: ["原油", "油价", "能源", "OPEC", "期货"],
                source: "金融时报"
            },
            {
                title: "人民币汇率保持稳定，对美元维持7.1附近",
                content: "在全球货币波动的背景下，人民币汇率保持相对稳定，对美元汇率维持在7.1附近，外汇储备规模保持稳定。",
                category: "财经",
                tags: ["人民币", "汇率", "外汇", "美元", "外汇储备"],
                source: "中国人民银行"
            },
            {
                title: "新能源汽车销量创新高，一季度破200万辆",
                content: "2026年第一季度，我国新能源汽车销量突破200万辆，市场渗透率达到45%，比亚迪、特斯拉、小米等品牌销量亮眼。",
                category: "财经",
                tags: ["新能源汽车", "销量", "比亚迪", "特斯拉", "小米汽车"],
                source: "乘联会"
            },
            {
                title: "银行理财产品收益率回升，投资者信心回暖",
                content: "随着市场利率调整，银行理财产品收益率近期有所回升，投资者信心回暖，理财产品发行规模环比增长。",
                category: "财经",
                tags: ["银行", "理财", "收益率", "投资", "利率"],
                source: "银保监会"
            },
            {
                title: "消费市场稳步复苏，五一假期旅游火爆",
                content: "五一假期国内旅游人次突破3亿，旅游收入超3000亿元，消费市场呈现强劲复苏态势，餐饮、零售等行业表现亮眼。",
                category: "财经",
                tags: ["消费", "旅游", "五一假期", "餐饮", "零售"],
                source: "文旅部"
            },
            {
                title: "数字人民币试点扩大，覆盖更多场景",
                content: "央行宣布扩大数字人民币试点范围，覆盖更多城市和应用场景，数字人民币钱包用户数突破2亿。",
                category: "财经",
                tags: ["数字人民币", "央行", "支付", "CBDC", "数字货币"],
                source: "央行"
            },
            {
                title: "上市公司分红创新高，A股迎来价值投资新时代",
                content: "2025年A股上市公司分红总额突破2万亿元，创历史新高，监管层鼓励上市公司回报投资者，价值投资理念深入人心。",
                category: "财经",
                tags: ["分红", "上市公司", "价值投资", "A股", "证监会"],
                source: "证监会"
            }
        ];

        const sportsNews = [
            {
                title: "欧冠决赛：皇马击败多特蒙德队史第15次夺冠",
                content: "北京时间5月26日凌晨，2025-2026赛季欧冠决赛在温布利球场展开争夺，皇家马德里凭借维尼修斯的梅开二度，以2-1击败多特蒙德，队史第15次夺得欧冠冠军。",
                category: "体育",
                tags: ["足球", "欧冠", "皇马", "多特蒙德", "维尼修斯"],
                source: "体育新闻"
            },
            {
                title: "梅西宣布将参加2026世界杯，第五次出征",
                content: "阿根廷球星梅西近日在接受采访时表示，他将代表阿根廷国家队参加2026年美加墨世界杯，这将是他第五次参加世界杯赛事。",
                category: "体育",
                tags: ["足球", "梅西", "世界杯", "阿根廷", "美加墨世界杯"],
                source: "足球报"
            },
            {
                title: "C罗沙特联赛35球蝉联射手王，利雅得胜利夺冠",
                content: "葡萄牙球星C罗在沙特联赛的首个赛季表现出色，帮助利雅得胜利队夺得联赛冠军，个人也以35粒进球荣膺射手王。",
                category: "体育",
                tags: ["足球", "C罗", "沙特联赛", "利雅得胜利", "射手王"],
                source: "环球体育"
            },
            {
                title: "英超联赛：曼城四连冠，阿森纳功亏一篑",
                content: "2025-2026赛季英超联赛落下帷幕，曼城队以领先第二名阿森纳5分的优势成功卫冕，实现英超四连冠的伟业。",
                category: "体育",
                tags: ["足球", "英超", "曼城", "阿森纳", "哈兰德"],
                source: "BBC体育"
            },
            {
                title: "中超联赛：上海海港三度夺冠，武磊回归状态火爆",
                content: "2025赛季中超联赛收官，上海海港队以总积分68分夺得冠军，这是他们队史第三座中超联赛冠军奖杯，武磊回归后状态火爆。",
                category: "体育",
                tags: ["足球", "中超", "上海海港", "武磊", "冠军"],
                source: "中国体育报"
            },
            {
                title: "女足亚洲杯：中国女足进四强，王霜绝杀日本",
                content: "在女足亚洲杯四分之一决赛中，中国女足凭借王霜的绝杀进球，以2-1击败日本女足，成功晋级半决赛。",
                category: "体育",
                tags: ["足球", "女足", "亚洲杯", "中国女足", "王霜"],
                source: "体育周报"
            },
            {
                title: "NBA总决赛：湖人对阵凯尔特人，詹姆斯冲击第五冠",
                content: "2026年NBA总决赛对阵出炉，洛杉矶湖人将与波士顿凯尔特人展开终极对决，詹姆斯有望再夺总冠军。",
                category: "体育",
                tags: ["篮球", "NBA", "湖人", "凯尔特人", "詹姆斯"],
                source: "ESPN"
            },
            {
                title: "欧洲杯开幕：24支球队角逐冠军，东道主德国志在夺冠",
                content: "2026年欧洲杯在德国盛大开幕，24支欧洲强队将在一个月的时间里争夺欧洲足球最高荣誉，东道主德国是夺冠热门。",
                category: "体育",
                tags: ["足球", "欧洲杯", "德国", "24强", "东道主"],
                source: "欧洲体育"
            },
            {
                title: "姆巴佩正式加盟皇马，创历史转会费纪录",
                content: "姆巴佩正式加盟皇家马德里，转会费创历史新高，这位法国新星将在伯纳乌开启新的征程，与贝林厄姆组成新的银河战舰。",
                category: "体育",
                tags: ["足球", "姆巴佩", "皇马", "转会", "贝林厄姆"],
                source: "马卡报"
            },
            {
                title: "哈兰德40球蝉联英超金靴，曼城锋线无解",
                content: "曼城前锋哈兰德以40粒进球蝉联英超金靴，帮助球队成功卫冕联赛冠军，个人表现无可挑剔，成为英超最恐怖的射手。",
                category: "体育",
                tags: ["足球", "哈兰德", "曼城", "英超", "金靴"],
                source: "天空体育"
            },
            {
                title: "利物浦欧冠小组赛全胜晋级，克洛普完美谢幕",
                content: "利物浦在欧冠小组赛中以六战全胜的战绩晋级淘汰赛，展现了强大的统治力，这也是克洛普执教利物浦的最后一个赛季。",
                category: "体育",
                tags: ["足球", "利物浦", "欧冠", "克洛普", "英超"],
                source: "镜报"
            },
            {
                title: "巴萨西甲夺冠在望，12分领先优势难撼动",
                content: "巴塞罗那在西甲联赛中领先第二名12分，距离本赛季联赛冠军仅一步之遥，莱万多夫斯基状态火热。",
                category: "体育",
                tags: ["足球", "巴萨", "西甲", "巴塞罗那", "莱万"],
                source: "阿斯报"
            },
            {
                title: "拜仁德甲八连冠，凯恩首冠圆梦",
                content: "拜仁慕尼黑成功卫冕德甲冠军，创造了德甲八连冠的辉煌纪录，新加盟的哈里-凯恩终于圆了冠军梦。",
                category: "体育",
                tags: ["足球", "拜仁", "德甲", "慕尼黑", "凯恩"],
                source: "图片报"
            },
            {
                title: "国米意甲强势夺冠，15分优势登顶",
                content: "国际米兰以领先第二名15分的巨大优势夺得意甲冠军，时隔11年再次登顶，劳塔罗状态神勇。",
                category: "体育",
                tags: ["足球", "国米", "意甲", "国际米兰", "劳塔罗"],
                source: "米兰体育报"
            },
            {
                title: "巴黎法甲三连冠，姆巴佩告别战完美收官",
                content: "巴黎圣日耳曼成功实现法甲三连冠，姆巴佩和内马尔的组合展现了强大的攻击力，这也是姆巴佩在巴黎的最后一个赛季。",
                category: "体育",
                tags: ["足球", "巴黎", "法甲", "内马尔", "姆巴佩"],
                source: "队报"
            }
        ];

        const entertainmentNews = [
            {
                title: "《流浪地球3》票房破50亿，科幻电影里程碑",
                content: "科幻大片《流浪地球3》上映两周票房突破50亿，成为春节档最大赢家，口碑票房双丰收，被称为中国科幻电影的里程碑。",
                category: "娱乐",
                tags: ["电影", "流浪地球", "票房", "科幻", "郭帆"],
                source: "猫眼电影"
            },
            {
                title: "周杰伦世界巡演启动，上海站开票秒罄",
                content: "华语乐坛天王周杰伦2026世界巡回演唱会正式启动，首站上海开票即秒罄，粉丝热情高涨，巡演将覆盖20多个城市。",
                category: "娱乐",
                tags: ["周杰伦", "演唱会", "音乐", "巡演", "上海"],
                source: "新浪娱乐"
            },
            {
                title: "国产剧出海成绩亮眼，文化输出新名片",
                content: "多部国产电视剧在海外流媒体平台热播，中国文化影响力持续提升，成为文化输出新名片，Netflix、Disney+争相抢购版权。",
                category: "娱乐",
                tags: ["电视剧", "国产剧", "文化输出", "Netflix", "流媒体"],
                source: "人民日报海外版"
            },
            {
                title: "短视频平台用户突破10亿，成信息获取主渠道",
                content: "国内短视频平台日活跃用户数突破10亿，短视频已成为人们获取信息和娱乐的主要方式之一，抖音、快手双雄争霸。",
                category: "娱乐",
                tags: ["短视频", "抖音", "快手", "用户", "信息"],
                source: "QuestMobile"
            },
            {
                title: "张艺谋新作《满江红2》开机，2026年底上映",
                content: "张艺谋导演新作《满江红2》正式开机，预计将于2026年底上映，备受影迷期待，沈腾、易烊千玺有望回归。",
                category: "娱乐",
                tags: ["张艺谋", "电影", "满江红", "沈腾", "易烊千玺"],
                source: "腾讯娱乐"
            },
            {
                title: "脱口秀大会第六季开播，新人辈出",
                content: "《脱口秀大会》第六季正式开播，本季涌现出多位优秀新人，李诞、罗永浩等嘉宾坐阵，节目热度持续高涨。",
                category: "娱乐",
                tags: ["脱口秀", "综艺", "李诞", "罗永浩", "喜剧"],
                source: "爱奇艺"
            },
            {
                title: "中国好声音回归，导师阵容豪华",
                content: "《中国好声音》2026赛季正式回归，本季导师阵容豪华，包括周杰伦、林俊杰、邓紫棋、华晨宇等实力派歌手。",
                category: "娱乐",
                tags: ["中国好声音", "综艺", "周杰伦", "林俊杰", "邓紫棋"],
                source: "浙江卫视"
            },
            {
                title: "《狂飙2》开拍，原班人马回归",
                content: "爆款剧《狂飙》续集正式开拍，张译、张颂文等原班人马回归，故事背景设定在2035年，讲述新一代警察与黑恶势力的斗争。",
                category: "娱乐",
                tags: ["狂飙", "电视剧", "张译", "张颂文", "续集"],
                source: "爱奇艺"
            },
            {
                title: "刘德华出道40周年演唱会，香港红磡连开10场",
                content: "刘德华迎来出道40周年，在香港红磡体育馆连开10场演唱会，场场爆满，经典歌曲引发全场大合唱。",
                category: "娱乐",
                tags: ["刘德华", "演唱会", "香港", "红磡", "40周年"],
                source: "搜狐娱乐"
            },
            {
                title: "《三体》电视剧第二季官宣，刘慈欣亲自监制",
                content: "《三体》电视剧第二季正式官宣，预计2027年播出，刘慈欣亲自担任监制，将展现三体人入侵地球后的故事线。",
                category: "娱乐",
                tags: ["三体", "电视剧", "刘慈欣", "科幻", "第二季"],
                source: "腾讯视频"
            }
        ];

        const lifeNews = [
            {
                title: "健康饮食趋势兴起，轻食市场快速增长",
                content: "越来越多的年轻人开始关注健康饮食，轻食、植物基食品市场快速增长，健康生活方式成为新时尚，沙拉、燕麦碗成为新宠。",
                category: "生活",
                tags: ["健康", "饮食", "轻食", "植物基", "沙拉"],
                source: "健康时报"
            },
            {
                title: "五一假期旅游火爆，国内游人次突破3亿",
                content: "五一假期国内旅游人次突破3亿，出入境游持续升温，旅游业迎来全面复苏的黄金期，热门城市酒店一房难求。",
                category: "生活",
                tags: ["旅游", "五一假期", "出行", "酒店", "文旅部"],
                source: "文旅部"
            },
            {
                title: "职场充电成新趋势，在线教育市场需求旺盛",
                content: "受市场环境影响，越来越多的职场人选择充电学习，在线教育、职业培训市场需求旺盛，考证热持续升温。",
                category: "生活",
                tags: ["职场", "教育", "培训", "在线教育", "考证"],
                source: "前程无忧"
            },
            {
                title: "智能家居普及加速，生态逐渐成熟",
                content: "智能音箱、智能门锁等设备普及率持续提升，智能家居生态逐渐成熟，让生活更加便捷，小米、华为、苹果三强争霸。",
                category: "生活",
                tags: ["智能家居", "物联网", "智能设备", "小米", "华为"],
                source: "IDC"
            },
            {
                title: "环保意识增强，绿色消费成主流",
                content: "消费者环保意识不断增强，绿色产品、可降解包装受到青睐，可持续发展理念深入人心，新能源汽车销量持续攀升。",
                category: "生活",
                tags: ["环保", "绿色消费", "可持续", "新能源", "可降解"],
                source: "中国环境报"
            },
            {
                title: "露营经济持续火热，成为周末休闲新方式",
                content: "露营经济持续火热，成为都市人周末休闲的新方式，精致露营、户外装备市场快速增长，各地露营地供不应求。",
                category: "生活",
                tags: ["露营", "休闲", "户外", "装备", "周末"],
                source: "马蜂窝"
            },
            {
                title: "咖啡文化深入人心，精品咖啡店遍地开花",
                content: "咖啡文化在中国深入人心，精品咖啡店遍地开花，瑞幸、星巴克竞争激烈，国产咖啡品牌崛起，人均咖啡消费量持续增长。",
                category: "生活",
                tags: ["咖啡", "瑞幸", "星巴克", "精品咖啡", "消费"],
                source: "咖啡金融网"
            },
            {
                title: "宠物经济爆发式增长，铲屎官舍得花钱",
                content: "中国宠物经济爆发式增长，市场规模突破3000亿元，宠物食品、医疗、美容等细分领域快速发展，铲屎官们越来越舍得为宠物花钱。",
                category: "生活",
                tags: ["宠物", "宠物经济", "铲屎官", "宠物食品", "医疗"],
                source: "宠物行业白皮书"
            },
            {
                title: "健身热潮持续，全民健身成新风尚",
                content: "健身热潮持续，全民健身成新风尚，健身房会员数持续增长，线上健身、家庭健身等新形式兴起，刘畊宏健身操持续火热。",
                category: "生活",
                tags: ["健身", "运动", "健康", "刘畊宏", "全民健身"],
                source: "国家体育总局"
            },
            {
                title: "线上买菜成习惯，社区团购洗牌完毕",
                content: "线上买菜已成为城市居民的生活习惯，社区团购行业洗牌完毕，美团优选、多多买菜等头部平台主导市场，配送效率持续提升。",
                category: "生活",
                tags: ["买菜", "社区团购", "美团", "拼多多", "配送"],
                source: "易观分析"
            }
        ];

        const allCategories = [techNews, financeNews, sportsNews, entertainmentNews, lifeNews];
        
        for (const categoryNews of allCategories) {
            for (const item of categoryNews) {
                news.push({
                    id: this.newsIdCounter++,
                    ...item,
                    url: `https://news.example.com/article/${this.newsIdCounter - 1}`
                });
            }
        }

        return news;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setToCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clearCache() {
        this.cache.clear();
    }
}
