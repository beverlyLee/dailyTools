class NutritionDB {
    constructor() {
        this.foodDatabase = {
            rice: {
                name: '米饭',
                icon: '🍚',
                density: { min: 0.8, max: 1.0 },
                caloriesPer100g: { min: 110, max: 130 },
                description: '煮熟的白米饭',
                category: 'staple'
            },
            noodles: {
                name: '面条',
                icon: '🍜',
                density: { min: 0.7, max: 0.9 },
                caloriesPer100g: { min: 100, max: 130 },
                description: '煮熟的面条',
                category: 'staple'
            },
            bread: {
                name: '面包',
                icon: '🍞',
                density: { min: 0.3, max: 0.5 },
                caloriesPer100g: { min: 260, max: 310 },
                description: '普通白面包',
                category: 'staple'
            },
            chicken: {
                name: '鸡肉',
                icon: '🍗',
                density: { min: 1.0, max: 1.2 },
                caloriesPer100g: { min: 160, max: 200 },
                description: '烹饪后的鸡肉',
                category: 'meat'
            },
            pork: {
                name: '猪肉',
                icon: '🥓',
                density: { min: 0.9, max: 1.1 },
                caloriesPer100g: { min: 200, max: 300 },
                description: '烹饪后的猪肉',
                category: 'meat'
            },
            beef: {
                name: '牛肉',
                icon: '🥩',
                density: { min: 1.0, max: 1.2 },
                caloriesPer100g: { min: 180, max: 250 },
                description: '烹饪后的牛肉',
                category: 'meat'
            },
            fish: {
                name: '鱼肉',
                icon: '🐟',
                density: { min: 1.0, max: 1.1 },
                caloriesPer100g: { min: 100, max: 150 },
                description: '烹饪后的鱼肉',
                category: 'meat'
            },
            egg: {
                name: '鸡蛋',
                icon: '🥚',
                density: { min: 1.0, max: 1.1 },
                caloriesPer100g: { min: 140, max: 160 },
                description: '整蛋（烹饪后）',
                category: 'protein'
            },
            vegetables: {
                name: '蔬菜',
                icon: '🥬',
                density: { min: 0.5, max: 0.7 },
                caloriesPer100g: { min: 20, max: 80 },
                description: '烹饪后的蔬菜',
                category: 'vegetable'
            },
            tofu: {
                name: '豆腐',
                icon: '🧈',
                density: { min: 0.8, max: 1.0 },
                caloriesPer100g: { min: 70, max: 90 },
                description: '普通豆腐',
                category: 'protein'
            },
            potato: {
                name: '土豆',
                icon: '🥔',
                density: { min: 0.8, max: 1.0 },
                caloriesPer100g: { min: 70, max: 100 },
                description: '烹饪后的土豆',
                category: 'staple'
            },
            mixedDish: {
                name: '混合菜肴',
                icon: '🍱',
                density: { min: 0.8, max: 1.0 },
                caloriesPer100g: { min: 120, max: 200 },
                description: '多种食材混合的菜肴',
                category: 'mixed'
            },
            soup: {
                name: '汤类',
                icon: '🍲',
                density: { min: 0.9, max: 1.0 },
                caloriesPer100g: { min: 30, max: 80 },
                description: '各类汤品',
                category: 'soup'
            },
            iceCream: {
                name: '冰淇淋',
                icon: '🍦',
                density: { min: 0.6, max: 0.8 },
                caloriesPer100g: { min: 180, max: 280 },
                description: '冰淇淋/雪糕',
                category: 'dessert'
            },
            cake: {
                name: '蛋糕',
                icon: '🎂',
                density: { min: 0.4, max: 0.6 },
                caloriesPer100g: { min: 250, max: 400 },
                description: '奶油蛋糕',
                category: 'dessert'
            },
            chocolate: {
                name: '巧克力',
                icon: '🍫',
                density: { min: 1.2, max: 1.4 },
                caloriesPer100g: { min: 500, max: 600 },
                description: '巧克力/巧克力制品',
                category: 'dessert'
            },
            candy: {
                name: '糖果',
                icon: '🍬',
                density: { min: 1.3, max: 1.5 },
                caloriesPer100g: { min: 350, max: 450 },
                description: '糖果/奶糖',
                category: 'dessert'
            },
            fruit: {
                name: '水果',
                icon: '🍎',
                density: { min: 0.8, max: 1.0 },
                caloriesPer100g: { min: 40, max: 80 },
                description: '新鲜水果',
                category: 'fruit'
            },
            mango: {
                name: '芒果',
                icon: '🥭',
                density: { min: 0.9, max: 1.05 },
                caloriesPer100g: { min: 50, max: 70 },
                description: '芒果/芒果制品',
                category: 'fruit'
            },
            strawberry: {
                name: '草莓',
                icon: '🍓',
                density: { min: 0.9, max: 1.0 },
                caloriesPer100g: { min: 30, max: 45 },
                description: '草莓',
                category: 'fruit'
            },
            watermelon: {
                name: '西瓜',
                icon: '🍉',
                density: { min: 0.9, max: 1.0 },
                caloriesPer100g: { min: 25, max: 35 },
                description: '西瓜',
                category: 'fruit'
            },
            drink: {
                name: '饮料',
                icon: '🥤',
                density: { min: 1.0, max: 1.05 },
                caloriesPer100g: { min: 40, max: 150 },
                description: '含糖饮料',
                category: 'drink'
            },
            milk: {
                name: '牛奶/奶茶',
                icon: '🥛',
                density: { min: 1.0, max: 1.05 },
                caloriesPer100g: { min: 50, max: 120 },
                description: '牛奶/奶茶/奶昔',
                category: 'drink'
            },
            juice: {
                name: '果汁',
                icon: '🧃',
                density: { min: 1.0, max: 1.05 },
                caloriesPer100g: { min: 40, max: 80 },
                description: '果汁',
                category: 'drink'
            },
            coffee: {
                name: '咖啡',
                icon: '☕',
                density: { min: 1.0, max: 1.03 },
                caloriesPer100g: { min: 0, max: 100 },
                description: '咖啡（含糖咖啡热量更高）',
                category: 'drink'
            },
            pasta: {
                name: '意大利面',
                icon: '🍝',
                density: { min: 0.7, max: 0.9 },
                caloriesPer100g: { min: 130, max: 180 },
                description: '烹饪后的意大利面',
                category: 'staple'
            },
            pizza: {
                name: '披萨',
                icon: '🍕',
                density: { min: 0.5, max: 0.7 },
                caloriesPer100g: { min: 250, max: 350 },
                description: '披萨',
                category: 'staple'
            },
            hamburger: {
                name: '汉堡',
                icon: '🍔',
                density: { min: 0.5, max: 0.7 },
                caloriesPer100g: { min: 200, max: 300 },
                description: '汉堡/三明治',
                category: 'staple'
            },
            fries: {
                name: '薯条',
                icon: '🍟',
                density: { min: 0.4, max: 0.6 },
                caloriesPer100g: { min: 280, max: 380 },
                description: '炸薯条',
                category: 'staple'
            },
            sushi: {
                name: '寿司',
                icon: '🍣',
                density: { min: 0.8, max: 1.0 },
                caloriesPer100g: { min: 120, max: 200 },
                description: '寿司/刺身',
                category: 'staple'
            },
            dumpling: {
                name: '饺子',
                icon: '🥟',
                density: { min: 0.8, max: 1.0 },
                caloriesPer100g: { min: 180, max: 250 },
                description: '饺子/馄饨',
                category: 'staple'
            }
        };
        
        this.containerTypes = {
            plate: {
                name: '盘子',
                icon: '🍽️',
                defaultSize: 26,
                sizeUnit: '厘米（直径）',
                sizeHint: '常见餐盘：24-28cm',
                isEdible: false,
                shape: 'circle'
            },
            bowl: {
                name: '碗',
                icon: '🥣',
                defaultSize: 15,
                sizeUnit: '厘米（直径）',
                sizeHint: '常见饭碗：12-16cm，面碗：16-20cm',
                isEdible: false,
                shape: 'circle'
            },
            cup: {
                name: '杯子',
                icon: '🥤',
                defaultSize: 12,
                sizeUnit: '厘米（直径）',
                sizeHint: '常见杯子：8-15cm，保温杯：7-9cm',
                isEdible: false,
                shape: 'circle'
            },
            cone: {
                name: '甜筒/蛋筒',
                icon: '🍦',
                defaultSize: 6,
                sizeUnit: '厘米（直径）',
                sizeHint: '蛋筒：5-8cm',
                isEdible: true,
                defaultContainerCalories: 150,
                shape: 'circle'
            },
            packaging: {
                name: '包装盒',
                icon: '📦',
                defaultSize: 20,
                sizeUnit: '厘米（宽度）',
                sizeHint: '外卖盒：15-25cm',
                isEdible: false,
                shape: 'rectangle'
            },
            custom: {
                name: '自定义',
                icon: '📐',
                defaultSize: 15,
                sizeUnit: '厘米',
                sizeHint: '请输入实际尺寸',
                isEdible: false,
                shape: 'circle'
            }
        };
        
        this.categoryMapping = {
            rice: ['rice', '白米饭', '米饭', '饭'],
            noodles: ['noodles', '面条', '面', '拉面'],
            bread: ['bread', '面包', '吐司', '法棍'],
            chicken: ['chicken', '鸡肉', '鸡腿', '鸡翅', '炸鸡'],
            pork: ['pork', '猪肉', '红烧肉', '排骨', '回锅肉'],
            beef: ['beef', '牛肉', '牛排', '牛腩'],
            fish: ['fish', '鱼肉', '鱼', '三文鱼', '鳕鱼'],
            egg: ['egg', '鸡蛋', '蛋', '煎蛋', '炒蛋'],
            vegetables: ['vegetables', '蔬菜', '青菜', '白菜', '菠菜', '花菜', '西兰花', '胡萝卜', '番茄', '黄瓜'],
            tofu: ['tofu', '豆腐', '豆干', '腐竹'],
            potato: ['potato', '土豆', '马铃薯', '薯条', '薯片'],
            mixedDish: ['mixed', '菜肴', '炒菜', '盖浇', '烩菜'],
            soup: ['soup', '汤', '粥', '羹'],
            iceCream: ['icecream', '冰淇淋', '雪糕', '冰棒', '甜筒'],
            cake: ['cake', '蛋糕', '奶油蛋糕', '芝士蛋糕'],
            chocolate: ['chocolate', '巧克力', '可可', '布朗尼'],
            candy: ['candy', '糖果', '糖', '奶糖', '硬糖'],
            fruit: ['fruit', '水果', '苹果', '香蕉', '橙子'],
            mango: ['mango', '芒果', '芒果干', '芒果酱'],
            strawberry: ['strawberry', '草莓', '草莓酱'],
            watermelon: ['watermelon', '西瓜', '甜瓜'],
            drink: ['drink', '饮料', '可乐', '雪碧', '汽水'],
            milk: ['milk', '牛奶', '奶茶', '奶昔', '酸奶'],
            juice: ['juice', '果汁', '橙汁', '苹果汁'],
            coffee: ['coffee', '咖啡', '拿铁', '卡布奇诺', '美式'],
            pasta: ['pasta', '意大利面', '意面', '通心粉'],
            pizza: ['pizza', '披萨', '比萨'],
            hamburger: ['hamburger', '汉堡', '三明治', '热狗'],
            fries: ['fries', '薯条', '炸薯条', '土豆条'],
            sushi: ['sushi', '寿司', '刺身', '生鱼片'],
            dumpling: ['dumpling', '饺子', '馄饨', '包子', '小笼包']
        };
    }

    getContainerTypes() {
        return this.containerTypes;
    }

    getContainerInfo(containerType) {
        return this.containerTypes[containerType] || this.containerTypes.plate;
    }

    getFoodInfo(foodType) {
        return this.foodDatabase[foodType] || this.foodDatabase.mixedDish;
    }

    getAllFoodTypes() {
        return Object.keys(this.foodDatabase);
    }

    calculateCalories(volumeCm3, foodType) {
        const foodInfo = this.getFoodInfo(foodType);
        
        const weightMin = volumeCm3 * foodInfo.density.min;
        const weightMax = volumeCm3 * foodInfo.density.max;
        
        const caloriesMin = (weightMin * foodInfo.caloriesPer100g.min) / 100;
        const caloriesMax = (weightMax * foodInfo.caloriesPer100g.max) / 100;
        
        return {
            foodType: foodType,
            foodInfo: foodInfo,
            volumeCm3: volumeCm3,
            weight: {
                min: Math.round(weightMin),
                max: Math.round(weightMax)
            },
            calories: {
                min: Math.round(caloriesMin),
                max: Math.round(caloriesMax)
            }
        };
    }

    estimateFoodTypeFromColor(hsvColor, extraFeatures = {}) {
        const { h, s, v } = hsvColor;
        const { brightness, saturation, redness, greenness, blueness, yellowness } = extraFeatures;

        if (this.isBrightYellow(h, s, v)) {
            return 'mango';
        }

        if (this.isBrightRed(h, s, v)) {
            return 'strawberry';
        }

        if (this.isWhiteRice(h, s, v)) {
            return 'rice';
        }

        if (this.isIceCream(h, s, v)) {
            return 'iceCream';
        }

        if (this.isCake(h, s, v)) {
            return 'cake';
        }

        if (this.isDarkBrown(h, s, v)) {
            return 'chocolate';
        }

        if (this.isRedMeat(h, s, v)) {
            return 'beef';
        }

        if (this.isPinkPork(h, s, v)) {
            return 'pork';
        }

        if (this.isLightYellowMeat(h, s, v)) {
            return 'chicken';
        }

        if (this.isGreenVegetable(h, s, v)) {
            return 'vegetables';
        }

        if (this.isOrangeFruit(h, s, v)) {
            return 'mango';
        }

        if (this.isLightGreenFruit(h, s, v)) {
            return 'fruit';
        }

        if (this.isYellowDessert(h, s, v)) {
            return 'cake';
        }

        if (this.isEgg(h, s, v)) {
            return 'egg';
        }

        if (this.isTofu(h, s, v)) {
            return 'tofu';
        }

        if (this.isPotato(h, s, v)) {
            return 'potato';
        }

        if (this.isSoup(h, s, v)) {
            return 'soup';
        }

        if (this.isVeryLight(h, s, v)) {
            return 'drink';
        }

        return 'mixedDish';
    }

    isBrightYellow(h, s, v) {
        return (h >= 40 && h <= 65) && s > 0.5 && v > 0.7;
    }

    isBrightRed(h, s, v) {
        return (h >= 340 || h <= 20) && s > 0.6 && v > 0.5;
    }

    isWhiteRice(h, s, v) {
        return s < 0.15 && v > 0.7;
    }

    isIceCream(h, s, v) {
        return (h >= 10 && h <= 50) && s < 0.3 && v > 0.7;
    }

    isCake(h, s, v) {
        return (h >= 20 && h <= 50) && s > 0.2 && s < 0.5 && v > 0.5;
    }

    isDarkBrown(h, s, v) {
        return (h >= 10 && h <= 35) && s > 0.3 && v < 0.4;
    }

    isRedMeat(h, s, v) {
        return (h >= 0 && h <= 30) && s > 0.35 && s < 0.65 && v > 0.35 && v < 0.7;
    }

    isPinkPork(h, s, v) {
        return (h >= 0 && h <= 25) && s > 0.25 && s < 0.45 && v > 0.55;
    }

    isLightYellowMeat(h, s, v) {
        return (h >= 35 && h <= 55) && s > 0.15 && s < 0.4 && v > 0.55;
    }

    isGreenVegetable(h, s, v) {
        return (h >= 80 && h <= 160) && s > 0.3 && v > 0.35;
    }

    isOrangeFruit(h, s, v) {
        return (h >= 20 && h <= 50) && s > 0.5 && v > 0.6;
    }

    isLightGreenFruit(h, s, v) {
        return (h >= 60 && h <= 100) && s < 0.4 && v > 0.6;
    }

    isYellowDessert(h, s, v) {
        return (h >= 35 && h <= 55) && s > 0.25 && s < 0.5 && v > 0.7;
    }

    isMeat(h, s, v) {
        return (h >= 0 && h <= 55) && s > 0.15 && s < 0.65 && v > 0.35;
    }

    isEgg(h, s, v) {
        return (h >= 35 && h <= 60) && s < 0.3 && v > 0.6;
    }

    isTofu(h, s, v) {
        return (h >= 30 && h <= 60) && s < 0.2 && v > 0.5 && v < 0.9;
    }

    isPotato(h, s, v) {
        return (h >= 25 && h <= 55) && s < 0.25 && v > 0.5 && v < 0.9;
    }

    isSoup(h, s, v) {
        return (h >= 20 && h <= 60) && s < 0.2 && v > 0.7;
    }

    isVeryLight(h, s, v) {
        return v > 0.9;
    }

    extractColorFeatures(imageData, clusterPixels) {
        const data = imageData.data;
        const width = imageData.width;
        
        let totalR = 0, totalG = 0, totalB = 0;
        const hueDistribution = {};
        const satDistribution = { low: 0, medium: 0, high: 0 };
        
        for (let i = 0; i < clusterPixels.length; i++) {
            const idx = clusterPixels[i] * 4;
            const r = data[idx] / 255;
            const g = data[idx + 1] / 255;
            const b = data[idx + 2] / 255;
            
            totalR += r;
            totalG += g;
            totalB += b;
            
            const hsv = this.rgbToHsv(r * 255, g * 255, b * 255);
            
            const hueBucket = Math.floor(hsv.h / 30) * 30;
            hueDistribution[hueBucket] = (hueDistribution[hueBucket] || 0) + 1;
            
            if (hsv.s < 0.2) satDistribution.low++;
            else if (hsv.s < 0.5) satDistribution.medium++;
            else satDistribution.high++;
        }
        
        const count = clusterPixels.length;
        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;
        
        const maxHueBucket = Object.entries(hueDistribution)
            .sort((a, b) => b[1] - a[1])[0];
        
        const dominantHue = maxHueBucket ? parseInt(maxHueBucket[0]) : 0;
        
        return {
            avgR,
            avgG,
            avgB,
            dominantHue,
            redness: avgR / (avgG + avgB + 0.01),
            greenness: avgG / (avgR + avgB + 0.01),
            blueness: avgB / (avgR + avgG + 0.01),
            yellowness: (avgR + avgG) / (2 * avgB + 0.01),
            brightness: (avgR + avgG + avgB) / 3,
            saturation: satDistribution
        };
    }

    rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, v = max;

        const d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0;
        } else {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }
            h /= 6;
        }

        return {
            h: h * 360,
            s: s,
            v: v
        };
    }
}

window.NutritionDB = NutritionDB;
