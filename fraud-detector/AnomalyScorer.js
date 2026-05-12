class AnomalyScorer {
    constructor() {
        this.model = null;
        this.threshold = 0.6;
        this.isolationThreshold = 0.5;
        this.featureWeights = {
            amount: 0.2,
            isLargeAmount: 0.15,
            amountDeviation: 0.15,
            isOddHour: 0.15,
            isForeignLocation: 0.15,
            locationAnomaly: 0.1,
            merchantAnomaly: 0.1
        };
    }

    async init() {
        try {
            if (typeof tf !== 'undefined') {
                this.model = await this.buildModel();
                console.log('TensorFlow.js 模型初始化成功');
            } else {
                console.log('TensorFlow.js 未加载，使用规则引擎');
            }
        } catch (error) {
            console.warn('模型初始化失败，将使用规则引擎:', error);
        }
    }

    buildModel() {
        const model = tf.sequential();
        
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu',
            inputShape: [12]
        }));
        
        model.add(tf.layers.dense({
            units: 8,
            activation: 'relu'
        }));
        
        model.add(tf.layers.dense({
            units: 1,
            activation: 'sigmoid'
        }));
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });
        
        return model;
    }

    calculateScore(features, transaction) {
        let score = 0;
        const detailedScores = {};

        const amountScore = this.calculateAmountScore(features);
        detailedScores.amount = amountScore;
        score += amountScore * this.featureWeights.amount;

        const largeAmountScore = features.isLargeAmount;
        detailedScores.isLargeAmount = largeAmountScore;
        score += largeAmountScore * this.featureWeights.isLargeAmount;

        const deviationScore = Math.min(features.amountDeviation, 1);
        detailedScores.amountDeviation = deviationScore;
        score += deviationScore * this.featureWeights.amountDeviation;

        const timeScore = this.calculateTimeScore(features);
        detailedScores.time = timeScore;
        score += timeScore * this.featureWeights.isOddHour;

        const locationScore = features.locationAnomaly;
        detailedScores.location = locationScore;
        score += locationScore * this.featureWeights.locationAnomaly;

        const foreignScore = features.isForeignLocation;
        detailedScores.isForeignLocation = foreignScore;
        score += foreignScore * this.featureWeights.isForeignLocation;

        const merchantScore = features.merchantAnomaly;
        detailedScores.merchant = merchantScore;
        score += merchantScore * this.featureWeights.merchantAnomaly;

        score = this.applyIsolationForestLogic(features, transaction, score);

        score = Math.max(0, Math.min(1, score));

        return {
            score,
            detailedScores,
            riskLevel: this.getRiskLevel(score),
            anomalies: this.detectAnomalies(features, transaction)
        };
    }

    calculateAmountScore(features) {
        return features.amount;
    }

    calculateTimeScore(features) {
        if (features.isOddHour === 1) {
            return 0.9;
        }
        if (features.isCommonHour === 1) {
            return 0.1;
        }
        return 0.3;
    }

    applyIsolationForestLogic(features, transaction, currentScore) {
        const isolationScores = [];
        
        if (features.isLargeAmount === 1) {
            isolationScores.push(0.8);
        }
        
        if (features.isOddHour === 1) {
            isolationScores.push(0.7);
        }
        
        if (features.isForeignLocation === 1) {
            isolationScores.push(0.75);
        }
        
        if (features.merchantAnomaly >= 0.5) {
            isolationScores.push(0.5);
        }
        
        if (features.amountDeviation >= 3) {
            isolationScores.push(0.9);
        }
        
        if (isolationScores.length >= 3) {
            const avgIsolationScore = isolationScores.reduce((a, b) => a + b, 0) / isolationScores.length;
            currentScore = (currentScore + avgIsolationScore * 0.5);
        }
        
        return currentScore;
    }

    detectAnomalies(features, transaction) {
        const anomalies = [];
        
        if (features.isLargeAmount === 1) {
            anomalies.push({
                type: 'amount',
                message: '大额交易异常',
                severity: 'high'
            });
        }
        
        if (features.isOddHour === 1) {
            anomalies.push({
                type: 'time',
                message: '深夜交易异常',
                severity: 'medium'
            });
        }
        
        if (features.isForeignLocation === 1) {
            anomalies.push({
                type: 'location',
                message: '异地交易异常',
                severity: 'high'
            });
        }
        
        if (features.merchantAnomaly >= 0.5) {
            anomalies.push({
                type: 'merchant',
                message: '不常见商户类别',
                severity: 'low'
            });
        }
        
        if (features.amountDeviation >= 5) {
            anomalies.push({
                type: 'deviation',
                message: '与历史消费偏差过大',
                severity: 'high'
            });
        }
        
        return anomalies;
    }

    getRiskLevel(score) {
        if (score >= 0.8) {
            return {
                level: 'critical',
                label: '极高风险',
                color: '#dc3545',
                action: '立即拦截'
            };
        }
        if (score >= 0.6) {
            return {
                level: 'high',
                label: '高风险',
                color: '#fd7e14',
                action: '二次验证'
            };
        }
        if (score >= 0.3) {
            return {
                level: 'medium',
                label: '中等风险',
                color: '#ffc107',
                action: '关注监控'
            };
        }
        return {
            level: 'low',
            label: '低风险',
            color: '#28a745',
            action: '正常放行'
        };
    }

    async predictWithModel(featureVector) {
        if (!this.model || typeof tf === 'undefined') {
            return null;
        }
        
        try {
            const tensor = tf.tensor2d([featureVector]);
            const prediction = this.model.predict(tensor);
            const result = await prediction.data();
            tensor.dispose();
            prediction.dispose();
            return result[0];
        } catch (error) {
            console.warn('模型预测失败:', error);
            return null;
        }
    }

    async scoreTransaction(features, transaction) {
        const ruleBasedScore = this.calculateScore(features, transaction);
        
        const featureVector = new FeatureExtractor().toFeatureVector(features);
        const modelScore = await this.predictWithModel(featureVector);
        
        if (modelScore !== null) {
            const finalScore = ruleBasedScore.score * 0.6 + modelScore * 0.4;
            return {
                ...ruleBasedScore,
                score: finalScore,
                riskLevel: this.getRiskLevel(finalScore)
            };
        }
        
        return ruleBasedScore;
    }
}
