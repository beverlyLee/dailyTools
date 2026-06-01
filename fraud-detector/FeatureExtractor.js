class FeatureExtractor {
    constructor(historyBaseline = null) {
        this.transactionHistory = [];
        this.baseline = historyBaseline || this.getDefaultBaseline();
        this.adaptiveThresholds = {
            highValueMultiplier: 3,
            extremeValueMultiplier: 10,
            consecutiveSameAmountThreshold: 3,
            rapidTransactionsWithinMinutes: 30,
            rapidTransactionCount: 3
        };
    }

    getDefaultBaseline() {
        return {
            avgAmount: 1500,
            medianAmount: 1000,
            maxAmount: 50000,
            minAmount: 10,
            stdDevAmount: 3000,
            totalTransactions: 0,
            homeLocation: null,
            commonHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
            commonMerchantCategories: ['餐饮', '零售', '交通', '娱乐'],
            commonLocations: ['中国', '北京', '上海', '广州', '深圳'],
            locationFrequency: {
                '北京': 10,
                '上海': 5,
                '中国其他': 3
            },
            merchantFrequency: {
                '餐饮': 15,
                '零售': 10,
                '交通': 8,
                '娱乐': 5
            },
            hourFrequency: {
                10: 5, 11: 8, 12: 12, 13: 10, 14: 8, 15: 6,
                16: 5, 17: 8, 18: 12, 19: 10, 20: 6
            },
            lastTransactionTime: null,
            lastTransactionLocation: null
        };
    }

    addToHistory(transaction, features) {
        const historyItem = {
            ...transaction,
            features,
            timestamp: Date.now()
        };
        this.transactionHistory.unshift(historyItem);
        
        if (this.transactionHistory.length > 100) {
            this.transactionHistory.pop();
        }
        
        this.updateBaselineFromHistory();
        return historyItem;
    }

    updateBaselineFromHistory() {
        if (this.transactionHistory.length < 3) {
            return;
        }

        const amounts = this.transactionHistory.map(t => t.amount);
        const sortedAmounts = [...amounts].sort((a, b) => a - b);
        
        this.baseline.avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        this.baseline.medianAmount = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
        this.baseline.maxAmount = Math.max(...amounts);
        this.baseline.minAmount = Math.min(...amounts);
        this.baseline.stdDevAmount = this.calculateStdDev(amounts, this.baseline.avgAmount);
        this.baseline.totalTransactions = this.transactionHistory.length;
        
        this.updateFrequencies();
    }

    calculateStdDev(values, mean) {
        if (values.length === 0) return 0;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    }

    updateFrequencies() {
        this.baseline.locationFrequency = {};
        this.baseline.merchantFrequency = {};
        this.baseline.hourFrequency = {};

        this.transactionHistory.forEach(t => {
            const location = this.normalizeLocation(t.location);
            const merchant = t.merchantCategory;
            const hour = new Date(t.time).getHours();

            this.baseline.locationFrequency[location] = (this.baseline.locationFrequency[location] || 0) + 1;
            this.baseline.merchantFrequency[merchant] = (this.baseline.merchantFrequency[merchant] || 0) + 1;
            this.baseline.hourFrequency[hour] = (this.baseline.hourFrequency[hour] || 0) + 1;
        });

        this.baseline.commonLocations = this.getTopKeys(this.baseline.locationFrequency, 5);
        this.baseline.commonMerchantCategories = this.getTopKeys(this.baseline.merchantFrequency, 4);
        this.baseline.commonHours = this.getTopKeys(this.baseline.hourFrequency, 12).map(Number);
    }

    getTopKeys(freqMap, topN) {
        return Object.entries(freqMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([key]) => key);
    }

    normalizeLocation(location) {
        if (location.includes('北京')) return '北京';
        if (location.includes('上海')) return '上海';
        if (location.includes('广州')) return '广州';
        if (location.includes('深圳')) return '深圳';
        if (location.includes('杭州')) return '杭州';
        if (location.includes('成都')) return '成都';
        if (location.includes('中国')) return '中国其他';
        if (location.includes('美国')) return '美国';
        if (location.includes('日本')) return '日本';
        if (location.includes('韩国')) return '韩国';
        if (location.includes('英国')) return '英国';
        if (location.includes('法国')) return '法国';
        if (location.includes('德国')) return '德国';
        if (location.includes('新加坡')) return '新加坡';
        return location;
    }

    extract(transaction) {
        const features = {};

        features.amount = this.normalizeAmount(transaction.amount);
        features.isLargeAmount = this.isLargeAmount(transaction.amount);
        features.isExtremeAmount = this.isExtremeAmount(transaction.amount);
        features.amountDeviation = this.calculateAmountDeviation(transaction.amount);
        features.amountZScore = this.calculateAmountZScore(transaction.amount);
        features.amountPercentile = this.calculateAmountPercentile(transaction.amount);

        const timeInfo = this.extractTimeFeatures(transaction.time);
        Object.assign(features, timeInfo);

        const locationInfo = this.extractLocationFeatures(transaction.location, transaction.time);
        Object.assign(features, locationInfo);

        const merchantInfo = this.extractMerchantFeatures(transaction.merchantCategory, transaction.merchant);
        Object.assign(features, merchantInfo);

        const behavioralInfo = this.extractBehavioralFeatures(transaction);
        Object.assign(features, behavioralInfo);

        return features;
    }

    normalizeAmount(amount) {
        const baselineMax = this.baseline.maxAmount * 2;
        if (baselineMax === 0) return 0;
        return Math.min(amount / baselineMax, 1);
    }

    isLargeAmount(amount) {
        return amount > this.baseline.medianAmount * this.adaptiveThresholds.highValueMultiplier ? 1 : 0;
    }

    isExtremeAmount(amount) {
        return amount > this.baseline.medianAmount * this.adaptiveThresholds.extremeValueMultiplier ? 1 : 0;
    }

    calculateAmountDeviation(amount) {
        if (this.baseline.medianAmount === 0) return 0;
        const deviation = Math.abs(amount - this.baseline.medianAmount) / this.baseline.medianAmount;
        return Math.min(deviation / 5, 1);
    }

    calculateAmountZScore(amount) {
        if (this.baseline.stdDevAmount === 0) return 0;
        const zScore = Math.abs(amount - this.baseline.avgAmount) / this.baseline.stdDevAmount;
        return Math.min(zScore / 3, 1);
    }

    calculateAmountPercentile(amount) {
        if (this.transactionHistory.length === 0) return 0.5;
        
        const historyAmounts = this.transactionHistory.map(t => t.amount).sort((a, b) => a - b);
        const countBelow = historyAmounts.filter(a => a <= amount).length;
        return countBelow / historyAmounts.length;
    }

    extractTimeFeatures(time) {
        const date = new Date(time);
        if (isNaN(date.getTime())) {
            console.warn('⚠️ 无效的交易时间:', time);
            return {
                hour: 12,
                normalizedHour: 0.5,
                isCommonHour: 1,
                isOddHour: 0,
                isLateNight: 0,
                isWeekend: 0,
                hourUnusualness: 0,
                lateNightHighRisk: 0
            };
        }
        
        const hour = date.getHours();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        const isCommonHour = this.baseline.commonHours.includes(hour) ? 1 : 0;
        const isOddHour = (hour >= 0 && hour < 6) ? 1 : 0;
        const isLateNight = (hour >= 0 && hour <= 2) ? 1 : 0;
        const lateNightHighRisk = (hour >= 0 && hour <= 2) ? 1 : 0;
        const normalizedHour = hour / 23;

        const hourFrequency = this.baseline.hourFrequency[hour] || 0;
        const totalTransactions = Math.max(this.transactionHistory.length, 1);
        const hourUnusualness = 1 - (hourFrequency / totalTransactions);

        return {
            hour,
            normalizedHour,
            isCommonHour,
            isOddHour,
            isLateNight,
            lateNightHighRisk,
            isWeekend,
            hourUnusualness: Math.min(hourUnusualness, 1)
        };
    }

    extractLocationFeatures(location, time) {
        const normalizedLocation = this.normalizeLocation(location);
        const locationFrequency = this.baseline.locationFrequency[normalizedLocation] || 0;
        const totalTransactions = Math.max(this.transactionHistory.length, 1);

        const isDomestic = this.isDomesticLocation(location);
        const isForeignLocation = !isDomestic ? 1 : 0;

        let locationChange = 0;
        if (this.baseline.lastTransactionLocation) {
            const lastNormalized = this.normalizeLocation(this.baseline.lastTransactionLocation);
            if (lastNormalized !== normalizedLocation) {
                locationChange = 1;
            }
        }

        const transactionDate = new Date(time);
        const transactionTimeMs = isNaN(transactionDate.getTime()) ? Date.now() : transactionDate.getTime();
        
        let rapidLocationChange = 0;
        if (this.baseline.lastTransactionTime && this.baseline.lastTransactionLocation) {
            const timeDiffMinutes = (transactionTimeMs - this.baseline.lastTransactionTime) / 60000;
            const lastNormalized = this.normalizeLocation(this.baseline.lastTransactionLocation);
            if (timeDiffMinutes > 0 && timeDiffMinutes < this.adaptiveThresholds.rapidTransactionsWithinMinutes && 
                lastNormalized !== normalizedLocation) {
                rapidLocationChange = 1;
            }
        }

        const locationUnusualness = 1 - (locationFrequency / Math.max(totalTransactions, 1));

        this.updateHomeLocation(normalizedLocation);
        
        let isOutOfHomeLocation = 0;
        if (this.baseline.homeLocation && this.baseline.homeLocation !== normalizedLocation) {
            isOutOfHomeLocation = 1;
        }

        let travelDistanceScore = 0;
        if (isForeignLocation) {
            travelDistanceScore = 0.9;
        } else if (isOutOfHomeLocation) {
            travelDistanceScore = 0.7;
        } else if (locationChange) {
            travelDistanceScore = 0.3;
        }

        this.baseline.lastTransactionLocation = location;
        this.baseline.lastTransactionTime = transactionTimeMs;

        return {
            location: this.encodeLocation(location),
            normalizedLocation,
            isDomestic: isDomestic ? 1 : 0,
            isForeignLocation,
            locationChange,
            rapidLocationChange,
            locationUnusualness: Math.min(locationUnusualness, 1),
            locationAnomaly: travelDistanceScore,
            isOutOfHomeLocation,
            homeLocation: this.baseline.homeLocation
        };
    }

    updateHomeLocation(normalizedLocation) {
        if (!this.baseline.homeLocation) {
            this.baseline.homeLocation = normalizedLocation;
            console.log(`🏠 首次交易，设置基准地: ${normalizedLocation}`);
            return;
        }

        if (this.transactionHistory.length >= 5) {
            const locationCounts = {};
            this.transactionHistory.forEach(t => {
                const loc = this.normalizeLocation(t.location);
                locationCounts[loc] = (locationCounts[loc] || 0) + 1;
            });
            locationCounts[normalizedLocation] = (locationCounts[normalizedLocation] || 0) + 1;

            let maxCount = 0;
            let maxLocation = this.baseline.homeLocation;
            
            for (const [loc, count] of Object.entries(locationCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    maxLocation = loc;
                }
            }

            if (maxLocation !== this.baseline.homeLocation) {
                const oldHome = this.baseline.homeLocation;
                this.baseline.homeLocation = maxLocation;
                console.log(`🏠 基准地更新: ${oldHome} → ${maxLocation} (交易次数: ${maxCount})`);
            }
        }
    }

    isDomesticLocation(location) {
        const domesticKeywords = ['中国', '北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安'];
        return domesticKeywords.some(keyword => location.includes(keyword));
    }

    encodeLocation(location) {
        const locations = ['中国', '美国', '日本', '韩国', '英国', '法国', '德国', '新加坡', '其他'];
        for (let i = 0; i < locations.length; i++) {
            if (location.includes(locations[i])) {
                return i;
            }
        }
        return locations.length - 1;
    }

    extractMerchantFeatures(category, merchant) {
        const merchantFrequency = this.baseline.merchantFrequency[category] || 0;
        const totalTransactions = Math.max(this.transactionHistory.length, 1);

        const isCommonMerchant = this.baseline.commonMerchantCategories.includes(category) ? 1 : 0;
        const merchantUnusualness = 1 - (merchantFrequency / Math.max(totalTransactions, 1));

        let merchantAnomaly = 0;
        if (!this.baseline.commonMerchantCategories.includes(category)) {
            if (category === '加油站') {
                merchantAnomaly = 0.3;
            } else if (category === '医疗') {
                merchantAnomaly = 0.4;
            } else if (category === '教育') {
                merchantAnomaly = 0.2;
            } else {
                merchantAnomaly = 0.5;
            }
        }

        return {
            merchantCategory: this.encodeMerchantCategory(category),
            merchant,
            isCommonMerchant,
            merchantUnusualness: Math.min(merchantUnusualness, 1),
            merchantAnomaly
        };
    }

    encodeMerchantCategory(category) {
        const categories = ['餐饮', '零售', '交通', '娱乐', '医疗', '教育', '加油站', '其他'];
        for (let i = 0; i < categories.length; i++) {
            if (category === categories[i]) {
                return i;
            }
        }
        return categories.length - 1;
    }

    extractBehavioralFeatures(transaction) {
        const features = {
            sameAmountConsecutive: 0,
            rapidTransactions: 0,
            firstTimeLocation: 0,
            firstTimeMerchant: 0
        };

        if (this.transactionHistory.length > 0) {
            const lastTransactions = this.transactionHistory.slice(0, this.adaptiveThresholds.consecutiveSameAmountThreshold);
            const sameAmountCount = lastTransactions.filter(t => t.amount === transaction.amount).length;
            if (sameAmountCount >= this.adaptiveThresholds.consecutiveSameAmountThreshold) {
                features.sameAmountConsecutive = 1;
            }

            const recentTransactions = this.transactionHistory.filter(t => {
                const timeDiff = Date.now() - t.timestamp;
                return timeDiff < this.adaptiveThresholds.rapidTransactionsWithinMinutes * 60000;
            });
            if (recentTransactions.length >= this.adaptiveThresholds.rapidTransactionCount) {
                features.rapidTransactions = 1;
            }

            const normalizedLocation = this.normalizeLocation(transaction.location);
            const hasLocationBefore = this.transactionHistory.some(t => 
                this.normalizeLocation(t.location) === normalizedLocation
            );
            features.firstTimeLocation = hasLocationBefore ? 0 : 1;

            const hasMerchantBefore = this.transactionHistory.some(t => 
                t.merchantCategory === transaction.merchantCategory
            );
            features.firstTimeMerchant = hasMerchantBefore ? 0 : 1;
        }

        return features;
    }

    toFeatureVector(features) {
        return [
            features.amount,
            features.isLargeAmount,
            features.isExtremeAmount,
            features.amountDeviation,
            features.amountZScore,
            features.amountPercentile,
            features.normalizedHour,
            features.isCommonHour,
            features.isOddHour,
            features.isLateNight,
            features.lateNightHighRisk,
            features.isWeekend,
            features.hourUnusualness,
            features.location,
            features.isDomestic,
            features.isForeignLocation,
            features.locationChange,
            features.rapidLocationChange,
            features.locationUnusualness,
            features.locationAnomaly,
            features.isOutOfHomeLocation,
            features.merchantCategory,
            features.isCommonMerchant,
            features.merchantUnusualness,
            features.merchantAnomaly,
            features.sameAmountConsecutive,
            features.rapidTransactions,
            features.firstTimeLocation,
            features.firstTimeMerchant
        ];
    }

    extractAndVectorize(transaction) {
        const features = this.extract(transaction);
        return this.toFeatureVector(features);
    }

    getBaseline() {
        return { ...this.baseline };
    }

    getHistory() {
        return [...this.transactionHistory];
    }

    clearHistory() {
        this.transactionHistory = [];
        this.baseline = this.getDefaultBaseline();
    }
}
