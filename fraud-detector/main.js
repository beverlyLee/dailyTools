class FraudDetectorApp {
    constructor() {
        this.featureExtractor = null;
        this.anomalyScorer = null;
        this.riskInterceptor = null;
        this.history = [];
        this.init();
    }

    async init() {
        console.log('🚀 初始化欺诈交易检测系统...');
        
        this.featureExtractor = new FeatureExtractor();
        this.anomalyScorer = new AnomalyScorer();
        this.riskInterceptor = new RiskInterceptor();
        
        await this.anomalyScorer.init();
        
        this.setupEventHandlers();
        this.setDefaultTime();
        this.setupRiskInterceptors();
        
        console.log('✅ 欺诈交易检测系统初始化完成！');
    }

    setupEventHandlers() {
        const form = document.getElementById('transactionForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearForm());
        }

        const exampleBtns = document.querySelectorAll('.example-btn');
        exampleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                this.loadExample(type);
            });
        });

        const clearHistoryBtn = document.getElementById('clearHistory');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        }

        const modalClose = document.getElementById('modalClose');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.hideModal());
        }

        const modalCancel = document.getElementById('modalCancel');
        if (modalCancel) {
            modalCancel.addEventListener('click', () => this.hideModal());
        }

        const modalConfirm = document.getElementById('modalConfirm');
        if (modalConfirm) {
            modalConfirm.addEventListener('click', () => this.handleAuthConfirm());
        }

        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.hideModal();
                }
            });
        }
    }

    setupRiskInterceptors() {
        this.riskInterceptor.on('onBlock', (result, transaction) => {
            console.log('🚫 交易已拦截:', transaction);
            this.showModal(result, transaction, 'block');
        });

        this.riskInterceptor.on('onAuth', (result, transaction) => {
            console.log('🔐 需要二次验证:', transaction);
            this.showModal(result, transaction, 'auth');
        });

        this.riskInterceptor.on('onAlert', (result, transaction) => {
            console.log('⚠️ 风险警报:', result.message);
        });

        this.riskInterceptor.on('onNotify', (result, transaction) => {
            console.log('📢 通知:', result.message);
        });
    }

    setDefaultTime() {
        const timeInput = document.getElementById('time');
        if (timeInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            timeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    }

    loadExample(type) {
        const examples = {
            normal: {
                amount: 580,
                time: '2024-01-15T14:30',
                location: '中国北京',
                merchant: '星巴克咖啡',
                merchantCategory: '餐饮'
            },
            fraud: {
                amount: 50000,
                time: '2024-01-15T03:00',
                location: '美国纽约',
                merchant: '海外加油站',
                merchantCategory: '加油站'
            },
            'large-amount': {
                amount: 50000,
                time: '2024-01-15T15:00',
                location: '中国北京',
                merchant: '奢侈品店',
                merchantCategory: '零售'
            },
            foreign: {
                amount: 2000,
                time: '2024-01-15T10:00',
                location: '日本东京',
                merchant: '秋叶原电器',
                merchantCategory: '零售'
            }
        };

        const example = examples[type];
        if (example) {
            document.getElementById('amount').value = example.amount;
            document.getElementById('time').value = example.time;
            document.getElementById('location').value = example.location;
            document.getElementById('merchant').value = example.merchant;
            document.getElementById('merchantCategory').value = example.merchantCategory;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const transaction = this.getFormData();
        if (!transaction) {
            alert('请填写完整的交易信息！');
            return;
        }

        try {
            const result = await this.processTransaction(transaction);
            this.displayResult(result, transaction);
            this.addToHistory(transaction, result);
        } catch (error) {
            console.error('检测失败:', error);
            alert('检测过程中发生错误，请重试！');
        }
    }

    getFormData() {
        const amount = parseFloat(document.getElementById('amount').value);
        const time = document.getElementById('time').value;
        const location = document.getElementById('location').value;
        const merchant = document.getElementById('merchant').value;
        const merchantCategory = document.getElementById('merchantCategory').value;

        if (!amount || !time || !location || !merchant || !merchantCategory) {
            return null;
        }

        return {
            amount,
            time,
            location,
            merchant,
            merchantCategory
        };
    }

    async processTransaction(transaction) {
        console.log('🔍 正在分析交易:', transaction);
        
        const features = this.featureExtractor.extract(transaction);
        console.log('📊 提取的特征:', features);
        
        const scoreResult = this.anomalyScorer.calculateScore(features, transaction);
        console.log('📈 风险评分:', scoreResult);
        
        const interceptResult = this.riskInterceptor.intercept(scoreResult, transaction);
        console.log('🚦 拦截决策:', interceptResult);
        
        return {
            features,
            scoreResult,
            interceptResult
        };
    }

    displayResult(result, transaction) {
        const resultContent = document.getElementById('resultContent');
        const { scoreResult, interceptResult } = result;
        const riskLevel = scoreResult.riskLevel;
        const scorePercent = (scoreResult.score * 100).toFixed(1);

        let anomaliesHtml = '';
        if (scoreResult.anomalies && scoreResult.anomalies.length > 0) {
            anomaliesHtml = `
                <div class="anomalies-section">
                    <h4>🚨 检测到的异常</h4>
                    <ul class="anomalies-list">
                        ${scoreResult.anomalies.map(anomaly => `
                            <li class="anomaly-item severity-${anomaly.severity}">
                                <span class="anomaly-icon">${this.getAnomalyIcon(anomaly.type)}</span>
                                <span class="anomaly-message">${anomaly.message}</span>
                                <span class="anomaly-severity">${this.getSeverityLabel(anomaly.severity)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        let recommendationsHtml = '';
        if (interceptResult.recommendations && interceptResult.recommendations.length > 0) {
            recommendationsHtml = `
                <div class="recommendations-section">
                    <h4>💡 建议措施</h4>
                    <ul class="recommendations-list">
                        ${interceptResult.recommendations.map(rec => `
                            <li class="recommendation-item priority-${rec.priority}">
                                <div class="rec-title">${this.getRecIcon(rec.type)} ${rec.title}</div>
                                <div class="rec-description">${rec.description}</div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        resultContent.innerHTML = `
            <div class="result-card risk-${riskLevel.level}">
                <div class="result-header" style="background-color: ${riskLevel.color}">
                    <div class="result-level">
                        <span class="level-icon">${this.getLevelIcon(riskLevel.level)}</span>
                        <span class="level-label">${riskLevel.label}</span>
                    </div>
                    <div class="result-score">
                        <span class="score-value">${scorePercent}</span>
                        <span class="score-unit">分</span>
                    </div>
                </div>
                
                <div class="result-body">
                    <div class="transaction-info">
                        <h4>💳 交易信息</h4>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">金额</span>
                                <span class="info-value">¥${transaction.amount.toLocaleString()}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">时间</span>
                                <span class="info-value">${new Date(transaction.time).toLocaleString()}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">地点</span>
                                <span class="info-value">${transaction.location}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">商户</span>
                                <span class="info-value">${transaction.merchant}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">类别</span>
                                <span class="info-value">${transaction.merchantCategory}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">建议</span>
                                <span class="info-value action-${riskLevel.level}">${riskLevel.action}</span>
                            </div>
                        </div>
                    </div>

                    ${anomaliesHtml}
                    ${recommendationsHtml}

                    <div class="score-breakdown">
                        <h4>📊 详细评分</h4>
                        <div class="score-grid">
                            ${Object.entries(scoreResult.detailedScores).map(([key, value]) => `
                                <div class="score-item">
                                    <span class="score-label">${this.getScoreLabel(key)}</span>
                                    <div class="score-bar">
                                        <div class="score-fill" style="width: ${value * 100}%"></div>
                                    </div>
                                    <span class="score-percent">${(value * 100).toFixed(0)}%</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getLevelIcon(level) {
        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢'
        };
        return icons[level] || '⚪';
    }

    getAnomalyIcon(type) {
        const icons = {
            amount: '💰',
            time: '⏰',
            location: '📍',
            merchant: '🏪',
            deviation: '📉'
        };
        return icons[type] || '⚠️';
    }

    getSeverityLabel(severity) {
        const labels = {
            high: '高',
            medium: '中',
            low: '低'
        };
        return labels[severity] || '未知';
    }

    getRecIcon(type) {
        const icons = {
            block: '🚫',
            verify: '🔐',
            monitor: '👁️',
            amount: '💰',
            time: '⏰',
            location: '📍',
            merchant: '🏪',
            deviation: '📉'
        };
        return icons[type] || '💡';
    }

    getScoreLabel(key) {
        const labels = {
            amount: '金额风险',
            isLargeAmount: '大额标记',
            amountDeviation: '金额偏差',
            time: '时间风险',
            location: '地点风险',
            isForeignLocation: '异地标记',
            merchant: '商户风险'
        };
        return labels[key] || key;
    }

    addToHistory(transaction, result) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
            transaction,
            result
        };
        
        this.history.unshift(historyItem);
        
        if (this.history.length > 20) {
            this.history.pop();
        }
        
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        
        if (this.history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📜</div>
                    <p>暂无检测历史</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = this.history.map(item => {
            const riskLevel = item.result.scoreResult.riskLevel;
            return `
                <div class="history-item risk-${riskLevel.level}" data-id="${item.id}">
                    <div class="history-left">
                        <div class="history-icon" style="background-color: ${riskLevel.color}">
                            ${this.getLevelIcon(riskLevel.level)}
                        </div>
                        <div class="history-info">
                            <div class="history-merchant">${item.transaction.merchant}</div>
                            <div class="history-details">
                                <span>¥${item.transaction.amount.toLocaleString()}</span>
                                <span>·</span>
                                <span>${item.transaction.location}</span>
                            </div>
                            <div class="history-time">${item.timestamp}</div>
                        </div>
                    </div>
                    <div class="history-right">
                        <div class="history-level" style="color: ${riskLevel.color}">
                            ${riskLevel.label}
                        </div>
                        <div class="history-score">
                            ${(item.result.scoreResult.score * 100).toFixed(0)}分
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    clearHistory() {
        this.history = [];
        this.renderHistory();
    }

    clearForm() {
        document.getElementById('transactionForm').reset();
        this.setDefaultTime();
        
        const resultContent = document.getElementById('resultContent');
        resultContent.innerHTML = `
            <div class="empty-result">
                <div class="empty-icon">🔍</div>
                <p>请输入交易信息进行风险检测</p>
            </div>
        `;
    }

    showModal(result, transaction, type) {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalBody = document.getElementById('modalBody');
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');

        if (type === 'block') {
            modalConfirm.style.display = 'none';
            modalCancel.textContent = '我知道了';
        } else {
            modalConfirm.style.display = 'inline-block';
            modalCancel.textContent = '取消交易';
        }

        const riskLevel = result.riskLevel;
        const scorePercent = (result.score * 100).toFixed(1);

        modalBody.innerHTML = `
            <div class="modal-alert risk-${riskLevel.level}">
                <div class="modal-alert-header" style="background-color: ${riskLevel.color}">
                    <span class="alert-icon">${this.getLevelIcon(riskLevel.level)}</span>
                    <span class="alert-title">${riskLevel.label}</span>
                    <span class="alert-score">${scorePercent}分</span>
                </div>
                <div class="modal-alert-body">
                    <div class="alert-transaction">
                        <h4>交易信息</h4>
                        <p><strong>金额:</strong> ¥${transaction.amount.toLocaleString()}</p>
                        <p><strong>时间:</strong> ${new Date(transaction.time).toLocaleString()}</p>
                        <p><strong>地点:</strong> ${transaction.location}</p>
                        <p><strong>商户:</strong> ${transaction.merchant}</p>
                    </div>
                    <div class="alert-message">
                        <p>${result.message}</p>
                    </div>
                    ${result.recommendations && result.recommendations.length > 0 ? `
                        <div class="alert-recommendations">
                            <h4>建议措施</h4>
                            <ul>
                                ${result.recommendations.map(rec => `<li>${rec.title}: ${rec.description}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        modalOverlay.classList.add('active');
    }

    hideModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        modalOverlay.classList.remove('active');
    }

    handleAuthConfirm() {
        alert('✅ 身份验证成功！交易已放行。');
        this.hideModal();
    }
}

let fraudDetectorApp;

document.addEventListener('DOMContentLoaded', () => {
    fraudDetectorApp = new FraudDetectorApp();
});
