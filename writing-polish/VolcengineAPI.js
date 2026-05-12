export class VolcengineAPI {
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.endpoint = config.endpoint || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
        this.model = config.model || '';
        this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
        this.temperature = config.temperature || 0.7;
        this.timeout = config.timeout || 30000;
        this.useProxy = config.useProxy || false;
        this.proxyUrl = config.proxyUrl || 'http://localhost:8081/proxy';
        this.isConfigured = false;
    }

    getDefaultSystemPrompt() {
        return `你是一位专业的英文写作润色助手。请帮助用户改进英文文本，包括：
1. 修正语法错误（主谓一致、时态、冠词使用等）
2. 优化词汇使用，将平淡的词汇替换为更高级、更精准的表达
3. 改进句式结构，使文本更流畅、更具文采
4. 将口语化表达转换为正式书面语

请以 JSON 格式返回结果，包含以下字段：
{
    "polishedText": "润色后的完整文本",
    "corrections": [
        {"original": "原词", "replacement": "修改后", "explanation": "说明"}
    ],
    "enhancements": [
        {"original": "原词", "replacement": "优化后", "explanation": "说明", "alternatives": ["备选1", "备选2"]}
    ],
    "rewrites": [
        {"original": "原句", "replacement": "改写后", "explanation": "说明"}
    ]
}

请确保：
- 保持原文的核心意思不变
- 对于"He is a very good man"这类句子，建议修改为"He is an exceptionally good man"或类似表达
- 修正明显的语法错误
- 提供具体的修改说明`;
    }

    configure(config) {
        if (config.apiKey) this.apiKey = config.apiKey;
        if (config.endpoint) this.endpoint = config.endpoint;
        if (config.model) this.model = config.model;
        if (config.systemPrompt) this.systemPrompt = config.systemPrompt;
        if (config.temperature !== undefined) this.temperature = config.temperature;
        if (config.timeout !== undefined) this.timeout = config.timeout;
        if (config.useProxy !== undefined) this.useProxy = config.useProxy;
        if (config.proxyUrl) this.proxyUrl = config.proxyUrl;
        
        this.isConfigured = this.validateConfig();
        return this.isConfigured;
    }

    validateConfig() {
        if (!this.apiKey) return false;
        if (!this.endpoint) return false;
        if (!this.model) return false;
        return true;
    }

    validateConfigDetailed() {
        const issues = [];
        
        if (!this.apiKey) {
            issues.push({
                field: 'apiKey',
                message: 'API Key 不能为空',
                suggestion: '请在火山引擎控制台获取 API Key'
            });
        } else if (this.apiKey.length < 10) {
            issues.push({
                field: 'apiKey',
                message: 'API Key 格式可能不正确',
                suggestion: 'API Key 通常以 "volc-..." 开头'
            });
        }

        if (!this.endpoint) {
            issues.push({
                field: 'endpoint',
                message: 'Endpoint 不能为空',
                suggestion: '默认值：https://ark.cn-beijing.volces.com/api/v3/chat/completions'
            });
        } else {
            try {
                new URL(this.endpoint);
            } catch (e) {
                issues.push({
                    field: 'endpoint',
                    message: 'Endpoint URL 格式不正确',
                    suggestion: '请确保 URL 格式正确，包含 https://'
                });
            }
            
            if (this.endpoint.includes('127.0.0.1') || this.endpoint.includes('localhost')) {
                issues.push({
                    field: 'endpoint',
                    message: '检测到本地地址',
                    suggestion: '火山引擎 API 是在线服务，请使用公网地址'
                });
            }
        }

        if (!this.model) {
            issues.push({
                field: 'model',
                message: '模型名称不能为空',
                suggestion: '请从火山引擎模型广场选择模型，例如：doubao-seed-2-0-code-preview-260215'
            });
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    getConfig() {
        return {
            apiKey: this.apiKey,
            endpoint: this.endpoint,
            model: this.model,
            systemPrompt: this.systemPrompt,
            temperature: this.temperature,
            timeout: this.timeout,
            useProxy: this.useProxy,
            proxyUrl: this.proxyUrl,
            isConfigured: this.isConfigured
        };
    }

    async testConnection() {
        const validation = this.validateConfigDetailed();
        
        if (!validation.isValid) {
            return {
                success: false,
                error: '配置验证失败',
                details: validation.issues,
                suggestions: this.getConfigurationHelp()
            };
        }

        try {
            const response = await this.callAPI('Hello!');
            
            if (response && response.choices && response.choices.length > 0) {
                return {
                    success: true,
                    message: '连接成功！',
                    response: response.choices[0].message.content,
                    model: response.model || this.model,
                    usage: response.usage
                };
            } else {
                return {
                    success: false,
                    error: 'API 响应格式异常',
                    suggestions: [
                        '模型可能返回了空响应',
                        '请检查模型端点状态是否正常'
                    ]
                };
            }
        } catch (error) {
            const errorInfo = this.analyzeError(error);
            return {
                success: false,
                error: errorInfo.message,
                errorCode: errorInfo.code,
                suggestions: errorInfo.suggestions
            };
        }
    }

    async testConnectionWithRetry(retries = 2) {
        let lastError = null;
        
        for (let i = 0; i <= retries; i++) {
            try {
                const result = await this.testConnection();
                if (result.success) {
                    return result;
                }
                lastError = result;
                
                if (i < retries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            } catch (e) {
                lastError = {
                    success: false,
                    error: e.message,
                    suggestions: this.getConfigurationHelp()
                };
            }
        }
        
        return lastError;
    }

    analyzeError(error) {
        const message = error.message || '未知错误';
        const suggestions = [];
        
        let code = 'UNKNOWN';

        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            code = 'NETWORK_ERROR';
            suggestions.push('网络连接问题：请检查您的网络连接');
            suggestions.push('CORS 限制：浏览器安全策略阻止直接请求，可能需要通过后端代理');
            suggestions.push('请确认火山引擎 API 支持跨域访问');
            suggestions.push('临时解决方案：可以使用浏览器插件或后端代理绕过 CORS');
        } else if (message.includes('401') || message.includes('Unauthorized')) {
            code = 'AUTH_ERROR';
            suggestions.push('API Key 无效或已过期');
            suggestions.push('请检查 API Key 是否正确');
            suggestions.push('请确认 API Key 对应账号还有可用额度');
        } else if (message.includes('403') || message.includes('Forbidden')) {
            code = 'PERMISSION_ERROR';
            suggestions.push('账号权限不足');
            suggestions.push('请确认模型端点已启用');
            suggestions.push('请检查 API Key 对应的角色权限');
        } else if (message.includes('404') || message.includes('Not Found')) {
            code = 'NOT_FOUND';
            suggestions.push('Endpoint URL 不正确');
            suggestions.push('Model ID 不存在或已删除');
            suggestions.push('请确认模型端点已创建并处于运行状态');
        } else if (message.includes('429') || message.includes('Too Many Requests')) {
            code = 'RATE_LIMIT';
            suggestions.push('请求过于频繁');
            suggestions.push('请稍后重试或联系客服提高额度');
        } else if (message.includes('500') || message.includes('Internal Server Error')) {
            code = 'SERVER_ERROR';
            suggestions.push('火山引擎服务器内部错误');
            suggestions.push('请稍后重试');
            suggestions.push('如持续出现此问题，请联系火山引擎客服');
        } else if (message.includes('timeout') || message.includes('timed out')) {
            code = 'TIMEOUT';
            suggestions.push('请求超时');
            suggestions.push('网络可能较慢，请稍后重试');
            suggestions.push('可以在设置中增加超时时间');
        } else if (message.includes('CORS') || message.includes('cors')) {
            code = 'CORS_ERROR';
            suggestions.push('跨域访问被拒绝');
            suggestions.push('这是浏览器安全限制，需要后端代理');
            suggestions.push('可以在本地开发时使用代理服务');
        }

        if (suggestions.length === 0) {
            suggestions.push('请检查配置是否正确');
            suggestions.push('请参考官方文档：https://www.volcengine.com/docs/82379');
        }

        return {
            message,
            code,
            suggestions
        };
    }

    getConfigurationHelp() {
        return [
            {
                title: '如何获取 API Key？',
                steps: [
                    '登录火山引擎控制台：https://console.volcengine.com',
                    '进入「智能方舟（Ark）」服务',
                    '在左侧菜单选择「API Key 管理」',
                    '点击「新建 API Key」创建并复制'
                ]
            },
            {
                title: '如何获取 Model ID（端点 ID）？',
                steps: [
                    '在火山引擎控制台进入「智能方舟」',
                    '选择「模型推理」->「在线推理」',
                    '创建或选择已有的模型端点',
                    '端点 ID 格式为：ep-xxxxxxxxxx-xxxxx'
                ]
            },
            {
                title: 'Endpoint URL 格式',
                steps: [
                    '默认格式：https://ark.cn-beijing.volces.com/api/v3/chat/completions',
                    '如果使用自定义域名，请替换域名部分',
                    '确保使用 https 协议'
                ]
            }
        ];
    }

    async polishText(text, options = {}) {
        if (!this.validateConfig()) {
            throw new Error('API 未配置，请先在设置中配置火山引擎 API');
        }

        const { userPrompt, systemPrompt } = this.buildUserPrompt(text, options);
        
        try {
            const response = await this.callAPI(userPrompt, systemPrompt);
            return this.parseResponse(response);
        } catch (error) {
            console.error('[VolcengineAPI] 调用失败:', error);
            const errorInfo = this.analyzeError(error);
            throw new Error(`${errorInfo.message}\n建议：${errorInfo.suggestions[0] || ''}`);
        }
    }

    buildUserPrompt(text, options) {
        const enableGrammar = options.enableGrammar !== false;
        const enableVocab = options.enableVocab !== false;
        const enableRewrite = options.enableRewrite !== false;
        const systemPrompt = options.systemPrompt || this.systemPrompt;

        let requirements = [];
        if (enableGrammar) requirements.push('语法纠错');
        if (enableVocab) requirements.push('词汇优化');
        if (enableRewrite) requirements.push('句式改写');

        const userPrompt = `请润色以下文本：

"${text}"

要求：
${requirements.map(r => `- ${r}`).join('\n')}

请以 JSON 格式返回结果。`;

        return { userPrompt, systemPrompt };
    }

    async callAPI(userMessage, systemPrompt = this.systemPrompt) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
        };

        const body = {
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            temperature: this.temperature,
            max_tokens: 2048
        };

        console.log('[VolcengineAPI] 调用 API:', {
            endpoint: this.endpoint,
            model: this.model,
            messageLength: userMessage.length,
            useProxy: this.useProxy
        });

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, this.timeout);

        try {
            let response;
            
            if (this.useProxy) {
                console.log('[VolcengineAPI] 使用本地代理:', this.proxyUrl);
                response = await this.callViaProxy(headers, body, controller.signal);
            } else {
                response = await fetch(this.endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                    signal: controller.signal
                });
            }

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `HTTP ${response.status}`;
                
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson.error) {
                        errorMessage = errorJson.error.message || errorJson.error;
                    }
                } catch (e) {
                    if (errorText) {
                        errorMessage = `${errorMessage}: ${errorText.substring(0, 200)}`;
                    }
                }
                
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`请求超时（${this.timeout / 1000}秒）`);
            }
            
            if (error.message === 'Failed to fetch' || error.message.includes('CORS')) {
                if (this.useProxy) {
                    throw new Error('Failed to fetch（代理连接失败，请确认代理服务器已启动）');
                } else {
                    throw new Error('Failed to fetch（CORS 限制，建议启用本地代理）');
                }
            }
            
            throw error;
        }
    }

    async callViaProxy(headers, body, signal) {
        const proxyPayload = {
            endpoint: this.endpoint,
            headers: headers,
            body: body
        };

        return await fetch(this.proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proxyPayload),
            signal
        });
    }

    parseResponse(response) {
        if (!response || !response.choices || response.choices.length === 0) {
            throw new Error('API 响应为空');
        }

        const content = response.choices[0].message.content;
        
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return this.normalizeResult(parsed);
            }
        } catch (e) {
            console.warn('[VolcengineAPI] JSON 解析失败，尝试文本解析');
        }

        return {
            polishedText: content,
            corrections: [],
            enhancements: [],
            rewrites: []
        };
    }

    normalizeResult(result) {
        return {
            polishedText: result.polishedText || result.text || result.content || '',
            corrections: this.normalizeArray(result.corrections),
            enhancements: this.normalizeArray(result.enhancements),
            rewrites: this.normalizeArray(result.rewrites)
        };
    }

    normalizeArray(arr) {
        if (!Array.isArray(arr)) return [];
        return arr.filter(item => item && typeof item === 'object');
    }

    saveToLocalStorage() {
        const config = {
            apiKey: this.apiKey,
            endpoint: this.endpoint,
            model: this.model,
            systemPrompt: this.systemPrompt,
            temperature: this.temperature,
            timeout: this.timeout,
            useProxy: this.useProxy,
            proxyUrl: this.proxyUrl
        };
        localStorage.setItem('volcengine_config', JSON.stringify(config));
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('volcengine_config');
            if (saved) {
                const config = JSON.parse(saved);
                return this.configure(config);
            }
        } catch (e) {
            console.warn('[VolcengineAPI] 加载保存的配置失败:', e);
        }
        return false;
    }

    clearLocalStorage() {
        localStorage.removeItem('volcengine_config');
    }

    async testProxyConnection(proxyUrl = this.proxyUrl) {
        const healthUrl = proxyUrl.replace('/proxy', '/health');
        
        try {
            const response = await fetch(healthUrl, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    message: '代理服务器运行正常',
                    details: data
                };
            }

            return {
                success: false,
                error: `代理服务器响应异常 (HTTP ${response.status})`
            };
        } catch (error) {
            const message = error.message || '无法连接代理服务器';
            let suggestion = '请确认代理服务器已启动';
            
            if (message.includes('fetch') || message.includes('NetworkError')) {
                suggestion = '代理服务器未启动，请运行: node proxy-server.js';
            } else if (message.includes('timeout')) {
                suggestion = '连接超时，请检查代理服务器状态';
            }

            return {
                success: false,
                error: message,
                suggestions: [
                    suggestion,
                    '运行命令: cd /Users/liboyang/trae/dailyTools/writing-polish && node proxy-server.js',
                    '确认端口 8081 未被其他程序占用'
                ]
            };
        }
    }
}
