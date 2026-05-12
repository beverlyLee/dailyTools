class MealAnalyzer {
    constructor(foodDatabase) {
        this.foodDatabase = foodDatabase;
        this.foods = foodDatabase.foods;
        this.foodIndex = this.buildFoodIndex();
    }

    buildFoodIndex() {
        const index = new Map();
        for (const food of this.foods) {
            index.set(food.name, food);
            for (const alias of food.aliases || []) {
                if (!index.has(alias)) {
                    index.set(alias, food);
                }
            }
        }
        return index;
    }

    findFood(query) {
        if (!query) return null;
        const normalized = query.trim().toLowerCase();

        if (this.foodIndex.has(query)) {
            return this.foodIndex.get(query);
        }

        for (const [key, food] of this.foodIndex.entries()) {
            if (key.toLowerCase().includes(normalized) || normalized.includes(key.toLowerCase())) {
                return food;
            }
        }

        for (const food of this.foods) {
            if (food.name.includes(query) || query.includes(food.name)) {
                return food;
            }
        }

        return null;
    }

    parsePortion(text) {
        const portionPatterns = [
            { pattern: /(\d+)\s*(?:碗|杯|瓶|罐|份|个|块|片|g|克|ml|毫升)/i, multiplier: 1 },
            { pattern: /(?:一|1)\s*(?:碗|杯|瓶|罐|份|个|块|片)/i, multiplier: 1 },
            { pattern: /(?:两|2)\s*(?:碗|杯|瓶|罐|份|个|块|片)/i, multiplier: 2 },
            { pattern: /(?:三|3)\s*(?:碗|杯|瓶|罐|份|个|块|片)/i, multiplier: 3 }
        ];

        for (const { pattern, multiplier } of portionPatterns) {
            const match = text.match(pattern);
            if (match) {
                if (match[1]) {
                    return parseInt(match[1]);
                }
                return multiplier;
            }
        }

        return 1;
    }

    estimateAmount(text, food) {
        const portionMap = this.foodDatabase.mealPortionEstimates || {};
        
        for (const [phrase, amountStr] of Object.entries(portionMap)) {
            if (text.includes(phrase)) {
                const amountMatch = amountStr.match(/(\d+)\s*(g|ml)/i);
                if (amountMatch) {
                    return {
                        value: parseInt(amountMatch[1]),
                        unit: amountMatch[2].toLowerCase()
                    };
                }
            }
        }

        const explicitMatch = text.match(/(\d+)\s*(g|克|ml|毫升)/i);
        if (explicitMatch) {
            return {
                value: parseInt(explicitMatch[1]),
                unit: explicitMatch[2] === 'ml' || explicitMatch[2] === '毫升' ? 'ml' : 'g'
            };
        }

        const defaultPortions = {
            '主食': 150,
            '饮料': 330,
            '肉类': 100,
            '蔬菜': 150,
            '水果': 150,
            '蛋类': 50,
            '奶制品': 250,
            '零食': 50
        };

        const unit = food.serving && food.serving.includes('ml') ? 'ml' : 'g';
        return {
            value: defaultPortions[food.category] || 100,
            unit
        };
    }

    parseMealText(mealText) {
        const items = mealText
            .split(/[+、,，\s]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const parsedItems = [];

        for (const item of items) {
            const food = this.findFood(item);
            if (food) {
                const estimatedAmount = this.estimateAmount(item, food);
                const servingAmount = this.parseServingAmount(food.serving);
                const ratio = servingAmount > 0 ? estimatedAmount.value / servingAmount : 1;

                parsedItems.push({
                    name: food.name,
                    matchedText: item,
                    food,
                    amount: estimatedAmount.value,
                    unit: estimatedAmount.unit,
                    ratio,
                    nutrition: this.scaleNutrition(food, ratio)
                });
            }
        }

        return parsedItems;
    }

    parseServingAmount(serving) {
        if (!serving) return 100;
        const match = serving.match(/(\d+)/);
        return match ? parseInt(match[1]) : 100;
    }

    scaleNutrition(food, ratio) {
        return {
            calories: food.calories * ratio,
            carbs: food.carbs * ratio,
            protein: food.protein * ratio,
            fat: food.fat * ratio,
            sugar: food.sugar * ratio,
            sodium: food.sodium * ratio,
            fiber: food.fiber * ratio,
            glycemicIndex: food.glycemicIndex
        };
    }

    aggregateNutrition(items) {
        const totals = {
            calories: 0,
            carbs: 0,
            protein: 0,
            fat: 0,
            sugar: 0,
            sodium: 0,
            fiber: 0,
            glycemicIndex: [],
            warnings: [],
            tags: new Set()
        };

        for (const item of items) {
            const n = item.nutrition;
            totals.calories += n.calories;
            totals.carbs += n.carbs;
            totals.protein += n.protein;
            totals.fat += n.fat;
            totals.sugar += n.sugar;
            totals.sodium += n.sodium;
            totals.fiber += n.fiber;

            if (n.glycemicIndex > 0) {
                totals.glycemicIndex.push(n.glycemicIndex);
            }

            for (const warning of item.food.healthWarnings || []) {
                if (!totals.warnings.includes(warning)) {
                    totals.warnings.push(warning);
                }
            }

            for (const tag of item.food.tags || []) {
                totals.tags.add(tag);
            }
        }

        const carbsRatio = totals.carbs + totals.protein + totals.fat > 0 
            ? (totals.carbs * 4 / (totals.carbs * 4 + totals.protein * 4 + totals.fat * 9)) * 100 
            : 0;

        const proteinRatio = totals.carbs + totals.protein + totals.fat > 0
            ? (totals.protein * 4 / (totals.carbs * 4 + totals.protein * 4 + totals.fat * 9)) * 100
            : 0;

        const fatRatio = totals.carbs + totals.protein + totals.fat > 0
            ? (totals.fat * 9 / (totals.carbs * 4 + totals.protein * 4 + totals.fat * 9)) * 100
            : 0;

        return {
            ...totals,
            calories: parseFloat(totals.calories.toFixed(1)),
            carbs: parseFloat(totals.carbs.toFixed(1)),
            protein: parseFloat(totals.protein.toFixed(1)),
            fat: parseFloat(totals.fat.toFixed(1)),
            sugar: parseFloat(totals.sugar.toFixed(1)),
            sodium: parseFloat(totals.sodium.toFixed(1)),
            fiber: parseFloat(totals.fiber.toFixed(1)),
            avgGlycemicIndex: totals.glycemicIndex.length > 0
                ? parseFloat((totals.glycemicIndex.reduce((a, b) => a + b, 0) / totals.glycemicIndex.length).toFixed(1))
                : 0,
            tags: Array.from(totals.tags),
            ratios: {
                carbs: parseFloat(carbsRatio.toFixed(1)),
                protein: parseFloat(proteinRatio.toFixed(1)),
                fat: parseFloat(fatRatio.toFixed(1))
            }
        };
    }

    analyze(mealText) {
        const items = this.parseMealText(mealText);
        const aggregate = this.aggregateNutrition(items);

        return {
            rawInput: mealText,
            items,
            aggregate,
            matchedCount: items.length
        };
    }
}

window.MealAnalyzer = MealAnalyzer;
