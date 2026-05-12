class LLMAnalyzer {
    constructor(config = {}) {
        this.apiKey = config.apiKey || localStorage.getItem('foodAnalyzer_apiKey') || '';
        this.model = config.model || localStorage.getItem('foodAnalyzer_model') || 'gpt-4o-mini';
        this.provider = config.provider || localStorage.getItem('foodAnalyzer_provider') || 'openai';
        this.baseUrl = config.baseUrl || localStorage.getItem('foodAnalyzer_baseUrl') || 'https://api.openai.com/v1';
        this.available = false;
    }

    getProviders() {
        return {
            openai: {
                name: 'OpenAI',
                models: [
                    { id: 'gpt-4o', name: 'GPT-4o' },
                    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
                    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
                ],
                baseUrl: 'https://api.openai.com/v1'
            },
            anthropic: {
                name: 'Anthropic Claude',
                models: [
                    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
                    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
                    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
                ],
                baseUrl: 'https://api.anthropic.com/v1'
            },
            openrouter: {
                name: 'OpenRouter (多模型)',
                models: [
                    { id: 'openai/gpt-4o', name: 'GPT-4o' },
                    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
                    { id: 'google/gemini-flash-1.5', name: 'Gemini Flash 1.5' }
                ],
                baseUrl: 'https://openrouter.ai/api/v1'
            },
            zhipu: {
                name: '智谱 AI (GLM)',
                models: [
                    { id: 'glm-4v', name: 'GLM-4V (多模态)' },
                    { id: 'glm-4-flash', name: 'GLM-4 Flash' }
                ],
                baseUrl: 'https://open.bigmodel.cn/api/paas/v4'
            },
            qwen: {
                name: '通义千问',
                models: [
                    { id: 'qwen-vl-max', name: 'Qwen-VL Max' },
                    { id: 'qwen-vl-plus', name: 'Qwen-VL Plus' }
                ],
                baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
            },
            doubao: {
                name: '豆包 (字节跳动)',
                models: [
                    { id: 'doubao-vision-pro-32k', name: 'Doubao Vision Pro' }
                ],
                baseUrl: 'https://ark.cn-beijing.volces.com/api/v3'
            },
            siliconflow: {
                name: 'SiliconFlow (硅基流动)',
                models: [
                    { id: 'Qwen/Qwen2-VL-7B-Instruct', name: 'Qwen2-VL 7B' },
                    { id: 'Qwen/Qwen2-VL-72B-Instruct', name: 'Qwen2-VL 72B' },
                    { id: 'internlm/internlm2.5-wvl-7b', name: 'InternLM2.5-WVL 7B' }
                ],
                baseUrl: 'https://api.siliconflow.cn/v1'
            }
        };
    }

    setConfig(config) {
        if (config.apiKey !== undefined) {
            this.apiKey = config.apiKey;
            localStorage.setItem('foodAnalyzer_apiKey', config.apiKey);
        }
        if (config.model !== undefined) {
            this.model = config.model;
            localStorage.setItem('foodAnalyzer_model', config.model);
        }
        if (config.provider !== undefined) {
            this.provider = config.provider;
            localStorage.setItem('foodAnalyzer_provider', config.provider);
        }
        if (config.baseUrl !== undefined) {
            this.baseUrl = config.baseUrl;
            localStorage.setItem('foodAnalyzer_baseUrl', config.baseUrl);
        }
        this.available = !!this.apiKey;
    }

    isAvailable() {
        return !!this.apiKey;
    }

    getSystemPrompt() {
        return `你是一位专业的食物分析助手，擅长从图片中识别食物和餐具。

请分析图片中的食物和餐具，返回严格的 JSON 格式数据。

识别要求：
1. **食物识别**：
   - 识别图片中所有可食用的食物
   - 每种食物要识别名称（中文）、估计重量范围（克）
   - 常见食物参考：米饭、面条、鸡肉、猪肉、牛肉、鱼肉、蔬菜、土豆、豆腐、鸡蛋、蛋糕、冰淇淋、水果、芒果、草莓等

2. **餐具识别**：
   - 识别盛放食物的容器类型
   - 常见类型：plate(盘子)、bowl(碗)、cup(杯子)、cone(甜筒)、packaging(包装盒)
   - 估计餐具尺寸（厘米）：盘子直径、碗口直径、杯子直径等
   - 判断餐具是否可食用（如甜筒底座）

3. **体积/厚度估计**：
   - 估计食物的平均厚度（厘米）
   - 米饭：2-4cm，菜肴：3-5cm，汤：5-10cm，冰淇淋：3-8cm

4. **输出格式**：严格的 JSON，不要任何解释文字：
{
  "foods": [
    {
      "name": "食物中文名称",
      "type": "英文类型代码",
      "weightMin": 最小重量克数,
      "weightMax": 最大重量克数,
      "description": "简短描述",
      "confidence": 置信度0-1
    }
  ],
  "container": {
    "type": "plate/bowl/cup/cone/packaging/custom",
    "isEdible": true/false,
    "sizeCm": 估计尺寸直径(厘米),
    "description": "餐具描述"
  },
  "foodThicknessCm": 食物平均厚度估计值,
  "analysisNotes": "简短分析说明"
}

食物类型代码映射：
- 主食类：rice(米饭), noodles(面条), bread(面包), pasta(意大利面), pizza(披萨), hamburger(汉堡), fries(薯条), sushi(寿司), dumpling(饺子), potato(土豆)
- 肉类：chicken(鸡肉), pork(猪肉), beef(牛肉), fish(鱼肉)
- 其他：egg(鸡蛋), tofu(豆腐), vegetables(蔬菜), soup(汤类), mixedDish(混合菜肴)
- 甜品：iceCream(冰淇淋), cake(蛋糕), chocolate(巧克力), candy(糖果)
- 水果：fruit(水果), mango(芒果), strawberry(草莓), watermelon(西瓜)
- 饮料：drink(饮料), milk(牛奶/奶茶), juice(果汁), coffee(咖啡)

如果无法识别某些信息，请使用合理的默认值，但要在 analysisNotes 中说明。`;
    }

    async analyzeImage(imageBase64) {
        if (!this.apiKey) {
            throw new Error('请先配置 API Key');
        }

        const providers = this.getProviders();
        const providerConfig = providers[this.provider] || providers.openai;

        if (this.provider === 'anthropic') {
            return this.analyzeWithAnthropic(imageBase64, providerConfig);
        } else {
            return this.analyzeWithOpenAICompat(imageBase64, providerConfig);
        }
    }

    async analyzeWithOpenAICompat(imageBase64, providerConfig) {
        const url = `${this.baseUrl || providerConfig.baseUrl}/chat/completions`;
        
        const supportsResponseFormat = this.provider === 'openai';
        
        const payload = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: this.getSystemPrompt()
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: '请分析这张图片中的食物和餐具，返回严格的JSON格式数据。只返回JSON，不要任何解释文字。'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ],
            temperature: 0.3,
            max_tokens: 2000
        };

        if (supportsResponseFormat) {
            payload.response_format = { type: 'json_object' };
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };

        if (this.provider === 'openrouter') {
            headers['HTTP-Referer'] = 'https://food-calorie-estimator.local';
            headers['X-Title'] = '食物卡路里估算工具';
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 错误: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return this.parseResponse(data);
        } catch (error) {
            console.error('LLM 分析失败:', error);
            throw error;
        }
    }

    async analyzeWithAnthropic(imageBase64, providerConfig) {
        const url = `${this.baseUrl || providerConfig.baseUrl}/messages`;
        
        const payload = {
            model: this.model,
            max_tokens: 2000,
            system: this.getSystemPrompt(),
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: '请分析这张图片中的食物和餐具，返回严格的JSON格式数据。'
                        },
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg',
                                data: imageBase64
                            }
                        }
                    ]
                }
            ]
        };

        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API 错误: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return this.parseAnthropicResponse(data);
        } catch (error) {
            console.error('Anthropic 分析失败:', error);
            throw error;
        }
    }

    parseResponse(data) {
        const content = data.choices?.[0]?.message?.content;
        return this.parseJsonContent(content);
    }

    parseAnthropicResponse(data) {
        const content = data.content?.[0]?.text;
        return this.parseJsonContent(content);
    }

    parseJsonContent(content) {
        if (!content) {
            throw new Error('API 返回内容为空');
        }

        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return this.validateAndFillDefaults(parsed);
            }
            throw new Error('无法解析 JSON 响应');
        } catch (error) {
            console.warn('JSON 解析失败，尝试直接解析:', error);
            try {
                const parsed = JSON.parse(content);
                return this.validateAndFillDefaults(parsed);
            } catch (e) {
                throw new Error(`无法解析响应内容: ${content.substring(0, 100)}`);
            }
        }
    }

    validateAndFillDefaults(result) {
        const defaults = {
            foods: [],
            container: {
                type: 'plate',
                isEdible: false,
                sizeCm: 26,
                description: '盘子'
            },
            foodThicknessCm: 3,
            analysisNotes: ''
        };

        const validated = {
            ...defaults,
            ...result
        };

        if (!Array.isArray(validated.foods)) {
            validated.foods = [];
        }

        const foodTypes = [
            'rice', 'noodles', 'bread', 'chicken', 'pork', 'beef', 'fish', 'egg',
            'vegetables', 'tofu', 'potato', 'mixedDish', 'soup',
            'iceCream', 'cake', 'chocolate', 'candy',
            'fruit', 'mango', 'strawberry', 'watermelon',
            'drink', 'milk', 'juice', 'coffee',
            'pasta', 'pizza', 'hamburger', 'fries', 'sushi', 'dumpling'
        ];

        validated.foods = validated.foods.map(food => ({
            name: food.name || '未知食物',
            type: food.type || 'mixedDish',
            weightMin: food.weightMin || 50,
            weightMax: food.weightMax || 150,
            description: food.description || '',
            confidence: food.confidence || 0.5
        }));

        if (!foodTypes.includes(validated.container?.type)) {
            validated.container = { ...defaults.container, ...validated.container };
        }

        validated.foodThicknessCm = validated.foodThicknessCm || 3;

        return validated;
    }

    async testConnection() {
        if (!this.apiKey) {
            return { success: false, error: 'API Key 未配置' };
        }

        try {
            const testImage = this.createTestImage();
            const result = await this.analyzeImage(testImage);
            return { success: true, result: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    createTestImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 10;
        canvas.height = 10;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 10, 10);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        return dataUrl.split(',')[1];
    }
}

window.LLMAnalyzer = LLMAnalyzer;
