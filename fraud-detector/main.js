class FraudDetectorApp {
    constructor() {
        this.featureExtractor = null;
        this.anomalyScorer = null;
        this.riskInterceptor = null;
        this.history = [];
        this.currentTransaction = null;
        this.init();
    }

    async init() {
        console.log('🚀 初始化欺诈交易检测系统...');
        
        this.featureExtractor = new FeatureExtractor();
        this.anomalyScorer = new AnomalyScorer();
        this.riskInterceptor = new RiskInterceptor();
        
        await this.anomalyScorer.init();
        
        this.syncThresholds();
        
        this.setupEventHandlers();
        this.setDefaultTime();
        this.setupRiskInterceptors();
        this.updateBaselineUI();
        
        console.log('✅ 欺诈交易检测系统初始化完成！');
    }

    syncThresholds() {
        const scorerThresholds = this.anomalyScorer.getThresholds();
        const interceptorThresholds = this.riskInterceptor.getThresholds();
        
        for (const [level, value] of Object.entries(scorerThresholds)) {
            if (interceptorThresholds[level] !== value) {
                this.riskInterceptor.setThreshold(level, value);
            }
        }
        
        console.log('🔄 阈值已同步:', scorerThresholds);
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
            clearHistoryBtn.addEventListener('click', () => this.clearAllHistory());
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
            this.riskInterceptor.showAlert(result, transaction);
        });

        this.riskInterceptor.on('onNotify', (result, transaction) => {
            console.log('📢 通知:', result.message);
        });

        this.riskInterceptor.on('onLog', (logEntry) => {
            console.log('📋 审计日志:', logEntry);
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
            },
            'multiple-high-value': {
                amount: 100000,
                time: '2024-01-15T11:00',
                location: '中国上海',
                merchant: '高端珠宝店',
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
            
            console.log(`📋 已加载示例: ${type}`);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const transaction = this.getFormData();
        if (!transaction) {
            alert('请填写完整的交易信息！');
            return;
        }

        this.currentTransaction = transaction;

        try {
            const result = await this.processTransaction(transaction);
            this.displayResult(result, transaction);
            this.addToHistory(transaction, result);
            
            this.featureExtractor.addToHistory(transaction, result.features);
            
            this.updateBaselineUI();
            
            console.log('✅ 交易处理完成');
        } catch (error) {
            console.error('❌ 检测失败:', error);
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
        console.log('📊 提取的特征:', this.summarizeFeatures(features));
        
        const scoreResult = await this.anomalyScorer.scoreTransaction(
            features, 
            transaction, 
            this.featureExtractor
        );
        console.log('📈 风险评分:', scoreResult);
        
        const interceptResult = this.riskInterceptor.intercept(scoreResult, transaction);
        console.log('🚦 拦截决策:', interceptResult);
        
        return {
            features,
            scoreResult,
            interceptResult
        };
    }

    summarizeFeatures(features) {
        return {
            amount: features.amount,
            isLargeAmount: features.isLargeAmount,
            isExtremeAmount: features.isExtremeAmount,
            amountDeviation: features.amountDeviation.toFixed(3),
            amountZScore: features.amountZScore.toFixed(3),
            isOddHour: features.isOddHour,
            isLateNight: features.isLateNight,
            isForeignLocation: features.isForeignLocation,
            locationChange: features.locationChange,
            rapidLocationChange: features.rapidLocationChange,
            firstTimeLocation: features.firstTimeLocation
        };
    }

    displayResult(result, transaction) {
        const resultContent = document.getElementById('resultContent');
        const { scoreResult, interceptResult } = result;
        const riskLevel = scoreResult.riskLevel;
        const scorePercent = (scoreResult.score * 100).toFixed(1);

        const anomaliesHtml = this.generateAnomaliesHtml(scoreResult);
        const recommendationsHtml = this.generateRecommendationsHtml(interceptResult);
        const scoreBreakdownHtml = this.generateScoreBreakdownHtml(scoreResult);
        const modelInfoHtml = this.generateModelInfoHtml(scoreResult);
        const baselineHtml = this.generateBaselineComparisonHtml(transaction, scoreResult);

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
                    ${baselineHtml}
                    ${scoreBreakdownHtml}
                    ${modelInfoHtml}
                </div>
            </div>
        `;
    }

    generateAnomaliesHtml(scoreResult) {
        if (!scoreResult.anomalies || scoreResult.anomalies.length === 0) {
            return `
                <div class="anomalies-section">
                    <h4>✅ 异常检测</h4>
                    <div class="no-anomalies">
                        <span>未检测到异常特征</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="anomalies-section">
                <h4>🚨 检测到的异常 (${scoreResult.anomalies.length}项)</h4>
                <ul class="anomalies-list">
                    ${scoreResult.anomalies.map(anomaly => `
                        <li class="anomaly-item severity-${anomaly.severity}">
                            <span class="anomaly-icon">${this.getAnomalyIcon(anomaly.type)}</span>
                            <div class="anomaly-content">
                                <span class="anomaly-message">${anomaly.message}</span>
                                ${anomaly.description ? `<span class="anomaly-desc">${anomaly.description}</span>` : ''}
                            </div>
                            <span class="anomaly-severity">${this.getSeverityLabel(anomaly.severity)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    generateRecommendationsHtml(interceptResult) {
        if (!interceptResult.recommendations || interceptResult.recommendations.length === 0) {
            return '';
        }

        return `
            <div class="recommendations-section">
                <h4>💡 建议措施</h4>
                <ul class="recommendations-list">
                    ${interceptResult.recommendations.map(rec => `
                        <li class="recommendation-item priority-${rec.priority}">
                            <div class="rec-title">${rec.icon || '📌'} ${rec.title}</div>
                            <div class="rec-description">${rec.description}</div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    generateScoreBreakdownHtml(scoreResult) {
        if (!scoreResult.detailedScores) {
            return '';
        }

        return `
            <div class="score-breakdown">
                <h4>📊 详细评分</h4>
                <div class="score-grid">
                    ${Object.entries(scoreResult.detailedScores).map(([key, value]) => `
                        <div class="score-item">
                            <span class="score-label">${this.getScoreLabel(key)}</span>
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${Math.min(value * 100, 100)}%"></div>
                            </div>
                            <span class="score-percent">${Math.min(value * 100, 100).toFixed(0)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateModelInfoHtml(scoreResult) {
        const scoreComposition = scoreResult.scoreComposition;
        if (!scoreComposition) {
            return '';
        }

        return `
            <div class="model-info-section">
                <h4>🤖 模型信息</h4>
                <div class="model-info">
                    <div class="model-type">
                        <span class="info-label">模型类型:</span>
                        <span class="info-value">${scoreResult.modelType || '未知'}</span>
                    </div>
                    <div class="score-composition">
                        <div class="comp-item">
                            <span>规则引擎:</span>
                            <span class="comp-value">${(scoreComposition.ruleBased * 100).toFixed(1)}%</span>
                        </div>
                        ${scoreComposition.modelBased !== null ? `
                            <div class="comp-item">
                                <span>模型预测:</span>
                                <span class="comp-value">${(scoreComposition.modelBased * 100).toFixed(1)}%</span>
                            </div>
                        ` : `
                            <div class="comp-item">
                                <span>模型预测:</span>
                                <span class="comp-value">不可用</span>
                            </div>
                        `}
                        <div class="comp-item final">
                            <span>综合分数:</span>
                            <span class="comp-value">${(scoreComposition.final * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateBaselineComparisonHtml(transaction, scoreResult) {
        const baseline = this.featureExtractor.getBaseline();
        const features = scoreResult.detailedScores;
        
        if (!baseline || baseline.totalTransactions === 0) {
            return '';
        }

        const amountComparison = transaction.amount / baseline.medianAmount;
        const deviation = Math.abs(transaction.amount - baseline.medianAmount);

        return `
            <div class="baseline-section">
                <h4>📈 历史基线对比</h4>
                <div class="baseline-grid">
                    <div class="baseline-item">
                        <span class="baseline-label">历史中位数</span>
                        <span class="baseline-value">¥${baseline.medianAmount.toLocaleString()}</span>
                    </div>
                    <div class="baseline-item">
                        <span class="baseline-label">历史平均值</span>
                        <span class="baseline-value">¥${baseline.avgAmount.toFixed(0).toLocaleString()}</span>
                    </div>
                    <div class="baseline-item">
                        <span class="baseline-label">交易次数</span>
                        <span class="baseline-value">${baseline.totalTransactions}次</span>
                    </div>
                    <div class="baseline-item highlight ${amountComparison > 3 ? 'high' : ''}">
                        <span class="baseline-label">相对比例</span>
                        <span class="baseline-value">${amountComparison.toFixed(1)}倍</span>
                    </div>
                </div>
                ${features && features.amountDeviation ? `
                    <div class="deviation-info">
                        <span>金额偏差: ${deviation.toLocaleString()}元 (${(features.amountDeviation * 100).toFixed(0)}%)</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    updateBaselineUI() {
        const baseline = this.featureExtractor.getBaseline();
        const baselineSection = document.getElementById('baselineInfo');
        
        if (baselineSection && baseline.totalTransactions > 0) {
            baselineSection.innerHTML = `
                <div class="baseline-summary">
                    <span>📊 已学习 ${baseline.totalTransactions} 笔历史交易</span>
                    <span>|</span>
                    <span>中位数: ¥${baseline.medianAmount.toLocaleString()}</span>
                    <span>|</span>
                    <span>常用地点: ${baseline.commonLocations.slice(0, 3).join(', ')}</span>
                </div>
            `;
        }
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
            extreme_amount: '💰',
            large_amount: '💴',
            zscore: '📊',
            late_night: '🌙',
            odd_hour: '⏰',
            unusual_hour: '🕐',
            foreign: '🌍',
            rapid_location: '✈️',
            location_change: '📍',
            new_location: '🆕',
            unusual_location: '🗺️',
            merchant: '🏪',
            new_merchant: '🛒',
            same_amount: '🔄',
            rapid: '⚡',
            amount: '💰',
            time: '⏰',
            location: '📍',
            deviation: '📉'
        };
        return icons[type] || '⚠️';
    }

    getSeverityLabel(severity) {
        const labels = {
            critical: '极高',
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
            observe: '📋',
            approve: '✅',
            investigate: '🔍',
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
            isExtremeAmount: '极端金额',
            amountDeviation: '金额偏差',
            amountZScore: 'Z-Score',
            amountPercentile: '金额百分位',
            isOddHour: '深夜标记',
            isLateNight: '凌晨标记',
            hourUnusualness: '时段异常度',
            time: '时间风险',
            isForeignLocation: '境外标记',
            locationChange: '地点变更',
            rapidLocationChange: '快速移动',
            locationUnusualness: '地点异常度',
            location: '地点风险',
            locationAnomaly: '旅行异常',
            merchantAnomaly: '商户异常',
            merchantUnusualness: '商户异常度',
            sameAmountConsecutive: '连续相同',
            rapidTransactions: '频繁交易',
            firstTimeLocation: '首次地点',
            firstTimeMerchant: '首次商户',
            merchant: '商户风险',
            isForeignLocation: '异地标记'
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
        
        if (this.history.length > 50) {
            this.history.pop();
        }
        
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        if (!this.history || !Array.isArray(this.history) || this.history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📜</div>
                    <p>暂无检测历史</p>
                </div>
            `;
            return;
        }

        historyList.innerHTML = this.history.map(item => {
            if (!item || !item.result || !item.result.scoreResult) {
                return '';
            }
            
            const riskLevel = item.result.scoreResult.riskLevel || { level: 'low', color: '#28a745', label: '低风险' };
            const anomalies = (item.result.scoreResult && item.result.scoreResult.anomalies) || [];
            const transaction = item.transaction || { merchant: '未知商户', amount: 0, location: '未知地点' };
            
            return `
                <div class="history-item risk-${riskLevel.level}" data-id="${item.id || Date.now()}">
                    <div class="history-left">
                        <div class="history-icon" style="background-color: ${riskLevel.color || '#28a745'}">
                            ${this.getLevelIcon(riskLevel.level)}
                        </div>
                        <div class="history-info">
                            <div class="history-merchant">${transaction.merchant || '未知商户'}</div>
                            <div class="history-details">
                                <span>¥${(transaction.amount || 0).toLocaleString()}</span>
                                <span>·</span>
                                <span>${transaction.location || '未知地点'}</span>
                            </div>
                            <div class="history-time">${item.timestamp || new Date().toLocaleString()}</div>
                            ${anomalies.length > 0 ? `
                                <div class="history-anomalies">
                                    ${anomalies.slice(0, 2).map(a => `<span class="mini-tag">${this.getAnomalyIcon(a.type)} ${a.message}</span>`).join('')}
                                    ${anomalies.length > 2 ? `<span class="mini-tag more">+${anomalies.length - 2}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="history-right">
                        <div class="history-level" style="color: ${riskLevel.color || '#28a745'}">
                            ${riskLevel.label || '未知'}
                        </div>
                        <div class="history-score">
                            ${((item.result.scoreResult && item.result.scoreResult.score) || 0 * 100).toFixed(0)}分
                        </div>
                    </div>
                </div>
            `;
        }).filter(Boolean).join('');
    }

    clearAllHistory() {
        if (!confirm('确定要清空所有历史记录吗？这将重置消费基线和所有学习到的模式。')) {
            return;
        }
        
        this.history = [];
        this.currentTransaction = null;
        
        if (this.featureExtractor) {
            this.featureExtractor.clearHistory();
        }
        
        if (this.riskInterceptor) {
            this.riskInterceptor.clearAuditLog();
        }
        
        this.renderHistory();
        this.updateBaselineUI();
        this.clearForm();
        
        console.log('🗑️ 所有历史记录、基线数据和审计日志已清空');
        alert('✅ 历史记录已重置！您可以开始新的测试。');
    }

    clearForm() {
        document.getElementById('transactionForm').reset();
        this.setDefaultTime();
        this.currentTransaction = null;
        
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
                        <h4>📋 交易信息</h4>
                        <p><strong>金额:</strong> ¥${transaction.amount.toLocaleString()}</p>
                        <p><strong>时间:</strong> ${new Date(transaction.time).toLocaleString()}</p>
                        <p><strong>地点:</strong> ${transaction.location}</p>
                        <p><strong>商户:</strong> ${transaction.merchant}</p>
                    </div>
                    <div class="alert-message">
                        <pre>${result.message}</pre>
                    </div>
                    ${result.recommendations && result.recommendations.length > 0 ? `
                        <div class="alert-recommendations">
                            <h4>💡 建议措施</h4>
                            <ul>
                                ${result.recommendations.slice(0, 3).map(rec => `
                                    <li><strong>${rec.icon || '📌'} ${rec.title}:</strong> ${rec.description}</li>
                                `).join('')}
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
        
        if (this.currentTransaction) {
            console.log('🔓 已授权交易:', this.currentTransaction);
        }
    }
}

let fraudDetectorApp;

document.addEventListener('DOMContentLoaded', () => {
    fraudDetectorApp = new FraudDetectorApp();
});
