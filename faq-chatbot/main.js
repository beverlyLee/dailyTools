import { knowledgeBase } from './knowledgeBase.js';
import { Indexer } from './Indexer.js';
import { Retriever } from './Retriever.js';
import { AnswerSynthesizer } from './AnswerSynthesizer.js';

class ChatBotApp {
    constructor() {
        this.indexer = null;
        this.retriever = null;
        this.synthesizer = null;
        this.conversationHistory = [];
        this.isProcessing = false;

        this.init();
    }

    init() {
        console.log('[ChatBot] 初始化智能客服聊天机器人...');
        
        this.indexer = new Indexer(knowledgeBase);
        this.indexer.init();
        
        this.retriever = new Retriever(this.indexer);
        this.synthesizer = new AnswerSynthesizer(knowledgeBase);
        
        this.initElements();
        this.initEventListeners();
        
        console.log('[ChatBot] 初始化完成');
    }

    initElements() {
        this.chatContainer = document.getElementById('chatContainer');
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.quickQuestions = document.getElementById('quickQuestions');
    }

    initEventListeners() {
        this.sendBtn.addEventListener('click', () => this.handleSend());
        
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        if (this.quickQuestions) {
            this.quickQuestions.addEventListener('click', (e) => {
                if (e.target.classList.contains('quick-tag')) {
                    const question = e.target.textContent;
                    this.handleQuickQuestion(question);
                }
            });
        }

        this.chatContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggested-tag')) {
                const question = e.target.getAttribute('data-question');
                if (question) {
                    this.handleQuickQuestion(question);
                }
            }
        });

        this.userInput.focus();
    }

    handleQuickQuestion(question) {
        this.userInput.value = question;
        this.handleSend();
    }

    async handleSend() {
        const message = this.userInput.value.trim();
        
        if (!message) return;
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.userInput.value = '';
        this.userInput.disabled = true;
        this.sendBtn.disabled = true;

        this.addUserMessage(message);
        this.conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: Date.now()
        });

        const typingIndicator = this.showTypingIndicator();

        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

        try {
            const answer = await this.processMessage(message);
            this.removeTypingIndicator(typingIndicator);
            this.addBotMessage(answer);
            this.conversationHistory.push({
                role: 'assistant',
                content: answer.text,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[ChatBot] 处理消息出错:', error);
            this.removeTypingIndicator(typingIndicator);
            this.addBotMessage({
                text: '抱歉，处理您的问题时出现了错误，请稍后再试。',
                confidence: 0
            });
        }

        this.isProcessing = false;
        this.userInput.disabled = false;
        this.sendBtn.disabled = false;
        this.userInput.focus();
    }

    async processMessage(message) {
        if (this.retriever.isGreeting(message)) {
            return this.synthesizer.getGreetingResponse(message);
        }

        const retrievalResult = this.retriever.retrieveWithContext(
            message,
            this.conversationHistory,
            3
        );

        console.log('[ChatBot] 检索结果:', retrievalResult);

        const answer = this.synthesizer.synthesize(retrievalResult);

        return answer;
    }

    addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-user';
        
        const time = this.getCurrentTime();
        
        messageDiv.innerHTML = `
            <div class="avatar">😊</div>
            <div class="message-content">
                <div class="message-text">${this.escapeHtml(message)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addBotMessage(answer) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-bot';
        
        const time = this.getCurrentTime();
        const formattedAnswer = this.synthesizer.formatForDisplay(answer);
        
        messageDiv.innerHTML = `
            <div class="avatar">🤖</div>
            <div class="message-content">
                <div class="message-text">${formattedAnswer}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        this.chatContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'message message-bot';
        indicatorDiv.id = 'typingIndicator';
        
        indicatorDiv.innerHTML = `
            <div class="avatar">🤖</div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        this.chatContainer.appendChild(indicatorDiv);
        this.scrollToBottom();
        
        return indicatorDiv;
    }

    removeTypingIndicator(indicator) {
        if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }, 50);
    }

    getCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[ChatBot] DOM 已加载，正在初始化...');
    new ChatBotApp();
});
