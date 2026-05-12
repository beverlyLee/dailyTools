class EmailReplyAssistant {
    constructor() {
        this.intentClassifier = new IntentClassifier();
        this.entityExtractor = new EntityExtractor();
        this.replyGenerator = new ReplyGenerator();
        
        this.init();
    }

    async init() {
        try {
            console.log('正在初始化智能邮件回复助手...');
            
            await Promise.all([
                this.intentClassifier.init(),
                this.entityExtractor.init()
            ]);
            
            this.bindEvents();
            console.log('智能邮件回复助手初始化完成！');
        } catch (error) {
            console.error('初始化失败:', error);
            this.bindEvents();
        }
    }

    bindEvents() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const clearBtn = document.getElementById('clearBtn');
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeEmail());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }
    }

    async analyzeEmail() {
        const emailContent = document.getElementById('emailContent').value.trim();
        
        if (!emailContent) {
            alert('请输入邮件内容！');
            return;
        }
        
        this.showLoading();
        
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const [intentResult, entityResult] = await Promise.all([
                this.intentClassifier.classify(emailContent),
                this.entityExtractor.extract(emailContent)
            ]);
            
            console.log('意图识别结果:', intentResult);
            console.log('实体抽取结果:', entityResult);
            
            const replies = this.replyGenerator.generate(
                intentResult.intent,
                entityResult,
                emailContent
            );
            
            this.hideLoading();
            this.displayResults(intentResult, entityResult, replies);
            
        } catch (error) {
            console.error('分析失败:', error);
            this.hideLoading();
            alert('分析失败，请重试！');
        }
    }

    displayResults(intentResult, entityResult, replies) {
        const resultSection = document.getElementById('resultSection');
        const intentResultDiv = document.getElementById('intentResult');
        const entityResultDiv = document.getElementById('entityResult');
        const repliesContainer = document.getElementById('repliesContainer');
        
        intentResultDiv.innerHTML = `
            <div class="intent-tag">${intentResult.label}</div>
            <div style="margin-top: 10px; font-size: 0.9rem;">
                置信度: <strong>${(intentResult.confidence * 100).toFixed(1)}%</strong>
            </div>
        `;
        
        let entityHtml = '';
        const entityLabels = {
            person: '人名',
            company: '公司名',
            product: '产品名',
            action_intent: '动作/意图',
            date: '日期/时间',
            amount: '金额',
            email: '邮箱',
            phone: '电话'
        };
        
        let hasEntities = false;
        for (const [type, entities] of Object.entries(entityResult)) {
            if (entities && entities.length > 0) {
                hasEntities = true;
                for (const entity of entities) {
                    entityHtml += `
                        <div class="entity-item">
                            <span class="entity-label">${entityLabels[type] || type}</span>
                            <span class="entity-value">${this.escapeHtml(entity.value)}</span>
                        </div>
                    `;
                }
            }
        }
        
        if (!hasEntities) {
            entityHtml = '<div style="color: #999;">未识别到关键实体</div>';
        }
        
        entityResultDiv.innerHTML = entityHtml;
        
        let repliesHtml = '';
        for (let i = 0; i < replies.length; i++) {
            const reply = replies[i];
            const styleClass = i === 0 ? '' : reply.style;
            
            repliesHtml += `
                <div class="reply-card" data-index="${i}" onclick="emailAssistant.copyReply(${i})">
                    <div class="reply-header ${styleClass}">
                        <span class="reply-title">${reply.title}</span>
                        <span class="copy-hint">点击复制</span>
                    </div>
                    <div class="reply-content" id="reply-content-${i}">${this.escapeHtml(reply.content)}</div>
                </div>
            `;
        }
        
        repliesContainer.innerHTML = repliesHtml;
        this.repliesCache = replies;
        
        resultSection.classList.remove('hidden');
    }

    copyReply(index) {
        if (!this.repliesCache || !this.repliesCache[index]) {
            return;
        }
        
        const content = this.repliesCache[index].content;
        
        navigator.clipboard.writeText(content).then(() => {
            const card = document.querySelector(`.reply-card[data-index="${index}"]`);
            const header = card.querySelector('.reply-header');
            const hint = header.querySelector('.copy-hint');
            
            card.classList.add('copied');
            hint.textContent = '已复制 ✓';
            
            setTimeout(() => {
                card.classList.remove('copied');
                hint.textContent = '点击复制';
            }, 2000);
        }).catch(err => {
            console.error('复制失败:', err);
            alert('复制失败，请手动复制');
        });
    }

    clearAll() {
        document.getElementById('emailContent').value = '';
        document.getElementById('resultSection').classList.add('hidden');
        this.repliesCache = null;
    }

    showLoading() {
        document.getElementById('loadingSection').classList.remove('hidden');
        document.getElementById('resultSection').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loadingSection').classList.add('hidden');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let emailAssistant;

document.addEventListener('DOMContentLoaded', () => {
    emailAssistant = new EmailReplyAssistant();
});