class SentimentClassifier {
    constructor() {
        this.initialized = false;
        this.useHFAPI = false;
        this.hfApiKey = null;
        this.modelName = 'distilbert-base-uncased-finetuned-sst-2-english';
        
        this.positiveWords = new Set([
            '好', '棒', '赞', '美', '优', '佳', '良', '棒极了', '优秀',
            '喜欢', '爱', '热爱', '喜爱', '欣赏', '赞美', '赞扬', '称赞',
            '高兴', '开心', '快乐', '愉快', '幸福', '满足', '满意', '愉悦',
            '精彩', '出色', '卓越', '完美', '绝佳', '绝佳', '绝佳',
            '美味', '好吃', '香', '鲜美', '可口', '诱人',
            '美丽', '漂亮', '好看', '迷人', '帅气', '可爱',
            '有趣', '好玩', '精彩', '刺激', '过瘾',
            '感动', '温暖', '温馨', '舒服', '舒适', '安心',
            '感谢', '感激', '谢谢', '感恩',
            '推荐', '值得', '划算', '实惠', '超值',
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'lovely', 'beautiful', 'nice', 'happy', 'joyful', 'delightful',
            'pleased', 'satisfied', 'impressed', 'love', 'like', 'enjoy',
            'awesome', 'incredible', 'perfect', 'brilliant', 'outstanding',
            'superb', 'magnificent', 'gorgeous', 'stunning', 'remarkable',
            'positive', 'optimistic', 'cheerful', 'grateful', 'thankful',
            'excited', 'thrilled', 'ecstatic', 'blessed', 'fortunate'
        ]);
        
        this.negativeWords = new Set([
            '坏', '差', '烂', '糟', '糟透了', '糟糕', '恶劣',
            '讨厌', '厌恶', '烦', '烦燥', '恶心', '反胃',
            '难过', '伤心', '悲伤', '痛苦', '失望', '绝望',
            '愤怒', '生气', '恼火', '气愤', '暴怒', '狂怒',
            '难吃', '难以下咽', '没味道', '寡淡', '油腻',
            '丑陋', '难看', '恶心', '吓人', '可怕',
            '无聊', '乏味', '枯燥', '没意思', '没劲',
            '难过', '难受', '不舒服', '痛苦', '煎熬',
            '后悔', '遗憾', '可惜', '惋惜',
            '坑', '骗', '宰', '黑店', '欺诈', '欺骗',
            '贵', '贵得离谱', '不值', '不划算',
            '迟到', '慢', '慢得要死', '磨洋工',
            'bad', 'terrible', 'awful', 'horrible', 'dreadful',
            'poor', 'worse', 'worst', 'disappointing', 'disappointed',
            'sad', 'unhappy', 'miserable', 'depressed', 'heartbroken',
            'angry', 'furious', 'annoyed', 'irritated', 'frustrated',
            'hate', 'dislike', 'loathe', 'despise', 'abhor',
            'ugly', 'hideous', 'repulsive', 'revolting', 'vile',
            'boring', 'dull', 'tedious', 'monotonous', 'tiresome',
            'expensive', 'overpriced', 'costly', 'pricey', 'rip-off',
            'slow', 'late', 'delayed', 'sluggish', 'lethargic',
            'negative', 'pessimistic', 'cynical', 'bitter', 'resentful',
            'regret', 'regretful', 'sorry', 'unfortunate', 'tragic'
        ]);
        
        this.intensifiers = new Set([
            '非常', '特别', '极其', '格外', '相当', '十分', '特别',
            '真的', '实在', '的确', '确实', '真正',
            '太', '超', '贼', '老', '死', '挺', '怪',
            '更加', '越发', '更为',
            'very', 'extremely', 'incredibly', 'absolutely', 'totally',
            'completely', 'utterly', 'really', 'truly', 'genuinely',
            'so', 'such', 'too', 'quite', 'rather', 'fairly',
            'especially', 'particularly', 'notably', 'remarkably'
        ]);
        
        this.negations = new Set([
            '不', '没', '没有', '无', '非', '否',
            '不是', '不会', '不能', '不该', '不要',
            'never', 'not', 'no', 'none', 'nobody', 'nowhere',
            'nothing', 'neither', 'nor', 'hardly', 'scarcely',
            'barely', 'seldom', 'rarely', 'without'
        ]);
    }

    async init() {
        try {
            this.hfApiKey = this.getStoredApiKey();
            if (this.hfApiKey) {
                this.useHFAPI = true;
                console.log('使用 Hugging Face API 进行情感分析');
            } else {
                console.log('未配置 Hugging Face API Key，使用本地关键词分析器');
            }
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('初始化失败:', error);
            this.initialized = true;
            return true;
        }
    }

    getStoredApiKey() {
        try {
            return localStorage.getItem('hf_api_key') || null;
        } catch (e) {
            return null;
        }
    }

    setApiKey(apiKey) {
        this.hfApiKey = apiKey;
        this.useHFAPI = true;
        try {
            localStorage.setItem('hf_api_key', apiKey);
        } catch (e) {}
        console.log('Hugging Face API Key 已配置');
    }

    clearApiKey() {
        this.hfApiKey = null;
        this.useHFAPI = false;
        try {
            localStorage.removeItem('hf_api_key');
        } catch (e) {}
    }

    async classify(text) {
        if (this.useHFAPI && this.hfApiKey) {
            try {
                return await this.classifyWithHFAPI(text);
            } catch (error) {
                console.warn('Hugging Face API 调用失败，使用本地分析器:', error);
                return this.classifyWithRules(text);
            }
        } else {
            return this.classifyWithRules(text);
        }
    }

    async classifyWithHFAPI(text) {
        const response = await fetch(
            `https://api-inference.huggingface.co/models/${this.modelName}`,
            {
                headers: {
                    Authorization: `Bearer ${this.hfApiKey}`,
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                body: JSON.stringify({ inputs: text })
            }
        );

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }

        const result = await response.json();
        return this.normalizeHFResult(result);
    }

    normalizeHFResult(apiResult) {
        if (!apiResult || !Array.isArray(apiResult) || apiResult.length === 0) {
            return this.classifyWithRules('');
        }

        const predictions = apiResult[0] || [];
        let positive = 0, negative = 0;

        for (const pred of predictions) {
            const label = pred.label?.toLowerCase() || '';
            const score = pred.score || 0;

            if (label.includes('positive') || label.includes('pos')) {
                positive = score;
            } else if (label.includes('negative') || label.includes('neg')) {
                negative = score;
            }
        }

        const neutral = Math.max(0, 1 - positive - negative);
        const total = positive + negative + neutral;

        return {
            positive: positive / total,
            negative: negative / total,
            neutral: neutral / total
        };
    }

    classifyWithRules(text) {
        let positiveScore = 0;
        let negativeScore = 0;
        let negationFlag = false;
        let intensifierMultiplier = 1;
        
        const tokens = this.tokenizeSimple(text);
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i].toLowerCase();
            
            if (this.negations.has(token)) {
                negationFlag = true;
                continue;
            }
            
            if (this.intensifiers.has(token)) {
                intensifierMultiplier = 2;
                continue;
            }
            
            let scoreDelta = 0;
            
            if (this.positiveWords.has(token)) {
                scoreDelta = 1;
            } else if (this.negativeWords.has(token)) {
                scoreDelta = -1;
            } else {
                for (const word of this.positiveWords) {
                    if (token.includes(word)) {
                        scoreDelta = 0.7;
                        break;
                    }
                }
                if (scoreDelta === 0) {
                    for (const word of this.negativeWords) {
                        if (token.includes(word)) {
                            scoreDelta = -0.7;
                            break;
                        }
                    }
                }
            }
            
            if (scoreDelta !== 0) {
                scoreDelta *= intensifierMultiplier;
                
                if (negationFlag) {
                    scoreDelta *= -0.5;
                    negationFlag = false;
                }
                
                if (scoreDelta > 0) {
                    positiveScore += scoreDelta;
                } else {
                    negativeScore += Math.abs(scoreDelta);
                }
                
                intensifierMultiplier = 1;
            }
        }
        
        const totalScore = positiveScore + negativeScore;
        
        if (totalScore === 0) {
            return {
                positive: 0.33,
                negative: 0.33,
                neutral: 0.34
            };
        }
        
        const confidence = Math.min(totalScore / 5, 1);
        const neutralScore = (1 - confidence) * 0.5;
        
        const positiveRatio = positiveScore / totalScore;
        const negativeRatio = negativeScore / totalScore;
        
        return {
            positive: positiveRatio * confidence + neutralScore * 0.33,
            negative: negativeRatio * confidence + neutralScore * 0.33,
            neutral: neutralScore * 0.34
        };
    }

    tokenizeSimple(text) {
        const cleaned = text
            .replace(/[^\w\u4e00-\u9fff\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        const chineseTokens = cleaned.match(/[\u4e00-\u9fff]/g) || [];
        const englishTokens = cleaned.match(/[a-zA-Z]+/g) || [];
        const numberTokens = cleaned.match(/\d+(?:\.\d+)?/g) || [];
        
        return [...chineseTokens, ...englishTokens, ...numberTokens];
    }

    setModel(modelName) {
        this.modelName = modelName;
    }

    addPositiveWord(word) {
        this.positiveWords.add(word.toLowerCase());
    }

    addNegativeWord(word) {
        this.negativeWords.add(word.toLowerCase());
    }

    removePositiveWord(word) {
        this.positiveWords.delete(word.toLowerCase());
    }

    removeNegativeWord(word) {
        this.negativeWords.delete(word.toLowerCase());
    }
}
