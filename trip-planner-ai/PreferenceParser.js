const PreferenceParser = {
    parse(options) {
        const { city, days, interests, budget } = options;
        
        if (!city || !days || days < 1) {
            throw new Error("请填写完整的行程信息（城市和天数）");
        }
        
        const parsedInterests = interests && interests.length > 0 
            ? interests 
            : ["历史", "自然", "美食"];

        return {
            city: city,
            days: Math.min(Math.max(parseInt(days), 1), 7),
            interests: parsedInterests,
            budget: parseInt(budget) || 1000,
            dailyBudget: (parseInt(budget) || 1000) / parseInt(days),
            maxPoisPerDay: 4,
            minPoisPerDay: 2
        };
    },

    validate(preferences) {
        const errors = [];
        
        if (!preferences.city) {
            errors.push("请选择目标城市");
        }
        
        if (!preferences.days || preferences.days < 1 || preferences.days > 7) {
            errors.push("游玩天数应在1-7天之间");
        }
        
        if (!preferences.interests || preferences.interests.length === 0) {
            errors.push("请至少选择一个兴趣偏好");
        }
        
        if (preferences.budget && preferences.budget < 100) {
            errors.push("预算过低，建议至少100元");
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    },

    expandInterests(interests) {
        const relatedTags = {
            "历史": ["历史", "古建筑", "建筑"],
            "自然": ["自然"],
            "美食": ["美食"],
            "购物": ["购物"],
            "现代": ["现代", "娱乐"],
            "古建筑": ["历史", "古建筑", "建筑"]
        };
        
        const expanded = new Set();
        
        interests.forEach(interest => {
            if (relatedTags[interest]) {
                relatedTags[interest].forEach(tag => expanded.add(tag));
            } else {
                expanded.add(interest);
            }
        });
        
        return Array.from(expanded);
    }
};
