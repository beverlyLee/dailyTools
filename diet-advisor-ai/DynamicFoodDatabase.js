class DynamicFoodDatabase {
    constructor(staticDatabase) {
        this.staticFoods = staticDatabase?.foods || [];
        this.mealPortionEstimates = staticDatabase?.mealPortionEstimates || {};
        this.storageKey = 'diet_advisor_dynamic_foods';
        this.dynamicFoods = this.loadFromStorage();
        this.foodIndex = this.buildIndex();
        console.log('[DynamicFoodDatabase] 初始化完成:', {
            static: this.staticFoods.length,
            dynamic: this.dynamicFoods.length,
            total: this.getAllFoods().length
        });
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                console.log('[DynamicFoodDatabase] 从 localStorage 加载动态食物:', parsed.length);
                return parsed;
            }
        } catch (e) {
            console.warn('[DynamicFoodDatabase] 加载动态食物失败:', e);
        }
        return [];
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.dynamicFoods));
            return true;
        } catch (e) {
            console.warn('[DynamicFoodDatabase] 保存动态食物失败:', e);
            return false;
        }
    }

    buildIndex() {
        const index = new Map();
        const allFoods = this.getAllFoods();
        
        for (const food of allFoods) {
            const key = food.name.toLowerCase();
            if (!index.has(key)) {
                index.set(key, food);
            }
            for (const alias of food.aliases || []) {
                const aliasKey = alias.toLowerCase();
                if (!index.has(aliasKey)) {
                    index.set(aliasKey, food);
                }
            }
        }
        return index;
    }

    rebuildIndex() {
        this.foodIndex = this.buildIndex();
    }

    getAllFoods() {
        return [...this.staticFoods, ...this.dynamicFoods];
    }

    getAllDatabase() {
        return {
            foods: this.getAllFoods(),
            mealPortionEstimates: this.mealPortionEstimates
        };
    }

    findFood(query) {
        if (!query) return null;
        const normalized = query.trim().toLowerCase();

        if (this.foodIndex.has(normalized)) {
            const food = this.foodIndex.get(normalized);
            console.log('[DynamicFoodDatabase] 找到食物:', food.name, 
                this.dynamicFoods.some(f => f.name === food.name) ? '(动态)' : '(静态)');
            return food;
        }

        for (const [key, food] of this.foodIndex.entries()) {
            if (key.includes(normalized) || normalized.includes(key)) {
                return food;
            }
        }

        for (const food of this.getAllFoods()) {
            if (food.name.toLowerCase().includes(normalized) || 
                normalized.includes(food.name.toLowerCase())) {
                return food;
            }
        }

        console.log('[DynamicFoodDatabase] 未找到食物:', query);
        return null;
    }

    addDynamicFood(foodData) {
        if (!foodData || !foodData.name) {
            console.warn('[DynamicFoodDatabase] 尝试添加无效食物:', foodData);
            return null;
        }

        const existing = this.findFood(foodData.name);
        if (existing) {
            console.log('[DynamicFoodDatabase] 食物已存在，跳过添加:', foodData.name);
            return existing;
        }

        const newFood = {
            name: foodData.name,
            category: foodData.category || '其他',
            aliases: foodData.aliases || [],
            serving: foodData.serving || '100g',
            calories: parseFloat(foodData.calories) || 0,
            carbs: parseFloat(foodData.carbs) || 0,
            protein: parseFloat(foodData.protein) || 0,
            fat: parseFloat(foodData.fat) || 0,
            sugar: parseFloat(foodData.sugar) || 0,
            sodium: parseFloat(foodData.sodium) || 0,
            fiber: parseFloat(foodData.fiber) || 0,
            glycemicIndex: parseFloat(foodData.glycemicIndex) || 0,
            tags: foodData.tags || [],
            dietaryRestrictions: foodData.dietaryRestrictions || [],
            healthWarnings: foodData.healthWarnings || [],
            source: 'llm',
            createdAt: Date.now()
        };

        this.dynamicFoods.push(newFood);
        this.saveToStorage();
        this.rebuildIndex();

        console.log('[DynamicFoodDatabase] 已添加动态食物:', newFood.name);
        return newFood;
    }

    getDynamicFoods() {
        return [...this.dynamicFoods];
    }

    removeDynamicFood(foodName) {
        const index = this.dynamicFoods.findIndex(f => f.name === foodName);
        if (index !== -1) {
            const removed = this.dynamicFoods.splice(index, 1)[0];
            this.saveToStorage();
            this.rebuildIndex();
            console.log('[DynamicFoodDatabase] 已移除动态食物:', foodName);
            return removed;
        }
        return null;
    }

    clearDynamicFoods() {
        this.dynamicFoods = [];
        try {
            localStorage.removeItem(this.storageKey);
        } catch (e) {}
        this.rebuildIndex();
        console.log('[DynamicFoodDatabase] 已清空所有动态食物');
    }

    isDynamicFood(food) {
        if (!food) return false;
        return food.source === 'llm' || 
               this.dynamicFoods.some(f => f.name === food.name);
    }

    getStats() {
        return {
            staticCount: this.staticFoods.length,
            dynamicCount: this.dynamicFoods.length,
            totalCount: this.getAllFoods().length
        };
    }
}

window.DynamicFoodDatabase = DynamicFoodDatabase;
