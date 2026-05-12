class RiskInterceptor {
    constructor() {
        this.thresholds = {
            critical: 0.8,
            high: 0.6,
            medium: 0.3
        };
        
        this.actions = {
            critical: {
                block: true,
                requireAuth: false,
                alert: true,
                notify: true
            },
            high: {
                block: false,
                requireAuth: true,
                alert: true,
                notify: true
            },
            medium: {
                block: false,
                requireAuth: false,
                alert: true,
                notify: false
            },
            low: {
                block: false,
                requireAuth: false,
                alert: false,
                notify: false
            }
        };
        
        this.handlers = {
            onBlock: null,
            onAuth: null,
            onAlert: null,
            onNotify: null
        };
    }

    intercept(scoreResult, transaction) {
        const riskLevel = scoreResult.riskLevel.level;
        const action = this.actions[riskLevel] || this.actions.low;

        const result = {
            shouldBlock: action.block,
            requireAuth: action.requireAuth,
            alert: action.alert,
            riskLevel,
            score: scoreResult.score,
            message: this.getMessage(scoreResult, transaction),
            recommendations: this.getRecommendations(scoreResult, transaction)
        };

        if (action.block && this.handlers.onBlock) {
            this.handlers.onBlock(result, transaction);
        }

        if (action.requireAuth && this.handlers.onAuth) {
            this.handlers.onAuth(result, transaction);
        }

        if (action.alert && this.handlers.onAlert) {
            this.handlers.onAlert(result, transaction);
        }

        if (action.notify && this.handlers.onNotify) {
            this.handlers.onNotify(result, transaction);
        }

        return result;
    }

    getMessage(scoreResult, transaction) {
        const riskLevel = scoreResult.riskLevel;
        const score = (scoreResult.score * 100).toFixed(1);
        
        const baseMessage = `交易风险等级: ${riskLevel.label} (${score}分)`;
        
        if (scoreResult.anomalies && scoreResult.anomalies.length > 0) {
            const anomalyMessages = scoreResult.anomalies.map(a => a.message).join('、');
            return `${baseMessage}\n\n检测到异常: ${anomalyMessages}`;
        }
        
        return baseMessage;
    }

    getRecommendations(scoreResult, transaction) {
        const recommendations = [];
        const riskLevel = scoreResult.riskLevel.level;

        if (riskLevel === 'critical') {
            recommendations.push({
                type: 'block',
                title: '交易已拦截',
                description: '此交易存在极高风险，已自动拦截。建议联系持卡人确认交易合法性。',
                priority: 'high'
            });
        } else if (riskLevel === 'high') {
            recommendations.push({
                type: 'verify',
                title: '需要二次验证',
                description: '请进行额外的身份验证，如短信验证码、指纹识别或人脸识别。',
                priority: 'high'
            });
        } else if (riskLevel === 'medium') {
            recommendations.push({
                type: 'monitor',
                title: '建议关注',
                description: '该交易存在一定风险特征，建议后续监控该账户的交易行为。',
                priority: 'medium'
            });
        }

        scoreResult.anomalies.forEach(anomaly => {
            recommendations.push({
                type: anomaly.type,
                title: anomaly.message,
                description: this.getAnomalyDescription(anomaly, transaction),
                priority: anomaly.severity
            });
        });

        return recommendations;
    }

    getAnomalyDescription(anomaly, transaction) {
        switch (anomaly.type) {
            case 'amount':
                return `交易金额 ¥${transaction.amount.toLocaleString()} 超过历史最大消费上限，存在盗刷风险。`;
            case 'time':
                return `交易时间 ${this.formatTime(transaction.time)} 属于非常规消费时间。`;
            case 'location':
                return `交易地点 ${transaction.location} 非常见消费地区。`;
            case 'merchant':
                return `商户类别 ${transaction.merchantCategory} 非常见消费类型。`;
            case 'deviation':
                return '本次消费金额与历史消费模式存在较大偏差。';
            default:
                return '检测到异常交易特征。';
        }
    }

    formatTime(time) {
        const date = new Date(time);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    showAlert(result, transaction) {
        const riskLevel = result.riskLevel;
        const score = (result.score * 100).toFixed(1);
        
        console.log(`%c⚠️ 风险警报`, `color: ${riskLevel.color}; font-size: 14px; font-weight: bold;`);
        console.log(`交易信息:`);
        console.log(`  金额: ¥${transaction.amount.toLocaleString()}`);
        console.log(`  时间: ${new Date(transaction.time).toLocaleString()}`);
        console.log(`  地点: ${transaction.location}`);
        console.log(`  商户: ${transaction.merchant}`);
        console.log(`风险评估:`);
        console.log(`  等级: ${riskLevel.label}`);
        console.log(`  分数: ${score}分`);
        console.log(`  建议: ${riskLevel.action}`);
    }

    on(handlerType, handler) {
        if (this.handlers.hasOwnProperty(handlerType)) {
            this.handlers[handlerType] = handler;
        }
    }

    setThreshold(level, value) {
        if (this.thresholds.hasOwnProperty(level)) {
            this.thresholds[level] = value;
        }
    }

    setAction(riskLevel, actionType, value) {
        if (this.actions.hasOwnProperty(riskLevel)) {
            this.actions[riskLevel][actionType] = value;
        }
    }

    getRiskLevel(score) {
        if (score >= this.thresholds.critical) {
            return 'critical';
        }
        if (score >= this.thresholds.high) {
            return 'high';
        }
        if (score >= this.thresholds.medium) {
            return 'medium';
        }
        return 'low';
    }
}
