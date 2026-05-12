class IntentClassifier {
    constructor() {
        this.model = null;
        this.confidenceThreshold = 0.5;
        this.intents = [
            'commercial_inquiry',
            'complaint',
            'status_inquiry',
            'meeting_request',
            'general_inquiry'
        ];
        
        this.priorityKeywords = {
            price_related: [
                '价格', '多少钱', '优惠', '折扣', '报价', '费用',
                '定价', '售价', '成本', '费率', '包月', '包年',
                '订阅费', '会员费', '折扣价', '促销价', '特价',
                '砍价', '便宜', '划算', '性价比', '预算',
                'price', 'cost', 'quote', 'discount', 'how much',
                'pricing', 'fee', 'rate', 'cheap', 'budget'
            ]
        };
        
        this.keywordPatterns = {
            commercial_inquiry: [
                '价格', '多少钱', '优惠', '折扣', '报价', '费用', '收费', '定价', '售价',
                '订阅', '套餐', '版本', '购买', '采购', '预算', '性价比',
                'price', 'cost', 'quote', 'pricing', 'how much', 'discount', 'buy', 'purchase'
            ],
            complaint: [
                '投诉', '不满', '不满意', '抱怨', '糟糕', '失望', '生气',
                '问题严重', '太差了', '退款', '维权',
                'complain', 'complaint', 'unhappy', 'dissatisfied', 'angry', 'refund'
            ],
            status_inquiry: [
                '进度', '进展', '状态', '怎么样了', '到哪一步了', '什么时候完成',
                '处理得怎么样', '有消息了吗', '结果如何', '更新',
                'status', 'progress', 'update', 'how is it going', 'what is the status'
            ],
            meeting_request: [
                '开会', '会议', '见面', '预约', '安排时间', '抽空',
                '约个时间', '电话沟通', '视频会议', '拜访',
                'meeting', 'schedule', 'appointment', 'meet up', 'call', 'visit'
            ],
            general_inquiry: [
                '咨询', '了解', '想问一下', '关于', '请问', '了解一下',
                'inquiry', 'question', 'about', 'regarding', 'ask'
            ]
        };
        
        this.intentPriority = {
            commercial_inquiry: 5,
            complaint: 4,
            status_inquiry: 3,
            meeting_request: 2,
            general_inquiry: 1
        };
        
        this.intentLabels = {
            commercial_inquiry: '商业询价',
            complaint: '投诉反馈',
            status_inquiry: '进度查询',
            meeting_request: '会议请求',
            general_inquiry: '一般咨询',
            unknown: '未知'
        };
    }

    async init() {
        await this.loadModel();
    }

    async loadModel() {
        try {
            console.log('正在初始化意图分类器...');
            
            if (typeof tf !== 'undefined') {
                const model = tf.sequential();
                model.add(tf.layers.embedding({
                    inputDim: 10000,
                    outputDim: 128,
                    inputLength: 50
                }));
                model.add(tf.layers.lstm({ units: 64, returnSequences: true }));
                model.add(tf.layers.dropout({ rate: 0.3 }));
                model.add(tf.layers.lstm({ units: 32 }));
                model.add(tf.layers.dropout({ rate: 0.3 }));
                model.add(tf.layers.dense({ units: this.intents.length, activation: 'softmax' }));
                
                model.compile({
                    optimizer: tf.train.adam(0.001),
                    loss: 'categoricalCrossentropy',
                    metrics: ['accuracy']
                });
                
                this.model = model;
                console.log('TensorFlow.js LSTM 模型初始化完成');
            }
        } catch (error) {
            console.warn('TensorFlow.js 模型加载失败，将使用基于规则的分类:', error);
        }
    }

    async classify(text) {
        const textLower = text.toLowerCase();
        
        const priorityResult = this.checkPriorityKeywords(textLower);
        if (priorityResult) {
            return priorityResult;
        }
        
        const scores = this.calculateKeywordScores(textLower);
        let predictedIntent = this.getTopIntent(scores);
        let confidence = this.calculateConfidence(scores);
        
        if (this.model && this.hasEnoughData(text)) {
            try {
                const modelPrediction = await this.predictWithModel(text);
                if (modelPrediction.confidence > confidence) {
                    predictedIntent = modelPrediction.intent;
                    confidence = modelPrediction.confidence;
                }
            } catch (error) {
                console.log('模型预测失败，使用规则结果');
            }
        }
        
        if (confidence < this.confidenceThreshold) {
            return {
                intent: 'unknown',
                label: this.intentLabels['unknown'],
                confidence: confidence,
                scores: scores
            };
        }
        
        return {
            intent: predictedIntent,
            label: this.intentLabels[predictedIntent] || this.intentLabels['unknown'],
            confidence: confidence,
            scores: scores
        };
    }

    checkPriorityKeywords(text) {
        let priceRelatedCount = 0;
        
        for (const keyword of this.priorityKeywords.price_related) {
            const regex = new RegExp(keyword, 'gi');
            const matches = text.match(regex);
            if (matches) {
                priceRelatedCount += matches.length;
            }
        }
        
        if (priceRelatedCount > 0) {
            const confidence = this.calculatePriorityConfidence(priceRelatedCount);
            
            if (confidence >= this.confidenceThreshold) {
                return {
                    intent: 'commercial_inquiry',
                    label: this.intentLabels['commercial_inquiry'],
                    confidence: confidence,
                    isPriorityMatch: true
                };
            }
        }
        
        return null;
    }

    calculatePriorityConfidence(matchCount) {
        if (matchCount >= 3) {
            return 0.95;
        } else if (matchCount >= 2) {
            return 0.85;
        } else if (matchCount === 1) {
            return 0.75;
        }
        return 0;
    }

    calculateKeywordScores(text) {
        const scores = {};
        
        for (const [intent, keywords] of Object.entries(this.keywordPatterns)) {
            scores[intent] = 0;
            
            for (const keyword of keywords) {
                const regex = new RegExp(keyword, 'gi');
                const matches = text.match(regex);
                if (matches) {
                    scores[intent] += matches.length * this.getKeywordWeight(intent, keyword);
                }
            }
        }
        
        return scores;
    }

    getKeywordWeight(intent, keyword) {
        const highWeightKeywords = {
            commercial_inquiry: ['价格', '多少钱', '报价', '优惠', '折扣', 'price', 'how much', 'quote', 'discount'],
            complaint: ['投诉', '不满', 'complain', 'complaint', '退款', 'refund'],
            status_inquiry: ['进度', '进展', '状态', 'status', 'progress', 'update'],
            meeting_request: ['开会', '会议', 'meeting', 'schedule', 'appointment'],
            general_inquiry: ['咨询', 'inquiry', 'question', 'ask']
        };
        
        const highWeights = highWeightKeywords[intent] || [];
        return highWeights.includes(keyword) ? 3 : 1;
    }

    getTopIntent(scores) {
        let maxScore = 0;
        let topIntent = 'general_inquiry';
        let maxPriority = this.intentPriority['general_inquiry'];
        
        for (const [intent, score] of Object.entries(scores)) {
            if (score > 0) {
                const currentPriority = this.intentPriority[intent] || 0;
                
                if (score > maxScore) {
                    maxScore = score;
                    topIntent = intent;
                    maxPriority = currentPriority;
                } else if (score === maxScore && currentPriority > maxPriority) {
                    topIntent = intent;
                    maxPriority = currentPriority;
                }
            }
        }
        
        return topIntent;
    }

    calculateConfidence(scores) {
        const scoreValues = Object.values(scores);
        const total = scoreValues.reduce((a, b) => a + b, 0);
        
        if (total === 0) return 0.3;
        
        const sortedScores = [...scoreValues].sort((a, b) => b - a);
        const maxScore = sortedScores[0];
        const secondMaxScore = sortedScores[1] || 0;
        
        const margin = maxScore - secondMaxScore;
        const ratio = total > 0 ? maxScore / total : 0;
        
        let confidence = 0.5 + (ratio * 0.3) + (margin / (total + 1) * 0.2);
        
        if (maxScore >= 5) {
            confidence += 0.1;
        } else if (maxScore >= 3) {
            confidence += 0.05;
        }
        
        return Math.min(0.95, Math.max(0.3, confidence));
    }

    async predictWithModel(text) {
        const tokenized = this.tokenize(text);
        const padded = this.padSequence(tokenized, 50);
        
        const tensor = tf.tensor2d([padded], [1, 50]);
        const prediction = this.model.predict(tensor);
        const probabilities = await prediction.data();
        
        const maxIndex = probabilities.indexOf(Math.max(...probabilities));
        const intent = this.intents[maxIndex];
        const confidence = probabilities[maxIndex];
        
        tensor.dispose();
        prediction.dispose();
        
        return { intent, confidence };
    }

    tokenize(text) {
        return text.split(/[\s,，.。!！?？;；:：]+/)
            .filter(word => word.length > 0)
            .map(word => this.hashWord(word) % 10000);
    }

    hashWord(word) {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
            const char = word.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    padSequence(sequence, maxLength) {
        if (sequence.length >= maxLength) {
            return sequence.slice(0, maxLength);
        }
        return [...new Array(maxLength - sequence.length).fill(0), ...sequence];
    }

    hasEnoughData(text) {
        return text.length >= 10;
    }
}

window.IntentClassifier = IntentClassifier;