class MeetingSummarizerApp {
    constructor() {
        this.textCleaner = new TextCleaner();
        this.summaryPredictor = new SummaryPredictor();
        this.actionItemExtractor = new ActionItemExtractor();
        
        this.currentSummary = '';
        this.currentActionItems = [];
        this.apiKeyVisible = false;
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadSavedConfig();
        this.updateCharCount();
        this.updateApiStatus();
    }

    cacheElements() {
        this.elements = {
            meetingText: document.getElementById('meetingText'),
            charCount: document.getElementById('charCount'),
            enableCleaning: document.getElementById('enableCleaning'),
            extractActions: document.getElementById('extractActions'),
            maxSummaryLength: document.getElementById('maxSummaryLength'),
            generateBtn: document.getElementById('generateBtn'),
            loadingIndicator: document.getElementById('loadingIndicator'),
            summaryOutput: document.getElementById('summaryOutput'),
            actionsOutput: document.getElementById('actionsOutput'),
            copySummaryBtn: document.getElementById('copySummaryBtn'),
            copyActionsBtn: document.getElementById('copyActionsBtn'),
            loadSampleBtn: document.getElementById('loadSampleBtn'),
            clearBtn: document.getElementById('clearBtn'),
            statOriginalLength: document.getElementById('statOriginalLength'),
            statCleanedLength: document.getElementById('statCleanedLength'),
            statSummaryLength: document.getElementById('statSummaryLength'),
            statActionCount: document.getElementById('statActionCount'),
            
            apiKey: document.getElementById('apiKey'),
            modelId: document.getElementById('modelId'),
            baseUrl: document.getElementById('baseUrl'),
            useApi: document.getElementById('useApi'),
            useFallback: document.getElementById('useFallback'),
            toggleApiKey: document.getElementById('toggleApiKey'),
            testApiBtn: document.getElementById('testApiBtn'),
            apiStatus: document.getElementById('apiStatus')
        };
    }

    bindEvents() {
        this.elements.meetingText.addEventListener('input', () => this.updateCharCount());
        
        this.elements.generateBtn.addEventListener('click', () => this.generateSummary());
        
        this.elements.copySummaryBtn.addEventListener('click', () => this.copyToClipboard(this.currentSummary, 'summary'));
        this.elements.copyActionsBtn.addEventListener('click', () => this.copyActionItems());
        
        this.elements.loadSampleBtn.addEventListener('click', () => this.loadSampleText());
        this.elements.clearBtn.addEventListener('click', () => this.clearAll());
        
        this.elements.apiKey.addEventListener('input', () => {
            this.saveConfig();
            this.updateApiStatus();
        });
        
        this.elements.modelId.addEventListener('input', () => this.saveConfig());
        this.elements.baseUrl.addEventListener('input', () => this.saveConfig());
        this.elements.useApi.addEventListener('change', () => {
            this.saveConfig();
            this.updateApiStatus();
        });
        this.elements.useFallback.addEventListener('change', () => this.saveConfig());
        
        this.elements.toggleApiKey.addEventListener('click', () => this.toggleApiKeyVisibility());
        this.elements.testApiBtn.addEventListener('click', () => this.testApiConnection());
    }

    updateCharCount() {
        const text = this.elements.meetingText.value;
        this.elements.charCount.textContent = text.length;
    }

    loadSavedConfig() {
        try {
            const savedConfig = localStorage.getItem('volcanoApiConfig');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                if (config.apiKey) this.elements.apiKey.value = config.apiKey;
                if (config.modelId) this.elements.modelId.value = config.modelId;
                if (config.baseUrl) this.elements.baseUrl.value = config.baseUrl;
                if (config.useApi !== undefined) this.elements.useApi.checked = config.useApi;
                if (config.useFallback !== undefined) this.elements.useFallback.checked = config.useFallback;
            }
        } catch (error) {
            console.warn('加载保存的配置失败:', error);
        }
    }

    saveConfig() {
        try {
            const config = {
                apiKey: this.elements.apiKey.value,
                modelId: this.elements.modelId.value,
                baseUrl: this.elements.baseUrl.value,
                useApi: this.elements.useApi.checked,
                useFallback: this.elements.useFallback.checked
            };
            localStorage.setItem('volcanoApiConfig', JSON.stringify(config));
        } catch (error) {
            console.warn('保存配置失败:', error);
        }
    }

    getConfig() {
        return {
            apiKey: this.elements.apiKey.value.trim(),
            modelId: this.elements.modelId.value.trim() || 'doubao-seed-1-6-251015',
            baseUrl: this.elements.baseUrl.value.trim() || 'https://ark.cn-beijing.volces.com/api/v3',
            useApi: this.elements.useApi.checked,
            useFallback: this.elements.useFallback.checked
        };
    }

    updateApiStatus() {
        const config = this.getConfig();
        const statusElement = this.elements.apiStatus;
        
        if (!config.useApi) {
            statusElement.textContent = '状态: 未启用火山 API';
            statusElement.className = '';
            this.elements.testApiBtn.disabled = true;
            return;
        }
        
        if (!config.apiKey) {
            statusElement.textContent = '状态: 未配置 API Key';
            statusElement.className = 'status-pending';
            this.elements.testApiBtn.disabled = true;
            return;
        }
        
        statusElement.textContent = '状态: 已配置（点击测试按钮验证连接）';
        statusElement.className = 'status-pending';
        this.elements.testApiBtn.disabled = false;
    }

    toggleApiKeyVisibility() {
        this.apiKeyVisible = !this.apiKeyVisible;
        
        if (this.apiKeyVisible) {
            this.elements.apiKey.type = 'text';
            this.elements.toggleApiKey.textContent = '隐藏';
        } else {
            this.elements.apiKey.type = 'password';
            this.elements.toggleApiKey.textContent = '显示';
        }
    }

    async testApiConnection() {
        const config = this.getConfig();
        const statusElement = this.elements.apiStatus;
        
        if (!config.apiKey) {
            statusElement.textContent = '状态: 请先输入 API Key';
            statusElement.className = 'status-error';
            return;
        }
        
        statusElement.textContent = '状态: 正在测试连接...';
        statusElement.className = 'status-pending';
        this.elements.testApiBtn.disabled = true;
        
        try {
            const response = await fetch(`${config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.modelId,
                    messages: [
                        { role: 'user', content: '你好' }
                    ],
                    max_tokens: 10
                })
            });
            
            if (response.ok) {
                statusElement.textContent = '状态: 连接成功 ✓';
                statusElement.className = 'status-ready';
            } else {
                const errorText = await response.text();
                statusElement.textContent = `状态: 连接失败 (${response.status})`;
                statusElement.className = 'status-error';
                console.error('API 测试失败:', response.status, errorText);
            }
        } catch (error) {
            statusElement.textContent = `状态: 连接错误 (${error.message})`;
            statusElement.className = 'status-error';
            console.error('API 测试异常:', error);
        } finally {
            this.elements.testApiBtn.disabled = false;
        }
    }

    getSampleText() {
        return `大家好，今天我们来开这个周会，嗯，首先，先回顾一下上周的工作进展吧。呃，那个张工，你那边的用户反馈处理得怎么样了？哦，对了，张工负责的那个性能优化问题，必须在本周五前完成修复，用户那边催得比较紧。

然后，还有那个新功能的开发进度，李工，你这边有什么问题吗？好的，李工来负责制定完整的测试计划，下周一之前提交给大家审核，测试团队需要在下周内完成所有的功能测试。

接下来我们讨论一下新产品的上线时间问题，那个，经过大家的讨论，决定在下周三进行灰度发布，然后下周五正式上线。运营团队需要准备好推广方案，明天下午之前完成初稿，市场部门也需要配合准备好相关的宣传材料。

还有，关于用户反馈的那个 bug，王工负责跟进这个问题，必须尽快修复，用户体验很重要。另外，我们还需要准备好上线后的监控方案，确保系统稳定运行。

对了，还有财务那边的预算审批，赵工需要跟进一下，下周二之前要有结果，这样我们才能采购需要的服务器。还有，产品经理需要整理用户需求文档，本周内完成，方便开发团队参考。

那个，大家还有什么其他问题吗？好的，没有的话我们今天的会议就到这里，散会。对了，下周同一时间继续开周会，大家记得准备好各自的工作汇报材料。`;
    }

    loadSampleText() {
        this.elements.meetingText.value = this.getSampleText();
        this.updateCharCount();
    }

    clearAll() {
        this.elements.meetingText.value = '';
        this.updateCharCount();
        this.resetOutputs();
    }

    resetOutputs() {
        this.elements.summaryOutput.innerHTML = '<p class="placeholder">摘要将在这里显示...</p>';
        this.elements.actionsOutput.innerHTML = '<p class="placeholder">行动项将在这里显示...</p>';
        this.elements.copySummaryBtn.disabled = true;
        this.elements.copyActionsBtn.disabled = true;
        this.currentSummary = '';
        this.currentActionItems = [];
        this.updateStats(0, 0, 0, 0);
    }

    async generateSummary() {
        const text = this.elements.meetingText.value.trim();
        
        if (text.length === 0) {
            alert('请先输入会议记录文本！');
            return;
        }

        if (text.length < 50) {
            alert('建议输入 500 字以上的会议记录以获得更好的效果。当前文本太短，可能无法生成有效的摘要。');
        }

        const config = this.getConfig();
        this.summaryPredictor.setConfig(config);

        if (config.useApi && !config.apiKey && !config.useFallback) {
            alert('已启用火山 API 但未配置 API Key，且未启用 fallback 方案。请先配置 API Key 或启用 fallback。');
            return;
        }

        this.showLoading(true);
        this.elements.generateBtn.disabled = true;

        try {
            const enableCleaning = this.elements.enableCleaning.checked;
            const extractActions = this.elements.extractActions.checked;
            const maxLength = parseInt(this.elements.maxSummaryLength.value) || 100;

            const originalLength = text.length;
            let cleanedText = text;
            
            if (enableCleaning) {
                cleanedText = this.textCleaner.clean(text);
            }
            
            const cleanedLength = cleanedText.length;

            const summary = await this.summaryPredictor.predict(cleanedText, maxLength);
            this.currentSummary = summary;
            const summaryLength = summary.length;

            let actionItems = [];
            if (extractActions) {
                actionItems = this.actionItemExtractor.extract(cleanedText);
            }
            this.currentActionItems = actionItems;

            this.displaySummary(summary);
            this.displayActionItems(actionItems);
            this.updateStats(originalLength, cleanedLength, summaryLength, actionItems.length);

            this.elements.copySummaryBtn.disabled = false;
            this.elements.copyActionsBtn.disabled = actionItems.length === 0;

        } catch (error) {
            console.error('生成摘要时出错:', error);
            alert(`生成摘要时出错: ${error.message}`);
        } finally {
            this.showLoading(false);
            this.elements.generateBtn.disabled = false;
        }
    }

    displaySummary(summary) {
        this.elements.summaryOutput.innerHTML = `<p>${this.escapeHtml(summary)}</p>`;
    }

    displayActionItems(items) {
        if (items.length === 0) {
            this.elements.actionsOutput.innerHTML = '<p class="placeholder">未检测到明确的行动项。</p>';
            return;
        }

        const html = items.map((item, index) => {
            const priorityClass = this.getPriorityClass(item.priority);
            let metaHtml = '';
            
            if (item.assignee !== '待定') {
                metaHtml += `<div class="meta-item">👤 负责人: ${this.escapeHtml(item.assignee)}</div>`;
            }
            if (item.deadline !== '待定') {
                metaHtml += `<div class="meta-item">⏰ 截止时间: ${this.escapeHtml(item.deadline)}</div>`;
            }
            metaHtml += `<div class="meta-item ${priorityClass}">📌 优先级: ${item.priority}</div>`;

            return `
                <div class="action-item">
                    <div class="action-title">${index + 1}. ${this.escapeHtml(item.action)}</div>
                    <div class="action-meta">${metaHtml}</div>
                </div>
            `;
        }).join('');

        this.elements.actionsOutput.innerHTML = html;
    }

    getPriorityClass(priority) {
        switch (priority) {
            case '高': return 'priority-high';
            case '中': return 'priority-medium';
            case '低': return 'priority-low';
            default: return '';
        }
    }

    updateStats(original, cleaned, summary, actionCount) {
        this.elements.statOriginalLength.textContent = original;
        this.elements.statCleanedLength.textContent = cleaned;
        this.elements.statSummaryLength.textContent = summary;
        this.elements.statActionCount.textContent = actionCount;
    }

    showLoading(show) {
        if (show) {
            this.elements.loadingIndicator.classList.remove('hidden');
        } else {
            this.elements.loadingIndicator.classList.add('hidden');
        }
    }

    async copyToClipboard(text, type) {
        if (!text) {
            return;
        }

        try {
            await navigator.clipboard.writeText(text);
            this.showCopySuccess(type);
        } catch (error) {
            console.error('复制失败:', error);
            this.fallbackCopy(text);
        }
    }

    async copyActionItems() {
        if (this.currentActionItems.length === 0) {
            return;
        }

        const text = this.actionItemExtractor.formatActionItems(this.currentActionItems);
        await this.copyToClipboard(text, 'actions');
    }

    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    showCopySuccess(type) {
        const btn = type === 'summary' 
            ? this.elements.copySummaryBtn 
            : this.elements.copyActionsBtn;
        
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ 已复制';
        btn.disabled = true;
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MeetingSummarizerApp();
});
