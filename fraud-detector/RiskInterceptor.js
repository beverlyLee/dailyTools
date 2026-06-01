class RiskInterceptor {
    constructor() {
        this.thresholds = {
            critical: 0.75,
            high: 0.55,
            medium: 0.30
        };
        
        this.interceptionRules = {
            critical: {
                autoBlock: true,
                requireAuth: false,
                showAlert: true,
                sendNotification: true,
                logToAudit: true,
                priority: 'highest'
            },
            high: {
                autoBlock: false,
                requireAuth: true,
                showAlert: true,
                sendNotification: true,
                logToAudit: true,
                priority: 'high'
            },
            medium: {
                autoBlock: false,
                requireAuth: false,
                showAlert: true,
                sendNotification: false,
                logToAudit: true,
                priority: 'medium'
            },
            low: {
                autoBlock: false,
                requireAuth: false,
                showAlert: false,
                sendNotification: false,
                logToAudit: false,
                priority: 'low'
            }
        };
        
        this.authMethods = {
            sms: { name: '短信验证码', enabled: true },
            biometric: { name: '生物识别', enabled: false },
            device: { name: '设备验证', enabled: true },
            question: { name: '安全问题', enabled: false }
        };
        
        this.handlers = {
            onBlock: null,
            onAuth: null,
            onAlert: null,
            onNotify: null,
            onLog: null
        };
        
        this.auditLog = [];
    }

    intercept(scoreResult, transaction) {
        const riskLevel = scoreResult.riskLevel.level;
        const rule = this.interceptionRules[riskLevel] || this.interceptionRules.low;
        
        const interceptionResult = {
            shouldBlock: rule.autoBlock,
            requireAuth: rule.requireAuth,
            showAlert: rule.showAlert,
            sendNotification: rule.sendNotification,
            riskLevel,
            score: scoreResult.score,
            priority: rule.priority,
            message: this.getMessage(scoreResult, transaction),
            recommendations: this.getRecommendations(scoreResult, transaction),
            authMethods: this.getAvailableAuthMethods(riskLevel),
            timestamp: Date.now()
        };

        this.logToAudit(scoreResult, transaction, interceptionResult);
        this.triggerHandlers(interceptionResult, transaction);

        console.log(`
🚦 拦截决策结果:
   ├─ 风险等级: ${riskLevel}
   ├─ 是否拦截: ${interceptionResult.shouldBlock ? '是' : '否'}
   ├─ 需要验证: ${interceptionResult.requireAuth ? '是' : '否'}
   └─ 优先级: ${interceptionResult.priority}
`);

        return interceptionResult;
    }

    getMessage(scoreResult, transaction) {
        const riskLevel = scoreResult.riskLevel;
        const score = (scoreResult.score * 100).toFixed(1);
        
        let message = `【${riskLevel.label}】风险分数: ${score}分\n\n`;
        message += `交易信息:\n`;
        message += `  金额: ¥${transaction.amount.toLocaleString()}\n`;
        message += `  时间: ${new Date(transaction.time).toLocaleString()}\n`;
        message += `  地点: ${transaction.location}\n`;
        message += `  商户: ${transaction.merchant}\n\n`;
        
        if (scoreResult.anomalies && scoreResult.anomalies.length > 0) {
            message += `检测到的异常:\n`;
            scoreResult.anomalies.forEach((anomaly, index) => {
                const severityIcon = anomaly.severity === 'high' ? '🔴' : 
                                     anomaly.severity === 'medium' ? '🟡' : '🟢';
                message += `  ${severityIcon} ${index + 1}. ${anomaly.message}`;
                if (anomaly.description) {
                    message += ` - ${anomaly.description}`;
                }
                message += '\n';
            });
        }
        
        return message;
    }

    getRecommendations(scoreResult, transaction) {
        const recommendations = [];
        const riskLevel = scoreResult.riskLevel.level;

        if (riskLevel === 'critical') {
            recommendations.push({
                type: 'block',
                title: '交易已自动拦截',
                description: '此交易存在极高欺诈风险，系统已自动拦截。请立即联系持卡人确认交易合法性，必要时冻结账户。',
                priority: 'critical',
                icon: '🚫'
            });
            recommendations.push({
                type: 'investigate',
                title: '建议深入调查',
                description: '建议风控团队对该账户近期所有交易进行全面审查，识别潜在的盗刷模式。',
                priority: 'high',
                icon: '🔍'
            });
        } else if (riskLevel === 'high') {
            recommendations.push({
                type: 'verify',
                title: '需要二次验证',
                description: '请持卡人进行额外的身份验证。建议采用多因素认证（MFA），如短信验证码 + 设备验证。',
                priority: 'high',
                icon: '🔐'
            });
            recommendations.push({
                type: 'monitor',
                title: '加强账户监控',
                description: '建议在未来24小时内加强对该账户的交易监控，如发现更多异常立即采取措施。',
                priority: 'medium',
                icon: '👁️'
            });
        } else if (riskLevel === 'medium') {
            recommendations.push({
                type: 'observe',
                title: '建议关注',
                description: '该交易存在一定风险特征。建议记录此交易，持续观察该账户的后续行为。',
                priority: 'medium',
                icon: '📋'
            });
        } else {
            recommendations.push({
                type: 'approve',
                title: '交易正常',
                description: '此交易符合用户的正常消费模式，可以安全放行。',
                priority: 'low',
                icon: '✅'
            });
        }

        scoreResult.anomalies.forEach(anomaly => {
            recommendations.push({
                type: anomaly.type,
                title: anomaly.message,
                description: anomaly.description || this.getDefaultAnomalyDescription(anomaly, transaction),
                priority: anomaly.severity,
                icon: this.getAnomalyIcon(anomaly.type)
            });
        });

        return recommendations;
    }

    getDefaultAnomalyDescription(anomaly, transaction) {
        switch (anomaly.type) {
            case 'extreme_amount':
            case 'large_amount':
                return `金额 ¥${transaction.amount.toLocaleString()} 超出历史正常范围，可能存在盗刷风险。`;
            case 'zscore':
                return '从统计学角度看，本次交易金额的分布异常。';
            case 'late_night':
            case 'odd_hour':
                return `交易时间 ${this.formatTime(transaction.time)} 属于非常规消费时段。`;
            case 'foreign':
                return `交易地点 ${transaction.location} 在境外，请确认是否为本人操作。`;
            case 'rapid_location':
            case 'location_change':
                return '短时间内的地点变更可能存在风险。';
            case 'new_location':
                return `首次在 ${transaction.location} 进行交易，建议确认。`;
            case 'same_amount':
                return '连续相同金额的交易可能是自动化盗刷。';
            case 'rapid':
                return '频繁交易可能是账户被盗用的迹象。';
            default:
                return '检测到异常交易特征，建议关注。';
        }
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
            rapid: '⚡'
        };
        return icons[type] || '⚠️';
    }

    formatTime(time) {
        const date = new Date(time);
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }

    getAvailableAuthMethods(riskLevel) {
        const methods = [];
        
        if (riskLevel === 'critical' || riskLevel === 'high') {
            if (this.authMethods.sms.enabled) methods.push({ id: 'sms', ...this.authMethods.sms });
            if (this.authMethods.device.enabled) methods.push({ id: 'device', ...this.authMethods.device });
            if (this.authMethods.biometric.enabled) methods.push({ id: 'biometric', ...this.authMethods.biometric });
        }
        
        return methods;
    }

    logToAudit(scoreResult, transaction, interceptionResult) {
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            transaction: {
                amount: transaction.amount,
                time: transaction.time,
                location: transaction.location,
                merchant: transaction.merchant,
                merchantCategory: transaction.merchantCategory
            },
            riskAssessment: {
                score: scoreResult.score,
                level: scoreResult.riskLevel.level,
                anomalies: scoreResult.anomalies.map(a => ({ type: a.type, message: a.message }))
            },
            interception: {
                blocked: interceptionResult.shouldBlock,
                requireAuth: interceptionResult.requireAuth
            }
        };
        
        this.auditLog.unshift(logEntry);
        
        if (this.auditLog.length > 1000) {
            this.auditLog = this.auditLog.slice(0, 1000);
        }
        
        if (this.handlers.onLog) {
            this.handlers.onLog(logEntry);
        }
    }

    triggerHandlers(result, transaction) {
        if (result.shouldBlock && this.handlers.onBlock) {
            this.handlers.onBlock(result, transaction);
        }

        if (result.requireAuth && this.handlers.onAuth) {
            this.handlers.onAuth(result, transaction);
        }

        if (result.showAlert && this.handlers.onAlert) {
            this.handlers.onAlert(result, transaction);
        }

        if (result.sendNotification && this.handlers.onNotify) {
            this.handlers.onNotify(result, transaction);
        }
    }

    showAlert(result, transaction) {
        const riskLevel = result.riskLevel;
        const score = (result.score * 100).toFixed(1);
        
        const style = `
            font-size: 14px;
            font-weight: bold;
            color: ${riskLevel.color};
            background: ${riskLevel.color}20;
            padding: 10px 15px;
            border-radius: 8px;
            border-left: 4px solid ${riskLevel.color};
        `;
        
        console.log(`%c⚠️ 【${riskLevel.label}】风险警报`, style);
        console.log(`
📋 交易详情:
   ├─ 金额: ¥${transaction.amount.toLocaleString()}
   ├─ 时间: ${new Date(transaction.time).toLocaleString()}
   ├─ 地点: ${transaction.location}
   ├─ 商户: ${transaction.merchant}
   └─ 类别: ${transaction.merchantCategory}

📊 风险评估:
   ├─ 等级: ${riskLevel.label}
   ├─ 分数: ${score}分
   ├─ 建议: ${riskLevel.action}
   └─ 描述: ${riskLevel.description}
`);
    }

    on(handlerType, handler) {
        if (this.handlers.hasOwnProperty(handlerType)) {
            this.handlers[handlerType] = handler;
            console.log(`✅ 已注册 ${handlerType} 处理器`);
        } else {
            console.warn(`⚠️ 未知的处理器类型: ${handlerType}`);
        }
    }

    setThreshold(level, value) {
        if (this.thresholds.hasOwnProperty(level)) {
            this.thresholds[level] = value;
            console.log(`✅ 阈值更新: ${level} = ${value}`);
        }
    }

    getThresholds() {
        return { ...this.thresholds };
    }

    setRule(riskLevel, ruleKey, value) {
        if (this.interceptionRules.hasOwnProperty(riskLevel)) {
            if (this.interceptionRules[riskLevel].hasOwnProperty(ruleKey)) {
                this.interceptionRules[riskLevel][ruleKey] = value;
                console.log(`✅ 规则更新: ${riskLevel}.${ruleKey} = ${value}`);
            }
        }
    }

    getRules() {
        return JSON.parse(JSON.stringify(this.interceptionRules));
    }

    configureAuthMethod(methodId, enabled) {
        if (this.authMethods.hasOwnProperty(methodId)) {
            this.authMethods[methodId].enabled = enabled;
            console.log(`✅ 认证方法 ${methodId}: ${enabled ? '启用' : '禁用'}`);
        }
    }

    getAuditLog(limit = 100) {
        return this.auditLog.slice(0, limit);
    }

    clearAuditLog() {
        this.auditLog = [];
        console.log('🗑️ 审计日志已清空');
    }

    simulateBlock(scoreResult, transaction) {
        console.log('🚫 [模拟] 交易已拦截');
        this.showAlert({ ...scoreResult, score: scoreResult.score, riskLevel: scoreResult.riskLevel }, transaction);
    }

    simulateAuthRequest(scoreResult, transaction) {
        console.log('🔐 [模拟] 请求二次验证');
        this.showAlert({ ...scoreResult, score: scoreResult.score, riskLevel: scoreResult.riskLevel }, transaction);
    }
}
