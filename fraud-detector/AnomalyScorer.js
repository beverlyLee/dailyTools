class AnomalyScorer {
    constructor() {
        this.model = null;
        this.modelType = 'pseudo';
        this.pseudoModel = null;
        this.tfjsLoaded = false;
        this.thresholds = {
            critical: 0.75,
            high: 0.55,
            medium: 0.30
        };
        this.featureWeights = {
            amount: 0.12,
            isLargeAmount: 0.08,
            isExtremeAmount: 0.12,
            amountDeviation: 0.10,
            amountZScore: 0.08,
            amountPercentile: 0.06,
            normalizedHour: 0.02,
            isCommonHour: 0.02,
            isOddHour: 0.08,
            isLateNight: 0.15,
            lateNightHighRisk: 0.18,
            isWeekend: 0.03,
            hourUnusualness: 0.04,
            isDomestic: 0.03,
            isForeignLocation: 0.18,
            locationChange: 0.06,
            rapidLocationChange: 0.12,
            locationUnusualness: 0.06,
            locationAnomaly: 0.12,
            isOutOfHomeLocation: 0.15,
            merchantAnomaly: 0.06,
            merchantUnusualness: 0.04,
            sameAmountConsecutive: 0.08,
            rapidTransactions: 0.06,
            firstTimeLocation: 0.08,
            firstTimeMerchant: 0.04
        };
    }

    async init() {
        console.log('🔄 初始化异常评分模型...');
        
        await this.checkTFJS();
        
        if (this.tfjsLoaded) {
            try {
                await this.loadOrBuildTFJSModel();
                console.log('✅ TensorFlow.js 模型初始化成功');
            } catch (error) {
                console.warn('⚠️ TFJS模型加载失败，使用伪模型:', error.message);
                this.initializePseudoModel();
            }
        } else {
            console.log('ℹ️ TensorFlow.js 未加载，使用伪模型');
            this.initializePseudoModel();
        }
    }

    async checkTFJS() {
        try {
            if (typeof tf !== 'undefined' && tf.ready) {
                await tf.ready();
                this.tfjsLoaded = true;
                console.log('✅ TensorFlow.js 已加载');
            }
        } catch (error) {
            console.warn('⚠️ TensorFlow.js 检查失败:', error.message);
            this.tfjsLoaded = false;
        }
    }

    initializePseudoModel() {
        this.modelType = 'pseudo';
        this.pseudoModel = {
            normalProfile: {
                centroid: this.getNormalCentroid(),
                maxDistance: 1.5,
                stdDev: 0.3
            },
            anomalyClusters: this.getAnomalyClusters()
        };
        console.log('✅ 伪模型初始化完成');
    }

    getNormalCentroid() {
        return [
            0.15,
            0.0,
            0.0,
            0.2,
            0.3,
            0.5,
            0.65,
            1.0,
            0.0,
            0.0,
            0.0,
            0.1,
            0.0,
            1.0,
            0.0,
            0.1,
            0.0,
            0.1,
            0.05,
            0.1,
            0.0,
            1.0,
            1.0,
            0.1,
            0.05,
            0.0,
            0.0,
            0.0,
            0.0
        ];
    }

    getAnomalyClusters() {
        return [
            {
                name: 'fraud_overseas',
                centroid: [0.8, 1.0, 1.0, 0.9, 0.9, 0.95, 0.13, 0.0, 1.0, 1.0, 1.0, 0.3, 0.9, 0.0, 1.0, 0.9, 0.5, 0.95, 0.9, 0.9, 1.0, 6.0, 0.0, 0.8, 0.4, 0.0, 0.0, 1.0, 0.5],
                weight: 1.2,
                threshold: 0.6
            },
            {
                name: 'large_amount',
                centroid: [0.9, 1.0, 0.8, 0.85, 0.9, 0.9, 0.6, 1.0, 0.0, 0.0, 0.0, 0.2, 0.15, 0.0, 1.0, 0.0, 0.1, 0.0, 0.1, 0.1, 0.0, 1.0, 1.0, 0.1, 0.1, 0.0, 0.0, 0.0, 0.0],
                weight: 1.0,
                threshold: 0.5
            },
            {
                name: 'night_transaction',
                centroid: [0.3, 0.0, 0.0, 0.25, 0.4, 0.5, 0.08, 0.0, 1.0, 1.0, 1.0, 0.5, 0.8, 0.0, 1.0, 0.0, 0.1, 0.0, 0.15, 0.2, 0.0, 1.0, 1.0, 0.1, 0.1, 0.0, 0.0, 0.0, 0.0],
                weight: 0.9,
                threshold: 0.45
            },
            {
                name: 'location_hop',
                centroid: [0.2, 0.0, 0.0, 0.2, 0.3, 0.5, 0.5, 0.8, 0.0, 0.0, 0.0, 0.2, 0.2, 2.0, 0.0, 1.0, 1.0, 1.0, 0.9, 0.8, 1.0, 1.0, 1.0, 0.1, 0.1, 0.0, 0.0, 1.0, 0.3],
                weight: 1.1,
                threshold: 0.55
            }
        ];
    }

    async loadOrBuildTFJSModel() {
        try {
            const savedModelPath = './model/model.json';
            this.model = await tf.loadLayersModel(savedModelPath);
            this.modelType = 'tfjs-pretrained';
            console.log('✅ 加载预训练 TFJS 模型成功');
        } catch (loadError) {
            console.log('ℹ️ 预训练模型不存在，构建新模型');
            this.model = this.buildTFJSModel();
            this.modelType = 'tfjs-built';
            console.log('✅ 构建 TFJS 模型成功');
        }
    }

    buildTFJSModel() {
        const model = tf.sequential();
        
        model.add(tf.layers.dense({
            units: 32,
            activation: 'relu',
            inputShape: [27],
            kernelInitializer: tf.initializers.glorotUniform()
        }));
        
        model.add(tf.layers.dropout({ rate: 0.3 }));
        
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));
        
        model.add(tf.layers.dropout({ rate: 0.2 }));
        
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
            metrics: ['accuracy', tf.metrics.auc()]
        });
        
        return model;
    }

    async predict(featureVector) {
        console.log('🤖 模型预测中...');
        
        if (this.modelType === 'pseudo' || !this.tfjsLoaded) {
            return this.predictWithPseudoModel(featureVector);
        }
        
        try {
            return await this.predictWithTFJS(featureVector);
        } catch (error) {
            console.warn('⚠️ TFJS预测失败，回退到伪模型:', error.message);
            return this.predictWithPseudoModel(featureVector);
        }
    }

    async predictWithTFJS(featureVector) {
        return tf.tidy(() => {
            const tensor = tf.tensor2d([featureVector]);
            const prediction = this.model.predict(tensor);
            const result = prediction.dataSync()[0];
            tensor.dispose();
            prediction.dispose();
            console.log(`📊 TFJS预测分数: ${(result * 100).toFixed(2)}%`);
            return result;
        });
    }

    predictWithPseudoModel(featureVector) {
        const { normalProfile, anomalyClusters } = this.pseudoModel;
        
        const distanceToNormal = this.calculateEuclideanDistance(
            featureVector,
            normalProfile.centroid
        );
        
        const normalizedDistance = Math.min(
            distanceToNormal / normalProfile.maxDistance,
            1.0
        );
        
        let maxClusterScore = 0;
        let matchedCluster = null;
        
        for (const cluster of anomalyClusters) {
            const distanceToCluster = this.calculateWeightedDistance(
                featureVector,
                cluster.centroid,
                this.getClusterWeights(cluster.name)
            );
            
            const clusterScore = 1 - Math.min(distanceToCluster / 2.0, 1.0);
            const weightedClusterScore = clusterScore * cluster.weight;
            
            if (weightedClusterScore > maxClusterScore && clusterScore > cluster.threshold) {
                maxClusterScore = weightedClusterScore;
                matchedCluster = cluster.name;
            }
        }
        
        const combinedScore = this.combineScores(normalizedDistance, maxClusterScore);
        
        console.log(`
📊 伪模型预测结果:
   ├─ 距离正常轮廓: ${(distanceToNormal * 100).toFixed(2)}
   ├─ 归一化距离分数: ${(normalizedDistance * 100).toFixed(2)}%
   ├─ 匹配异常簇: ${matchedCluster || '无'}
   ├─ 异常簇分数: ${(maxClusterScore * 100).toFixed(2)}%
   └─ 综合风险分数: ${(combinedScore * 100).toFixed(2)}%
`);
        
        return combinedScore;
    }

    calculateEuclideanDistance(vec1, vec2) {
        if (vec1.length !== vec2.length) {
            console.warn(`⚠️ 向量长度不匹配: ${vec1.length} vs ${vec2.length}`);
            return 0.5;
        }
        
        let sum = 0;
        const minLength = Math.min(vec1.length, vec2.length);
        
        for (let i = 0; i < minLength; i++) {
            const diff = vec1[i] - vec2[i];
            sum += diff * diff;
        }
        
        return Math.sqrt(sum);
    }

    calculateWeightedDistance(vec1, vec2, weights) {
        if (vec1.length !== vec2.length || vec1.length !== weights.length) {
            return this.calculateEuclideanDistance(vec1, vec2);
        }
        
        let sum = 0;
        let weightSum = 0;
        
        for (let i = 0; i < vec1.length; i++) {
            const diff = vec1[i] - vec2[i];
            sum += weights[i] * diff * diff;
            weightSum += weights[i];
        }
        
        return Math.sqrt(sum / Math.max(weightSum, 1));
    }

    getClusterWeights(clusterName) {
        const weights = new Array(27).fill(0.1);
        
        switch (clusterName) {
            case 'fraud_overseas':
                weights[0] = 0.15;
                weights[1] = 0.15;
                weights[2] = 0.15;
                weights[14] = 0.20;
                weights[15] = 0.15;
                weights[18] = 0.15;
                weights[8] = 0.12;
                weights[9] = 0.12;
                break;
            case 'large_amount':
                weights[0] = 0.20;
                weights[1] = 0.20;
                weights[2] = 0.20;
                weights[3] = 0.15;
                weights[4] = 0.15;
                break;
            case 'night_transaction':
                weights[8] = 0.20;
                weights[9] = 0.20;
                weights[11] = 0.15;
                weights[6] = 0.15;
                break;
            case 'location_hop':
                weights[14] = 0.20;
                weights[15] = 0.20;
                weights[16] = 0.20;
                weights[17] = 0.15;
                weights[18] = 0.15;
                break;
        }
        
        return weights;
    }

    combineScores(distanceScore, clusterScore) {
        const distanceWeight = 0.4;
        const clusterWeight = 0.6;
        
        let combined = distanceScore * distanceWeight + clusterScore * clusterWeight;
        
        if (clusterScore > 0.6 && distanceScore > 0.4) {
            combined = Math.min(1.0, combined * 1.2);
        }
        
        return Math.max(0, Math.min(1, combined));
    }

    calculateScore(features, transaction) {
        console.log('📊 计算风险评分...');
        
        const detailedScores = this.calculateDetailedScores(features);
        let score = 0;
        let totalWeight = 0;
        
        for (const [key, value] of Object.entries(detailedScores)) {
            const weight = this.featureWeights[key] || 0.05;
            score += value * weight;
            totalWeight += weight;
        }
        
        if (totalWeight > 0) {
            score = score / totalWeight;
        }
        
        score = this.applyRiskBoosters(score, features);
        
        score = Math.max(0, Math.min(1, score));
        
        const anomalies = this.detectAnomalies(features, transaction);
        const riskLevel = this.getRiskLevel(score);
        
        console.log(`
🎯 风险评分结果:
   ├─ 基础评分: ${(score * 100).toFixed(2)}%
   ├─ 风险等级: ${riskLevel.label}
   ├─ 建议动作: ${riskLevel.action}
   └─ 异常数量: ${anomalies.length}
`);
        
        return {
            score,
            detailedScores,
            riskLevel,
            anomalies,
            modelType: this.modelType
        };
    }

    calculateDetailedScores(features) {
        const scores = {};
        
        scores.amount = features.amount;
        scores.isLargeAmount = features.isLargeAmount;
        scores.isExtremeAmount = features.isExtremeAmount;
        scores.amountDeviation = features.amountDeviation;
        scores.amountZScore = features.amountZScore;
        scores.amountPercentile = features.amountPercentile;
        scores.isOddHour = features.isOddHour;
        scores.isLateNight = features.isLateNight;
        scores.hourUnusualness = features.hourUnusualness;
        scores.isForeignLocation = features.isForeignLocation;
        scores.locationChange = features.locationChange;
        scores.rapidLocationChange = features.rapidLocationChange;
        scores.locationUnusualness = features.locationUnusualness;
        scores.locationAnomaly = features.locationAnomaly;
        scores.isOutOfHomeLocation = features.isOutOfHomeLocation;
        scores.merchantAnomaly = features.merchantAnomaly;
        scores.merchantUnusualness = features.merchantUnusualness;
        scores.sameAmountConsecutive = features.sameAmountConsecutive;
        scores.rapidTransactions = features.rapidTransactions;
        scores.firstTimeLocation = features.firstTimeLocation;
        scores.firstTimeMerchant = features.firstTimeMerchant;
        
        return scores;
    }

    applyRiskBoosters(score, features) {
        let boostedScore = score;
        
        const anomalyFlags = [
            features.isExtremeAmount,
            features.isOddHour,
            features.isForeignLocation,
            features.rapidLocationChange,
            features.sameAmountConsecutive,
            features.rapidTransactions
        ];
        
        const activeAnomalies = anomalyFlags.filter(f => f === 1).length;
        
        if (activeAnomalies >= 3) {
            boostedScore += 0.15;
            console.log(`🚨 多异常叠加 (+15%): ${activeAnomalies}个异常同时触发`);
        } else if (activeAnomalies === 2) {
            boostedScore += 0.08;
            console.log(`⚠️ 双异常叠加 (+8%): 2个异常同时触发`);
        }
        
        if (features.isForeignLocation === 1 && features.isOddHour === 1) {
            boostedScore += 0.10;
            console.log(`🌍 海外深夜交易 (+10%)`);
        }
        
        if (features.isExtremeAmount === 1 && features.isForeignLocation === 1) {
            boostedScore += 0.12;
            console.log(`💰 海外大额交易 (+12%)`);
        }
        
        if (features.rapidLocationChange === 1 && features.isForeignLocation === 1) {
            boostedScore += 0.10;
            console.log(`✈️ 快速跨境移动 (+10%)`);
        }
        
        return Math.min(boostedScore, 1.0);
    }

    detectAnomalies(features, transaction) {
        const anomalies = [];
        
        if (features.isExtremeAmount === 1) {
            anomalies.push({
                type: 'extreme_amount',
                message: '极端大额交易',
                description: `交易金额 ¥${transaction.amount.toLocaleString()} 远超历史正常水平`,
                severity: 'high'
            });
        } else if (features.isLargeAmount === 1) {
            anomalies.push({
                type: 'large_amount',
                message: '大额交易异常',
                description: `交易金额 ¥${transaction.amount.toLocaleString()} 超过历史平均值的3倍`,
                severity: 'medium'
            });
        }
        
        if (features.amountZScore > 0.8) {
            anomalies.push({
                type: 'zscore',
                message: '金额统计异常',
                description: '本次交易金额的统计分布异常',
                severity: features.amountZScore > 0.95 ? 'high' : 'medium'
            });
        }
        
        if (features.lateNightHighRisk === 1) {
            anomalies.push({
                type: 'late_night',
                message: '深夜高危交易',
                description: '交易发生在凌晨0点-2点的高危时段，属于典型欺诈模式',
                severity: 'critical'
            });
        } else if (features.isOddHour === 1) {
            anomalies.push({
                type: 'odd_hour',
                message: '非常规时段交易',
                description: '交易发生在凌晨3点-6点的非活跃时段',
                severity: 'medium'
            });
        }
        
        if (features.hourUnusualness > 0.6) {
            anomalies.push({
                type: 'unusual_hour',
                message: '异常交易时段',
                description: '该时段的历史交易记录较少',
                severity: 'low'
            });
        }
        
        if (features.isForeignLocation === 1) {
            anomalies.push({
                type: 'foreign',
                message: '境外交易异常',
                description: `交易地点 ${transaction.location} 在境外，需额外验证`,
                severity: 'high'
            });
        }
        
        if (features.isOutOfHomeLocation === 1) {
            anomalies.push({
                type: 'out_of_home',
                message: '异地消费',
                description: `交易地点 ${transaction.location} 与基准地 ${features.homeLocation || '未建立'} 不同`,
                severity: 'medium'
            });
        }
        
        if (features.rapidLocationChange === 1) {
            anomalies.push({
                type: 'rapid_location',
                message: '快速地点变更',
                description: '短时间内发生跨地区交易，疑似欺诈',
                severity: 'high'
            });
        } else if (features.locationChange === 1) {
            anomalies.push({
                type: 'location_change',
                message: '地点变更',
                description: '交易地点与上一次不同',
                severity: 'low'
            });
        }
        
        if (features.firstTimeLocation === 1) {
            anomalies.push({
                type: 'new_location',
                message: '首次在此地点交易',
                description: `首次在 ${transaction.location} 进行消费`,
                severity: 'low'
            });
        }
        
        if (features.locationUnusualness > 0.85) {
            anomalies.push({
                type: 'unusual_location',
                message: '不常见交易地点',
                description: '该地点的历史交易记录较少',
                severity: 'low'
            });
        }
        
        if (features.merchantAnomaly > 0.5) {
            anomalies.push({
                type: 'merchant',
                message: '不常见商户类别',
                description: `商户类别 ${transaction.merchantCategory} 不在常用消费类型中`,
                severity: 'low'
            });
        }
        
        if (features.firstTimeMerchant === 1) {
            anomalies.push({
                type: 'new_merchant',
                message: '首次在此商户类别交易',
                description: `首次进行 ${transaction.merchantCategory} 类别的消费`,
                severity: 'low'
            });
        }
        
        if (features.sameAmountConsecutive === 1) {
            anomalies.push({
                type: 'same_amount',
                message: '连续相同金额',
                description: '连续多笔交易金额完全相同',
                severity: 'high'
            });
        }
        
        if (features.rapidTransactions === 1) {
            anomalies.push({
                type: 'rapid',
                message: '频繁交易',
                description: '短时间内发生多笔交易',
                severity: 'medium'
            });
        }
        
        return anomalies;
    }

    getRiskLevel(score) {
        if (score >= this.thresholds.critical) {
            return {
                level: 'critical',
                label: '极高风险',
                color: '#dc3545',
                action: '立即拦截',
                description: '此交易存在极高欺诈风险，建议立即拦截'
            };
        }
        if (score >= this.thresholds.high) {
            return {
                level: 'high',
                label: '高风险',
                color: '#fd7e14',
                action: '二次验证',
                description: '此交易存在较高风险，需要进行二次验证'
            };
        }
        if (score >= this.thresholds.medium) {
            return {
                level: 'medium',
                label: '中等风险',
                color: '#ffc107',
                action: '关注监控',
                description: '此交易存在一定风险特征，建议持续关注'
            };
        }
        return {
            level: 'low',
            label: '低风险',
            color: '#28a745',
            action: '正常放行',
            description: '此交易符合正常消费模式'
        };
    }

    async scoreTransaction(features, transaction, featureExtractor) {
        console.log('🧠 开始交易评分...');
        
        const ruleBasedScore = this.calculateScore(features, transaction);
        
        const featureVector = featureExtractor.toFeatureVector(features);
        
        const modelScore = await this.predict(featureVector);
        
        let finalScore;
        let scoreComposition;
        
        if (modelScore !== null && !isNaN(modelScore)) {
            const ruleWeight = 0.45;
            const modelWeight = 0.55;
            
            finalScore = ruleBasedScore.score * ruleWeight + modelScore * modelWeight;
            scoreComposition = {
                ruleBased: ruleBasedScore.score,
                modelBased: modelScore,
                final: finalScore,
                weights: { ruleBased: ruleWeight, modelBased: modelWeight }
            };
        } else {
            finalScore = ruleBasedScore.score;
            scoreComposition = {
                ruleBased: ruleBasedScore.score,
                modelBased: null,
                final: finalScore,
                note: '仅使用规则引擎评分'
            };
        }
        
        console.log(`
📈 最终评分:
   ├─ 规则引擎: ${(scoreComposition.ruleBased * 100).toFixed(2)}%
   ├─ 模型预测: ${scoreComposition.modelBased !== null ? (scoreComposition.modelBased * 100).toFixed(2) + '%' : '不可用'}
   └─ 综合分数: ${(finalScore * 100).toFixed(2)}%
`);
        
        return {
            ...ruleBasedScore,
            score: finalScore,
            riskLevel: this.getRiskLevel(finalScore),
            scoreComposition
        };
    }

    setThreshold(level, value) {
        if (this.thresholds.hasOwnProperty(level)) {
            this.thresholds[level] = value;
            console.log(`✅ 阈值更新: ${level} = ${value}`);
        }
    }

    getThresholds() {
        return { ...this.thresholds };
    }
}
