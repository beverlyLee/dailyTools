class FeatureExtractor {
    constructor(historyBaseline = null) {
        this.historyBaseline = historyBaseline || {
            avgAmount: 1200,
            maxAmount: 8000,
            commonHours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
            commonMerchantCategories: ['餐饮', '零售', '交通', '娱乐'],
            commonLocations: ['中国', '北京', '上海', '广州', '深圳']
        };
    }

    extract(transaction) {
        const features = {};

        features.amount = this.normalizeAmount(transaction.amount);
        features.isLargeAmount = this.isLargeAmount(transaction.amount);
        features.amountDeviation = this.calculateAmountDeviation(transaction.amount);

        const timeInfo = this.extractTimeFeatures(transaction.time);
        Object.assign(features, timeInfo);

        features.location = this.extractLocationFeature(transaction.location);
        features.isForeignLocation = this.isForeignLocation(transaction.location);
        features.locationAnomaly = this.calculateLocationAnomaly(transaction.location);

        features.merchantCategory = this.extractMerchantCategory(transaction.merchantCategory);
        features.merchantAnomaly = this.calculateMerchantAnomaly(transaction.merchantCategory);

        return features;
    }

    normalizeAmount(amount) {
        const baselineMax = this.historyBaseline.maxAmount * 1.5;
        return Math.min(amount / baselineMax, 1);
    }

    isLargeAmount(amount) {
        return amount > this.historyBaseline.maxAmount ? 1 : 0;
    }

    calculateAmountDeviation(amount) {
        if (this.historyBaseline.avgAmount === 0) return 0;
        return Math.abs(amount - this.historyBaseline.avgAmount) / this.historyBaseline.avgAmount;
    }

    extractTimeFeatures(time) {
        const date = new Date(time);
        const hour = date.getHours();
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        const isCommonHour = this.historyBaseline.commonHours.includes(hour) ? 1 : 0;
        const isOddHour = (hour >= 0 && hour < 6) ? 1 : 0;
        const normalizedHour = hour / 23;

        return {
            hour,
            normalizedHour,
            isCommonHour,
            isOddHour,
            isWeekend
        };
    }

    extractLocationFeature(location) {
        const locations = ['中国', '美国', '日本', '韩国', '英国', '法国', '德国', '其他'];
        for (let i = 0; i < locations.length; i++) {
            if (location.includes(locations[i])) {
                return i;
            }
        }
        return locations.length - 1;
    }

    isForeignLocation(location) {
        for (const commonLoc of this.historyBaseline.commonLocations) {
            if (location.includes(commonLoc)) {
                return 0;
            }
        }
        return 1;
    }

    calculateLocationAnomaly(location) {
        if (this.isForeignLocation(location)) {
            return 0.8;
        }
        for (const commonLoc of this.historyBaseline.commonLocations) {
            if (location.includes(commonLoc)) {
                return 0;
            }
        }
        return 0.3;
    }

    extractMerchantCategory(category) {
        const categories = ['餐饮', '零售', '交通', '娱乐', '医疗', '教育', '加油站', '其他'];
        for (let i = 0; i < categories.length; i++) {
            if (category === categories[i]) {
                return i;
            }
        }
        return categories.length - 1;
    }

    calculateMerchantAnomaly(category) {
        if (this.historyBaseline.commonMerchantCategories.includes(category)) {
            return 0;
        }
        if (category === '加油站') {
            return 0.4;
        }
        return 0.5;
    }

    toFeatureVector(features) {
        return [
            features.amount,
            features.isLargeAmount,
            features.amountDeviation,
            features.normalizedHour,
            features.isCommonHour,
            features.isOddHour,
            features.isWeekend,
            features.location,
            features.isForeignLocation,
            features.locationAnomaly,
            features.merchantCategory,
            features.merchantAnomaly
        ];
    }

    extractAndVectorize(transaction) {
        const features = this.extract(transaction);
        return this.toFeatureVector(features);
    }
}
