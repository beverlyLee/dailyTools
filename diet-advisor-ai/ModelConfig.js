class ModelConfig {
    constructor() {
        this.storageKey = 'diet_advisor_model_config';
        this.config = this.loadFromStorage();
    }

    getDefaultConfig() {
        return {
            provider: 'volcengine',
            apiKey: '',
            endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
            model: '',
            temperature: 0.3,
            maxTokens: 2048,
            visionEnabled: false,
            visionModel: ''
        };
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { ...this.getDefaultConfig(), ...parsed };
            }
        } catch (e) {
            console.warn('Failed to load config from localStorage:', e);
        }
        return this.getDefaultConfig();
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
            return true;
        } catch (e) {
            console.warn('Failed to save config to localStorage:', e);
            return false;
        }
    }

    update(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this.saveToStorage();
    }

    getConfig() {
        return { ...this.config };
    }

    get(key) {
        return this.config[key];
    }

    isConfigured() {
        return this.config.apiKey && 
               this.config.apiKey.trim().length > 0 &&
               this.config.endpoint &&
               this.config.endpoint.trim().length > 0 &&
               this.config.model &&
               this.config.model.trim().length > 0;
    }

    isVisionConfigured() {
        return this.config.visionEnabled &&
               this.config.apiKey && 
               this.config.apiKey.trim().length > 0 &&
               this.config.endpoint &&
               this.config.endpoint.trim().length > 0 &&
               this.config.visionModel &&
               this.config.visionModel.trim().length > 0;
    }

    clear() {
        this.config = this.getDefaultConfig();
        try {
            localStorage.removeItem(this.storageKey);
        } catch (e) {}
    }

    async testConnection(testConfig = null) {
        const config = testConfig || this.config;

        if (!config.apiKey || !config.apiKey.trim()) {
            return { success: false, message: 'API Key 不能为空' };
        }
        if (!config.endpoint || !config.endpoint.trim()) {
            return { success: false, message: 'Endpoint 不能为空' };
        }
        if (!config.model || !config.model.trim()) {
            return { success: false, message: '模型 ID 不能为空' };
        }

        const endpoint = config.endpoint.endsWith('/') ? 
                        config.endpoint.slice(0, -1) : config.endpoint;
        const chatUrl = `${endpoint}/chat/completions`;

        try {
            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: '你是一个助手，请回复"测试成功"来确认连接正常。' },
                        { role: 'user', content: '请回复"测试成功"' }
                    ],
                    temperature: 0.3,
                    max_tokens: 50
                })
            });

            if (response.status === 401) {
                return { success: false, message: '认证失败：API Key 无效或已过期', status: 401 };
            }

            if (response.status === 403) {
                return { success: false, message: '权限不足：请检查 API Key 是否有该模型的访问权限', status: 403 };
            }

            if (response.status === 404) {
                return { success: false, message: '模型不存在：请确认模型 ID 是否正确', status: 404 };
            }

            if (!response.ok) {
                let errorMsg = `请求失败 (HTTP ${response.status})`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMsg += `: ${errorData.error.message || JSON.stringify(errorData.error)}`;
                    }
                } catch (e) {}
                return { success: false, message: errorMsg, status: response.status };
            }

            const data = await response.json();
            const reply = data?.choices?.[0]?.message?.content || '';

            return {
                success: true,
                message: '连接测试成功！',
                reply: reply,
                model: data?.model || config.model,
                usage: data?.usage
            };

        } catch (error) {
            console.error('Connection test error:', error);
            return {
                success: false,
                message: `网络错误：${error.message}。请检查网络连接或 Endpoint 配置是否正确（火山引擎 Endpoint 应包含 /api/v3）`
            };
        }
    }
}

window.ModelConfig = ModelConfig;
