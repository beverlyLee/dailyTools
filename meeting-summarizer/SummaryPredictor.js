class SummaryPredictor {
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.modelId = config.modelId || 'doubao-seed-1-6-251015';
        this.baseUrl = config.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
        this.useApi = config.useApi || false;
        this.useFallback = config.useFallback || true;
    }

    setConfig(config) {
        if (config.apiKey !== undefined) {
            this.apiKey = config.apiKey;
        }
        if (config.modelId !== undefined) {
            this.modelId = config.modelId;
        }
        if (config.baseUrl !== undefined) {
            this.baseUrl = config.baseUrl;
        }
        if (config.useApi !== undefined) {
            this.useApi = config.useApi;
        }
        if (config.useFallback !== undefined) {
            this.useFallback = config.useFallback;
        }
    }

    isApiReady() {
        return this.useApi && this.apiKey && this.apiKey.trim().length > 0;
    }

    async predict(cleanedText, maxLength = 100) {
        if (!cleanedText || cleanedText.trim().length === 0) {
            return '输入文本为空，无法生成摘要。';
        }

        if (this.isApiReady()) {
            try {
                return await this.callVolcanoApi(cleanedText, maxLength);
            } catch (error) {
                console.error('火山 API 调用失败:', error);
                if (this.useFallback) {
                    console.warn('使用本地 fallback 方案');
                    return this.generateFallbackSummary(cleanedText, maxLength);
                }
                throw error;
            }
        }

        if (this.useFallback) {
            return this.generateFallbackSummary(cleanedText, maxLength);
        }

        throw new Error('未配置火山 API Key，且未启用 fallback 模式');
    }

    async callVolcanoApi(text, maxLength) {
        const systemPrompt = this.getSystemPrompt(maxLength);
        const userPrompt = this.getUserPrompt(text);

        const requestBody = {
            model: this.modelId,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            max_tokens: Math.max(200, maxLength * 2),
            temperature: 0.3,
            top_p: 0.9
        };

        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 调用失败: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.choices || data.choices.length === 0) {
            throw new Error('API 返回结果为空');
        }

        const content = data.choices[0].message.content;
        return this.cleanApiResponse(content, maxLength);
    }

    getSystemPrompt(maxLength) {
        return `你是一位专业的会议纪要摘要助手。你的任务是：

1. 仔细阅读用户提供的会议记录文本
2. 生成一个简洁的 TL;DR 风格摘要，长度控制在 ${maxLength} 字以内
3. 摘要必须涵盖会议的核心决策点、重要结论和关键安排
4. 语言要精炼、专业，避免冗余
5. 直接输出摘要内容，不要包含任何解释性文字或前缀

示例：
会议讨论了新产品上线计划，决定下周三灰度发布，下周五正式上线。张工负责性能优化（本周五前完成），李工负责制定测试计划（下周一前提交）。`;
    }

    getUserPrompt(text) {
        return `请为以下会议记录生成摘要：

${text}

要求：
- 摘要长度：100 字以内
- 涵盖核心决策点
- 语言简洁专业
- 直接输出摘要内容`;
    }

    cleanApiResponse(content, maxLength) {
        let cleaned = content.trim();
        
        cleaned = cleaned.replace(/^摘要[:：]\s*/i, '');
        cleaned = cleaned.replace(/^TL;DR[:：]\s*/i, '');
        cleaned = cleaned.replace(/^【摘要】\s*/, '');
        cleaned = cleaned.replace(/^会议摘要[:：]\s*/i, '');
        
        cleaned = cleaned.replace(/\n+/g, ' ');
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.trim();
        
        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength - 3) + '...';
        }
        
        if (!cleaned.endsWith('。') && !cleaned.endsWith('...') && !cleaned.endsWith('！') && !cleaned.endsWith('？')) {
            cleaned += '。';
        }
        
        return cleaned;
    }

    generateFallbackSummary(text, maxLength) {
        const sentences = this.splitIntoSentences(text);
        
        if (sentences.length === 0) {
            return text.substring(0, maxLength) + '...';
        }

        const scoredSentences = this.scoreSentences(sentences, text);
        const topSentences = scoredSentences
            .sort((a, b) => b.score - a.score)
            .slice(0, Math.ceil(sentences.length * 0.3))
            .sort((a, b) => a.index - b.index)
            .map(s => s.text);

        let summary = topSentences.join('。');
        
        if (summary.length > maxLength) {
            summary = summary.substring(0, maxLength - 3) + '...';
        }

        if (summary.endsWith('。。')) {
            summary = summary.slice(0, -1);
        }
        
        if (!summary.endsWith('。') && !summary.endsWith('...')) {
            summary += '。';
        }

        return summary;
    }

    splitIntoSentences(text) {
        return text
            .split(/[。！？.!?\n]+/)
            .map(s => s.trim())
            .filter(s => s.length > 5);
    }

    scoreSentences(sentences, fullText) {
        const keywords = this.extractKeywords(fullText);
        const keyPhrases = ['决定', '确定', '同意', '通过', '需要', '应该', '必须', '建议', '计划', '安排', '目标', '任务', '问题', '方案', '讨论'];
        
        return sentences.map((text, index) => {
            let score = 0;
            
            if (index === 0 || index === sentences.length - 1) {
                score += 2;
            }
            
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    score += 1;
                }
            }
            
            for (const phrase of keyPhrases) {
                if (text.includes(phrase)) {
                    score += 2;
                }
            }
            
            const lengthScore = Math.min(text.length / 50, 2);
            score += lengthScore;
            
            const positionWeight = 1 - (index / sentences.length) * 0.3;
            score *= positionWeight;
            
            return { text, index, score };
        });
    }

    extractKeywords(text) {
        const words = text.split(/[\s,.!?，。！？、；;：:\n]+/).filter(w => w.length > 1);
        const wordFreq = {};
        
        for (const word of words) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
        
        const totalWords = words.length;
        const keywords = Object.entries(wordFreq)
            .filter(([word, freq]) => freq > 1 && freq / totalWords < 0.3)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
        
        return keywords;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SummaryPredictor;
}
