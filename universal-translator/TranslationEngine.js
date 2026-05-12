import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

const MODEL_MAP = {
    'en-zh': 'Xenova/opus-mt-en-zh',
    'zh-en': 'Xenova/opus-mt-zh-en',
    'en-fr': 'Xenova/opus-mt-en-fr',
    'fr-en': 'Xenova/opus-mt-fr-en',
    'en-ja': 'Xenova/opus-mt-en-jap',
    'ja-en': 'Xenova/opus-mt-ja-en',
    'en-es': 'Xenova/opus-mt-en-es',
    'es-en': 'Xenova/opus-mt-es-en',
    'en-de': 'Xenova/opus-mt-en-de',
    'de-en': 'Xenova/opus-mt-de-en',
    'en-ru': 'Xenova/opus-mt-en-ru',
    'ru-en': 'Xenova/opus-mt-ru-en',
    'en-ar': 'Xenova/opus-mt-en-ar',
    'ar-en': 'Xenova/opus-mt-ar-en',
    'fr-de': 'Xenova/opus-mt-fr-de',
    'de-fr': 'Xenova/opus-mt-de-fr',
    'fr-es': 'Xenova/opus-mt-fr-es',
    'es-fr': 'Xenova/opus-mt-es-fr'
};

const LANGUAGE_NAMES = {
    'auto': '自动检测',
    'en': 'English',
    'zh': 'Chinese',
    'fr': 'French',
    'ja': 'Japanese',
    'es': 'Spanish',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ko': 'Korean',
    'ar': 'Arabic'
};

const LOCALIZED_NAMES = {
    'auto': '自动检测',
    'en': '英语',
    'zh': '中文',
    'fr': '法语',
    'ja': '日语',
    'es': '西班牙语',
    'de': '德语',
    'it': '意大利语',
    'pt': '葡萄牙语',
    'ru': '俄语',
    'ko': '韩语',
    'ar': '阿拉伯语'
};

const MODEL_DIRECTIONS = {
    'Xenova/opus-mt-en-zh': { source: 'en', target: 'zh' },
    'Xenova/opus-mt-zh-en': { source: 'zh', target: 'en' },
    'Xenova/opus-mt-en-fr': { source: 'en', target: 'fr' },
    'Xenova/opus-mt-fr-en': { source: 'fr', target: 'en' },
    'Xenova/opus-mt-en-jap': { source: 'en', target: 'ja' },
    'Xenova/opus-mt-ja-en': { source: 'ja', target: 'en' },
    'Xenova/opus-mt-en-es': { source: 'en', target: 'es' },
    'Xenova/opus-mt-es-en': { source: 'es', target: 'en' },
    'Xenova/opus-mt-en-de': { source: 'en', target: 'de' },
    'Xenova/opus-mt-de-en': { source: 'de', target: 'en' },
    'Xenova/opus-mt-en-ru': { source: 'en', target: 'ru' },
    'Xenova/opus-mt-ru-en': { source: 'ru', target: 'en' },
    'Xenova/opus-mt-en-ar': { source: 'en', target: 'ar' },
    'Xenova/opus-mt-ar-en': { source: 'ar', target: 'en' },
    'Xenova/opus-mt-fr-de': { source: 'fr', target: 'de' },
    'Xenova/opus-mt-de-fr': { source: 'de', target: 'fr' },
    'Xenova/opus-mt-fr-es': { source: 'fr', target: 'es' },
    'Xenova/opus-mt-es-fr': { source: 'es', target: 'fr' }
};

class VolcengineTranslator {
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.model = config.model || 'doubao-seed-2-0-code-preview-260215';
        this.endpoint = config.endpoint || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
        this.systemPrompt = config.systemPrompt || '你是一位专业的翻译专家。请将用户提供的文本从源语言翻译为目标语言，保持原文的语义和语气。只输出翻译结果，不要输出其他内容。';
    }

    setConfig(config) {
        if (config.apiKey !== undefined) this.apiKey = config.apiKey;
        if (config.model !== undefined) this.model = config.model;
        if (config.endpoint !== undefined) this.endpoint = config.endpoint;
        if (config.systemPrompt !== undefined) this.systemPrompt = config.systemPrompt;
    }

    isConfigured() {
        return this.apiKey.length > 0 && this.model.length > 0;
    }

    getConfig() {
        return {
            apiKey: this.apiKey,
            model: this.model,
            endpoint: this.endpoint,
            systemPrompt: this.systemPrompt
        };
    }

    _getLanguageName(code) {
        const languageMap = {
            'auto': '自动检测',
            'zh': '中文',
            'en': '英语',
            'fr': '法语',
            'ja': '日语',
            'es': '西班牙语',
            'de': '德语',
            'it': '意大利语',
            'pt': '葡萄牙语',
            'ru': '俄语',
            'ko': '韩语',
            'ar': '阿拉伯语'
        };
        return languageMap[code] || code;
    }

    async translate(text, options = {}) {
        const {
            sourceLang = 'auto',
            targetLang = 'zh'
        } = options;

        if (!this.isConfigured()) {
            return {
                success: false,
                error: '火山 Ark API 未配置，请先在参数设置中填写 API Key'
            };
        }

        const sourceLangName = this._getLanguageName(sourceLang);
        const targetLangName = this._getLanguageName(targetLang);

        let userPrompt = '';
        if (sourceLang === 'auto') {
            userPrompt = `请将以下文本翻译为${targetLangName}：\n\n${text}`;
        } else {
            userPrompt = `请将以下${sourceLangName}文本翻译为${targetLangName}：\n\n${text}`;
        }

        const requestBody = {
            'model': this.model,
            'messages': [
                {
                    'role': 'system',
                    'content': this.systemPrompt
                },
                {
                    'role': 'user',
                    'content': userPrompt
                }
            ],
            'temperature': 0.3,
            'max_tokens': 2048
        };

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.error) {
                return {
                    success: false,
                    error: `${result.error.type || 'Error'}: ${result.error.message || 'Unknown error'}`
                };
            }

            if (result.choices && result.choices.length > 0) {
                const translatedText = result.choices[0].message.content.trim();
                return {
                    success: true,
                    originalText: text,
                    translatedText: translatedText,
                    sourceLang: sourceLang,
                    targetLang: targetLang,
                    method: 'volcengine_ark',
                    translations: [{
                        text: translatedText,
                        score: 0.95,
                        method: 'volcengine_ark'
                    }]
                };
            }

            return {
                success: false,
                error: '未获取到翻译结果'
            };

        } catch (error) {
            console.error('[VolcengineTranslator] 翻译失败:', error);
            return {
                success: false,
                error: error.message || '翻译请求失败'
            };
        }
    }

    async testConnection() {
        return await this.translate('Hello', {
            sourceLang: 'en',
            targetLang: 'zh'
        });
    }
}

class CustomApiTranslator {
    constructor(config = {}) {
        this.modelName = config.modelName || 'Custom API';
        this.url = config.url || '';
        this.method = config.method || 'POST';
        this.apiKey = config.apiKey || '';
        this.headers = config.headers || {};
        this.bodyTemplate = config.bodyTemplate || '{"text": "{{text}}", "source": "{{source}}", "target": "{{target}}"}';
        this.responsePath = config.responsePath || 'translation';
    }

    setConfig(config) {
        if (config.modelName !== undefined) this.modelName = config.modelName;
        if (config.url !== undefined) this.url = config.url;
        if (config.method !== undefined) this.method = config.method;
        if (config.apiKey !== undefined) this.apiKey = config.apiKey;
        if (config.headers !== undefined) this.headers = config.headers;
        if (config.bodyTemplate !== undefined) this.bodyTemplate = config.bodyTemplate;
        if (config.responsePath !== undefined) this.responsePath = config.responsePath;
    }

    isConfigured() {
        return this.url.length > 0;
    }

    getConfig() {
        return {
            modelName: this.modelName,
            url: this.url,
            method: this.method,
            apiKey: this.apiKey,
            headers: this.headers,
            bodyTemplate: this.bodyTemplate,
            responsePath: this.responsePath
        };
    }

    _renderTemplate(template, values) {
        let result = template;
        for (const [key, value] of Object.entries(values)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
        return result;
    }

    _getValueByPath(obj, path) {
        if (!path || path === '') return obj;

        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            if (current === null || current === undefined) return undefined;
            current = current[part];
        }

        return current;
    }

    async translate(text, options = {}) {
        const {
            sourceLang = 'auto',
            targetLang = 'zh'
        } = options;

        if (!this.isConfigured()) {
            return {
                success: false,
                error: '自定义 API 未配置，请先在参数设置中填写 API URL'
            };
        }

        try {
            const values = {
                text: text,
                source: sourceLang,
                target: targetLang
            };

            let headers = { ...this.headers };
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }

            let fetchOptions = {
                method: this.method,
                headers
            };

            if (this.method === 'POST' && this.bodyTemplate) {
                try {
                    const bodyStr = this._renderTemplate(this.bodyTemplate, values);
                    fetchOptions.body = bodyStr;
                } catch (e) {
                    fetchOptions.body = JSON.stringify({
                        text,
                        source: sourceLang,
                        target: targetLang
                    });
                }
            }

            let url = this.url;
            if (this.method === 'GET') {
                const separator = url.includes('?') ? '&' : '?';
                url += `${separator}text=${encodeURIComponent(text)}&source=${sourceLang}&target=${targetLang}`;
            }

            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }

            let result;
            try {
                result = await response.json();
            } catch (e) {
                const textResult = await response.text();
                return {
                    success: true,
                    originalText: text,
                    translatedText: textResult,
                    sourceLang,
                    targetLang,
                    method: 'custom_api',
                    translations: [{
                        text: textResult,
                        score: 0.8,
                        method: 'custom_api'
                    }]
                };
            }

            let translation = this._getValueByPath(result, this.responsePath);

            if (!translation && Array.isArray(result)) {
                translation = result[0]?.translation || result[0]?.text || result[0];
            }

            if (!translation && typeof result === 'string') {
                translation = result;
            }

            if (!translation) {
                translation = JSON.stringify(result);
            }

            if (Array.isArray(translation)) {
                translation = translation[0];
            }

            if (typeof translation === 'object') {
                translation = translation.translation || translation.text || JSON.stringify(translation);
            }

            return {
                success: true,
                originalText: text,
                translatedText: String(translation),
                sourceLang,
                targetLang,
                method: 'custom_api',
                translations: [{
                    text: String(translation),
                    score: 0.85,
                    method: 'custom_api'
                }]
            };

        } catch (error) {
            console.error('[CustomApiTranslator] 翻译失败:', error);
            return {
                success: false,
                error: error.message || '翻译请求失败'
            };
        }
    }

    async testConnection() {
        return await this.translate('Hello', {
            sourceLang: 'en',
            targetLang: 'zh'
        });
    }
}

class LocalOnnxTranslator {
    constructor(options = {}) {
        this.options = {
            beamSize: options.beamSize || 4,
            maxLength: options.maxLength || 256,
            onProgress: options.onProgress || null,
            onLoadStart: options.onLoadStart || null,
            onLoadComplete: options.onLoadComplete || null
        };

        env.allowLocalModels = false;
        env.useBrowserCache = true;

        this.pipelineCache = new Map();
        this.currentModelId = null;
        this.currentTranslator = null;
        this.isLoading = false;
    }

    setOptions(options) {
        if (options.beamSize !== undefined) this.options.beamSize = options.beamSize;
        if (options.maxLength !== undefined) this.options.maxLength = options.maxLength;
        if (options.onProgress !== undefined) this.options.onProgress = options.onProgress;
        if (options.onLoadStart !== undefined) this.options.onLoadStart = options.onLoadStart;
        if (options.onLoadComplete !== undefined) this.options.onLoadComplete = options.onLoadComplete;
    }

    async loadModel(modelId) {
        if (this.currentModelId === modelId && this.currentTranslator) {
            return { success: true, cached: true, modelId };
        }

        if (this.isLoading) {
            return { success: false, error: 'Another model is loading' };
        }

        if (this.pipelineCache.has(modelId)) {
            this.currentTranslator = this.pipelineCache.get(modelId);
            this.currentModelId = modelId;
            return { success: true, cached: true, modelId };
        }

        this.isLoading = true;

        if (this.options.onLoadStart) {
            this.options.onLoadStart(modelId);
        }

        try {
            this.currentTranslator = await pipeline('translation', modelId, {
                progress_callback: (progress) => {
                    if (progress?.progress !== undefined) {
                        const raw = progress.progress;
                        const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
                        if (this.options.onProgress) {
                            this.options.onProgress(pct, progress);
                        }
                    }
                }
            });

            this.currentModelId = modelId;
            this.pipelineCache.set(modelId, this.currentTranslator);

            if (this.options.onLoadComplete) {
                this.options.onLoadComplete(modelId);
            }

            this.isLoading = false;
            return { success: true, cached: false, modelId };

        } catch (error) {
            this.isLoading = false;
            this.currentTranslator = null;
            this.currentModelId = null;
            return {
                success: false,
                error: error.message || 'Failed to load model',
                modelId
            };
        }
    }

    isModelLoaded(modelId = this.currentModelId) {
        if (!modelId) return false;
        if (this.pipelineCache.has(modelId)) return true;
        return this.currentModelId === modelId && !!this.currentTranslator;
    }

    getCurrentModelInfo() {
        if (!this.currentModelId) return null;
        const direction = MODEL_DIRECTIONS[this.currentModelId];
        return {
            modelId: this.currentModelId,
            sourceLang: direction?.source,
            targetLang: direction?.target
        };
    }

    async translate(text, options = {}) {
        const {
            maxNewTokens = this.options.maxLength,
            beamSize = this.options.beamSize
        } = options;

        if (!this.currentTranslator) {
            return {
                success: false,
                error: 'No model loaded. Please load a translation model first.'
            };
        }

        try {
            const result = await this.currentTranslator(text, {
                max_new_tokens: maxNewTokens,
                num_beams: beamSize,
                return_full_text: false
            });

            let translation = '';
            if (Array.isArray(result)) {
                translation = result[0]?.generated_text ||
                    result[0]?.translation_text ||
                    result[0]?.text ||
                    '';
            } else if (result && typeof result === 'object') {
                translation = result.generated_text ||
                    result.translation_text ||
                    result.text ||
                    '';
            }

            translation = translation.trim();

            const modelInfo = this.getCurrentModelInfo();

            return {
                success: true,
                originalText: text,
                translatedText: translation,
                sourceLang: modelInfo?.sourceLang || 'auto',
                targetLang: modelInfo?.targetLang || 'zh',
                modelId: this.currentModelId,
                method: 'local_onnx',
                translations: [{
                    text: translation,
                    score: 0.95,
                    method: 'local_onnx'
                }]
            };

        } catch (error) {
            return {
                success: false,
                error: error.message || 'Translation failed',
                originalText: text
            };
        }
    }
}

class TranslationEngine {
    constructor(options = {}) {
        this.currentSource = options.initialSource || 'local';
        
        this.localTranslator = new LocalOnnxTranslator({
            beamSize: options.beamSize || 4,
            maxLength: options.maxLength || 256,
            onProgress: options.onProgress,
            onLoadStart: options.onLoadStart,
            onLoadComplete: options.onLoadComplete
        });

        this.volcengineTranslator = new VolcengineTranslator(options.volcengineConfig || {});
        this.customTranslator = new CustomApiTranslator(options.customConfig || {});

        this.isInitialized = false;
    }

    async initialize() {
        this.isInitialized = true;
        return true;
    }

    setSource(source) {
        this.currentSource = source;
    }

    getSource() {
        return this.currentSource;
    }

    async loadLocalModel(modelId) {
        return await this.localTranslator.loadModel(modelId);
    }

    setVolcengineConfig(config) {
        this.volcengineTranslator.setConfig(config);
    }

    getVolcengineConfig() {
        return this.volcengineTranslator.getConfig();
    }

    isVolcengineConfigured() {
        return this.volcengineTranslator.isConfigured();
    }

    async testVolcengine() {
        return await this.volcengineTranslator.testConnection();
    }

    setCustomConfig(config) {
        this.customTranslator.setConfig(config);
    }

    getCustomConfig() {
        return this.customTranslator.getConfig();
    }

    isCustomConfigured() {
        return this.customTranslator.isConfigured();
    }

    async testCustom() {
        return await this.customTranslator.testConnection();
    }

    setLocalOptions(options) {
        this.localTranslator.setOptions(options);
    }

    isLocalModelLoaded(modelId) {
        return this.localTranslator.isModelLoaded(modelId);
    }

    async translate(text, options = {}) {
        const {
            sourceLang = 'auto',
            targetLang = 'zh',
            modelId = null
        } = options;

        if (!text || !text.trim()) {
            return {
                success: false,
                error: 'Empty input text',
                translations: []
            };
        }

        const trimmedText = text.trim();

        switch (this.currentSource) {
            case 'volcengine':
                return await this.volcengineTranslator.translate(trimmedText, {
                    sourceLang,
                    targetLang
                });

            case 'custom':
                return await this.customTranslator.translate(trimmedText, {
                    sourceLang,
                    targetLang
                });

            case 'local':
            default:
                if (modelId) {
                    await this.localTranslator.loadModel(modelId);
                }
                return await this.localTranslator.translate(trimmedText, options);
        }
    }

    getSupportedLanguages() {
        const languages = new Set();
        for (const direction of Object.values(MODEL_DIRECTIONS)) {
            languages.add(direction.source);
            languages.add(direction.target);
        }

        return Array.from(languages).map(code => ({
            code,
            name: LANGUAGE_NAMES[code],
            localizedName: LOCALIZED_NAMES[code]
        }));
    }

    getLanguageName(code, localized = true) {
        return localized ? (LOCALIZED_NAMES[code] || code) : (LANGUAGE_NAMES[code] || code);
    }

    getAvailableModels() {
        return Object.entries(MODEL_DIRECTIONS).map(([modelId, direction]) => ({
            modelId,
            sourceLang: direction.source,
            targetLang: direction.target,
            sourceName: LANGUAGE_NAMES[direction.source],
            targetName: LANGUAGE_NAMES[direction.target]
        }));
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            currentSource: this.currentSource,
            local: {
                currentModelId: this.localTranslator.currentModelId,
                isLoading: this.localTranslator.isLoading,
                cachedModels: Array.from(this.localTranslator.pipelineCache.keys())
            },
            volcengine: {
                isConfigured: this.volcengineTranslator.isConfigured()
            },
            custom: {
                isConfigured: this.customTranslator.isConfigured()
            }
        };
    }
}

export { 
    TranslationEngine, 
    VolcengineTranslator,
    CustomApiTranslator,
    LocalOnnxTranslator,
    MODEL_MAP, 
    LANGUAGE_NAMES, 
    LOCALIZED_NAMES, 
    MODEL_DIRECTIONS 
};
