class ImageRecognizer {
    constructor(modelConfig) {
        this.modelConfig = modelConfig;
    }

    imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    resizeImage(base64Data, maxWidth = 1024, maxHeight = 1024) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = base64Data;
        });
    }

    async recognizeFromImage(file, options = {}) {
        const config = this.modelConfig.getConfig();

        if (!config.visionEnabled) {
            return {
                success: false,
                error: '视觉模型未启用，请在模型配置中启用图片识别功能。'
            };
        }

        if (!this.modelConfig.isVisionConfigured()) {
            return {
                success: false,
                error: '视觉模型配置不完整，请确保已配置 API Key、Endpoint 和视觉模型 ID。'
            };
        }

        try {
            let base64Image = await this.imageToBase64(file);
            base64Image = await this.resizeImage(base64Image);

            const base64Content = base64Image.split(',')[1];

            const endpoint = config.endpoint.endsWith('/') ?
                           config.endpoint.slice(0, -1) : config.endpoint;
            const chatUrl = `${endpoint}/chat/completions`;

            const prompt = options.prompt || `请仔细分析这张食物图片，识别其中的餐食内容。

要求：
1. 列出图片中所有可见的食物名称
2. 估算每种食物的大致份量
3. 如果是完整的一餐，请说明是早餐、午餐还是晚餐
4. 输出格式：用中文，用"+"号连接多种食物，例如："米饭+红烧肉+青菜+汤"
5. 尽量准确识别，不要添加食物数据库中没有的食物

请只输出食物列表，不要输出其他文字。`;

            const requestBody = {
                model: config.visionModel,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/jpeg;base64,${base64Content}`
                                }
                            }
                        ]
                    }
                ],
                temperature: config.temperature || 0.3,
                max_tokens: config.maxTokens || 512
            };

            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (response.status === 401) {
                return { success: false, error: '认证失败：API Key 无效' };
            }
            if (response.status === 403) {
                return { success: false, error: '权限不足：请检查该模型是否支持图像识别（需要 Vision 模型）' };
            }
            if (response.status === 404) {
                return { success: false, error: '模型不存在：请确认视觉模型 ID 是否正确' };
            }

            if (!response.ok) {
                let errorMsg = `API 请求失败 (HTTP ${response.status})`;
                try {
                    const errData = await response.json();
                    if (errData.error) {
                        errorMsg += `: ${errData.error.message || JSON.stringify(errData.error)}`;
                    }
                } catch (e) {}
                return { success: false, error: errorMsg };
            }

            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content || '';

            if (!content.trim()) {
                return {
                    success: false,
                    error: '模型未返回识别结果，请重试或更换图片。'
                };
            }

            const parsedFoods = this.parseResponse(content);

            return {
                success: true,
                rawResponse: content,
                parsedFoods: parsedFoods,
                formattedInput: parsedFoods.join('+'),
                usage: data?.usage,
                model: data?.model
            };

        } catch (error) {
            console.error('Image recognition error:', error);
            return {
                success: false,
                error: `识别失败：${error.message}`
            };
        }
    }

    parseResponse(responseText) {
        const text = responseText.trim();
        const foods = [];
        
        const plusMatch = text.match(/[\u4e00-\u9fa5a-zA-Z]+(?:\s*\+\s*[\u4e00-\u9fa5a-zA-Z]+)+/);
        if (plusMatch) {
            return plusMatch[0].split(/\s*\+\s*/).map(f => f.trim()).filter(f => f);
        }

        const lines = text.split(/\n+/);
        for (const line of lines) {
            const cleaned = line
                .replace(/^[\d\.\-\*、•○●□■\s]+/, '')
                .replace(/[:：].*/, '')
                .replace(/[（(].*?[）)]/g, '')
                .trim();

            const foodMatch = cleaned.match(/^[\u4e00-\u9fa5]{2,8}/);
            if (foodMatch && foodMatch[0].length >= 2) {
                const food = foodMatch[0];
                if (!foods.includes(food) && 
                    !['请', '好的', '根据', '图片', '以下', '餐食', '食物', '识别'].includes(food)) {
                    foods.push(food);
                }
            }
        }

        return foods;
    }

    async enhanceTextDescription(mealText, options = {}) {
        const config = this.modelConfig.getConfig();

        if (!this.modelConfig.isConfigured()) {
            return { success: false, error: '模型未配置', enhanced: mealText };
        }

        try {
            const endpoint = config.endpoint.endsWith('/') ?
                           config.endpoint.slice(0, -1) : config.endpoint;
            const chatUrl = `${endpoint}/chat/completions`;

            const prompt = `用户输入的餐食描述："${mealText}"

请优化这段描述，补充更准确的食物名称。
要求：
1. 识别用户提到的所有食物
2. 使用标准的食物名称
3. 用"+"号连接多种食物
4. 只输出优化后的结果，不要其他文字

例如：
输入："白饭和一瓶可乐" → 输出："米饭+可乐"
输入："鸡和青菜" → 输出："鸡肉+白菜"
输入："牛肉拉面" → 输出："面条"`;

            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: '你是一个食物识别助手，擅长将口语化的食物描述转换为标准化的食物名称。' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.2,
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                return { success: false, error: 'API 请求失败', enhanced: mealText };
            }

            const data = await response.json();
            const content = (data?.choices?.[0]?.message?.content || '').trim();

            let enhanced = content;
            const match = content.match(/["'"]?([\u4e00-\u9fa5a-zA-Z]+(?:\s*\+\s*[\u4e00-\u9fa5a-zA-Z]+)+)["'"]?/);
            if (match) {
                enhanced = match[1].replace(/\s/g, '');
            }

            return {
                success: true,
                original: mealText,
                enhanced: enhanced || mealText,
                rawResponse: content
            };

        } catch (error) {
            console.error('Text enhancement error:', error);
            return { success: false, error: error.message, enhanced: mealText };
        }
    }
}

window.ImageRecognizer = ImageRecognizer;
