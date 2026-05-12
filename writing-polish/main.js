import { GrammarCorrector } from './GrammarCorrector.js';
import { SentenceRewriter } from './SentenceRewriter.js';
import { VocabEnhancer } from './VocabEnhancer.js';
import { VolcengineAPI } from './VolcengineAPI.js';
import { LANGUAGES, detectLanguage } from './MultilingualData.js';

const MULTILINGUAL_PROMPTS = {
    en: `You are a professional English writing assistant. Help users improve their English text, including: 1. Correct grammatical errors; 2. Optimize vocabulary using more advanced words; 3. Improve sentence structure for better flow. Return in JSON format: {"polishedText": "...", "corrections": [{"original": "...", "replacement": "...", "explanation": "..."}], "enhancements": [{"original": "...", "replacement": "...", "explanation": "..."}], "rewrites": [{"original": "...", "replacement": "...", "explanation": "..."}]}`,
    zh: `你是一位专业的中文写作润色助手。请帮助用户改进中文文本，包括：1. 修正语法和用词错误；2. 优化词汇使用，使用更精准或优美的词汇；3. 改进句式结构，使其更流畅自然。请以 JSON 格式返回结果：{"polishedText": "...", "corrections": [{"original": "...", "replacement": "...", "explanation": "..."}], "enhancements": [{"original": "...", "replacement": "...", "explanation": "..."}], "rewrites": [{"original": "...", "replacement": "...", "explanation": "..."}]}`,
    ja: `あなたはプロフェッショナルな日本語ライティングアシスタントです。ユーザーの日本語テキストを改善するのを手伝ってください。1. 文法エラーの修正；2. より高度な語彙を使用して語彙を最適化；3. 文の構造を改善して流れを良くする。JSON形式で返してください：{"polishedText": "...", "corrections": [{"original": "...", "replacement": "...", "explanation": "..."}], "enhancements": [{"original": "...", "replacement": "...", "explanation": "..."}], "rewrites": [{"original": "...", "replacement": "...", "explanation": "..."}]}`,
    ko: `당신은 전문적인 한국어 작성 어시스턴트입니다. 사용자의 한국어 텍스트를 개선하는 것을 도와주세요. 1. 문법 오류 수정；2. 더 고급 단어를 사용하여 어휘 최적화；3. 문장 구조를 개선하여 흐름을 좋게 하세요. JSON 형식으로 반환하세요：{"polishedText": "...", "corrections": [{"original": "...", "replacement": "...", "explanation": "..."}], "enhancements": [{"original": "...", "replacement": "...", "explanation": "..."}], "rewrites": [{"original": "...", "replacement": "...", "explanation": "..."}]}`,
    de: `Sie sind ein professioneller deutscher Schreibassistent. Helfen Sie Benutzern, ihren deutschen Text zu verbessern, einschließlich: 1. Korrektur grammatikalischer Fehler; 2. Optimierung des Wortschatzes mit fortgeschritteneren Wörtern; 3. Verbesserung der Satzstruktur für einen besseren Fluss. Rückgabe im JSON-Format: {"polishedText": "...", "corrections": [{"original": "...", "replacement": "...", "explanation": "..."}], "enhancements": [{"original": "...", "replacement": "...", "explanation": "..."}], "rewrites": [{"original": "...", "replacement": "...", "explanation": "..."}]}`,
    fr: `Vous êtes un assistant de rédaction professionnel en français. Aidez les utilisateurs à améliorer leur texte français, y compris: 1. Corriger les erreurs grammaticales; 2. Optimiser le vocabulaire en utilisant des mots plus avancés; 3. Améliorer la structure des phrases pour une meilleure fluidité. Retournez au format JSON: {"polishedText": "...", "corrections": [{"original": "...", "replacement": "...", "explanation": "..."}], "enhancements": [{"original": "...", "replacement": "...", "explanation": "..."}], "rewrites": [{"original": "...", "replacement": "...", "explanation": "..."}]}`
};

class WritingPolishApp {
    constructor() {
        this.grammarCorrector = null;
        this.sentenceRewriter = null;
        this.vocabEnhancer = null;
        this.volcengineAPI = null;
        
        this.modelStatus = 'loading';
        this.currentMode = 'local';
        this.currentLanguage = 'auto';
        this.isProcessing = false;
        this.lastResult = null;

        this.init();
    }

    async init() {
        console.log('[WritingPolish] 正在初始化智能写作润色助手...');

        this.initElements();
        this.initEventListeners();
        this.updateStatus('loading', '模型加载中...');

        try {
            await this.initModules();
            this.initConfigUI();
            this.updateStatus('ready', '模型已就绪');
            console.log('[WritingPolish] 智能写作润色助手初始化完成');
        } catch (error) {
            console.error('[WritingPolish] 初始化失败:', error);
            this.updateStatus('error', '模型加载失败');
            this.showToast('模型加载失败: ' + error.message, 'error');
        }
    }

    initElements() {
        this.inputText = document.getElementById('inputText');
        this.polishBtn = document.getElementById('polishBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.copyResultBtn = document.getElementById('copyResultBtn');

        this.languageSelect = document.getElementById('languageSelect');
        this.enableGrammar = document.getElementById('enableGrammar');
        this.enableVocab = document.getElementById('enableVocab');
        this.enableRewrite = document.getElementById('enableRewrite');

        this.resultsSection = document.getElementById('resultsSection');
        this.loadingSection = document.getElementById('loadingSection');
        this.resultContent = document.getElementById('resultContent');

        this.grammarCard = document.getElementById('grammarCard');
        this.vocabCard = document.getElementById('vocabCard');
        this.rewriteCard = document.getElementById('rewriteCard');

        this.grammarDetails = document.getElementById('grammarDetails');
        this.vocabDetails = document.getElementById('vocabDetails');
        this.rewriteDetails = document.getElementById('rewriteDetails');

        this.exampleTags = document.querySelectorAll('.example-tag');

        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');

        this.configBtn = document.getElementById('configBtn');
        this.configPanel = document.getElementById('configPanel');
        this.closeConfigBtn = document.getElementById('closeConfigBtn');
        this.configTabs = document.querySelectorAll('.config-tab');
        this.configSections = document.querySelectorAll('.config-section');

        this.volcApiKey = document.getElementById('volcApiKey');
        this.volcEndpoint = document.getElementById('volcEndpoint');
        this.volcModel = document.getElementById('volcModel');
        this.volcSystemPrompt = document.getElementById('volcSystemPrompt');
        this.volcTemperature = document.getElementById('volcTemperature');
        this.volcTimeout = document.getElementById('volcTimeout');
        this.useProxy = document.getElementById('useProxy');
        this.proxyUrl = document.getElementById('proxyUrl');
        this.proxyUrlGroup = document.getElementById('proxyUrlGroup');
        this.testVolcBtn = document.getElementById('testVolcBtn');
        this.testProxyBtn = document.getElementById('testProxyBtn');
        this.saveVolcBtn = document.getElementById('saveVolcBtn');
        this.testResult = document.getElementById('testResult');
        this.proxyTestResult = document.getElementById('proxyTestResult');
        
        this.toggleHelpBtn = document.getElementById('toggleHelpBtn');
        this.helpContent = document.getElementById('helpContent');

        this.localOptimizeLevel = document.getElementById('localOptimizeLevel');
    }

    async initModules() {
        this.grammarCorrector = new GrammarCorrector();
        this.sentenceRewriter = new SentenceRewriter();
        this.vocabEnhancer = new VocabEnhancer();
        this.volcengineAPI = new VolcengineAPI();

        const hasSavedConfig = this.volcengineAPI.loadFromLocalStorage();
        if (hasSavedConfig && this.volcengineAPI.isConfigured) {
            this.currentMode = 'volcengine';
            console.log('[WritingPolish] 已加载火山引擎 API 配置');
        }

        await this.checkTFJS();
    }

    async checkTFJS() {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            if (typeof tf !== 'undefined') {
                console.log('[WritingPolish] TensorFlow.js 已加载');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 200));
            attempts++;
        }

        console.warn('[WritingPolish] TensorFlow.js 加载超时，使用本地规则引擎');
        return false;
    }

    initConfigUI() {
        const config = this.volcengineAPI.getConfig();
        
        if (config.apiKey) {
            this.volcApiKey.value = config.apiKey;
        }
        if (config.endpoint) {
            this.volcEndpoint.value = config.endpoint;
        }
        if (config.model) {
            this.volcModel.value = config.model;
        }
        if (config.systemPrompt) {
            this.volcSystemPrompt.value = config.systemPrompt;
        }
        if (config.temperature !== undefined) {
            this.volcTemperature.value = config.temperature;
        }
        if (config.timeout !== undefined) {
            this.volcTimeout.value = config.timeout / 1000;
        }
        if (config.useProxy !== undefined) {
            this.useProxy.checked = config.useProxy;
            this.handleProxyToggle();
        }
        if (config.proxyUrl) {
            this.proxyUrl.value = config.proxyUrl;
        }

        const savedMode = localStorage.getItem('writing_polish_mode');
        if (savedMode) {
            this.switchMode(savedMode);
        }
    }

    initEventListeners() {
        this.polishBtn.addEventListener('click', () => this.handlePolish());
        this.clearBtn.addEventListener('click', () => this.handleClear());
        this.copyResultBtn.addEventListener('click', () => this.handleCopyResult());

        this.inputText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.handlePolish();
            }
        });

        this.exampleTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const lang = tag.getAttribute('data-lang');
                this.inputText.value = tag.getAttribute('data-text');
                if (lang && this.languageSelect) {
                    this.languageSelect.value = lang;
                    this.handleLanguageChange();
                }
                this.inputText.focus();
            });
        });

        this.configBtn.addEventListener('click', () => this.toggleConfigPanel(true));
        this.closeConfigBtn.addEventListener('click', () => this.toggleConfigPanel(false));

        this.configTabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchConfigTab(tab.dataset.tab));
        });

        this.testVolcBtn.addEventListener('click', () => this.handleTestVolcengine());
        this.testProxyBtn.addEventListener('click', () => this.handleTestProxy());
        this.saveVolcBtn.addEventListener('click', () => this.handleSaveVolcengine());
        
        this.toggleHelpBtn.addEventListener('click', () => this.toggleHelp());

        this.useProxy.addEventListener('change', () => this.handleProxyToggle());

        if (this.languageSelect) {
            this.languageSelect.addEventListener('change', () => this.handleLanguageChange());
        }
    }

    handleLanguageChange() {
        if (this.languageSelect) {
            this.currentLanguage = this.languageSelect.value;
            if (this.grammarCorrector) {
                this.grammarCorrector.setLanguage(this.currentLanguage);
            }
            if (this.vocabEnhancer) {
                this.vocabEnhancer.setLanguage(this.currentLanguage);
            }
        }
    }

    toggleHelp() {
        const isHidden = this.helpContent.style.display === 'none';
        this.helpContent.style.display = isHidden ? 'block' : 'none';
        this.toggleHelpBtn.textContent = isHidden ? '❌ 关闭帮助' : '❓ 配置帮助';
    }

    handleProxyToggle() {
        this.proxyUrlGroup.style.display = this.useProxy.checked ? 'block' : 'none';
    }

    async handleTestProxy() {
        const proxyUrl = this.proxyUrl.value.trim();
        
        this.proxyTestResult.style.display = 'block';
        this.proxyTestResult.className = 'test-result test-loading';
        this.proxyTestResult.innerHTML = '🔄 正在检测代理服务器...';

        const result = await this.volcengineAPI.testProxyConnection(proxyUrl);

        if (result.success) {
            this.proxyTestResult.className = 'test-result test-success';
            let html = '✅ 代理服务器运行正常';
            
            if (result.details) {
                html += `<br><small>状态: ${this.escapeHtml(result.details.status || 'ok')}</small>`;
            }
            
            this.proxyTestResult.innerHTML = html;
        } else {
            this.proxyTestResult.className = 'test-result test-error';
            let html = `❌ 代理连接失败<br><small style="font-weight: bold;">${this.escapeHtml(result.error)}</small>`;
            
            if (result.suggestions && result.suggestions.length > 0) {
                html += '<br><br><small><strong>解决方案：</strong></small>';
                for (const suggestion of result.suggestions) {
                    html += `<br><small>• ${this.escapeHtml(suggestion)}</small>`;
                }
            }
            
            this.proxyTestResult.innerHTML = html;
        }
    }

    switchMode(mode) {
        this.currentMode = mode;
        localStorage.setItem('writing_polish_mode', mode);

        this.configTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === mode);
        });

        this.configSections.forEach(section => {
            section.style.display = section.id === `${mode}-config` ? 'block' : 'none';
        });

        this.updateStatusBasedOnMode();
    }

    updateStatusBasedOnMode() {
        if (this.currentMode === 'local') {
            this.updateStatus('ready', '本地引擎已就绪');
        } else if (this.currentMode === 'volcengine') {
            if (this.volcengineAPI.isConfigured) {
                this.updateStatus('ready', '火山引擎 API 已就绪');
            } else {
                this.updateStatus('error', '火山引擎 API 未配置');
            }
        }
    }

    switchConfigTab(tabName) {
        this.switchMode(tabName);
    }

    toggleConfigPanel(show) {
        if (show) {
            this.configPanel.style.display = 'block';
            setTimeout(() => {
                this.configPanel.classList.add('show');
            }, 10);
        } else {
            this.configPanel.classList.remove('show');
            setTimeout(() => {
                this.configPanel.style.display = 'none';
            }, 300);
        }
    }

    async handleTestVolcengine() {
        const config = this.getVolcConfigFromUI();
        this.volcengineAPI.configure(config);

        this.testResult.style.display = 'block';
        this.testResult.className = 'test-result test-loading';
        this.testResult.innerHTML = '🔄 正在测试连接...（第1次尝试）';

        const result = await this.volcengineAPI.testConnectionWithRetry(2);

        if (result.success) {
            this.testResult.className = 'test-result test-success';
            let html = '✅ 连接成功！';
            
            if (result.response) {
                html += `<br><small>模型响应: ${this.escapeHtml(result.response.substring(0, 100))}</small>`;
            }
            if (result.model) {
                html += `<br><small>使用模型: ${this.escapeHtml(result.model)}</small>`;
            }
            
            this.testResult.innerHTML = html;
        } else {
            this.testResult.className = 'test-result test-error';
            let html = `❌ 连接失败<br><small style="font-weight: bold;">${this.escapeHtml(result.error)}</small>`;
            
            if (result.details && result.details.length > 0) {
                html += '<br><br><small><strong>配置问题：</strong></small>';
                for (const issue of result.details) {
                    html += `<br><small>• ${this.escapeHtml(issue.message)}</small>`;
                    html += `<br><small style="color: #667eea; margin-left: 16px;">💡 ${this.escapeHtml(issue.suggestion)}</small>`;
                }
            }
            
            if (result.suggestions && result.suggestions.length > 0) {
                html += '<br><br><small><strong>解决方案：</strong></small>';
                for (const suggestion of result.suggestions) {
                    html += `<br><small>• ${this.escapeHtml(suggestion)}</small>`;
                }
            }
            
            html += '<br><br><small style="color: #888;">点击「配置帮助」查看详细配置指南</small>';
            
            this.testResult.innerHTML = html;
        }
    }

    handleSaveVolcengine() {
        const config = this.getVolcConfigFromUI();
        
        if (!config.apiKey || !config.endpoint || !config.model) {
            this.showToast('请填写完整的配置信息', 'warning');
            return;
        }

        this.volcengineAPI.configure(config);
        this.volcengineAPI.saveToLocalStorage();
        
        this.switchMode('volcengine');
        this.showToast('配置已保存', 'success');
        this.toggleConfigPanel(false);
    }

    getVolcConfigFromUI() {
        const timeoutSec = parseInt(this.volcTimeout.value) || 30;
        return {
            apiKey: this.volcApiKey.value.trim(),
            endpoint: this.volcEndpoint.value.trim() || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            model: this.volcModel.value.trim(),
            systemPrompt: this.volcSystemPrompt.value.trim(),
            temperature: parseFloat(this.volcTemperature.value),
            timeout: timeoutSec * 1000,
            useProxy: this.useProxy.checked,
            proxyUrl: this.proxyUrl.value.trim() || 'http://localhost:8081/proxy'
        };
    }

    updateStatus(status, text) {
        this.modelStatus = status;
        
        const statusConfig = {
            'loading': { color: '#ffc107', className: 'status-loading' },
            'ready': { color: '#28a745', className: 'status-ready' },
            'error': { color: '#dc3545', className: 'status-error' },
            'processing': { color: '#17a2b8', className: 'status-processing' }
        };

        const config = statusConfig[status] || statusConfig['error'];
        
        this.statusIndicator.style.backgroundColor = config.color;
        this.statusIndicator.className = `status-indicator ${config.className}`;
        this.statusText.textContent = text;

        if (status === 'ready') {
            this.polishBtn.disabled = false;
        } else {
            this.polishBtn.disabled = true;
        }
    }

    async handlePolish() {
        const text = this.inputText.value.trim();

        if (!text) {
            this.showToast('请输入需要润色的文本', 'warning');
            return;
        }

        if (this.currentMode === 'volcengine' && !this.volcengineAPI.isConfigured) {
            this.showToast('请先配置火山引擎 API', 'warning');
            this.toggleConfigPanel(true);
            this.switchConfigTab('volcengine');
            return;
        }

        if (this.isProcessing) return;

        this.isProcessing = true;
        this.showLoading(true);
        this.updateStatus('processing', '正在处理...');
        this.polishBtn.disabled = true;

        try {
            const result = await this.processText(text);
            this.lastResult = result;
            this.displayResults(result);
            this.updateStatus('ready', this.currentMode === 'local' ? '本地引擎已就绪' : '火山引擎 API 已就绪');
        } catch (error) {
            console.error('[WritingPolish] 处理出错:', error);
            this.showToast('处理失败: ' + error.message, 'error');
            this.updateStatus('error', '处理失败');
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
            this.polishBtn.disabled = false;
        }
    }

    async processText(text) {
        if (this.currentMode === 'volcengine' && this.volcengineAPI.isConfigured) {
            return await this.processWithAPI(text);
        } else {
            return await this.processWithLocal(text);
        }
    }

    async processWithAPI(text) {
        const detectedLang = detectLanguage(text);
        const languagePrompt = MULTILINGUAL_PROMPTS[detectedLang] || MULTILINGUAL_PROMPTS['en'];
        
        const options = {
            enableGrammar: this.enableGrammar.checked,
            enableVocab: this.enableVocab.checked,
            enableRewrite: this.enableRewrite.checked,
            systemPrompt: languagePrompt
        };

        const result = await this.volcengineAPI.polishText(text, options);

        return {
            original: text,
            polished: result.polishedText || text,
            grammarCorrections: result.corrections || [],
            vocabEnhancements: result.enhancements || [],
            sentenceRewrites: result.rewrites || [],
            smartSuggestions: [],
            hasChanges: result.polishedText && result.polishedText !== text,
            source: 'volcengine'
        };
    }

    async processWithLocal(text) {
        let processedText = text;
        const allCorrections = [];
        const allEnhancements = [];
        const allRewrites = [];

        await new Promise(resolve => setTimeout(resolve, 300));

        if (this.enableGrammar.checked) {
            const grammarResult = await this.grammarCorrector.correct(processedText);
            processedText = grammarResult.correctedText;
            allCorrections.push(...grammarResult.corrections);
        }

        if (this.enableVocab.checked) {
            const vocabResult = await this.vocabEnhancer.enhance(processedText);
            processedText = vocabResult.enhancedText;
            allEnhancements.push(...vocabResult.enhancements);
        }

        if (this.enableRewrite.checked) {
            const rewriteResult = await this.sentenceRewriter.rewrite(processedText);
            processedText = rewriteResult.rewrittenText;
            allRewrites.push(...rewriteResult.rewrites);
        }

        const smartSuggestions = this.generateSmartSuggestions(text, processedText);

        return {
            original: text,
            polished: processedText,
            grammarCorrections: allCorrections,
            vocabEnhancements: allEnhancements,
            sentenceRewrites: allRewrites,
            smartSuggestions,
            hasChanges: text !== processedText,
            source: 'local'
        };
    }

    generateSmartSuggestions(original, polished) {
        const suggestions = [];

        if (original.includes('He is a very good') && !polished.includes('very good')) {
            suggestions.push({
                type: 'recommended',
                original: 'He is a very good man',
                alternatives: [
                    'He is an exceptionally good man',
                    'He is a truly excellent man',
                    'He is an outstanding man',
                    'He is a remarkably good man'
                ],
                explanation: '推荐的高质量改写方案'
            });
        }

        if (original.includes('a very good')) {
            suggestions.push({
                type: 'vocab',
                original: 'a very good',
                alternatives: ['an exceptionally good', 'a truly excellent', 'an outstanding'],
                explanation: '使用更具表现力的词汇组合'
            });
        }

        if (original.includes('very good')) {
            suggestions.push({
                type: 'phrase',
                original: 'very good',
                alternatives: ['exceptionally good', 'truly excellent', 'genuinely outstanding'],
                explanation: '使用更强有力的形容词短语'
            });
        }

        return suggestions;
    }

    displayResults(result) {
        this.resultsSection.style.display = 'block';

        const formattedResult = this.formatResultWithHighlights(result);
        this.resultContent.innerHTML = formattedResult;

        this.displayGrammarDetails(result.grammarCorrections);
        this.displayVocabDetails(result.vocabEnhancements);
        this.displayRewriteDetails(result.sentenceRewrites);

        this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    formatResultWithHighlights(result) {
        let original = result.original;
        let polished = result.polished;

        const changes = this.findChanges(original, polished);

        if (changes.length === 0) {
            return `<p>${this.escapeHtml(polished)}</p>`;
        }

        let html = '';
        let lastIndex = 0;

        for (const change of changes) {
            if (change.index > lastIndex) {
                html += this.escapeHtml(polished.slice(lastIndex, change.index));
            }
            html += `<span class="suggested-text">${this.escapeHtml(change.text)}</span>`;
            lastIndex = change.index + change.text.length;
        }

        if (lastIndex < polished.length) {
            html += this.escapeHtml(polished.slice(lastIndex));
        }

        return `<p>${html}</p>`;
    }

    findChanges(original, polished) {
        const changes = [];

        if (original === polished) return changes;

        const originalWords = original.split(/(\s+)/);
        const polishedWords = polished.split(/(\s+)/);

        const originalSet = new Set(originalWords.map(w => w.toLowerCase().trim()).filter(w => w));

        let currentIndex = 0;
        
        for (let i = 0; i < polishedWords.length; i++) {
            const word = polishedWords[i];
            const wordLower = word.toLowerCase().trim();

            if (wordLower && !originalSet.has(wordLower) && !this.isPunctuation(word)) {
                const wordIndex = polished.toLowerCase().indexOf(wordLower, currentIndex);
                if (wordIndex !== -1) {
                    changes.push({
                        text: word,
                        index: wordIndex
                    });
                    currentIndex = wordIndex + wordLower.length;
                }
            }
        }

        return changes;
    }

    isPunctuation(word) {
        return /^[.,!?;:()[\]{}'"-]+$/.test(word.trim());
    }

    displayGrammarDetails(corrections) {
        if (!corrections || corrections.length === 0) {
            this.grammarCard.style.display = 'none';
            return;
        }

        this.grammarCard.style.display = 'block';
        this.grammarDetails.innerHTML = corrections.map(corr => `
            <div class="correction-item grammar">
                <span class="correction-badge grammar">语法</span>
                <div class="correction-text">
                    <div>
                        <span class="from">${this.escapeHtml(corr.original)}</span>
                        <span class="arrow">→</span>
                        <span class="to">${this.escapeHtml(corr.replacement)}</span>
                    </div>
                    <div class="explanation">${this.escapeHtml(corr.explanation)}</div>
                </div>
            </div>
        `).join('');
    }

    displayVocabDetails(enhancements) {
        if (!enhancements || enhancements.length === 0) {
            this.vocabCard.style.display = 'none';
            return;
        }

        const uniqueEnhancements = this.deduplicateByOriginal(enhancements);

        this.vocabCard.style.display = 'block';
        this.vocabDetails.innerHTML = uniqueEnhancements.map(enh => `
            <div class="correction-item vocab">
                <span class="correction-badge vocab">词汇</span>
                <div class="correction-text">
                    <div>
                        <span class="from">${this.escapeHtml(enh.original)}</span>
                        <span class="arrow">→</span>
                        <span class="to">${this.escapeHtml(enh.replacement)}</span>
                    </div>
                    <div class="explanation">
                        ${this.escapeHtml(enh.explanation)}
                        ${enh.alternatives && enh.alternatives.length > 0 ? 
                            `<br><span style="color: #667eea;">其他选项: ${enh.alternatives.slice(0, 3).map(a => this.escapeHtml(a)).join(', ')}</span>` : ''
                        }
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayRewriteDetails(rewrites) {
        if (!rewrites || rewrites.length === 0) {
            this.rewriteCard.style.display = 'none';
            return;
        }

        const uniqueRewrites = this.deduplicateByOriginal(rewrites);

        this.rewriteCard.style.display = 'block';
        this.rewriteDetails.innerHTML = uniqueRewrites.map(rw => `
            <div class="correction-item rewrite">
                <span class="correction-badge rewrite">句式</span>
                <div class="correction-text">
                    <div>
                        <span class="from">${this.escapeHtml(rw.original)}</span>
                        ${rw.replacement ? `<span class="arrow">→</span><span class="to">${this.escapeHtml(rw.replacement)}</span>` : ''}
                    </div>
                    <div class="explanation">${this.escapeHtml(rw.explanation)}</div>
                </div>
            </div>
        `).join('');
    }

    deduplicateByOriginal(items) {
        const seen = new Set();
        return items.filter(item => {
            if (!item.original) return false;
            const key = item.original.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    handleClear() {
        this.inputText.value = '';
        this.resultsSection.style.display = 'none';
        this.lastResult = null;
        this.inputText.focus();
    }

    handleCopyResult() {
        if (!this.lastResult) {
            this.showToast('没有可复制的结果', 'warning');
            return;
        }

        const text = this.lastResult.polished;
        navigator.clipboard.writeText(text)
            .then(() => {
                this.showToast('已复制到剪贴板', 'success');
            })
            .catch(() => {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showToast('已复制到剪贴板', 'success');
            });
    }

    showLoading(show) {
        if (show) {
            this.loadingSection.style.display = 'block';
            this.resultsSection.style.display = 'none';
        } else {
            this.loadingSection.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast';
        
        if (type === 'success') {
            toast.style.background = '#28a745';
        } else if (type === 'error') {
            toast.style.background = '#dc3545';
        } else if (type === 'warning') {
            toast.style.background = '#ffc107';
            toast.style.color = '#333';
        }

        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 2500);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[WritingPolish] DOM 已加载，正在初始化...');
    window.writingPolishApp = new WritingPolishApp();
});
