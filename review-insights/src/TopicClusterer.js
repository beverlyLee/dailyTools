class TopicClusterer {
    constructor(options = {}) {
        this.similarityThreshold = options.similarityThreshold || 0.15;
        this.minSemanticSimilarity = options.minSemanticSimilarity || 0.25;
        this.forceMergeThreshold = options.forceMergeThreshold || 0.3;
        this.maxIterations = options.maxIterations || 100;
        
        this.painPointLexicon = this._buildPainPointLexicon();
        this.synonymMap = this._buildSynonymMap();
        this.validKeywords = this._buildValidKeywordSet();
        this.positiveLexicon = this._buildPositiveLexicon();
        this.negativeLexicon = this._buildNegativeLexicon();
        this.negationWords = this._buildNegationWords();
        this.categoryMergeRules = this._buildCategoryMergeRules();
        this.semanticFeatures = this._buildSemanticFeatures();
        this.contentWords = this._buildContentWords();
        this.functionWords = this._buildFunctionWords();
    }

    _buildPainPointLexicon() {
        return {
            crash: {
                keywords: ['闪退', '崩溃', '退出', '关闭', '终止', '卡住', '无响应', '停止运行', '黑屏', '白屏'],
                variants: ['疯狂闪退', '频繁闪退', '总是闪退', '打开就退', '启动就退', '自动退出', '打不开', '进不去'],
                sentiment: 'negative',
                weight: 5.0,
                category: '性能问题'
            },
            freeze: {
                keywords: ['卡', '卡顿', '慢', '延迟', '等待', '加载', '转圈', '响应', '迟钝', '速度'],
                variants: ['太卡了', '卡爆了', '卡得要死', '卡死了', '太卡', '很慢', '太慢', '加载慢', '不流畅', '响应慢'],
                sentiment: 'negative',
                weight: 4.5,
                category: '性能问题'
            },
            ad: {
                keywords: ['广告', '推广', '弹窗', '开屏', '插播'],
                variants: ['广告太多', '满屏广告', '广告软件', '广告多', '弹窗广告', '开屏广告', '强制看广告'],
                sentiment: 'negative',
                weight: 4.0,
                category: '内容问题'
            },
            customerService: {
                keywords: ['客服', '售后', '反馈', '工单', '人工', '机器人', '回复', '态度'],
                variants: ['客服差', '客服烂', '没人管', '不理人', '联系不上', '态度恶劣', '客服好', '回复及时', '态度好'],
                sentiment: 'context_dependent',
                weight: 3.5,
                category: '服务问题'
            },
            ui: {
                keywords: ['UI', '界面', '设计', '好看', '简洁', '清爽', '漂亮', '现代化', '深色模式', '配色', '布局'],
                variants: ['新UI', '新界面', 'UI好看', '界面好看', '设计不错', 'UI设计', '界面丑', '不好用', '设计不合理'],
                sentiment: 'context_dependent',
                weight: 3.0,
                category: '体验问题'
            },
            bug: {
                keywords: ['bug', 'Bug', 'BUG', '修复', '适配', '错误', '异常'],
                variants: ['有bug', 'bug多', '没修复', '适配问题', 'bug已修复', '修复了', '解决了'],
                sentiment: 'context_dependent',
                weight: 4.0,
                category: '技术问题'
            },
            update: {
                keywords: ['更新', '升级', '版本', '新版本', '老版本'],
                variants: ['更新后', '升级后', '越更新越差', '新版本', '老版本', '更新不错', '升级成功'],
                sentiment: 'context_dependent',
                weight: 2.0,
                category: '版本问题'
            },
            payment: {
                keywords: ['支付', '付款', '退款', '订单', '金额', '扣费'],
                variants: ['支付失败', '扣款成功', '退款失败', '扣错钱', '多扣款', '支付成功'],
                sentiment: 'context_dependent',
                weight: 5.0,
                category: '支付问题'
            },
            delivery: {
                keywords: ['配送', '外卖', '快递', '骑手', '准时', '超时'],
                variants: ['配送慢', '超时', '送错了', '配送员', '骑手态度', '准时送达'],
                sentiment: 'context_dependent',
                weight: 3.5,
                category: '配送问题'
            },
            food: {
                keywords: ['味道', '菜品', '分量', '包装', '餐具', '食材'],
                variants: ['味道好', '味道差', '分量少', '分量足', '包装好', '不新鲜'],
                sentiment: 'context_dependent',
                weight: 3.0,
                category: '商品问题'
            }
        };
    }

    _buildSynonymMap() {
        return {
            '闪退': ['崩溃', '退出', '关闭', '终止', '卡住', '无响应', '黑屏', '白屏'],
            '卡顿': ['卡', '慢', '延迟', '迟钝', '卡死', '卡爆', '不流畅'],
            '广告': ['推广', '弹窗', '插播'],
            '客服': ['售后', '人工客服', '在线客服', '反馈'],
            'UI': ['界面', '设计', '布局', '配色'],
            '加载慢': ['加载', '等待', '转圈', '响应慢'],
            'bug': ['错误', '异常', '缺陷'],
            '更新': ['升级', '版本'],
            '支付': ['付款', '扣费', '退款'],
            '配送': ['外卖', '快递', '送货']
        };
    }

    _buildValidKeywordSet() {
        const valid = new Set();
        
        for (const category of Object.values(this.painPointLexicon)) {
            for (const kw of category.keywords) {
                valid.add(kw);
            }
            for (const v of category.variants) {
                valid.add(v);
            }
        }
        
        return valid;
    }

    _buildPositiveLexicon() {
        return {
            single: new Set([
                '好', '棒', '赞', '优秀', '不错', '完美', '满意', '舒服',
                '流畅', '好用', '方便', '简洁', '漂亮', '爽', '推荐', '五星',
                '好评', '实用', '强大', '给力', '超赞', '点赞', '贴心', '专业',
                '喜欢', '爱', '欣赏', '认可', '肯定', '支持', '感谢', '开心',
                '惊喜', '惊艳', '出色', '卓越', '一流', '顶级', '优质', '良心',
                '值', '值得', '划算', '超值', '用心', '细致', '耐心', '及时',
                '快速', '迅速', '高效', '稳定', '顺畅', '灵活', '智能', '人性化',
                '准时', '新鲜', '足量', '美味'
            ]),
            multi: new Set([
                '很好', '非常好', '特别好', '相当好', '太好了', '超级好',
                '很棒', '非常棒', '特别棒', '太棒了',
                '很赞', '非常赞', '特别赞',
                '很不错', '真不错', '相当不错',
                '很满意', '非常满意', '特别满意', '超满意',
                '很好用', '非常好用', '特别好用', '真好用',
                '很方便', '非常方便', '特别方便',
                '很舒服', '非常舒服', '特别舒服',
                '很流畅', '非常流畅', '特别流畅',
                '很喜欢', '非常喜欢', '特别喜欢', '超喜欢',
                '强烈推荐', '真心推荐', '推荐大家',
                '点赞', '点个赞', '必须好评', '给好评',
                '值得推荐', '值得购买', '值得使用',
                '解决了', '已解决', '已修复', '修复了',
                '客服好', '服务好', '态度好', '回复快', '回复及时',
                '设计不错', '界面好看', 'UI好看', '体验好', '体验不错',
                '很贴心', '很专业', '很用心', '很细致', '很耐心',
                '味道好', '分量足', '包装好', '准时送达'
            ])
        };
    }

    _buildNegativeLexicon() {
        return {
            single: new Set([
                '差', '烂', '垃圾', '坏', '讨厌', '烦', '崩溃', '闪退', '卡', '慢',
                '糟', '坑', '骗', '失望', '生气', '愤怒', '吐槽', '卸载',
                '恶劣', '后悔', '可惜', '遗憾', '恶心', '渣', '屎',
                '坑', '坑人', '骗人', '忽悠', '不值', '亏', '浪费'
            ]),
            multi: new Set([
                '不好', '很差', '太差', '很不好', '非常差', '特别差',
                '不好用', '很难用', '太不好用', '一点不好用',
                '很烂', '非常烂', '特别烂', '太烂了',
                '垃圾', '太垃圾', '真垃圾', '垃圾软件',
                '很失望', '非常失望', '特别失望', '太失望',
                '很生气', '非常生气', '特别生气', '气死我了',
                '很卡', '非常卡', '特别卡', '卡死了', '卡爆了', '卡得要死',
                '很慢', '非常慢', '特别慢', '太慢了',
                '广告太多', '广告多', '太多广告',
                '客服差', '态度差', '态度恶劣', '不理人', '没人管',
                '联系不上', '找不到人', '没人回复',
                '越更新越差', '越升级越烂',
                '后悔买了', '后悔用了', '后悔下载',
                '浪费时间', '浪费钱', '浪费精力',
                '恶心人', '太恶心', '真恶心',
                '想卸载', '准备卸载', '已卸载',
                '不好看', '很丑', '太丑了', '设计不合理',
                '体验差', '体验很差', '体验不好',
                '没解决', '没修复', '没处理', '没人管',
                '味道差', '分量少', '不新鲜', '超时', '送错了', '退款失败', '支付失败'
            ]),
            strong: new Set([
                '垃圾', '垃圾软件', '垃圾应用', '太垃圾', '真垃圾',
                '烂', '很烂', '太烂', '真烂',
                '差', '很差', '太差', '非常差',
                '恶心', '太恶心', '真恶心',
                '坑', '坑人', '坑爹',
                '骗', '骗人', '骗子'
            ])
        };
    }

    _buildNegationWords() {
        return new Set([
            '不', '没', '没有', '别', '勿', '未', '非', '无',
            '不好', '不是', '不要', '不用', '不能', '不会', '不该',
            '没有', '没什么', '没关系',
            '不推荐', '不喜欢', '不满意', '不好用', '不怎么样'
        ]);
    }

    _buildCategoryMergeRules() {
        return {
            crash: ['crash', 'freeze', 'bug'],
            freeze: ['freeze', 'crash', 'bug'],
            ad: ['ad'],
            customerService: ['customerService'],
            ui: ['ui'],
            bug: ['bug', 'crash', 'update'],
            update: ['update', 'bug', 'crash'],
            payment: ['payment'],
            delivery: ['delivery'],
            food: ['food']
        };
    }

    _buildSemanticFeatures() {
        return {
            performance: ['闪退', '崩溃', '卡', '卡顿', '慢', '延迟', '加载', '响应', '速度', '流畅', '无响应', '黑屏', '白屏'],
            content: ['广告', '弹窗', '推送', '推荐', '内容', '视频', '图片'],
            service: ['客服', '售后', '反馈', '投诉', '态度', '回复', '人工'],
            interface: ['UI', '界面', '设计', '布局', '配色', '操作', '按钮'],
            payment: ['支付', '付款', '退款', '订单', '金额', '扣费', '会员', '付费'],
            delivery: ['配送', '外卖', '快递', '骑手', '准时', '超时', '送达'],
            food: ['味道', '菜品', '分量', '包装', '新鲜', '食材'],
            stability: ['bug', '错误', '异常', '修复', '适配', '版本', '更新']
        };
    }

    _buildContentWords() {
        return new Set([
            '闪退', '崩溃', '退出', '关闭', '终止', '卡住', '无响应', '停止运行', '黑屏', '白屏',
            '卡', '卡顿', '慢', '延迟', '等待', '加载', '转圈', '响应', '迟钝', '速度',
            '广告', '推广', '弹窗', '开屏', '插播',
            '客服', '售后', '反馈', '工单', '人工', '机器人', '回复', '态度',
            'UI', '界面', '设计', '好看', '简洁', '清爽', '漂亮', '现代化', '深色模式', '配色', '布局',
            'bug', '修复', '适配', '版本', '错误', '异常',
            '更新', '升级', '新版本', '老版本',
            '用户', '体验', '功能', '使用', '推荐', '好评', '差评', '垃圾',
            '失望', '满意', '舒服', '流畅', '方便', '专业', '简洁', '漂亮',
            '好用', '不好用', '喜欢', '讨厌', '赞', '棒', '差', '烂',
            '速度', '效率', '稳定', '不稳定', '卸载',
            '登录', '启动', '打开', '操作', '响应', '解决',
            '后悔', '幸好', '可惜', '遗憾', '开心', '难过', '愤怒',
            '良心', '坑', '骗', '值', '不值', '不推荐',
            '订单', '支付', '付款', '退款', '售后', '配送', '外卖', '快递',
            '商家', '商品', '质量', '价格', '优惠', '活动',
            '搜索', '推荐', '算法', '内容', '视频', '图片', '音频',
            '评论', '评价', '点赞', '收藏', '分享', '转发',
            '消息', '通知', '推送', '提醒',
            '账号', '密码', '验证码', '安全', '隐私',
            '网络', '连接', '流量', 'WiFi', '信号',
            '手机', '苹果', '安卓', '系统', '升级', '更新',
            '美团', '饿了么', '淘宝', '京东', '拼多多', '抖音', '快手', '微信',
            '外卖', '餐饮', '美食', '酒店', '旅游', '机票', '火车票',
            '打车', '出行', '共享单车', '地铁', '公交',
            '电影', '演出', '门票', '团购', '优惠券',
            '评价', '晒单', '晒图', '返现', '红包',
            '骑手', '配送员', '商家', '餐厅',
            '菜品', '味道', '分量', '包装', '餐具',
            '准时', '超时', '取消', '退款', '赔付',
            '定位', '导航', '地址', '距离', '范围',
            '会员', 'VIP', '付费', '订阅', '续费',
            '活动', '优惠', '折扣', '满减', '秒杀',
            '金额', '扣款', '成功', '失败'
        ]);
    }

    _buildFunctionWords() {
        return new Set([
            '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
            '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看',
            '自己', '这', '那', '还', '跟', '个', '我们', '能', '吗', '呢', '啊', '吧', '呀',
            '哦', '嘛', '给', '让', '被', '把', '哪', '什么', '怎么', '为什么',
            '多', '少', '大', '小', '太', '真', '最', '更', '比较', '挺', '蛮', '非常',
            '特别', '十分', '格外', '尤其', 'app', '软件', '应用', '这个', '那个',
            '它', '他', '她', '们', '啦', '哦', '呢', '吧', '啊', '吗', '呀',
            '可以', '能够', '应该', '需要', '可能', '已经', '正在', '以后',
            '这个', '那个', '什么', '怎么', '为什么', '还有', '而且', '但是',
            '因为', '所以', '如果', '虽然', '不过', '其实', '真的', '还是',
            '太', '真', '很', '非常', '特别', '十分', '格外', '尤其', '比较',
            '从', '向', '往', '朝', '对', '对于', '关于', '被', '把', '给',
            '把', '被', '给', '让', '使', '叫', '请',
            '得', '地', '所', '之', '以', '而', '与', '或',
            '及', '等', '等等', '之类', '等等',
            '但是', '然而', '不过', '只是', '就是', '才', '就', '还',
            '因为', '所以', '因此', '于是', '如果', '只要', '除非',
            '虽然', '但是', '即使', '也', '无论', '都',
            '首先', '其次', '然后', '最后', '总之',
            '其实', '实际上', '事实上', '当然', '显然',
            '嗯', '啊', '哦', '唉', '哇', '哈', '嘿', '哼', '呸', '呀'
        ]);
    }

    extractPainPoints(sentence) {
        const text = typeof sentence === 'object' ? sentence.text : sentence;
        const found = [];
        
        for (const [category, info] of Object.entries(this.painPointLexicon)) {
            for (const keyword of info.keywords) {
                if (text.includes(keyword)) {
                    found.push({
                        category,
                        keyword,
                        weight: info.weight,
                        baseSentiment: info.sentiment,
                        semanticCategory: info.category
                    });
                }
            }
            for (const variant of info.variants) {
                if (text.includes(variant)) {
                    found.push({
                        category,
                        keyword: variant,
                        weight: info.weight * 1.2,
                        baseSentiment: info.sentiment,
                        semanticCategory: info.category
                    });
                }
            }
        }
        
        return found.sort((a, b) => b.weight - a.weight);
    }

    getDominantPainPoint(sentence) {
        const painPoints = this.extractPainPoints(sentence);
        if (painPoints.length === 0) return null;
        return painPoints[0];
    }

    getSemanticCategory(sentence) {
        const text = typeof sentence === 'object' ? sentence.text : sentence;
        const categoryScores = {};
        
        for (const [category, keywords] of Object.entries(this.semanticFeatures)) {
            let score = 0;
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    score++;
                }
            }
            if (score > 0) {
                categoryScores[category] = score;
            }
        }
        
        const categories = Object.entries(categoryScores)
            .sort((a, b) => b[1] - a[1])
            .map(([cat]) => cat);
        
        return categories.length > 0 ? categories : ['general'];
    }

    analyzeSentiment(sentence) {
        const text = typeof sentence === 'object' ? sentence.text : sentence;
        
        let positiveScore = 0;
        let negativeScore = 0;
        const matchedPositive = [];
        const matchedNegative = [];
        
        for (const phrase of this.negativeLexicon.multi) {
            if (text.includes(phrase)) {
                const score = this.negativeLexicon.strong.has(phrase) ? 3.0 : 2.0;
                negativeScore += score;
                matchedNegative.push(phrase);
            }
        }
        
        for (const phrase of this.positiveLexicon.multi) {
            if (text.includes(phrase)) {
                positiveScore += 2.0;
                matchedPositive.push(phrase);
            }
        }
        
        const chars = text.split('');
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            
            if (this.negativeLexicon.single.has(char)) {
                let isNegated = false;
                for (let j = Math.max(0, i - 3); j < i; j++) {
                    const context = chars.slice(Math.max(0, j - 1), j + 2).join('');
                    if (this.negationWords.has(context) || this.negationWords.has(chars[j])) {
                        isNegated = true;
                        break;
                    }
                }
                
                if (!isNegated) {
                    if (this.negativeLexicon.strong.has(char)) {
                        negativeScore += 2.0;
                    } else {
                        negativeScore += 1.0;
                    }
                    matchedNegative.push(char);
                } else {
                    positiveScore += 0.5;
                }
            }
            
            if (this.positiveLexicon.single.has(char)) {
                let isNegated = false;
                for (let j = Math.max(0, i - 3); j < i; j++) {
                    const context = chars.slice(Math.max(0, j - 1), j + 2).join('');
                    if (this.negationWords.has(context) || this.negationWords.has(chars[j])) {
                        isNegated = true;
                        break;
                    }
                }
                
                if (!isNegated) {
                    positiveScore += 1.0;
                    matchedPositive.push(char);
                } else {
                    negativeScore += 0.5;
                }
            }
        }
        
        const painPoints = this.extractPainPoints(text);
        for (const pp of painPoints) {
            if (pp.baseSentiment === 'negative') {
                negativeScore += pp.weight * 0.3;
            } else if (pp.baseSentiment === 'positive') {
                positiveScore += pp.weight * 0.3;
            }
        }
        
        if (matchedPositive.length === 0 && matchedNegative.length === 0) {
            if (painPoints.length > 0) {
                const firstPP = painPoints[0];
                if (firstPP.baseSentiment === 'negative') {
                    return 'negative';
                } else if (firstPP.baseSentiment === 'positive') {
                    return 'positive';
                }
            }
            return 'neutral';
        }
        
        const threshold = 1.5;
        
        if (negativeScore > positiveScore * threshold) {
            return 'negative';
        } else if (positiveScore > negativeScore * threshold) {
            return 'positive';
        }
        
        if (negativeScore > positiveScore + 0.5) {
            return 'negative';
        } else if (positiveScore > negativeScore + 0.5) {
            return 'positive';
        }
        
        if (matchedNegative.some(m => this.negativeLexicon.strong.has(m))) {
            return 'negative';
        }
        
        return 'neutral';
    }

    computeSemanticSimilarity(sentence1, sentence2) {
        const text1 = typeof sentence1 === 'object' ? sentence1.text : sentence1;
        const text2 = typeof sentence2 === 'object' ? sentence2.text : sentence2;
        
        const cats1 = this.getSemanticCategory(text1);
        const cats2 = this.getSemanticCategory(text2);
        
        let semanticScore = 0;
        for (const cat1 of cats1) {
            for (const cat2 of cats2) {
                if (cat1 === cat2) {
                    semanticScore += 1.0;
                } else if (this._areSemanticallyRelated(cat1, cat2)) {
                    semanticScore += 0.5;
                }
            }
        }
        
        const maxPossible = Math.max(cats1.length, cats2.length);
        return maxPossible > 0 ? semanticScore / maxPossible : 0;
    }

    _areSemanticallyRelated(cat1, cat2) {
        const relatedGroups = [
            ['performance', 'stability'],
            ['payment', 'delivery'],
            ['content', 'interface'],
            ['food', 'delivery']
        ];
        
        for (const group of relatedGroups) {
            if (group.includes(cat1) && group.includes(cat2)) {
                return true;
            }
        }
        
        return false;
    }

    computeEnhancedSimilarity(sentence1, sentence2) {
        const text1 = typeof sentence1 === 'object' ? sentence1.text : sentence1;
        const text2 = typeof sentence2 === 'object' ? sentence2.text : sentence2;
        
        const pp1 = sentence1.painPoints || this.extractPainPoints(sentence1);
        const pp2 = sentence2.painPoints || this.extractPainPoints(sentence2);
        
        const sent1 = sentence1.sentiment || this.analyzeSentiment(sentence1);
        const sent2 = sentence2.sentiment || this.analyzeSentiment(sentence2);
        
        if (sent1 !== sent2 && sent1 !== 'neutral' && sent2 !== 'neutral') {
            return 0;
        }
        
        const semanticSim = this.computeSemanticSimilarity(text1, text2);
        
        if (semanticSim === 0) {
            return 0;
        }
        
        const semanticCats1 = sentence1.semanticCategories || this.getSemanticCategory(text1);
        const semanticCats2 = sentence2.semanticCategories || this.getSemanticCategory(text2);
        
        if (semanticCats1.length > 0 && semanticCats2.length > 0 && 
            semanticCats1[0] !== 'general' && semanticCats2[0] !== 'general') {
            const hasExactMatch = semanticCats1.some(c1 => semanticCats2.some(c2 => c1 === c2));
            if (!hasExactMatch) {
                const hasRelated = semanticCats1.some(c1 => 
                    semanticCats2.some(c2 => this._areSemanticallyRelated(c1, c2))
                );
                if (!hasRelated) {
                    return 0;
                }
            }
        }
        
        if (pp1.length > 0 && pp2.length > 0) {
            const cats1 = new Set(pp1.map(p => p.category));
            const cats2 = new Set(pp2.map(p => p.category));
            
            let commonWeight = 0;
            let totalWeight = 0;
            
            for (const p of pp1) {
                totalWeight += p.weight;
                for (const p2 of pp2) {
                    if (p.category === p2.category) {
                        if (sent1 === sent2 || sent1 === 'neutral' || sent2 === 'neutral') {
                            commonWeight += Math.min(p.weight, p2.weight);
                        }
                    }
                }
            }
            
            if (commonWeight > 0) {
                const painPointSim = commonWeight / Math.max(totalWeight, 1);
                const baseSim = this.computeContentSimilarity(text1, text2);
                const combinedSim = painPointSim * 0.5 + baseSim * 0.25 + semanticSim * 0.25;
                
                if (combinedSim < this.minSemanticSimilarity) {
                    return 0;
                }
                
                return Math.min(1.0, combinedSim);
            }
        }
        
        const contentSim = this.computeContentSimilarity(text1, text2);
        const combinedSim = contentSim * 0.4 + semanticSim * 0.6;
        
        if (combinedSim < this.minSemanticSimilarity) {
            return 0;
        }
        
        return combinedSim;
    }

    computeContentSimilarity(text1, text2) {
        const words1 = this.getMeaningfulTokens(text1);
        const words2 = this.getMeaningfulTokens(text2);
        
        if (words1.length === 0 || words2.length === 0) {
            return 0;
        }
        
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        let commonWeight = 0;
        let totalWeight = 0;
        
        for (const word of set1) {
            const weight = this._getWordWeight(word);
            totalWeight += weight;
            
            for (const word2 of set2) {
                if (word === word2 || word.includes(word2) || word2.includes(word)) {
                    commonWeight += weight;
                    break;
                }
                
                for (const [canonical, synonyms] of Object.entries(this.synonymMap)) {
                    if ((word === canonical || synonyms.includes(word)) &&
                        (word2 === canonical || synonyms.includes(word2))) {
                        commonWeight += weight;
                        break;
                    }
                }
            }
        }
        
        if (commonWeight === 0) {
            return 0;
        }
        
        return commonWeight / Math.max(totalWeight, 1);
    }

    _getWordWeight(word) {
        if (this.validKeywords.has(word)) {
            return 3.0;
        }
        
        for (const [canonical, synonyms] of Object.entries(this.synonymMap)) {
            if (word === canonical || synonyms.includes(word)) {
                return 3.0;
            }
        }
        
        if (this.positiveLexicon.single.has(word) || this.positiveLexicon.multi.has(word)) {
            return 2.0;
        }
        
        if (this.negativeLexicon.single.has(word) || this.negativeLexicon.multi.has(word)) {
            return 2.0;
        }
        
        if (this.contentWords.has(word)) {
            return 2.0;
        }
        
        if (word.length >= 2 && /[\u4e00-\u9fa5]/.test(word)) {
            return 1.0;
        }
        
        return 0.5;
    }

    getMeaningfulTokens(text) {
        const tokens = [];
        
        for (const category of Object.values(this.painPointLexicon)) {
            for (const kw of category.keywords) {
                if (text.includes(kw)) {
                    tokens.push(kw);
                }
            }
            for (const variant of category.variants) {
                if (text.includes(variant)) {
                    tokens.push(variant);
                }
            }
        }
        
        for (const phrase of this.positiveLexicon.multi) {
            if (text.includes(phrase)) {
                tokens.push(phrase);
            }
        }
        
        for (const phrase of this.negativeLexicon.multi) {
            if (text.includes(phrase)) {
                tokens.push(phrase);
            }
        }
        
        for (const word of this.contentWords) {
            if (text.includes(word) && word.length >= 2) {
                tokens.push(word);
            }
        }
        
        return [...new Set(tokens)];
    }

    cluster(sentences, numClusters = 5) {
        if (!Array.isArray(sentences)) {
            console.warn('TopicClusterer.cluster: 输入 sentences 不是数组，返回空数组');
            return [];
        }
        
        if (sentences.length === 0) {
            return [];
        }
        
        if (sentences.length <= numClusters) {
            return sentences.map((s, i) => ({
                id: i,
                sentences: [s],
                center: s,
                size: 1
            }));
        }
        
        return this._hybridCluster(sentences, numClusters);
    }

    _hybridCluster(sentences, numClusters) {
        const n = sentences.length;
        const sentencesWithMeta = sentences.map((s, idx) => ({
            ...s,
            idx,
            painPoints: this.extractPainPoints(s),
            sentiment: this.analyzeSentiment(s),
            semanticCategories: this.getSemanticCategory(s)
        }));
        
        const clustersByCategory = this._clusterByCategoryWithSentiment(sentencesWithMeta);
        const categoryClusters = [];
        
        for (const [key, group] of Object.entries(clustersByCategory)) {
            if (group.length >= 2) {
                const center = this.findCentroid(group);
                categoryClusters.push({
                    id: categoryClusters.length,
                    sentences: group,
                    center,
                    size: group.length,
                    category: key.split('_')[0],
                    sentiment: key.split('_')[1]
                });
            }
        }
        
        const unassigned = sentencesWithMeta.filter(s => {
            return !categoryClusters.some(c => c.sentences.some(cs => cs.idx === s.idx));
        });
        
        categoryClusters.sort((a, b) => b.size - a.size);
        
        let remainingClusters = Math.max(1, numClusters - categoryClusters.length);
        
        if (unassigned.length > 0 && remainingClusters > 0) {
            const kmeansClusters = this._kMeansCluster(unassigned, Math.min(remainingClusters, unassigned.length));
            for (const c of kmeansClusters) {
                c.id = categoryClusters.length;
                categoryClusters.push(c);
            }
        }
        
        const finalClusters = this._aggressiveMergeClusters(categoryClusters);
        
        finalClusters.sort((a, b) => b.size - a.size);
        finalClusters.forEach((c, i) => { c.id = i; });
        
        return finalClusters.map(c => ({
            ...c,
            sentences: c.sentences.map(s => ({
                text: s.text,
                sourceReview: s.sourceReview
            }))
        }));
    }

    _clusterByCategoryWithSentiment(sentences) {
        const clusters = {};
        
        for (const sentence of sentences) {
            const painPoints = sentence.painPoints;
            
            if (painPoints.length > 0) {
                const dominantPP = painPoints[0];
                const sentiment = sentence.sentiment;
                
                let effectiveSentiment = sentiment;
                if (dominantPP.baseSentiment === 'negative' && sentiment === 'neutral') {
                    effectiveSentiment = 'negative';
                }
                
                const key = `${dominantPP.category}_${effectiveSentiment}`;
                if (!clusters[key]) {
                    clusters[key] = [];
                }
                clusters[key].push(sentence);
            }
        }
        
        return clusters;
    }

    _kMeansCluster(sentences, numClusters) {
        const n = sentences.length;
        
        let centroids = [];
        const usedIndices = new Set();
        
        const sortedByImportance = [...sentences].sort((a, b) => {
            const scoreA = (a.painPoints?.[0]?.weight || 0) + 
                          (a.sentiment === 'negative' ? 2 : 0) +
                          (a.painPoints?.length || 0);
            const scoreB = (b.painPoints?.[0]?.weight || 0) + 
                          (b.sentiment === 'negative' ? 2 : 0) +
                          (b.painPoints?.length || 0);
            return scoreB - scoreA;
        });
        
        centroids.push(sortedByImportance[0]);
        usedIndices.add(sortedByImportance[0].idx);
        
        for (let k = 1; k < numClusters; k++) {
            let maxMinDist = -1;
            let selected = null;
            
            for (const sentence of sentences) {
                if (usedIndices.has(sentence.idx)) continue;
                
                let minDist = Infinity;
                for (const centroid of centroids) {
                    const sim = this.computeEnhancedSimilarity(sentence, centroid);
                    const dist = 1 - sim;
                    if (dist < minDist) minDist = dist;
                }
                
                if (minDist > maxMinDist) {
                    maxMinDist = minDist;
                    selected = sentence;
                }
            }
            
            if (selected) {
                centroids.push(selected);
                usedIndices.add(selected.idx);
            }
        }
        
        let clusters = new Array(numClusters).fill(null).map(() => []);
        let prevAssignments = new Array(n).fill(-1);
        
        for (let iteration = 0; iteration < this.maxIterations; iteration++) {
            const assignments = new Map();
            
            for (const sentence of sentences) {
                let bestCluster = 0;
                let maxSim = -1;
                
                for (let k = 0; k < centroids.length; k++) {
                    const sim = this.computeEnhancedSimilarity(sentence, centroids[k]);
                    if (sim > maxSim) {
                        maxSim = sim;
                        bestCluster = k;
                    }
                }
                
                if (maxSim >= this.minSemanticSimilarity * 0.5) {
                    assignments.set(sentence.idx, bestCluster);
                } else {
                    let nearestCluster = 0;
                    let nearestSim = 0;
                    for (let k = 0; k < centroids.length; k++) {
                        const sim = this.computeContentSimilarity(
                            sentence.text, centroids[k].text
                        );
                        if (sim > nearestSim) {
                            nearestSim = sim;
                            nearestCluster = k;
                        }
                    }
                    assignments.set(sentence.idx, nearestCluster);
                }
            }
            
            clusters = new Array(numClusters).fill(null).map(() => []);
            for (const sentence of sentences) {
                const clusterIdx = assignments.get(sentence.idx);
                clusters[clusterIdx].push(sentence);
            }
            
            let changed = false;
            for (let i = 0; i < sentences.length; i++) {
                const assignment = assignments.get(sentences[i].idx);
                if (assignment !== prevAssignments[i]) {
                    changed = true;
                    break;
                }
            }
            
            if (!changed) break;
            
            for (let k = 0; k < numClusters; k++) {
                if (clusters[k].length > 0) {
                    centroids[k] = this.findCentroid(clusters[k]);
                }
            }
            
            prevAssignments = sentences.map(s => assignments.get(s.idx));
        }
        
        const result = [];
        for (let k = 0; k < numClusters; k++) {
            if (clusters[k].length > 0) {
                result.push({
                    id: k,
                    sentences: clusters[k],
                    center: centroids[k],
                    size: clusters[k].length
                });
            }
        }
        
        return result.sort((a, b) => b.size - a.size);
    }

    _aggressiveMergeClusters(clusters) {
        if (clusters.length <= 1) return clusters;
        
        let merged = [...clusters];
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 10;
        
        while (hasChanges && merged.length > 1 && iterations < maxIterations) {
            hasChanges = false;
            iterations++;
            
            for (let i = 0; i < merged.length; i++) {
                for (let j = i + 1; j < merged.length; j++) {
                    const shouldMerge = this._shouldMergeClusters(merged[i], merged[j]);
                    
                    if (shouldMerge) {
                        merged[i] = {
                            ...merged[i],
                            sentences: [...merged[i].sentences, ...merged[j].sentences],
                            size: merged[i].size + merged[j].size,
                            center: this.findCentroid([...merged[i].sentences, ...merged[j].sentences]),
                            category: merged[i].category || merged[j].category,
                            sentiment: this._getMergedSentiment(merged[i], merged[j])
                        };
                        merged.splice(j, 1);
                        hasChanges = true;
                        j--;
                    }
                }
            }
        }
        
        return merged.sort((a, b) => b.size - a.size);
    }

    _shouldMergeClusters(cluster1, cluster2) {
        const pp1 = this._getClusterPainPoints(cluster1);
        const pp2 = this._getClusterPainPoints(cluster2);
        
        const sentiment1 = cluster1.sentiment || this.getClusterSentiment({ 
            sentences: cluster1.sentences.map(s => ({ text: s.text })) 
        });
        const sentiment2 = cluster2.sentiment || this.getClusterSentiment({ 
            sentences: cluster2.sentences.map(s => ({ text: s.text })) 
        });
        
        if (sentiment1 !== sentiment2 && sentiment1 !== 'neutral' && sentiment2 !== 'neutral') {
            return false;
        }
        
        const semanticCats1 = this._getClusterSemanticCategories(cluster1);
        const semanticCats2 = this._getClusterSemanticCategories(cluster2);
        
        const mainCat1 = semanticCats1.size > 0 ? Array.from(semanticCats1)[0] : null;
        const mainCat2 = semanticCats2.size > 0 ? Array.from(semanticCats2)[0] : null;
        
        if (mainCat1 && mainCat2 && mainCat1 !== 'general' && mainCat2 !== 'general') {
            if (mainCat1 !== mainCat2 && !this._areSemanticallyRelated(mainCat1, mainCat2)) {
                return false;
            }
        }
        
        if (pp1.categories.size > 0 && pp2.categories.size > 0) {
            for (const cat1 of pp1.categories) {
                for (const cat2 of pp2.categories) {
                    if (cat1 === cat2) {
                        return true;
                    }
                }
            }
        }
        
        const keywordOverlap = this._getKeywordOverlap(pp1.keywords, pp2.keywords);
        if (keywordOverlap >= this.forceMergeThreshold) {
            if (mainCat1 && mainCat2) {
                if (mainCat1 === mainCat2 || this._areSemanticallyRelated(mainCat1, mainCat2)) {
                    return true;
                }
            }
        }
        
        for (const cat1 of semanticCats1) {
            for (const cat2 of semanticCats2) {
                if (cat1 === cat2 || this._areSemanticallyRelated(cat1, cat2)) {
                    if (cluster1.size < 6 && cluster2.size < 6) {
                        return true;
                    }
                }
            }
        }
        
        if (pp1.categories.size === 0 && pp2.categories.size === 0) {
            if (mainCat1 && mainCat2) {
                if (mainCat1 === mainCat2 || this._areSemanticallyRelated(mainCat1, mainCat2)) {
                    return cluster1.size < 4 && cluster2.size < 4;
                }
            }
        }
        
        return false;
    }

    _getClusterSemanticCategories(cluster) {
        const categories = new Set();
        for (const sentence of cluster.sentences) {
            const cats = sentence.semanticCategories || this.getSemanticCategory(sentence);
            for (const cat of cats) {
                categories.add(cat);
            }
        }
        return categories;
    }

    _getKeywordOverlap(keywords1, keywords2) {
        if (keywords1.size === 0 || keywords2.size === 0) return 0;
        
        let common = 0;
        for (const kw1 of keywords1) {
            for (const kw2 of keywords2) {
                if (kw1 === kw2 || kw1.includes(kw2) || kw2.includes(kw1)) {
                    common++;
                    break;
                }
            }
            
            for (const [canonical, synonyms] of Object.entries(this.synonymMap)) {
                if ((keywords1.has(canonical) || synonyms.some(s => keywords1.has(s))) &&
                    (keywords2.has(canonical) || synonyms.some(s => keywords2.has(s)))) {
                    common++;
                    break;
                }
            }
        }
        
        return common / Math.max(keywords1.size, keywords2.size);
    }

    _getMergedSentiment(cluster1, cluster2) {
        const s1 = cluster1.sentiment || this.getClusterSentiment({ 
            sentences: cluster1.sentences.map(s => ({ text: s.text })) 
        });
        const s2 = cluster2.sentiment || this.getClusterSentiment({ 
            sentences: cluster2.sentences.map(s => ({ text: s.text })) 
        });
        
        if (s1 === s2) return s1;
        if (s1 === 'neutral') return s2;
        if (s2 === 'neutral') return s1;
        
        const size1 = cluster1.size;
        const size2 = cluster2.size;
        
        return size1 > size2 ? s1 : s2;
    }

    _getClusterPainPoints(cluster) {
        const categories = new Set();
        const keywords = new Set();
        
        for (const sentence of cluster.sentences) {
            const pps = sentence.painPoints || this.extractPainPoints(sentence);
            for (const pp of pps) {
                categories.add(pp.category);
                keywords.add(pp.keyword);
            }
        }
        
        return { categories, keywords };
    }

    findCentroid(cluster) {
        if (cluster.length === 0) return null;
        
        let bestSentence = cluster[0];
        let bestScore = -Infinity;
        
        for (const sentence of cluster) {
            let totalSim = 0;
            for (const other of cluster) {
                totalSim += this.computeEnhancedSimilarity(sentence, other);
            }
            
            const ppScore = (sentence.painPoints?.[0]?.weight || 0) * 0.1;
            const sentScore = (sentence.sentiment === 'negative' ? 0.05 : 0);
            const avgSim = totalSim / cluster.length + ppScore + sentScore;
            
            if (avgSim > bestScore) {
                bestScore = avgSim;
                bestSentence = sentence;
            }
        }
        
        return bestSentence;
    }

    generateSummary(cluster) {
        if (!cluster || cluster.sentences.length === 0) {
            return '';
        }
        
        const sentences = cluster.sentences;
        const textRank = new TextRank();
        const ranked = textRank.rankSentences(sentences);
        
        const dominantPP = this._getClusterDominantPainPoint(cluster);
        const clusterSentiment = this.getClusterSentiment({ sentences: cluster.sentences });
        
        let bestSummary = '';
        let bestScore = -Infinity;
        
        for (const rankedSentence of ranked) {
            const text = rankedSentence.text;
            
            if (!this._isCompleteSentence(text)) {
                continue;
            }
            
            const pp = this.extractPainPoints(rankedSentence);
            const sentiment = this.analyzeSentiment(rankedSentence);
            let score = rankedSentence.score || 0;
            
            if (dominantPP && pp.some(p => p.category === dominantPP.category)) {
                score += 1.0;
            }
            
            if (sentiment === clusterSentiment) {
                score += 0.5;
            }
            
            if (this._isNaturalSentence(text)) {
                score += 0.3;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestSummary = text;
            }
        }
        
        if (!bestSummary && ranked.length > 0) {
            for (const s of ranked) {
                if (this._isCompleteSentence(s.text)) {
                    bestSummary = s.text;
                    break;
                }
            }
        }
        
        if (!bestSummary && ranked.length > 0) {
            bestSummary = ranked[0].text;
        }
        
        return bestSummary;
    }

    _isCompleteSentence(text) {
        if (!text || text.length < 5) {
            return false;
        }
        
        if (text.length < 8) {
            const hasVerb = ['用', '看', '说', '做', '是', '有', '在'].some(v => text.includes(v));
            const hasNoun = this.contentWords.has(text) || 
                          Array.from(this.contentWords).some(w => text.includes(w));
            return hasVerb || hasNoun;
        }
        
        return true;
    }

    _isNaturalSentence(text) {
        if (text.includes('，') || text.includes('。') || text.includes('！') || text.includes('？')) {
            return true;
        }
        
        const verbs = ['用', '打开', '启动', '登录', '点击', '操作', '看', '玩', '买', '退', '等', '加载', '喜欢', '讨厌', '觉得'];
        for (const verb of verbs) {
            if (text.includes(verb)) {
                return true;
            }
        }
        
        return false;
    }

    _getClusterDominantPainPoint(cluster) {
        const categoryCount = {};
        
        for (const sentence of cluster.sentences) {
            const pps = this.extractPainPoints(sentence);
            for (const pp of pps) {
                categoryCount[pp.category] = (categoryCount[pp.category] || 0) + pp.weight;
            }
        }
        
        if (Object.keys(categoryCount).length === 0) return null;
        
        let maxCat = null;
        let maxCount = 0;
        for (const [cat, count] of Object.entries(categoryCount)) {
            if (count > maxCount) {
                maxCount = count;
                maxCat = cat;
            }
        }
        
        return maxCat ? { category: maxCat, weight: maxCount } : null;
    }

    extractTopicKeywords(cluster, topN = 5) {
        if (!cluster || cluster.sentences.length === 0) {
            return [];
        }
        
        const keywordScores = {};
        const docFreq = {};
        const totalDocs = cluster.sentences.length;
        
        for (const sentence of cluster.sentences) {
            const text = sentence.text;
            const tokens = this.getMeaningfulTokens(text);
            const seenInDoc = new Set();
            
            for (const token of tokens) {
                if (!this._isValidKeyword(token)) continue;
                
                if (!seenInDoc.has(token)) {
                    docFreq[token] = (docFreq[token] || 0) + 1;
                    seenInDoc.add(token);
                }
                
                keywordScores[token] = (keywordScores[token] || 0) + 1;
            }
            
            const pps = this.extractPainPoints(sentence);
            for (const pp of pps) {
                keywordScores[pp.keyword] = (keywordScores[pp.keyword] || 0) + pp.weight * 2;
                if (!seenInDoc.has(pp.keyword)) {
                    docFreq[pp.keyword] = (docFreq[pp.keyword] || 0) + 1;
                }
            }
        }
        
        const tfidfScores = [];
        for (const [word, freq] of Object.entries(keywordScores)) {
            const df = docFreq[word] || 1;
            const tf = freq;
            const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
            const tfidf = tf * idf;
            
            let bonus = 0;
            if (this.validKeywords.has(word)) bonus += 3.0;
            
            for (const [canonical, synonyms] of Object.entries(this.synonymMap)) {
                if (word === canonical || synonyms.includes(word)) {
                    bonus += 2.0;
                    break;
                }
            }
            
            if (this.positiveLexicon.multi.has(word) || this.negativeLexicon.multi.has(word)) {
                bonus += 1.5;
            }
            
            if (this.contentWords.has(word)) {
                bonus += 1.0;
            }
            
            if (this.functionWords.has(word)) {
                bonus -= 5.0;
            }
            
            tfidfScores.push({
                word,
                score: tfidf + bonus
            });
        }
        
        tfidfScores.sort((a, b) => b.score - a.score);
        
        const deduplicated = [];
        const seen = new Set();
        
        for (const item of tfidfScores) {
            if (!this._isValidKeyword(item.word)) continue;
            
            let isRedundant = false;
            
            for (const existing of deduplicated) {
                if (existing.word.includes(item.word) || item.word.includes(existing.word)) {
                    isRedundant = true;
                    break;
                }
                
                for (const [canonical, synonyms] of Object.entries(this.synonymMap)) {
                    const itemInGroup = item.word === canonical || synonyms.includes(item.word);
                    const existingInGroup = existing.word === canonical || synonyms.includes(existing.word);
                    if (itemInGroup && existingInGroup) {
                        isRedundant = true;
                        break;
                    }
                }
                
                if (isRedundant) break;
            }
            
            if (!isRedundant && !seen.has(item.word)) {
                deduplicated.push(item);
                seen.add(item.word);
            }
            
            if (deduplicated.length >= topN) break;
        }
        
        return deduplicated.slice(0, topN);
    }

    _isValidKeyword(word) {
        if (!word) return false;
        if (word.length < 2) return false;
        if (word.length > 10) return false;
        
        if (this.functionWords.has(word)) {
            return false;
        }
        
        const stopPhrases = new Set([
            '这个', '那个', '什么', '怎么', '为什么', '还有', '而且', '但是',
            '因为', '所以', '如果', '虽然', '不过', '其实', '真的', '还是',
            '可以', '能够', '应该', '需要', '可能', '已经', '正在', '以后',
            'app', '软件', '应用', '一个', '一些', '一下', '那种', '这样', '那样'
        ]);
        
        if (stopPhrases.has(word.toLowerCase())) return false;
        
        if (/^[0-9]+$/.test(word)) return false;
        
        return true;
    }

    getTopicTitle(cluster) {
        const dominantPP = this._getClusterDominantPainPoint(cluster);
        
        if (dominantPP) {
            const keywords = this.extractTopicKeywords(cluster, 3);
            const relevantKeywords = keywords.filter(k => {
                const pps = this.extractPainPoints(k.word);
                return pps.some(p => p.category === dominantPP.category) || this.validKeywords.has(k.word);
            });
            
            if (relevantKeywords.length > 0) {
                return relevantKeywords.map(k => k.word).join('、');
            }
        }
        
        const keywords = this.extractTopicKeywords(cluster, 3);
        if (keywords.length > 0) {
            return keywords.map(k => k.word).join('、');
        }
        
        const summary = this.generateSummary(cluster);
        if (summary.length > 15) {
            return summary.substring(0, 15) + '...';
        }
        return summary || '主题';
    }

    getClusterSentiment(cluster) {
        if (!cluster || cluster.sentences.length === 0) {
            return 'neutral';
        }
        
        let positive = 0;
        let negative = 0;
        let neutral = 0;
        
        for (const sentence of cluster.sentences) {
            const sentiment = this.analyzeSentiment(sentence);
            if (sentiment === 'positive') positive++;
            else if (sentiment === 'negative') negative++;
            else neutral++;
        }
        
        const total = cluster.sentences.length;
        const posRatio = positive / total;
        const negRatio = negative / total;
        
        if (negRatio > 0.4) {
            return 'negative';
        } else if (posRatio > 0.4) {
            return 'positive';
        }
        
        if (negRatio > posRatio && negRatio > 0.25) {
            return 'negative';
        } else if (posRatio > negRatio && posRatio > 0.25) {
            return 'positive';
        }
        
        const dominantPP = this._getClusterDominantPainPoint(cluster);
        if (dominantPP) {
            const catInfo = this.painPointLexicon[dominantPP.category];
            if (catInfo && catInfo.sentiment === 'negative') {
                return 'negative';
            }
        }
        
        return 'neutral';
    }
}

window.TopicClusterer = TopicClusterer;
