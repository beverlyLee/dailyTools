export class TagHierarchy {
    constructor() {
        this.hierarchy = this.buildHierarchy();
        this.tagToAncestorsCache = new Map();
        this.synonymMap = this.buildSynonymMap();
    }

    buildHierarchy() {
        return {
            '体育': {
                level: 1,
                parent: null,
                children: ['足球', '篮球', '网球', '田径', '游泳', '其他运动']
            },
            '足球': {
                level: 2,
                parent: '体育',
                children: ['欧洲足球', '亚洲足球', '美洲足球', '中国足球', '女足']
            },
            '欧洲足球': {
                level: 3,
                parent: '足球',
                children: ['英超', '西甲', '德甲', '意甲', '法甲', '欧冠', '欧洲杯']
            },
            '英超': {
                level: 4,
                parent: '欧洲足球',
                children: ['曼城', '利物浦', '阿森纳', '曼联', '切尔西', '热刺', '哈兰德']
            },
            '西甲': {
                level: 4,
                parent: '欧洲足球',
                children: ['巴萨', '皇马', '巴塞罗那', '马德里竞技', '姆巴佩']
            },
            '德甲': {
                level: 4,
                parent: '欧洲足球',
                children: ['拜仁', '慕尼黑', '多特蒙德']
            },
            '意甲': {
                level: 4,
                parent: '欧洲足球',
                children: ['国米', '尤文图斯', 'AC米兰', '国际米兰']
            },
            '法甲': {
                level: 4,
                parent: '欧洲足球',
                children: ['巴黎', '内马尔', '巴黎圣日耳曼']
            },
            '欧冠': {
                level: 4,
                parent: '欧洲足球',
                children: []
            },
            '欧洲杯': {
                level: 4,
                parent: '欧洲足球',
                children: ['德国']
            },
            '亚洲足球': {
                level: 3,
                parent: '足球',
                children: ['中超', '亚洲杯', 'J联赛', 'K联赛']
            },
            '中超': {
                level: 4,
                parent: '亚洲足球',
                children: ['上海海港', '广州恒大', '山东泰山']
            },
            '亚洲杯': {
                level: 4,
                parent: '亚洲足球',
                children: ['中国女足']
            },
            '中国足球': {
                level: 3,
                parent: '足球',
                children: ['中国女足', '中超']
            },
            '女足': {
                level: 3,
                parent: '足球',
                children: ['中国女足', '亚洲杯']
            },
            '美洲足球': {
                level: 3,
                parent: '足球',
                children: ['梅西', 'C罗', '世界杯', '美洲杯']
            },
            
            '篮球': {
                level: 2,
                parent: '体育',
                children: ['NBA', 'CBA', '国际篮球']
            },
            'NBA': {
                level: 3,
                parent: '篮球',
                children: ['湖人', '凯尔特人', '勇士', '詹姆斯', '库里', '杜兰特']
            },
            'CBA': {
                level: 3,
                parent: '篮球',
                children: ['广东队', '辽宁队']
            },
            
            '网球': {
                level: 2,
                parent: '体育',
                children: ['大满贯', '德约科维奇', '费德勒', '纳达尔']
            },
            '田径': {
                level: 2,
                parent: '体育',
                children: ['短跑', '长跑', '田赛']
            },
            '游泳': {
                level: 2,
                parent: '体育',
                children: ['奥运会游泳', '世锦赛']
            },
            '其他运动': {
                level: 2,
                parent: '体育',
                children: ['乒乓球', '羽毛球', '排球', '电竞']
            },
            
            '科技': {
                level: 1,
                parent: null,
                children: ['人工智能', '芯片', '新能源', '互联网', '通信', '元宇宙', '其他科技']
            },
            '人工智能': {
                level: 2,
                parent: '科技',
                children: ['大模型', '机器学习', 'AI', '神经网络', '深度学习']
            },
            '大模型': {
                level: 3,
                parent: '人工智能',
                children: ['GPT', 'Claude', '文心一言', '通义千问']
            },
            'AI': {
                level: 3,
                parent: '人工智能',
                children: []
            },
            
            '芯片': {
                level: 2,
                parent: '科技',
                children: ['半导体', '台积电', '英伟达', 'CPU', 'GPU', '量子计算']
            },
            '半导体': {
                level: 3,
                parent: '芯片',
                children: []
            },
            '量子计算': {
                level: 3,
                parent: '芯片',
                children: ['IBM']
            },
            
            '新能源': {
                level: 2,
                parent: '科技',
                children: ['新能源汽车', '太阳能', '储能', '电动车', '动力电池']
            },
            '新能源汽车': {
                level: 3,
                parent: '新能源',
                children: ['特斯拉', '自动驾驶', '比亚迪', '蔚来']
            },
            '自动驾驶': {
                level: 4,
                parent: '新能源汽车',
                children: ['FSD']
            },
            '特斯拉': {
                level: 4,
                parent: '新能源汽车',
                children: []
            },
            
            '互联网': {
                level: 2,
                parent: '科技',
                children: ['苹果', '谷歌', '腾讯', '阿里', '百度', '字节跳动']
            },
            '通信': {
                level: 2,
                parent: '科技',
                children: ['5G', '6G', '工信部']
            },
            '5G': {
                level: 3,
                parent: '通信',
                children: []
            },
            
            '元宇宙': {
                level: 2,
                parent: '科技',
                children: ['VR', 'AR', 'Vision Pro']
            },
            'VR': {
                level: 3,
                parent: '元宇宙',
                children: []
            },
            'AR': {
                level: 3,
                parent: '元宇宙',
                children: []
            },
            '苹果': {
                level: 3,
                parent: '互联网',
                children: ['Vision Pro']
            },
            '其他科技': {
                level: 2,
                parent: '科技',
                children: ['科技突破', '太空探索', '生物科技']
            },
            
            '财经': {
                level: 1,
                parent: null,
                children: ['股票', '基金', '债券', '房地产', '宏观经济', '银行', '保险', '投资']
            },
            '股票': {
                level: 2,
                parent: '财经',
                children: ['A股', '美股', '港股', '上证', '创业板', '沪指']
            },
            'A股': {
                level: 3,
                parent: '股票',
                children: ['贵州茅台', '宁德时代']
            },
            
            '基金': {
                level: 2,
                parent: '财经',
                children: ['公募基金', '私募基金', 'ETF']
            },
            '房地产': {
                level: 2,
                parent: '财经',
                children: ['楼市', '房价', '买房', '房贷']
            },
            '楼市': {
                level: 3,
                parent: '房地产',
                children: []
            },
            
            '宏观经济': {
                level: 2,
                parent: '财经',
                children: ['GDP', 'CPI', '利率', '货币政策', '财政政策']
            },
            '银行': {
                level: 2,
                parent: '财经',
                children: ['央行', '商业银行', '理财']
            },
            '保险': {
                level: 2,
                parent: '财经',
                children: ['人寿保险', '财产保险', '医疗险']
            },
            '投资': {
                level: 2,
                parent: '财经',
                children: ['比特币', '加密货币', '黄金', '外汇']
            },
            
            '娱乐': {
                level: 1,
                parent: null,
                children: ['电影', '音乐', '电视剧', '综艺', '游戏', '短视频', '明星', '演唱会']
            },
            '电影': {
                level: 2,
                parent: '娱乐',
                children: ['票房', '导演', '演员', '满江红']
            },
            '满江红': {
                level: 3,
                parent: '电影',
                children: ['张艺谋']
            },
            '张艺谋': {
                level: 4,
                parent: '满江红',
                children: []
            },
            
            '音乐': {
                level: 2,
                parent: '娱乐',
                children: ['专辑', '歌手', '演唱会', '音乐节']
            },
            '电视剧': {
                level: 2,
                parent: '娱乐',
                children: ['国产剧', '韩剧', '美剧', '文化输出']
            },
            '国产剧': {
                level: 3,
                parent: '电视剧',
                children: []
            },
            
            '综艺': {
                level: 2,
                parent: '娱乐',
                children: ['选秀', '真人秀', '脱口秀']
            },
            '游戏': {
                level: 2,
                parent: '娱乐',
                children: ['手游', '端游', '电竞', '原神']
            },
            '短视频': {
                level: 2,
                parent: '娱乐',
                children: ['抖音', '快手', '直播']
            },
            '抖音': {
                level: 3,
                parent: '短视频',
                children: []
            },
            '快手': {
                level: 3,
                parent: '短视频',
                children: []
            },
            
            '明星': {
                level: 2,
                parent: '娱乐',
                children: ['易烊千玺', '肖战', '王一博']
            },
            '演唱会': {
                level: 2,
                parent: '娱乐',
                children: []
            },
            
            '生活': {
                level: 1,
                parent: null,
                children: ['健康生活', '旅游出行', '美食餐饮', '时尚穿搭', '家居家装', '职场', '宠物', '环保', '智能家居']
            },
            '健康生活': {
                level: 2,
                parent: '生活',
                children: ['健康', '饮食', '轻食', '健身', '医疗', '养生']
            },
            '健康': {
                level: 3,
                parent: '健康生活',
                children: ['医疗', '医院', '医生']
            },
            '饮食': {
                level: 3,
                parent: '健康生活',
                children: ['轻食', '素食', '美食']
            },
            '轻食': {
                level: 4,
                parent: '饮食',
                children: []
            },
            '健身': {
                level: 3,
                parent: '健康生活',
                children: ['运动', '刘畊宏', '全民健身']
            },
            '医疗': {
                level: 3,
                parent: '健康生活',
                children: ['医院', '医生']
            },
            
            '旅游出行': {
                level: 2,
                parent: '生活',
                children: ['旅游', '出行', '酒店', '五一假期', '文旅']
            },
            '旅游': {
                level: 3,
                parent: '旅游出行',
                children: ['景点', '酒店', '文旅部']
            },
            '出行': {
                level: 3,
                parent: '旅游出行',
                children: ['交通', '高铁', '机票']
            },
            '五一假期': {
                level: 3,
                parent: '旅游出行',
                children: []
            },
            
            '美食餐饮': {
                level: 2,
                parent: '生活',
                children: ['外卖', '奶茶', '咖啡', '海底捞']
            },
            '时尚穿搭': {
                level: 2,
                parent: '生活',
                children: ['穿搭', '美妆', '奢侈品']
            },
            '家居家装': {
                level: 2,
                parent: '生活',
                children: ['装修', '家具', '家电']
            },
            
            '职场': {
                level: 2,
                parent: '生活',
                children: ['教育', '培训', '跳槽', '求职', '充电']
            },
            '教育': {
                level: 3,
                parent: '职场',
                children: ['培训', '在线教育']
            },
            '培训': {
                level: 4,
                parent: '教育',
                children: []
            },
            
            '宠物': {
                level: 2,
                parent: '生活',
                children: ['宠物经济', '铲屎官', '宠物食品', '猫粮', '狗粮']
            },
            '宠物经济': {
                level: 3,
                parent: '宠物',
                children: []
            },
            '铲屎官': {
                level: 3,
                parent: '宠物',
                children: []
            },
            '宠物食品': {
                level: 3,
                parent: '宠物',
                children: []
            },
            
            '环保': {
                level: 2,
                parent: '生活',
                children: ['绿色消费', '可持续', '碳中和', '可降解']
            },
            '绿色消费': {
                level: 3,
                parent: '环保',
                children: []
            },
            '可持续': {
                level: 3,
                parent: '环保',
                children: []
            },
            
            '智能家居': {
                level: 2,
                parent: '生活',
                children: ['物联网', '智能设备', '智能音箱', '智能门锁']
            },
            '物联网': {
                level: 3,
                parent: '智能家居',
                children: []
            },
            '智能设备': {
                level: 3,
                parent: '智能家居',
                children: []
            }
        };
    }

    buildSynonymMap() {
        return {
            '曼城队': '曼城',
            '利物浦队': '利物浦',
            '阿森纳队': '阿森纳',
            '曼联队': '曼联',
            '切尔西队': '切尔西',
            '巴塞罗纳': '巴萨',
            '巴塞罗那': '巴萨',
            '皇家马德里': '皇马',
            '拜仁慕尼黑': '拜仁',
            '国际米兰': '国米',
            '巴黎圣日耳曼': '巴黎',
            '詹姆斯哈登': '哈登',
            '勒布朗詹姆斯': '詹姆斯',
            '斯蒂芬库里': '库里',
            '凯文杜兰特': '杜兰特',
            'OpenAI': 'AI',
            '人工智能': 'AI',
            '机器学习': 'AI',
            'GPT4': 'GPT',
            'GPT-4': 'GPT',
            'GPT3': 'GPT',
            'ChatGPT': 'GPT',
            '特斯拉汽车': '特斯拉',
            '比亚迪汽车': '比亚迪',
            'A股市场': 'A股',
            '上海证券交易所': '上证',
            '深圳证券交易所': '创业板',
            '楼市': '房地产',
            '房价': '房地产',
            '抖音短视频': '抖音',
            '快手短视频': '快手',
            '宠物': '宠物经济',
            '养宠物': '铲屎官',
            '健身房': '健身',
            '运动健身': '健身',
            '人工智能': 'AI',
            '大语言模型': '大模型',
            '英伟达公司': '英伟达',
            '台积电公司': '台积电'
        };
    }

    normalizeTag(tag) {
        if (!tag) return null;
        
        if (typeof tag !== 'string') return null;
        
        const cleanedTag = tag.trim().toLowerCase();
        
        for (const [synonym, canonical] of Object.entries(this.synonymMap)) {
            if (cleanedTag === synonym.toLowerCase() || 
                cleanedTag.includes(synonym.toLowerCase())) {
                return canonical;
            }
        }
        
        return tag.trim();
    }

    getTagInfo(tag) {
        const normalizedTag = this.normalizeTag(tag);
        if (!normalizedTag) return null;
        
        return this.hierarchy[normalizedTag] || null;
    }

    getParent(tag) {
        const info = this.getTagInfo(tag);
        return info ? info.parent : null;
    }

    getLevel(tag) {
        const info = this.getTagInfo(tag);
        return info ? info.level : 5;
    }

    getChildren(tag) {
        const info = this.getTagInfo(tag);
        return info ? info.children || [] : [];
    }

    getAncestors(tag, includeSelf = false) {
        const normalizedTag = this.normalizeTag(tag);
        if (!normalizedTag) return [];
        
        const cacheKey = `${normalizedTag}:${includeSelf}`;
        if (this.tagToAncestorsCache.has(cacheKey)) {
            return [...this.tagToAncestorsCache.get(cacheKey)];
        }
        
        const ancestors = [];
        let current = normalizedTag;
        
        if (includeSelf) {
            ancestors.push(current);
        }
        
        while (true) {
            const info = this.hierarchy[current];
            if (!info || !info.parent) break;
            
            ancestors.push(info.parent);
            current = info.parent;
        }
        
        this.tagToAncestorsCache.set(cacheKey, ancestors);
        return [...ancestors];
    }

    getSiblings(tag) {
        const parent = this.getParent(tag);
        if (!parent) return [];
        
        const children = this.getChildren(parent);
        return children.filter(t => t !== tag);
    }

    findCommonAncestor(tag1, tag2) {
        const ancestors1 = new Set(this.getAncestors(tag1, true));
        const ancestors2 = this.getAncestors(tag2, true);
        
        for (const ancestor of ancestors2) {
            if (ancestors1.has(ancestor)) {
                return ancestor;
            }
        }
        
        return null;
    }

    getLowestCommonAncestor(tags) {
        if (!tags || tags.length === 0) return null;
        if (tags.length === 1) return this.normalizeTag(tags[0]);
        
        let commonAncestor = this.normalizeTag(tags[0]);
        
        for (let i = 1; i < tags.length; i++) {
            commonAncestor = this.findCommonAncestor(commonAncestor, tags[i]);
            if (!commonAncestor) return null;
        }
        
        return commonAncestor;
    }

    aggregateTags(tags, targetLevel = null) {
        const normalizedTags = tags
            .map(tag => this.normalizeTag(tag))
            .filter(tag => tag !== null);
        
        if (normalizedTags.length === 0) return [];
        
        const aggregated = new Map();
        
        for (const tag of normalizedTags) {
            const ancestors = this.getAncestors(tag, true);
            
            for (const ancestor of ancestors) {
                if (!aggregated.has(ancestor)) {
                    aggregated.set(ancestor, new Set());
                }
                aggregated.get(ancestor).add(tag);
            }
        }
        
        let result = [];
        
        if (targetLevel) {
            for (const [ancestor, childTags] of aggregated.entries()) {
                const level = this.getLevel(ancestor);
                if (level === targetLevel) {
                    result.push({
                        tag: ancestor,
                        level,
                        childCount: childTags.size,
                        children: Array.from(childTags)
                    });
                }
            }
        } else {
            const rootAncestors = new Set();
            
            for (const tag of normalizedTags) {
                const ancestors = this.getAncestors(tag);
                const allAncestors = new Set([tag, ...ancestors]);
                
                let isRoot = true;
                for (const other of normalizedTags) {
                    if (other === tag) continue;
                    const otherAncestors = this.getAncestors(other, true);
                    if (allAncestors.has(other) || otherAncestors.has(tag)) {
                        isRoot = false;
                        break;
                    }
                }
                
                if (isRoot) {
                    const tagAncestors = this.getAncestors(tag, true);
                    let bestAncestor = tag;
                    let bestLevel = this.getLevel(tag);
                    
                    for (const ancestor of tagAncestors) {
                        const level = this.getLevel(ancestor);
                        const children = this.getChildren(ancestor);
                        let hasMatchingChild = false;
                        
                        for (const other of normalizedTags) {
                            if (other === tag) continue;
                            const otherAncestors = this.getAncestors(other, true);
                            if (otherAncestors.has(ancestor)) {
                                hasMatchingChild = true;
                                break;
                            }
                        }
                        
                        if (hasMatchingChild && level < bestLevel) {
                            bestAncestor = ancestor;
                            bestLevel = level;
                        }
                    }
                    
                    rootAncestors.add(bestAncestor);
                }
            }
            
            for (const ancestor of rootAncestors) {
                const childTags = normalizedTags.filter(tag => {
                    const ancestors = this.getAncestors(tag, true);
                    return ancestors.includes(ancestor);
                });
                
                result.push({
                    tag: ancestor,
                    level: this.getLevel(ancestor),
                    childCount: childTags.length,
                    children: childTags
                });
            }
        }
        
        result.sort((a, b) => b.childCount - a.childCount);
        
        return result;
    }

    aggregateForProfile(tags) {
        const result = this.aggregateTags(tags);
        
        if (result.length === 0) {
            return tags.map(tag => ({
                tag: this.normalizeTag(tag) || tag,
                level: 5,
                childCount: 1,
                children: [tag]
            }));
        }
        
        return result;
    }

    isAncestor(possibleAncestor, tag) {
        const ancestors = this.getAncestors(tag, true);
        return ancestors.includes(this.normalizeTag(possibleAncestor));
    }

    getTagsAtLevel(level) {
        const result = [];
        for (const [tag, info] of Object.entries(this.hierarchy)) {
            if (info.level === level) {
                result.push(tag);
            }
        }
        return result;
    }

    getTopLevelTags() {
        return ['体育', '科技', '财经', '娱乐', '生活'];
    }
}
