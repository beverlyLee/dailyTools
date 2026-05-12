class SentimentAnalyzer {
    constructor() {
        this.tokenizer = new Tokenizer();
        this.classifier = new SentimentClassifier();
        this.gaugeChart = new GaugeChart();
        this.init();
    }

    async init() {
        try {
            console.log('正在初始化情感分析器...');
            
            await Promise.all([
                this.tokenizer.init(),
                this.classifier.init()
            ]);
            
            this.bindEvents();
            console.log('情感分析器初始化完成！');
        } catch (error) {
            console.error('初始化失败:', error);
            this.bindEvents();
        }
    }

    bindEvents() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const clearBtn = document.getElementById('clearBtn');
        const exampleBtns = document.querySelectorAll('.example-btn');
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeText());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAll());
        }
        
        exampleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.getAttribute('data-text');
                document.getElementById('textInput').value = text;
            });
        });

        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.analyzeText();
                    }
                }
            });
        }
    }

    async analyzeText() {
        const textInput = document.getElementById('textInput');
        const text = textInput.value.trim();
        
        if (!text) {
            alert('请输入文本内容！');
            return;
        }
        
        this.showLoading();
        
        try {
            const tokenizationResult = this.tokenizer.tokenize(text);
            console.log('分词结果:', tokenizationResult);
            
            const classificationResult = await this.classifier.classify(text);
            console.log('分类结果:', classificationResult);
            
            this.hideLoading();
            this.displayResults(classificationResult, tokenizationResult);
            
        } catch (error) {
            console.error('分析失败:', error);
            this.hideLoading();
            alert('分析失败，请重试！');
        }
    }

    displayResults(classificationResult, tokenizationResult) {
        const resultSection = document.getElementById('resultSection');
        const sentimentLabel = document.getElementById('sentimentLabel');
        const probabilityDistribution = document.getElementById('probabilityDistribution');
        const tokensCount = document.getElementById('tokensCount');
        
        const dominantSentiment = this.getDominantSentiment(classificationResult);
        const sentimentText = this.getSentimentText(dominantSentiment);
        const sentimentStrength = this.getSentimentStrength(classificationResult);
        
        sentimentLabel.className = 'sentiment-label sentiment-' + dominantSentiment;
        sentimentLabel.textContent = sentimentText + ' (' + sentimentStrength + ')';
        
        const sortedScores = this.sortSentimentScores(classificationResult);
        let probabilityHtml = '';
        
        for (const [sentiment, score] of Object.entries(sortedScores)) {
            const labelInfo = this.getSentimentLabelInfo(sentiment);
            probabilityHtml += `
                <div class="probability-item">
                    <div class="probability-header">
                        <div class="probability-label">
                            <span class="probability-icon">${labelInfo.icon}</span>
                            <span>${labelInfo.label}</span>
                        </div>
                        <div class="probability-value">${(score * 100).toFixed(1)}%</div>
                    </div>
                    <div class="probability-bar">
                        <div class="probability-fill probability-fill-${sentiment}" style="width: 0%"></div>
                    </div>
                </div>
            `;
        }
        
        probabilityDistribution.innerHTML = probabilityHtml;
        
        setTimeout(() => {
            const fillElements = document.querySelectorAll('.probability-fill');
            let index = 0;
            for (const [, score] of Object.entries(sortedScores)) {
                if (fillElements[index]) {
                    fillElements[index].style.width = (score * 100) + '%';
                }
                index++;
            }
        }, 50);
        
        tokensCount.innerHTML = `
            <div>原始字符数: <strong>${tokenizationResult.originalLength}</strong></div>
            <div>清洗后字符数: <strong>${tokenizationResult.cleanedLength}</strong></div>
            <div>Token 数量: <strong>${tokenizationResult.tokens.length}</strong></div>
            <div>移除停用词: <strong>${tokenizationResult.stopWordsRemoved}</strong></div>
        `;
        
        resultSection.classList.remove('hidden');
        
        this.gaugeChart.update(classificationResult);
    }

    getDominantSentiment(result) {
        let maxScore = 0;
        let dominant = 'neutral';
        
        for (const [sentiment, score] of Object.entries(result)) {
            if (score > maxScore) {
                maxScore = score;
                dominant = sentiment;
            }
        }
        
        return dominant;
    }

    getSentimentText(sentiment) {
        const texts = {
            positive: '正面情感',
            negative: '负面情感',
            neutral: '中性情感'
        };
        return texts[sentiment] || '中性情感';
    }

    getSentimentStrength(result) {
        const dominant = this.getDominantSentiment(result);
        const score = result[dominant];
        
        if (score >= 0.8) return '强烈';
        if (score >= 0.6) return '明显';
        if (score >= 0.4) return '中等';
        return '轻微';
    }

    sortSentimentScores(result) {
        const sorted = {};
        const entries = Object.entries(result).sort((a, b) => b[1] - a[1]);
        for (const [key, value] of entries) {
            sorted[key] = value;
        }
        return sorted;
    }

    getSentimentLabelInfo(sentiment) {
        const labels = {
            positive: { label: '正面', icon: '😊' },
            negative: { label: '负面', icon: '😠' },
            neutral: { label: '中性', icon: '😐' }
        };
        return labels[sentiment] || { label: '中性', icon: '😐' };
    }

    clearAll() {
        document.getElementById('textInput').value = '';
        document.getElementById('resultSection').classList.add('hidden');
        this.gaugeChart.clear();
    }

    showLoading() {
        document.getElementById('loadingSection').classList.remove('hidden');
        document.getElementById('resultSection').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loadingSection').classList.add('hidden');
    }
}

let sentimentAnalyzer;

document.addEventListener('DOMContentLoaded', () => {
    sentimentAnalyzer = new SentimentAnalyzer();
});
