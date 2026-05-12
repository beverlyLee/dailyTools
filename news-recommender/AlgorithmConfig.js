export class AlgorithmConfig {
    constructor() {
        this.storageKey = 'news_algorithm_config_v3';
        this.defaultConfig = {
            profile: {
                categoryWeight: 4,
                tagWeight: 8,
                viewTimeCategoryWeight: 2,
                viewTimeTagWeight: 4,
                maxViewTimeScore: 5,
                baseScoreMin: 1,
                baseScoreMax: 10,
                tagImportanceTitleWeight: 1.2,
                tagImportanceContentWeight: 1.0,
                tagImportanceExplicitTagWeight: 0.8,
                aggregateThreshold: 2
            },
            recommendation: {
                tagMatchBoost: 0.3,
                categoryMatchMultiplier: 0.5,
                collaborativeBaseMultiplier: 5,
                recentlyClickedPenalty: 3,
                tagWeightRatio: 0.7,
                categoryWeightRatio: 0.15,
                collaborativeWeightRatio: 0.15,
                hierarchyMatchBonus: 0.5
            },
            api: {
                provider: 'fallback',
                apiKey: '',
                apiEndpoint: '',
                useRealApi: false
            }
        };
        this.config = this.loadConfig();
        this.listeners = [];
    }

    loadConfig() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return this.mergeConfig(this.defaultConfig, parsed);
            } catch (e) {
                console.error('[AlgorithmConfig] 解析配置失败:', e);
            }
        }
        return this.deepClone(this.defaultConfig);
    }

    saveConfig() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            this.notifyListeners();
        } catch (e) {
            console.error('[AlgorithmConfig] 保存配置失败:', e);
        }
    }

    mergeConfig(defaultConfig, userConfig) {
        const result = this.deepClone(defaultConfig);
        
        for (const key in userConfig) {
            if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
                result[key] = this.mergeConfig(result[key] || {}, userConfig[key]);
            } else if (userConfig[key] !== undefined) {
                result[key] = userConfig[key];
            }
        }
        
        return result;
    }

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    get(key) {
        const keys = key.split('.');
        let value = this.config;
        
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    set(key, value) {
        const keys = key.split('.');
        let obj = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]] || typeof obj[keys[i]] !== 'object') {
                obj[keys[i]] = {};
            }
            obj = obj[keys[i]];
        }
        
        obj[keys[keys.length - 1]] = value;
        this.saveConfig();
    }

    getAll() {
        return this.deepClone(this.config);
    }

    reset() {
        this.config = this.deepClone(this.defaultConfig);
        this.saveConfig();
        console.log('[AlgorithmConfig] 配置已重置为默认值');
    }

    getDefault(key) {
        const keys = key.split('.');
        let value = this.defaultConfig;
        
        for (const k of keys) {
            if (value && value[k] !== undefined) {
                value = value[k];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    onChange(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notifyListeners() {
        for (const listener of this.listeners) {
            try {
                listener(this.config);
            } catch (e) {
                console.error('[AlgorithmConfig] 通知监听器失败:', e);
            }
        }
    }

    getTagImportanceWeight(location) {
        const mapping = {
            'title': this.get('profile.tagImportanceTitleWeight') ?? 1.2,
            'content': this.get('profile.tagImportanceContentWeight') ?? 1.0,
            'tag': this.get('profile.tagImportanceExplicitTagWeight') ?? 0.8
        };
        return mapping[location] ?? 1.0;
    }

    getBaseScoreRange() {
        return {
            min: this.get('profile.baseScoreMin') ?? 1,
            max: this.get('profile.baseScoreMax') ?? 10
        };
    }

    getAggregateThreshold() {
        return this.get('profile.aggregateThreshold') ?? 2;
    }

    getConfigDescription() {
        return {
            'profile.categoryWeight': {
                label: '分类权重',
                description: '点击新闻时，给分类增加的基础分数',
                min: 0,
                max: 20,
                step: 1,
                defaultValue: 4
            },
            'profile.tagWeight': {
                label: '标签权重',
                description: '点击新闻时，给每个标签增加的分数（建议比分类权重大）',
                min: 0,
                max: 30,
                step: 1,
                defaultValue: 8
            },
            'profile.viewTimeCategoryWeight': {
                label: '阅读时长-分类权重',
                description: '阅读时长转换为分类分数的系数',
                min: 0,
                max: 10,
                step: 0.5,
                defaultValue: 2
            },
            'profile.viewTimeTagWeight': {
                label: '阅读时长-标签权重',
                description: '阅读时长转换为标签分数的系数',
                min: 0,
                max: 10,
                step: 0.5,
                defaultValue: 4
            },
            'profile.maxViewTimeScore': {
                label: '最大阅读时长分数',
                description: '单次阅读时长最多转换的分数（每30秒1分，最大到此值）',
                min: 0,
                max: 20,
                step: 1,
                defaultValue: 5
            },
            'profile.baseScoreMin': {
                label: '基础分最小值',
                description: '新闻与用户画像初始匹配度的最小基础分（1-10分）',
                min: 1,
                max: 5,
                step: 1,
                defaultValue: 1
            },
            'profile.baseScoreMax': {
                label: '基础分最大值',
                description: '新闻与用户画像初始匹配度的最大基础分（1-10分）',
                min: 5,
                max: 15,
                step: 1,
                defaultValue: 10
            },
            'profile.tagImportanceTitleWeight': {
                label: '标题出现权重',
                description: '标签出现在标题中的权重系数',
                min: 0.5,
                max: 2.0,
                step: 0.1,
                defaultValue: 1.2
            },
            'profile.tagImportanceContentWeight': {
                label: '正文出现权重',
                description: '标签出现在正文中的权重系数',
                min: 0.5,
                max: 2.0,
                step: 0.1,
                defaultValue: 1.0
            },
            'profile.tagImportanceExplicitTagWeight': {
                label: '显式标签权重',
                description: '标签作为显式 tags 字段出现的权重系数',
                min: 0.5,
                max: 2.0,
                step: 0.1,
                defaultValue: 0.8
            },
            'profile.aggregateThreshold': {
                label: '聚合阈值',
                description: '同一父级下需要多少个子标签才触发聚合',
                min: 2,
                max: 5,
                step: 1,
                defaultValue: 2
            },
            'recommendation.tagMatchBoost': {
                label: '标签覆盖率加成',
                description: '新闻标签匹配数量占比的加成系数',
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 0.3
            },
            'recommendation.categoryMatchMultiplier': {
                label: '分类匹配系数',
                description: '分类分数乘以此系数后加入推荐得分',
                min: 0,
                max: 2,
                step: 0.1,
                defaultValue: 0.5
            },
            'recommendation.collaborativeBaseMultiplier': {
                label: '协同过滤系数',
                description: '协同相似度乘以此系数后加入推荐得分',
                min: 0,
                max: 10,
                step: 1,
                defaultValue: 5
            },
            'recommendation.recentlyClickedPenalty': {
                label: '已点击惩罚',
                description: '最近点击过的新闻减少的分数（避免重复推荐）',
                min: 0,
                max: 10,
                step: 1,
                defaultValue: 3
            },
            'recommendation.hierarchyMatchBonus': {
                label: '层级匹配加成',
                description: '子标签匹配时给父级标签增加的额外分数',
                min: 0,
                max: 1,
                step: 0.1,
                defaultValue: 0.5
            }
        };
    }

    getApiProviders() {
        return [
            {
                id: 'fallback',
                name: '本地数据（默认）',
            },
            {
                id: 'sina',
                name: '新浪新闻API',
                requiresKey: true
            },
            {
                id: 'juhe',
                name: '聚合数据API',
                requiresKey: true
            },
            {
                id: 'tianapi',
                name: '天行数据API',
                requiresKey: true
            },
            {
                id: 'gnews',
                name: 'GNews (国际)',
                requiresKey: true
            }
        ];
    }
}
