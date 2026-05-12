class ReviewInsightsApp {
    constructor() {
        this.sentenceSplitter = new SentenceSplitter();
        this.textRank = new TextRank();
        this.topicClusterer = new TopicClusterer();
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.showEmptyState();
    }

    bindEvents() {
        const reviewInput = document.getElementById('reviewInput');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const loadSample = document.getElementById('loadSample');
        const clearInput = document.getElementById('clearInput');
        const clusterCount = document.getElementById('clusterCount');

        reviewInput.addEventListener('input', () => this.updateStats());
        
        analyzeBtn.addEventListener('click', () => this.analyze());
        
        loadSample.addEventListener('click', () => this.loadSampleData());
        
        clearInput.addEventListener('click', () => this.clearInput());
        
        clusterCount.addEventListener('change', () => {
            const input = reviewInput.value.trim();
            if (input) {
                this.analyze();
            }
        });
    }

    updateStats() {
        const input = document.getElementById('reviewInput').value;
        const lines = input.split('\n').filter(line => line.trim().length > 0);
        
        document.getElementById('reviewCount').textContent = lines.length;
        document.getElementById('charCount').textContent = input.length;
    }

    loadSampleData() {
        const sampleText = window.sampleReviews.join('\n');
        document.getElementById('reviewInput').value = sampleText;
        this.updateStats();
    }

    clearInput() {
        document.getElementById('reviewInput').value = '';
        this.updateStats();
        this.showEmptyState();
    }

    showEmptyState() {
        const results = document.getElementById('results');
        results.innerHTML = `
            <div class="empty-state">
                <h3>📊 等待分析</h3>
                <p>请在上方输入框中粘贴评论内容，然后点击"开始分析"</p>
                <p style="margin-top: 10px; font-size: 14px;">或者点击"加载示例评论"按钮体验功能</p>
            </div>
        `;
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').innerHTML = '';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    async analyze() {
        const input = document.getElementById('reviewInput').value.trim();
        
        if (!input) {
            alert('请输入评论内容');
            return;
        }

        this.showLoading();

        setTimeout(() => {
            try {
                const reviews = input.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                if (reviews.length === 0) {
                    this.hideLoading();
                    this.showEmptyState();
                    return;
                }

                const clusterCount = parseInt(document.getElementById('clusterCount').value);
                
                const splitResult = this.sentenceSplitter.splitMultipleReviews(reviews);
                const sentences = splitResult && Array.isArray(splitResult.sentences) ? splitResult.sentences : [];
                
                if (!Array.isArray(sentences) || sentences.length === 0) {
                    this.hideLoading();
                    alert('未能从评论中提取有效句子');
                    return;
                }

                const clusters = this.topicClusterer.cluster(sentences, clusterCount);
                
                this.displayResults(clusters, reviews.length, sentences.length);
            } catch (error) {
                console.error('分析出错:', error);
                alert('分析过程中出错，请重试');
            }
            
            this.hideLoading();
        }, 100);
    }

    displayResults(clusters, reviewCount, sentenceCount) {
        const results = document.getElementById('results');
        
        if (clusters.length === 0) {
            this.showEmptyState();
            return;
        }

        let html = `<div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 8px;">
            <p style="color: #64748b; font-size: 14px;">
                共分析了 <strong>${reviewCount}</strong> 条评论，提取出 <strong>${sentenceCount}</strong> 个有效句子，聚类为 <strong>${clusters.length}</strong> 个主题
            </p>
        </div>`;

        for (let i = 0; i < clusters.length; i++) {
            const cluster = clusters[i];
            const summary = this.topicClusterer.generateSummary(cluster);
            const keywords = this.topicClusterer.extractTopicKeywords(cluster, 5);
            const sentiment = this.topicClusterer.getClusterSentiment(cluster);
            const title = this.topicClusterer.getTopicTitle(cluster);

            const sentimentLabel = sentiment === 'positive' ? '正面' : 
                                   sentiment === 'negative' ? '负面' : '中性';
            const sentimentClass = sentiment === 'positive' ? 'positive' : 
                                   sentiment === 'negative' ? 'negative' : 'neutral';

            html += `
                <div class="topic-card">
                    <div class="topic-header">
                        <span class="topic-title">${i + 1}. ${title}</span>
                        <span class="topic-size">${cluster.size} 条观点</span>
                    </div>
                    
                    <div class="topic-summary">
                        <strong>核心观点：</strong>${summary}
                        <span style="margin-left: 10px; font-size: 12px; padding: 2px 8px; border-radius: 4px; background: ${this.getSentimentColor(sentiment)}; color: white;">${sentimentLabel}</span>
                    </div>
                    
                    <div class="topic-keywords">
                        ${keywords.map(k => `<span class="keyword-tag">${k.word}</span>`).join('')}
                    </div>
                    
                    <div class="topic-sentences">
                        ${cluster.sentences.slice(0, 8).map(s => `
                            <div class="sentence-item">${s.text}</div>
                        `).join('')}
                        ${cluster.sentences.length > 8 ? `<div style="text-align: center; color: #94a3b8; font-size: 13px; margin-top: 10px;">... 还有 ${cluster.sentences.length - 8} 条类似观点</div>` : ''}
                    </div>
                </div>
            `;
        }

        results.innerHTML = html;
    }

    getSentimentColor(sentiment) {
        switch (sentiment) {
            case 'positive': return '#10b981';
            case 'negative': return '#ef4444';
            default: return '#6b7280';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ReviewInsightsApp();
});
