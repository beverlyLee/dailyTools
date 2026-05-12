import { TranslationEngine } from './TranslationEngine.js';

class VoiceInputManager {
    constructor(options = {}) {
        this.onResult = options.onResult || null;
        this.onError = options.onError || null;
        this.onStart = options.onStart || null;
        this.onEnd = options.onEnd || null;
        this.onFinalResult = options.onFinalResult || null;
        
        this.recognition = null;
        this.isListening = false;
        this.interimText = '';
        this.finalText = '';
        
        this.init();
    }

    init() {
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.interimText = '';
                this.finalText = '';
                if (this.onStart) this.onStart();
            };

            this.recognition.onend = () => {
                this.isListening = false;
                if (this.onEnd) this.onEnd();
            };

            this.recognition.onerror = (event) => {
                console.error('[VoiceInput] 语音识别错误:', event.error);
                if (this.onError) this.onError(event.error);
            };

            this.recognition.onresult = (event) => {
                let newInterim = '';
                let newFinal = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        newFinal += transcript;
                    } else {
                        newInterim += transcript;
                    }
                }

                if (newFinal) {
                    this.finalText += newFinal;
                    if (this.onFinalResult) {
                        this.onFinalResult(this.finalText);
                    }
                }

                this.interimText = newInterim;

                if (this.onResult) {
                    this.onResult(this.finalText + this.interimText, !!newFinal);
                }
            };
        }
    }

    isSupported() {
        return !!this.recognition;
    }

    setLanguage(langCode) {
        if (this.recognition) {
            const langMap = {
                'zh': 'zh-CN',
                'en': 'en-US',
                'fr': 'fr-FR',
                'ja': 'ja-JP',
                'es': 'es-ES',
                'de': 'de-DE',
                'it': 'it-IT',
                'pt': 'pt-PT',
                'ru': 'ru-RU',
                'ko': 'ko-KR',
                'ar': 'ar-SA'
            };
            this.recognition.lang = langMap[langCode] || 'en-US';
        }
    }

    start(language = 'en') {
        if (!this.isSupported()) {
            if (this.onError) this.onError('not_supported');
            return false;
        }

        if (this.isListening) {
            return true;
        }

        this.setLanguage(language);
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('[VoiceInput] 启动失败:', error);
            if (this.onError) this.onError('start_failed');
            return false;
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    getFinalText() {
        return this.finalText;
    }

    getInterimText() {
        return this.interimText;
    }

    getFullText() {
        return this.finalText + this.interimText;
    }
}

class ConfigManager {
    constructor() {
        this.storageKey = 'translator_config';
        this.config = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('[ConfigManager] 加载配置失败:', e);
        }
        
        return {
            modelSource: 'volcengine',
            volcengine: {
                apiKey: '',
                model: 'doubao-seed-2-0-code-preview-260215',
                endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
                systemPrompt: '你是一位专业的翻译专家。请将用户提供的文本从源语言翻译为目标语言，保持原文的语义和语气。只输出翻译结果，不要输出其他内容。'
            },
            custom: {
                modelName: '',
                url: '',
                method: 'POST',
                apiKey: '',
                headers: {},
                bodyTemplate: '{"text": "{{text}}", "source": "{{source}}", "target": "{{target}}"}',
                responsePath: 'translation'
            },
            local: {
                modelId: 'Xenova/opus-mt-en-fr',
                beamSize: 4,
                maxTokens: 256
            }
        };
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.config));
        } catch (e) {
            console.warn('[ConfigManager] 保存配置失败:', e);
        }
    }

    get(key) {
        return key ? this.config[key] : this.config;
    }

    set(key, value) {
        if (typeof key === 'object') {
            this.config = { ...this.config, ...key };
        } else {
            this.config[key] = value;
        }
        this.save();
    }
}

class TranslatorApp {
    constructor() {
        this.configManager = new ConfigManager();
        const savedConfig = this.configManager.get();

        this.translationEngine = new TranslationEngine({
            initialSource: savedConfig.modelSource,
            beamSize: savedConfig.local.beamSize,
            maxLength: savedConfig.local.maxTokens,
            onProgress: (pct, progress) => this.handleModelProgress(pct, progress),
            onLoadStart: (modelId) => this.handleModelLoadStart(modelId),
            onLoadComplete: (modelId) => this.handleModelLoadComplete(modelId),
            volcengineConfig: savedConfig.volcengine,
            customConfig: savedConfig.custom
        });

        this.voiceInput = null;
        this.isInitialized = false;
        this.isTranslating = false;
        this.translationHistory = [];

        this.init();
    }

    async init() {
        console.log('[TranslatorApp] 正在初始化智能翻译官...');

        this.initElements();
        this.loadSavedConfig();
        this.initVoiceInput();
        this.initEventListeners();

        try {
            await this.translationEngine.initialize();
            this.isInitialized = true;
            this.updateStatus('ready');
            this.updateCurrentConfigDisplay();
            console.log('[TranslatorApp] 智能翻译官初始化完成');
        } catch (error) {
            console.error('[TranslatorApp] 初始化失败:', error);
            this.updateStatus('error');
        }
    }

    initElements() {
        this.sourceText = document.getElementById('sourceText');
        this.targetText = document.getElementById('targetText');
        
        this.modelSource = document.getElementById('modelSource');
        this.configBtn = document.getElementById('configBtn');
        this.configPanel = document.getElementById('configPanel');
        this.closeConfigBtn = document.getElementById('closeConfigBtn');
        
        this.configTabs = document.querySelectorAll('.config-tab');
        this.configSections = document.querySelectorAll('.config-section');
        
        this.volcApiKey = document.getElementById('volcApiKey');
        this.volcModel = document.getElementById('volcModel');
        this.volcEndpoint = document.getElementById('volcEndpoint');
        this.volcSystemPrompt = document.getElementById('volcSystemPrompt');
        this.testVolcBtn = document.getElementById('testVolcBtn');
        this.saveVolcBtn = document.getElementById('saveVolcBtn');
        
        this.customModelName = document.getElementById('customModelName');
        this.customUrl = document.getElementById('customUrl');
        this.customMethod = document.getElementById('customMethod');
        this.customApiKey = document.getElementById('customApiKey');
        this.customHeaders = document.getElementById('customHeaders');
        this.customBodyTemplate = document.getElementById('customBodyTemplate');
        this.customResponsePath = document.getElementById('customResponsePath');
        this.testCustomBtn = document.getElementById('testCustomBtn');
        this.saveCustomBtn = document.getElementById('saveCustomBtn');
        
        this.localModelSelect = document.getElementById('localModelSelect');
        this.localBeamSize = document.getElementById('localBeamSize');
        this.localMaxTokens = document.getElementById('localMaxTokens');
        this.loadLocalBtn = document.getElementById('loadLocalBtn');
        
        this.modelSelect = document.getElementById('modelSelect');
        this.loadModelBtn = document.getElementById('loadModelBtn');
        
        this.apiSourceLang = document.getElementById('apiSourceLang');
        this.apiTargetLang = document.getElementById('apiTargetLang');
        this.apiSwapBtn = document.getElementById('apiSwapBtn');
        this.apiLanguageControls = document.getElementById('apiLanguageControls');
        this.localModelControls = document.getElementById('localModelControls');
        
        this.translateBtn = document.getElementById('translateBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.speakBtn = document.getElementById('speakBtn');
        this.voiceInputBtn = document.getElementById('voiceInputBtn');
        this.stopVoiceBtn = document.getElementById('stopVoiceBtn');
        
        this.historyList = document.getElementById('historyList');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.backTranslateCheck = document.getElementById('backTranslateCheck');
        this.backTranslateResult = document.getElementById('backTranslateResult');
        this.modelProgress = document.getElementById('modelProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.modelInfo = document.getElementById('modelInfo');
        this.voiceStatus = document.getElementById('voiceStatus');
        this.voiceStatusText = document.getElementById('voiceStatusText');
        this.testResult = document.getElementById('testResult');
        
        this.currentSource = document.getElementById('currentSource');
        this.currentStatus = document.getElementById('currentStatus');

        this.quickPhrases = document.querySelectorAll('.quick-phrase');
    }

    loadSavedConfig() {
        try {
            const config = this.configManager.get();
            
            if (this.modelSource) {
                this.modelSource.value = config.modelSource;
            }
            
            if (config.volcengine) {
                if (this.volcApiKey) {
                    this.volcApiKey.value = config.volcengine.apiKey || '';
                }
                if (this.volcModel) {
                    this.volcModel.value = config.volcengine.model || 'doubao-seed-2-0-code-preview-260215';
                }
                if (this.volcEndpoint) {
                    this.volcEndpoint.value = config.volcengine.endpoint || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
                }
                if (this.volcSystemPrompt) {
                    this.volcSystemPrompt.value = config.volcengine.systemPrompt || '你是一位专业的翻译专家。请将用户提供的文本从源语言翻译为目标语言，保持原文的语义和语气。只输出翻译结果，不要输出其他内容。';
                }
            }
            
            if (config.custom) {
                if (this.customModelName) {
                    this.customModelName.value = config.custom.modelName || '';
                }
                if (this.customUrl) {
                    this.customUrl.value = config.custom.url || '';
                }
                if (this.customMethod) {
                    this.customMethod.value = config.custom.method || 'POST';
                }
                if (this.customApiKey) {
                    this.customApiKey.value = config.custom.apiKey || '';
                }
                if (this.customHeaders && config.custom.headers && typeof config.custom.headers === 'object') {
                    this.customHeaders.value = JSON.stringify(config.custom.headers, null, 2);
                }
                if (this.customBodyTemplate) {
                    this.customBodyTemplate.value = config.custom.bodyTemplate || '{"text": "{{text}}", "source": "{{source}}", "target": "{{target}}"}';
                }
                if (this.customResponsePath) {
                    this.customResponsePath.value = config.custom.responsePath || 'translation';
                }
            }
            
            if (config.local) {
                if (this.localModelSelect) {
                    this.localModelSelect.value = config.local.modelId || 'Xenova/opus-mt-en-fr';
                }
                if (this.localBeamSize) {
                    this.localBeamSize.value = config.local.beamSize || 4;
                }
                if (this.localMaxTokens) {
                    this.localMaxTokens.value = config.local.maxTokens || 256;
                }
            }

            this.updateModelSourceUI(config.modelSource);
        } catch (error) {
            console.error('[TranslatorApp] loadSavedConfig 错误:', error);
        }
    }

    initVoiceInput() {
        try {
            this.voiceInput = new VoiceInputManager({
                onStart: () => {
                    try {
                        console.log('[TranslatorApp] 语音输入已启动');
                        if (this.voiceStatus) this.voiceStatus.style.display = 'flex';
                        if (this.voiceInputBtn) this.voiceInputBtn.classList.add('active');
                        if (this.voiceStatusText) this.voiceStatusText.textContent = '正在聆听... (Listening...)';
                    } catch (e) {
                        console.error('[TranslatorApp] 语音输入启动回调错误:', e);
                    }
                },
                onEnd: () => {
                    try {
                        console.log('[TranslatorApp] 语音输入已停止');
                        if (this.voiceStatus) this.voiceStatus.style.display = 'none';
                        if (this.voiceInputBtn) this.voiceInputBtn.classList.remove('active');
                    } catch (e) {
                        console.error('[TranslatorApp] 语音输入停止回调错误:', e);
                    }
                },
                onError: (error) => {
                    try {
                        console.error('[TranslatorApp] 语音输入错误:', error);
                        let errorMsg = '语音识别错误';
                        if (error === 'not_supported') {
                            errorMsg = '您的浏览器不支持语音识别功能';
                        } else if (error === 'not-allowed') {
                            errorMsg = '麦克风权限被拒绝';
                        } else if (error === 'network') {
                            errorMsg = '语音识别服务连接失败，请检查网络连接';
                        } else if (error === 'no-speech') {
                            errorMsg = '未检测到语音输入';
                        } else if (error === 'audio-capture') {
                            errorMsg = '麦克风访问失败';
                        } else if (error === 'start_failed') {
                            errorMsg = '语音识别启动失败';
                        }
                        this.showNotification(errorMsg, 'error');
                        
                        if (this.voiceStatus) this.voiceStatus.style.display = 'none';
                        if (this.voiceInputBtn) this.voiceInputBtn.classList.remove('active');
                    } catch (e) {
                        console.error('[TranslatorApp] 语音输入错误处理回调错误:', e);
                    }
                },
                onResult: (text, isFinal) => {
                    try {
                        if (this.sourceText) {
                            this.sourceText.value = text;
                            this.updateCharCount();
                        }
                    } catch (e) {
                        console.error('[TranslatorApp] 语音输入结果回调错误:', e);
                    }
                },
                onFinalResult: (text) => {
                    try {
                        if (this.sourceText) {
                            this.sourceText.value = text;
                            this.updateCharCount();
                        }
                    } catch (e) {
                        console.error('[TranslatorApp] 语音输入最终结果回调错误:', e);
                    }
                }
            });

            if (!this.voiceInput.isSupported()) {
                if (this.voiceInputBtn) {
                    this.voiceInputBtn.style.opacity = '0.5';
                    this.voiceInputBtn.title = '您的浏览器不支持语音识别';
                }
                console.warn('[TranslatorApp] 浏览器不支持 Web Speech API');
                this.showNotification('您的浏览器不支持语音识别功能', 'warning');
            }
        } catch (error) {
            console.error('[TranslatorApp] 语音输入初始化失败:', error);
            if (this.voiceInputBtn) {
                this.voiceInputBtn.style.opacity = '0.5';
                this.voiceInputBtn.title = '语音识别初始化失败';
            }
        }
    }

    initEventListeners() {
        try {
            if (this.modelSource) {
                this.modelSource.addEventListener('change', () => this.handleModelSourceChange());
            }
            if (this.configBtn) {
                this.configBtn.addEventListener('click', () => this.toggleConfigPanel());
            }
            if (this.closeConfigBtn) {
                this.closeConfigBtn.addEventListener('click', () => this.toggleConfigPanel(false));
            }

            if (this.configTabs) {
                this.configTabs.forEach(tab => {
                    tab.addEventListener('click', () => this.switchConfigTab(tab.dataset.tab));
                });
            }

            if (this.testVolcBtn) {
                this.testVolcBtn.addEventListener('click', () => this.testVolcengineConnection());
            }
            if (this.saveVolcBtn) {
                this.saveVolcBtn.addEventListener('click', () => this.saveVolcengineConfig());
            }
            if (this.testCustomBtn) {
                this.testCustomBtn.addEventListener('click', () => this.testCustomConnection());
            }
            if (this.saveCustomBtn) {
                this.saveCustomBtn.addEventListener('click', () => this.saveCustomConfig());
            }
            if (this.loadLocalBtn) {
                this.loadLocalBtn.addEventListener('click', () => this.loadLocalModelFromConfig());
            }

            if (this.loadModelBtn) {
                this.loadModelBtn.addEventListener('click', () => this.handleLoadModel());
            }
            if (this.translateBtn) {
                this.translateBtn.addEventListener('click', () => this.handleTranslate());
            }
            if (this.clearBtn) {
                this.clearBtn.addEventListener('click', () => this.handleClear());
            }
            if (this.copyBtn) {
                this.copyBtn.addEventListener('click', () => this.handleCopy());
            }
            if (this.speakBtn) {
                this.speakBtn.addEventListener('click', () => this.handleSpeak());
            }
            if (this.voiceInputBtn) {
                this.voiceInputBtn.addEventListener('click', () => this.handleVoiceInput());
            }
            if (this.stopVoiceBtn) {
                this.stopVoiceBtn.addEventListener('click', () => this.handleStopVoice());
            }
            if (this.apiSwapBtn) {
                this.apiSwapBtn.addEventListener('click', () => this.handleApiSwapLanguages());
            }

            if (this.sourceText) {
                this.sourceText.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        this.handleTranslate();
                    }
                });
            }

            if (this.modelSelect) {
                this.modelSelect.addEventListener('change', () => this.handleModelChange());
            }
            if (this.backTranslateCheck) {
                this.backTranslateCheck.addEventListener('change', () => this.toggleBackTranslate());
            }

            if (this.quickPhrases) {
                this.quickPhrases.forEach(phrase => {
                    phrase.addEventListener('click', () => {
                        if (this.sourceText) {
                            this.sourceText.value = phrase.getAttribute('data-text');
                            this.updateCharCount();
                        }
                    });
                });
            }

            if (this.sourceText) {
                this.sourceText.addEventListener('input', () => {
                    this.updateCharCount();
                });
            }

            this.updateCharCount();
            this.updateModelInfo();
        } catch (error) {
            console.error('[TranslatorApp] 事件监听器初始化失败:', error);
        }
    }

    handleModelSourceChange() {
        try {
            if (!this.modelSource) return;
            
            const source = this.modelSource.value;
            this.configManager.set('modelSource', source);
            this.translationEngine.setSource(source);
            this.updateModelSourceUI(source);
            this.updateCurrentConfigDisplay();
            this.updateModelInfo();
        } catch (error) {
            console.error('[TranslatorApp] handleModelSourceChange 错误:', error);
        }
    }

    updateModelSourceUI(source) {
        try {
            if (this.localModelControls && this.apiLanguageControls) {
                if (source === 'local') {
                    this.localModelControls.style.display = 'flex';
                    this.apiLanguageControls.style.display = 'none';
                    
                    if (this.modelSelect && this.translateBtn) {
                        const isLoaded = this.translationEngine.isLocalModelLoaded(this.modelSelect.value);
                        this.translateBtn.disabled = !isLoaded;
                    }
                } else {
                    this.localModelControls.style.display = 'none';
                    this.apiLanguageControls.style.display = 'flex';
                    
                    if (this.translateBtn) {
                        const isConfigured = source === 'volcengine' 
                            ? this.translationEngine.isVolcengineConfigured()
                            : this.translationEngine.isCustomConfigured();
                        
                        this.translateBtn.disabled = !isConfigured;
                    }
                }
            }
        } catch (error) {
            console.error('[TranslatorApp] updateModelSourceUI 错误:', error);
        }
    }

    toggleConfigPanel(show = null) {
        try {
            if (!this.configPanel) return;
            
            const isHidden = this.configPanel.style.display === 'none' || !this.configPanel.style.display;
            const shouldShow = show !== null ? show : isHidden;
            
            this.configPanel.style.display = shouldShow ? 'block' : 'none';
            
            if (shouldShow && this.modelSource) {
                const currentSource = this.modelSource.value;
                const tabMap = {
                    'local': 'local',
                    'volcengine': 'volcengine',
                    'custom': 'custom'
                };
                if (tabMap[currentSource]) {
                    this.switchConfigTab(tabMap[currentSource]);
                }
            }
        } catch (error) {
            console.error('[TranslatorApp] toggleConfigPanel 错误:', error);
        }
    }

    switchConfigTab(tabName) {
        this.configTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        this.configSections.forEach(section => {
            section.classList.toggle('active', section.id === `${tabName}-config`);
        });
    }

    async testVolcengineConnection() {
        try {
            if (!this.testResult) return;
            
            this.testResult.style.display = 'block';
            this.testResult.className = 'test-result test-loading';
            this.testResult.innerHTML = '🔄 正在测试火山 Ark API 连接...';

            if (!this.volcApiKey || !this.volcModel || !this.volcEndpoint) {
                this.testResult.className = 'test-result test-error';
                this.testResult.innerHTML = '❌ 配置元素缺失，请刷新页面重试';
                return;
            }

            const config = {
                apiKey: this.volcApiKey.value.trim(),
                model: this.volcModel.value.trim(),
                endpoint: this.volcEndpoint.value.trim(),
                systemPrompt: this.volcSystemPrompt ? this.volcSystemPrompt.value.trim() : ''
            };

            if (!config.apiKey) {
                this.testResult.className = 'test-result test-error';
                this.testResult.innerHTML = '❌ 请先填写 Ark API Key';
                return;
            }

            this.translationEngine.setVolcengineConfig(config);
            const result = await this.translationEngine.testVolcengine();

            if (result.success) {
                this.testResult.className = 'test-result test-success';
                this.testResult.innerHTML = `
                    ✅ 连接成功！
                    <br>
                    <small>测试: "Hello" → "${result.translatedText}"</small>
                `;
            } else {
                this.testResult.className = 'test-result test-error';
                this.testResult.innerHTML = `
                    ❌ 连接失败: ${result.error}
                    <br>
                    <small>请检查 API Key 和 Model ID 是否正确</small>
                `;
            }
        } catch (error) {
            console.error('[TranslatorApp] testVolcengineConnection 错误:', error);
            if (this.testResult) {
                this.testResult.className = 'test-result test-error';
                this.testResult.innerHTML = `❌ 测试异常: ${error.message}`;
            }
        }
    }

    saveVolcengineConfig() {
        try {
            if (!this.volcApiKey || !this.volcModel || !this.volcEndpoint) {
                this.showNotification('配置元素缺失，请刷新页面重试', 'error');
                return;
            }

            const config = {
                apiKey: this.volcApiKey.value.trim(),
                model: this.volcModel.value.trim(),
                endpoint: this.volcEndpoint.value.trim(),
                systemPrompt: this.volcSystemPrompt ? this.volcSystemPrompt.value.trim() : ''
            };

            this.translationEngine.setVolcengineConfig(config);
            this.configManager.set('volcengine', config);

            this.showNotification('火山 Ark 配置已保存', 'success');
            
            if (this.modelSource && this.modelSource.value === 'volcengine' && this.translateBtn) {
                this.translateBtn.disabled = !this.translationEngine.isVolcengineConfigured();
            }
            
            this.updateCurrentConfigDisplay();
        } catch (error) {
            console.error('[TranslatorApp] saveVolcengineConfig 错误:', error);
            this.showNotification(`保存失败: ${error.message}`, 'error');
        }
    }

    async testCustomConnection() {
        try {
            if (!this.testResult) return;
            
            this.testResult.style.display = 'block';
            this.testResult.className = 'test-result test-loading';
            this.testResult.innerHTML = '🔄 正在测试自定义 API 连接...';

            if (!this.customUrl) {
                this.testResult.className = 'test-result test-error';
                this.testResult.innerHTML = '❌ 配置元素缺失，请刷新页面重试';
                return;
            }

            let headers = {};
            if (this.customHeaders && this.customHeaders.value.trim()) {
                try {
                    headers = JSON.parse(this.customHeaders.value);
                } catch (e) {
                    this.testResult.className = 'test-result test-error';
                    this.testResult.innerHTML = '❌ Headers JSON 格式错误';
                    return;
                }
            }

            const config = {
                modelName: this.customModelName ? this.customModelName.value.trim() : '',
                url: this.customUrl.value.trim(),
                method: this.customMethod ? this.customMethod.value : 'POST',
                apiKey: this.customApiKey ? this.customApiKey.value.trim() : '',
                headers,
                bodyTemplate: this.customBodyTemplate ? this.customBodyTemplate.value : '',
                responsePath: this.customResponsePath ? this.customResponsePath.value : ''
            };

            if (!config.url) {
                this.testResult.className = 'test-result test-error';
                this.testResult.innerHTML = '❌ 请先填写 API URL';
                return;
            }

            this.translationEngine.setCustomConfig(config);
            const result = await this.translationEngine.testCustom();

            if (result.success) {
                this.testResult.className = 'test-result test-success';
                const displayText = result.translatedText ? 
                    result.translatedText.substring(0, 50) + (result.translatedText.length > 50 ? '...' : '') : 
                    '成功';
                this.testResult.innerHTML = `
                    ✅ 连接成功！
                    <br>
                    <small>测试: "Hello" → "${displayText}"</small>
                `;
            } else {
                this.testResult.className = 'test-result test-error';
                this.testResult.innerHTML = `
                    ❌ 连接失败: ${result.error}
                    <br>
                    <small>请检查 URL、Headers 和响应路径配置</small>
                `;
            }
        } catch (error) {
            console.error('[TranslatorApp] testCustomConnection 错误:', error);
            if (this.testResult) {
                this.testResult.className = 'test-result test-error';
                this.testResult.innerHTML = `❌ 测试异常: ${error.message}`;
            }
        }
    }

    saveCustomConfig() {
        try {
            let headers = {};
            if (this.customHeaders && this.customHeaders.value.trim()) {
                try {
                    headers = JSON.parse(this.customHeaders.value);
                } catch (e) {
                    this.showNotification('Headers JSON 格式错误', 'error');
                    return;
                }
            }

            if (!this.customUrl) {
                this.showNotification('配置元素缺失，请刷新页面重试', 'error');
                return;
            }

            const config = {
                modelName: this.customModelName ? this.customModelName.value.trim() : '',
                url: this.customUrl.value.trim(),
                method: this.customMethod ? this.customMethod.value : 'POST',
                apiKey: this.customApiKey ? this.customApiKey.value.trim() : '',
                headers,
                bodyTemplate: this.customBodyTemplate ? this.customBodyTemplate.value : '',
                responsePath: this.customResponsePath ? this.customResponsePath.value : ''
            };

            this.translationEngine.setCustomConfig(config);
            this.configManager.set('custom', config);

            this.showNotification('自定义 API 配置已保存', 'success');
            
            if (this.modelSource && this.modelSource.value === 'custom' && this.translateBtn) {
                this.translateBtn.disabled = !this.translationEngine.isCustomConfigured();
            }
            
            this.updateCurrentConfigDisplay();
        } catch (error) {
            console.error('[TranslatorApp] saveCustomConfig 错误:', error);
            this.showNotification(`保存失败: ${error.message}`, 'error');
        }
    }

    async loadLocalModelFromConfig() {
        try {
            if (!this.localModelSelect) {
                this.showNotification('配置元素缺失，请刷新页面重试', 'error');
                return;
            }

            const modelId = this.localModelSelect.value;
            const beamSize = this.localBeamSize ? (parseInt(this.localBeamSize.value) || 4) : 4;
            const maxTokens = this.localMaxTokens ? (parseInt(this.localMaxTokens.value) || 256) : 256;

            this.configManager.set('local', {
                modelId,
                beamSize,
                maxTokens
            });

            this.translationEngine.setLocalOptions({
                beamSize,
                maxLength: maxTokens
            });

            if (this.modelSelect) {
                this.modelSelect.value = modelId;
            }
            await this.handleLoadModel();
        } catch (error) {
            console.error('[TranslatorApp] loadLocalModelFromConfig 错误:', error);
            this.showNotification(`加载失败: ${error.message}`, 'error');
        }
    }

    handleModelLoadStart(modelId) {
        try {
            console.log(`[TranslatorApp] 开始加载模型: ${modelId}`);
            if (this.modelProgress) this.modelProgress.style.display = 'flex';
            if (this.progressFill) this.progressFill.style.width = '0%';
            if (this.progressText) this.progressText.textContent = '正在下载模型... 0%';
            if (this.loadModelBtn) {
                this.loadModelBtn.disabled = true;
                this.loadModelBtn.innerHTML = '<span class="spinner"></span> 加载中...';
            }
            this.updateStatus('loading');
        } catch (error) {
            console.error('[TranslatorApp] handleModelLoadStart 错误:', error);
        }
    }

    handleModelProgress(pct, progress) {
        try {
            if (this.progressFill) this.progressFill.style.width = `${pct}%`;
            if (this.progressText) this.progressText.textContent = `正在下载模型... ${pct}%`;
        } catch (error) {
            console.error('[TranslatorApp] handleModelProgress 错误:', error);
        }
    }

    handleModelLoadComplete(modelId) {
        try {
            console.log(`[TranslatorApp] 模型加载完成: ${modelId}`);
            if (this.modelProgress) this.modelProgress.style.display = 'none';
            if (this.loadModelBtn) {
                this.loadModelBtn.disabled = false;
                this.loadModelBtn.innerHTML = '🔄 加载模型 (Load Model)';
            }
            if (this.translateBtn) this.translateBtn.disabled = false;
            this.updateStatus('ready');
            this.updateModelInfo();
            this.updateCurrentConfigDisplay();
            this.showNotification('模型加载完成，可以开始翻译了！', 'success');
        } catch (error) {
            console.error('[TranslatorApp] handleModelLoadComplete 错误:', error);
        }
    }

    handleModelChange() {
        try {
            if (!this.modelSelect) return;
            
            const modelId = this.modelSelect.value;
            
            if (this.translateBtn) {
                if (this.translationEngine.isLocalModelLoaded(modelId)) {
                    this.translateBtn.disabled = false;
                } else {
                    this.translateBtn.disabled = true;
                }
            }

            this.updateModelInfo();
        } catch (error) {
            console.error('[TranslatorApp] handleModelChange 错误:', error);
        }
    }

    async handleLoadModel() {
        try {
            if (!this.modelSelect) return;
            
            const modelId = this.modelSelect.value;

            if (this.translationEngine.localTranslator && this.translationEngine.localTranslator.isLoading) {
                this.showNotification('模型正在加载中，请稍候...', 'warning');
                return;
            }

            if (this.translationEngine.isLocalModelLoaded(modelId)) {
                this.showNotification('模型已在缓存中，可以直接使用', 'info');
                if (this.translateBtn) this.translateBtn.disabled = false;
                return;
            }

            console.log(`[TranslatorApp] 准备加载模型: ${modelId}`);

            const result = await this.translationEngine.loadLocalModel(modelId);

            if (!result.success) {
                if (this.modelProgress) this.modelProgress.style.display = 'none';
                if (this.loadModelBtn) {
                    this.loadModelBtn.disabled = false;
                    this.loadModelBtn.innerHTML = '🔄 加载模型 (Load Model)';
                }
                this.updateStatus('error');
                this.showNotification(`模型加载失败: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('[TranslatorApp] handleLoadModel 错误:', error);
            this.showNotification(`加载失败: ${error.message}`, 'error');
        }
    }

    handleVoiceInput() {
        try {
            if (!this.voiceInput || !this.voiceInput.isSupported()) {
                this.showNotification('您的浏览器不支持语音识别功能', 'error');
                return;
            }

            if (this.voiceInput.isListening) {
                this.voiceInput.stop();
            } else {
                let sourceLang = 'en';
                
                if (this.modelSource && this.modelSource.value === 'local' && this.modelSelect) {
                    const modelId = this.modelSelect.value;
                    const parts = modelId.replace('Xenova/opus-mt-', '').split('-');
                    sourceLang = parts[0] === 'jap' ? 'ja' : parts[0];
                } else if (this.apiSourceLang) {
                    sourceLang = this.apiSourceLang.value === 'auto' ? 'en' : this.apiSourceLang.value;
                }
                
                this.voiceInput.start(sourceLang);
            }
        } catch (error) {
            console.error('[TranslatorApp] handleVoiceInput 错误:', error);
        }
    }

    handleStopVoice() {
        this.voiceInput.stop();
    }

    updateCharCount() {
        const count = this.sourceText.value.length;
        const charCountEl = document.querySelector('.char-count');
        if (charCountEl) {
            charCountEl.textContent = `${count} 字符`;
        }
    }

    async handleTranslate() {
        try {
            if (!this.sourceText) {
                this.showNotification('页面元素缺失，请刷新页面重试', 'error');
                return;
            }

            const text = this.sourceText.value.trim();

            if (!text) {
                this.showNotification('请输入要翻译的文本', 'warning');
                return;
            }

            if (!this.modelSource) {
                this.showNotification('页面元素缺失，请刷新页面重试', 'error');
                return;
            }

            const source = this.modelSource.value;

            if (source === 'local') {
                if (!this.modelSelect || !this.translationEngine.isLocalModelLoaded(this.modelSelect.value)) {
                    this.showNotification('请先点击"加载模型"按钮下载翻译模型', 'warning');
                    return;
                }
            } else if (source === 'volcengine') {
                if (!this.translationEngine.isVolcengineConfigured()) {
                    this.showNotification('请先在"参数设置"中配置火山 Ark API', 'warning');
                    this.toggleConfigPanel(true);
                    this.switchConfigTab('volcengine');
                    return;
                }
            } else if (source === 'custom') {
                if (!this.translationEngine.isCustomConfigured()) {
                    this.showNotification('请先在"参数设置"中配置自定义 API', 'warning');
                    this.toggleConfigPanel(true);
                    this.switchConfigTab('custom');
                    return;
                }
            }

            if (this.isTranslating) {
                return;
            }

            this.isTranslating = true;
            this.updateStatus('translating');
            if (this.translateBtn) {
                this.translateBtn.disabled = true;
                this.translateBtn.innerHTML = '<span class="spinner"></span> 翻译中...';
            }
            if (this.targetText) {
                this.targetText.placeholder = '正在翻译...';
                this.targetText.value = '';
            }

            let sourceLang = 'auto';
            let targetLang = 'zh';
            let modelId = null;

            if (source === 'local' && this.modelSelect) {
                modelId = this.modelSelect.value;
            } else if (this.apiSourceLang && this.apiTargetLang) {
                sourceLang = this.apiSourceLang.value;
                targetLang = this.apiTargetLang.value;
            }

            console.log(`[TranslatorApp] 源: ${source}, 输入: ${text}`);

            const result = await this.translationEngine.translate(text, {
                sourceLang,
                targetLang,
                modelId,
                maxNewTokens: parseInt(this.localMaxTokens?.value) || 256,
                beamSize: parseInt(this.localBeamSize?.value) || 4
            });

            console.log('[TranslatorApp] 翻译结果:', result);

            if (result.success) {
                if (this.targetText) {
                    this.targetText.value = result.translatedText;
                }
                this.addToHistory(text, result.translatedText, result.sourceLang, result.targetLang);

                if (this.backTranslateCheck && this.backTranslateCheck.checked) {
                    await this.performBackTranslate(result);
                }

                this.updateStatus('ready');
            } else {
                if (this.targetText) {
                    this.targetText.value = `翻译失败: ${result.error || '未知错误'}`;
                }
                this.updateStatus('error');
                this.showNotification(`翻译失败: ${result.error}`, 'error');
            }

        } catch (error) {
            console.error('[TranslatorApp] 翻译出错:', error);
            if (this.targetText) {
                this.targetText.value = `翻译出错: ${error.message}`;
            }
            this.updateStatus('error');
            this.showNotification(`翻译出错: ${error.message}`, 'error');
        } finally {
            this.isTranslating = false;
            if (this.translateBtn) {
                this.translateBtn.disabled = false;
                this.translateBtn.textContent = '翻译 (Translate)';
            }
        }
    }

    async performBackTranslate(result) {
        try {
            let backSourceLang = result.targetLang;
            let backTargetLang = result.sourceLang;
            let backModelId = null;

            if (!this.modelSource || !this.backTranslateResult) {
                return;
            }

            const source = this.modelSource.value;

            if (source === 'local') {
                const reverseKey = `${result.targetLang}-${result.sourceLang}`;
                const reverseMap = {
                    'en-zh': 'Xenova/opus-mt-zh-en',
                    'zh-en': 'Xenova/opus-mt-en-zh',
                    'en-fr': 'Xenova/opus-mt-fr-en',
                    'fr-en': 'Xenova/opus-mt-en-fr',
                    'en-ja': 'Xenova/opus-mt-ja-en',
                    'ja-en': 'Xenova/opus-mt-en-jap',
                    'en-es': 'Xenova/opus-mt-es-en',
                    'es-en': 'Xenova/opus-mt-en-es',
                    'en-de': 'Xenova/opus-mt-de-en',
                    'de-en': 'Xenova/opus-mt-en-de'
                };
                backModelId = reverseMap[reverseKey];
                
                if (!backModelId) {
                    this.backTranslateResult.style.display = 'block';
                    this.backTranslateResult.innerHTML = `
                        <div class="back-translate-label">回译结果 (Back Translation):</div>
                        <div class="back-translate-text" style="color: #6c757d;">
                            暂无对应的反向翻译模型
                        </div>
                    `;
                    return;
                }
            }

            const backResult = await this.translationEngine.translate(result.translatedText, {
                sourceLang: backSourceLang,
                targetLang: backTargetLang,
                modelId: backModelId
            });

            if (backResult.success) {
                this.backTranslateResult.style.display = 'block';
                this.backTranslateResult.innerHTML = `
                    <div class="back-translate-label">回译结果 (Back Translation):</div>
                    <div class="back-translate-text">${this.escapeHtml(backResult.translatedText)}</div>
                `;
            }
        } catch (error) {
            console.warn('[TranslatorApp] 回译失败:', error);
        }
    }

    handleApiSwapLanguages() {
        try {
            if (!this.apiSourceLang || !this.apiTargetLang || !this.sourceText || !this.targetText) return;
            
            const sourceVal = this.apiSourceLang.value;
            const targetVal = this.apiTargetLang.value;

            if (sourceVal === 'auto') {
                this.showNotification('自动检测模式无法交换', 'warning');
                return;
            }

            this.apiSourceLang.value = targetVal;
            this.apiTargetLang.value = sourceVal === 'auto' ? 'en' : sourceVal;

            const tempText = this.sourceText.value;
            this.sourceText.value = this.targetText.value;
            this.targetText.value = tempText;

            this.updateCharCount();
        } catch (error) {
            console.error('[TranslatorApp] handleApiSwapLanguages 错误:', error);
        }
    }

    toggleBackTranslate() {
        try {
            if (!this.backTranslateCheck || !this.backTranslateResult) return;
            
            if (!this.backTranslateCheck.checked) {
                this.backTranslateResult.style.display = 'none';
            } else if (this.targetText && this.targetText.value) {
                this.handleTranslate();
            }
        } catch (error) {
            console.error('[TranslatorApp] toggleBackTranslate 错误:', error);
        }
    }

    handleClear() {
        try {
            if (this.sourceText) this.sourceText.value = '';
            if (this.targetText) this.targetText.value = '';
            if (this.backTranslateResult) this.backTranslateResult.style.display = 'none';
            this.updateCharCount();
            this.updateStatus('ready');
        } catch (error) {
            console.error('[TranslatorApp] handleClear 错误:', error);
        }
    }

    handleCopy() {
        try {
            if (!this.targetText) return;
            
            const text = this.targetText.value;
            if (!text) {
                this.showNotification('没有可复制的内容', 'warning');
                return;
            }

            navigator.clipboard.writeText(text)
                .then(() => {
                    this.showNotification('已复制到剪贴板', 'success');
                })
                .catch(() => {
                    if (this.targetText) {
                        this.targetText.select();
                        document.execCommand('copy');
                        this.showNotification('已复制到剪贴板', 'success');
                    }
                });
        } catch (error) {
            console.error('[TranslatorApp] handleCopy 错误:', error);
        }
    }

    handleSpeak() {
        try {
            if (!this.targetText) return;
            
            const text = this.targetText.value;
            if (!text) {
                this.showNotification('没有可朗读的内容', 'warning');
                return;
            }

            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);

                let targetLang = 'en';
                if (this.modelSource) {
                    const source = this.modelSource.value;

                    if (source === 'local' && this.modelSelect) {
                        const modelId = this.modelSelect.value;
                        const parts = modelId.replace('Xenova/opus-mt-', '').split('-');
                        targetLang = parts[1] === 'jap' ? 'ja' : parts[1];
                    } else if (this.apiTargetLang) {
                        targetLang = this.apiTargetLang.value;
                    }
                }
                
                const langMap = {
                    'zh': 'zh-CN',
                    'en': 'en-US',
                    'fr': 'fr-FR',
                    'ja': 'ja-JP',
                    'es': 'es-ES',
                    'de': 'de-DE',
                    'it': 'it-IT',
                    'pt': 'pt-PT',
                    'ru': 'ru-RU',
                    'ko': 'ko-KR',
                    'ar': 'ar-SA'
                };

                utterance.lang = langMap[targetLang] || 'en-US';
                utterance.rate = 0.9;
                utterance.pitch = 1;

                speechSynthesis.speak(utterance);
            } else {
                this.showNotification('您的浏览器不支持语音朗读', 'error');
            }
        } catch (error) {
            console.error('[TranslatorApp] handleSpeak 错误:', error);
        }
    }

    addToHistory(source, target, sourceLang, targetLang) {
        try {
            const historyItem = {
                id: Date.now(),
                source,
                target,
                sourceLang,
                targetLang,
                timestamp: new Date()
            };

            this.translationHistory.unshift(historyItem);

            if (this.translationHistory.length > 20) {
                this.translationHistory.pop();
            }

            this.renderHistory();
        } catch (error) {
            console.error('[TranslatorApp] addToHistory 错误:', error);
        }
    }

    renderHistory() {
        try {
            if (!this.historyList) return;

            if (this.translationHistory.length === 0) {
                this.historyList.innerHTML = '<div class="empty-history">暂无翻译历史</div>';
                return;
            }

            this.historyList.innerHTML = this.translationHistory.map(item => `
                <div class="history-item" data-id="${item.id}">
                    <div class="history-source">${this.escapeHtml(item.source)}</div>
                    <div class="history-arrow">→</div>
                    <div class="history-target">${this.escapeHtml(item.target)}</div>
                    <div class="history-time">${this.formatTime(item.timestamp)}</div>
                </div>
            `).join('');

            this.historyList.querySelectorAll('.history-item').forEach(item => {
                item.addEventListener('click', () => {
                    try {
                        const id = parseInt(item.getAttribute('data-id'));
                        const historyItem = this.translationHistory.find(h => h.id === id);
                        if (historyItem && this.sourceText && this.targetText) {
                            this.sourceText.value = historyItem.source;
                            this.targetText.value = historyItem.target;
                            this.updateCharCount();
                        }
                    } catch (e) {
                        console.error('[TranslatorApp] 历史记录点击错误:', e);
                    }
                });
            });
        } catch (error) {
            console.error('[TranslatorApp] renderHistory 错误:', error);
        }
    }

    formatTime(date) {
        try {
            const now = new Date();
            const diff = now - date;

            if (diff < 60000) {
                return '刚刚';
            } else if (diff < 3600000) {
                return `${Math.floor(diff / 60000)} 分钟前`;
            } else if (diff < 86400000) {
                return `${Math.floor(diff / 3600000)} 小时前`;
            } else {
                return date.toLocaleDateString('zh-CN');
            }
        } catch (error) {
            console.error('[TranslatorApp] formatTime 错误:', error);
            return '未知时间';
        }
    }

    updateStatus(status) {
        try {
            const statusMap = {
                'ready': {
                    text: '✓ 就绪',
                    class: 'status-ready',
                    color: '#28a745'
                },
                'translating': {
                    text: '翻译中...',
                    class: 'status-translating',
                    color: '#17a2b8'
                },
                'error': {
                    text: '错误',
                    class: 'status-error',
                    color: '#dc3545'
                },
                'loading': {
                    text: '加载模型中...',
                    class: 'status-loading',
                    color: '#ffc107'
                }
            };

            const info = statusMap[status] || statusMap['ready'];

            if (this.statusText) {
                this.statusText.textContent = info.text;
                this.statusText.className = info.class;
            }

            if (this.statusIndicator) {
                this.statusIndicator.style.backgroundColor = info.color;
            }
        } catch (error) {
            console.error('[TranslatorApp] updateStatus 错误:', error);
        }
    }

    updateModelInfo() {
        try {
            if (!this.modelSource) return;
            
            const source = this.modelSource.value;
            let infoText = '';
            
            if (source === 'local' && this.modelSelect) {
                const modelId = this.modelSelect.value;
                const isLoaded = this.translationEngine.isLocalModelLoaded(modelId);
                
                if (isLoaded) {
                    infoText = `✅ 模型已加载: ${modelId}`;
                } else {
                    infoText = `📦 点击"加载模型"按钮下载: ${modelId}`;
                }
            } else if (source === 'volcengine') {
                const isConfigured = this.translationEngine.isVolcengineConfigured();
                const modelName = this.volcModel ? this.volcModel.value : '未配置';
                infoText = isConfigured 
                    ? `✅ 火山 Ark API 已配置 (模型: ${modelName})`
                    : `⚠️ 请在参数设置中配置火山 Ark API`;
            } else if (source === 'custom' && this.customUrl) {
                const isConfigured = this.translationEngine.isCustomConfigured();
                const urlDisplay = this.customUrl.value ? this.customUrl.value.substring(0, 40) + '...' : '';
                infoText = isConfigured 
                    ? `✅ 自定义 API 已配置: ${urlDisplay}`
                    : `⚠️ 请在参数设置中配置自定义 API`;
            }
            
            if (this.modelInfo) {
                this.modelInfo.textContent = infoText;
            }
        } catch (error) {
            console.error('[TranslatorApp] updateModelInfo 错误:', error);
        }
    }

    updateCurrentConfigDisplay() {
        try {
            if (!this.modelSource) return;
            
            const source = this.modelSource.value;
            const sourceNames = {
                'local': '本地模型',
                'volcengine': '火山 Ark API',
                'custom': '自定义 API'
            };

            if (this.currentSource) {
                this.currentSource.textContent = sourceNames[source] || source;
            }

            if (this.currentStatus) {
                let statusText = '';
                let statusClass = 'status-waiting';

                if (source === 'local' && this.modelSelect) {
                    const modelId = this.modelSelect.value;
                    const isLoaded = this.translationEngine.isLocalModelLoaded(modelId);
                    statusText = isLoaded ? '已就绪' : '等待加载模型';
                    statusClass = isLoaded ? 'status-ready' : 'status-waiting';
                } else if (source === 'volcengine') {
                    const isConfigured = this.translationEngine.isVolcengineConfigured();
                    statusText = isConfigured ? '已配置' : '未配置';
                    statusClass = isConfigured ? 'status-ready' : 'status-error';
                } else if (source === 'custom') {
                    const isConfigured = this.translationEngine.isCustomConfigured();
                    statusText = isConfigured ? '已配置' : '未配置';
                    statusClass = isConfigured ? 'status-ready' : 'status-error';
                }

                this.currentStatus.textContent = statusText;
                this.currentStatus.className = `config-value ${statusClass}`;
            }
        } catch (error) {
            console.error('[TranslatorApp] updateCurrentConfigDisplay 错误:', error);
        }
    }

    showNotification(message, type = 'info') {
        try {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;

            document.body.appendChild(notification);

            setTimeout(() => {
                try {
                    notification.style.animation = 'fadeOut 0.3s ease-out';
                    setTimeout(() => {
                        try {
                            notification.remove();
                        } catch (e) {
                            // 忽略移除错误
                        }
                    }, 300);
                } catch (e) {
                    console.error('[TranslatorApp] 通知动画错误:', e);
                }
            }, 3000);
        } catch (error) {
            console.error('[TranslatorApp] showNotification 错误:', error);
        }
    }

    updateCharCount() {
        try {
            const charCountEl = document.getElementById('charCount');
            if (charCountEl && this.sourceText) {
                const count = this.sourceText.value.length;
                charCountEl.textContent = `${count} 字符`;
            }
        } catch (error) {
            console.error('[TranslatorApp] updateCharCount 错误:', error);
        }
    }

    escapeHtml(text) {
        try {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        } catch (error) {
            console.error('[TranslatorApp] escapeHtml 错误:', error);
            return text || '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('[TranslatorApp] DOM 已加载，正在初始化智能翻译官...');
        window.translatorApp = new TranslatorApp();
        console.log('[TranslatorApp] 初始化完成！');
    } catch (error) {
        console.error('[TranslatorApp] 初始化失败:', error);
        alert('应用初始化失败，请刷新页面重试。错误: ' + error.message);
    }
});
