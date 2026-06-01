class LLMFoodProvider {
    constructor(modelConfig) {
        this.modelConfig = modelConfig;
        this.cache = new Map();
    }

    isAvailable() {
        return this.modelConfig.isConfigured();
    }

    getSystemPrompt() {
        return `你是一个专业的食物营养数据助手。你的任务是根据食物名称，提供准确的营养成分信息。

请严格按照以下 JSON 格式返回（只返回 JSON，不要返回其他文字）：

{
  "name": "食物标准名称",
  "category": "主食|肉类|蔬菜|水果|饮料|奶制品|蛋类|零食|其他",
  "aliases": ["别名1", "别名2"],
  "serving": "100g",
  "calories": 每100g热量数值（kcal）,
  "carbs": 碳水化合物（g）,
  "protein": 蛋白质（g）,
  "fat": 脂肪（g）,
  "sugar": 糖分（g）,
  "sodium": 钠（mg）,
  "fiber": 膳食纤维（g）,
  "glycemicIndex": 升糖指数（0-100，未知填0）,
  "tags": ["标签1", "标签2"],
  "dietaryRestrictions": ["过敏原或禁忌"],
  "healthWarnings": ["糖尿病|高血压|肥胖|心脏病", "针对哪些健康状况有风险"]
}

要求：
1. 数值要准确，参考 USDA 或中国食物成分表数据
2. glycemicIndex（升糖指数）：低GI <55, 中GI 55-70, 高GI >70
3. tags 可以是：高GI、低GI、高糖、低糖、高纤维、高蛋白、低脂肪、高钠、高热量、粗粮、精制碳水等
4. healthWarnings：如果是糖尿病患者慎食，填"糖尿病"；高血压慎食填"高血压"，以此类推
5. 如果不确定，尽量给出合理估算值，不要留空`;
    }

    getUserPrompt(foodName) {
        return `请提供以下食物的营养成分数据：
食物名称：${foodName}

请只返回符合要求的 JSON 格式数据，不要有其他文字。`;
    }

    async callLLM(systemPrompt, userPrompt) {
        const config = this.modelConfig.getConfig();
        
        const endpoint = config.endpoint.endsWith('/') ?
                       config.endpoint.slice(0, -1) : config.endpoint;
        const chatUrl = `${endpoint}/chat/completions`;

        const requestBody = {
            model: config.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: config.temperature || 0.2,
            max_tokens: config.maxTokens || 1000,
            response_format: { type: "json_object" }
        };

        console.log('[LLMFoodProvider] 调用大模型获取食物信息...');
        console.log('[LLMFoodProvider] Request:', JSON.stringify(requestBody, null, 2).substring(0, 500) + '...');

        const response = await fetch(chatUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            let errorMsg = `API 请求失败 (HTTP ${response.status})`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMsg += `: ${errorData.error.message || JSON.stringify(errorData.error)}`;
                }
            } catch (e) {}
            throw new Error(errorMsg);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';
        
        console.log('[LLMFoodProvider] 原始响应:', content.substring(0, 300));
        console.log('[LLMFoodProvider] Token 消耗:', data?.usage);

        return content;
    }

    parseJSONResponse(content) {
        let jsonStr = content.trim();
        
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        try {
            const parsed = JSON.parse(jsonStr);
            return this.normalizeFoodData(parsed);
        } catch (e) {
            console.warn('[LLMFoodProvider] JSON 解析失败，尝试清理:', e);
            
            jsonStr = jsonStr
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/(['"])?([a-zA-Z_][a-zA-Z0-9_]*)(['"])?\s*:/g, '"$2":')
                .replace(/'/g, '"');
            
            try {
                const parsed = JSON.parse(jsonStr);
                return this.normalizeFoodData(parsed);
            } catch (e2) {
                throw new Error(`无法解析模型返回的 JSON: ${content.substring(0, 200)}`);
            }
        }
    }

    normalizeFoodData(data) {
        const categoryMap = {
            '主食': '主食', '谷物': '主食', '谷类': '主食',
            '肉类': '肉类', '荤菜': '肉类', '畜禽': '肉类',
            '蔬菜': '蔬菜', '青菜': '蔬菜', '菜类': '蔬菜',
            '水果': '水果', '鲜果': '水果',
            '饮料': '饮料', '饮品': '饮料',
            '奶制品': '奶制品', '乳制品': '奶制品',
            '蛋类': '蛋类', '鸡蛋': '蛋类',
            '零食': '零食', '点心': '零食', '小吃': '零食',
            '海鲜': '肉类', '水产': '肉类',
            '豆制品': '其他', '调料': '其他'
        };

        return {
            name: String(data.name || data.foodName || ''),
            category: categoryMap[data.category] || data.category || '其他',
            aliases: Array.isArray(data.aliases) ? data.aliases : [],
            serving: String(data.serving || data.servingSize || '100g'),
            calories: parseFloat(data.calories) || parseFloat(data.energy) || 0,
            carbs: parseFloat(data.carbs) || parseFloat(data.carbohydrate) || parseFloat(data.carbohydrates) || 0,
            protein: parseFloat(data.protein) || 0,
            fat: parseFloat(data.fat) || 0,
            sugar: parseFloat(data.sugar) || parseFloat(data.sugars) || 0,
            sodium: parseFloat(data.sodium) || 0,
            fiber: parseFloat(data.fiber) || parseFloat(data.dietaryFiber) || 0,
            glycemicIndex: parseFloat(data.glycemicIndex) || parseFloat(data.gi) || 0,
            tags: Array.isArray(data.tags) ? data.tags : this.autoGenerateTags(data),
            dietaryRestrictions: Array.isArray(data.dietaryRestrictions) ? data.dietaryRestrictions : [],
            healthWarnings: Array.isArray(data.healthWarnings) ? data.healthWarnings : this.autoGenerateWarnings(data)
        };
    }

    autoGenerateTags(data) {
        const tags = [];
        const gi = parseFloat(data.glycemicIndex) || 0;
        const sugar = parseFloat(data.sugar) || 0;
        const fiber = parseFloat(data.fiber) || 0;
        const protein = parseFloat(data.protein) || 0;
        const fat = parseFloat(data.fat) || 0;
        const sodium = parseFloat(data.sodium) || 0;
        const calories = parseFloat(data.calories) || 0;

        if (gi > 70) tags.push('高GI');
        else if (gi > 0 && gi <= 55) tags.push('低GI');
        else if (gi > 55) tags.push('中GI');

        if (sugar > 15) tags.push('高糖');
        else if (sugar < 5) tags.push('低糖');

        if (fiber > 5) tags.push('高纤维');
        if (protein > 15) tags.push('高蛋白');
        if (fat > 15) tags.push('高脂肪');
        if (sodium > 200) tags.push('高钠');
        if (calories > 400) tags.push('高热量');

        return tags;
    }

    autoGenerateWarnings(data) {
        const warnings = [];
        const gi = parseFloat(data.glycemicIndex) || 0;
        const sugar = parseFloat(data.sugar) || 0;
        const sodium = parseFloat(data.sodium) || 0;
        const fat = parseFloat(data.fat) || 0;
        const calories = parseFloat(data.calories) || 0;

        if (gi > 70 || sugar > 10) {
            warnings.push('糖尿病');
        }
        if (sodium > 200) {
            warnings.push('高血压');
        }
        if (fat > 15 || calories > 400) {
            warnings.push('肥胖');
        }
        if (sodium > 200 || fat > 15) {
            warnings.push('心脏病');
        }

        return [...new Set(warnings)];
    }

    validateFoodData(data) {
        if (!data.name || !data.name.trim()) {
            return { valid: false, reason: '缺少食物名称' };
        }
        if (data.calories === undefined || isNaN(data.calories)) {
            return { valid: false, reason: '缺少热量数据' };
        }
        return { valid: true };
    }

    async getFoodInfo(foodName) {
        const cacheKey = foodName.toLowerCase().trim();
        
        if (this.cache.has(cacheKey)) {
            console.log('[LLMFoodProvider] 命中内存缓存:', foodName);
            return { success: true, data: this.cache.get(cacheKey), source: 'cache' };
        }

        if (!this.isAvailable()) {
            return { 
                success: false, 
                error: '大模型未配置，请先配置 API Key 和模型 ID' 
            };
        }

        try {
            const content = await this.callLLM(
                this.getSystemPrompt(),
                this.getUserPrompt(foodName)
            );

            const foodData = this.parseJSONResponse(content);
            const validation = this.validateFoodData(foodData);
            
            if (!validation.valid) {
                return {
                    success: false,
                    error: `返回的数据不完整: ${validation.reason}`
                };
            }

            this.cache.set(cacheKey, foodData);

            console.log('[LLMFoodProvider] 成功获取食物信息:', foodData.name);
            return {
                success: true,
                data: foodData,
                source: 'llm'
            };

        } catch (error) {
            console.error('[LLMFoodProvider] 获取食物信息失败:', error);
            return {
                success: false,
                error: error.message || '未知错误'
            };
        }
    }

    async getBatchFoodInfo(foodNames) {
        const results = [];
        for (const name of foodNames) {
            const result = await this.getFoodInfo(name);
            results.push({ name, ...result });
        }
        return results;
    }

    clearCache() {
        this.cache.clear();
        console.log('[LLMFoodProvider] 缓存已清空');
    }
}

window.LLMFoodProvider = LLMFoodProvider;
