export class AnswerSynthesizer {
    constructor(knowledgeBase) {
        this.knowledgeBase = knowledgeBase;
    }

    synthesize(retrievalResult) {
        if (retrievalResult.results.length === 0) {
            return this.getDefaultResponse();
        }

        const bestMatch = retrievalResult.bestMatch;
        const confidence = retrievalResult.confidence;

        if (confidence < 0.5) {
            return this.getLowConfidenceResponse(retrievalResult);
        }

        const entry = bestMatch.entry;
        const answer = this.buildAnswer(entry, retrievalResult);

        return {
            text: answer,
            source: entry,
            confidence: confidence,
            relatedQuestions: this.getRelatedQuestions(retrievalResult.results)
        };
    }

    buildAnswer(entry, retrievalResult) {
        const answerObj = entry.answer;
        let response = '';

        if (answerObj.steps && answerObj.steps.length > 0) {
            response = answerObj.steps.join('\n\n');
        }

        if (answerObj.note) {
            response += `\n\n${answerObj.note}`;
        }

        return response;
    }

    getDefaultResponse() {
        const responses = this.knowledgeBase.defaultResponses;
        const randomIndex = Math.floor(Math.random() * responses.length);
        
        return {
            text: responses[randomIndex],
            source: null,
            confidence: 0,
            relatedQuestions: [],
            suggestions: this.getSuggestedQuestions()
        };
    }

    getLowConfidenceResponse(retrievalResult) {
        const results = retrievalResult.results;
        
        if (results.length === 0) {
            return this.getDefaultResponse();
        }

        const firstEntry = results[0].entry;
        const response = `我找到一些可能相关的信息：\n\n` +
            this.buildAnswer(firstEntry, retrievalResult) +
            `\n\n（提示：如果这个回答不是您想要的，您可以尝试用更具体的方式提问，或者联系人工客服）`;

        return {
            text: response,
            source: firstEntry,
            confidence: retrievalResult.confidence,
            relatedQuestions: this.getRelatedQuestions(results),
            isLowConfidence: true
        };
    }

    getRelatedQuestions(results) {
        if (results.length <= 1) return [];
        
        const related = [];
        for (let i = 1; i < Math.min(results.length, 3); i++) {
            const entry = results[i].entry;
            if (entry && entry.questions && entry.questions.length > 0) {
                related.push({
                    question: entry.questions[0],
                    confidence: results[i].confidence
                });
            }
        }
        return related;
    }

    getSuggestedQuestions() {
        const allQuestions = [];
        for (const entry of this.knowledgeBase.entries) {
            if (entry.questions && entry.questions.length > 0) {
                allQuestions.push(entry.questions[0]);
            }
        }
        
        const shuffled = allQuestions.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    }

    getGreetingResponse(query) {
        const greetings = [
            "您好！很高兴为您服务。请问有什么可以帮您的？",
            "你好！我是智能客服助手，可以帮您解答购物、退货、配送等问题。",
            "嗨！欢迎咨询。您有什么问题吗？",
            "您好！有什么我可以帮助您的？",
            "你好！我可以帮您查询订单、了解售后政策等。请问您需要什么帮助？"
        ];
        
        const randomIndex = Math.floor(Math.random() * greetings.length);
        
        return {
            text: greetings[randomIndex],
            source: null,
            confidence: 1,
            relatedQuestions: [],
            isGreeting: true
        };
    }

    formatForDisplay(answer) {
        let html = `<div class="message-content-wrapper">`;
        html += `<div class="answer-text">${this.escapeHtml(answer.text).replace(/\n/g, '<br>')}</div>`;
        
        if (answer.relatedQuestions && answer.relatedQuestions.length > 0) {
            html += `<div class="suggested-questions">`;
            html += `<div class="suggested-title">您可能还想问：</div>`;
            for (const rq of answer.relatedQuestions) {
                html += `<span class="suggested-tag" data-question="${this.escapeHtml(rq.question)}">${this.escapeHtml(rq.question)}</span>`;
            }
            html += `</div>`;
        }
        
        if (answer.suggestions && answer.suggestions.length > 0) {
            html += `<div class="suggested-questions">`;
            html += `<div class="suggested-title">试试这些问题：</div>`;
            for (const sug of answer.suggestions) {
                html += `<span class="suggested-tag" data-question="${this.escapeHtml(sug)}">${this.escapeHtml(sug)}</span>`;
            }
            html += `</div>`;
        }
        
        if (answer.confidence > 0) {
            const confidenceClass = answer.confidence >= 0.8 ? 'confidence-high' : 'confidence-medium';
            const confidenceText = answer.confidence >= 0.8 ? '高' : '中';
            html += `<div style="margin-top: 8px; font-size: 11px; color: #999;">`;
            html += `<span class="confidence-badge ${confidenceClass}">置信度：${confidenceText}</span>`;
            html += `</div>`;
        }
        
        html += `</div>`;
        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
