export class ContentFeature {
    constructor() {
        this.stopWords = new Set([
            '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
            '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
            '自己', '这', '那', '他', '她', '它', '们', '被', '把', '让', '给', '来', '出来',
            '从', '到', '与', '及', '等', '以', '于', '之', '而', '或', '但', '还', '能',
            '将', '已', '曾', '正', '正', '个', '种', '各', '些', '每', '各', '中', '内',
            '外', '前', '后', '左', '右', '上', '下', '间', '时', '年', '月', '日', '天',
            '今年', '去年', '明年', '今天', '昨天', '明天', '上午', '下午', '晚上',
            '可以', '可能', '应该', '必须', '一定', '需要', '已经', '正在', '即将'
        ]);
    }

    extractFeatures(news) {
        return {
            id: news.id,
            category: news.category,
            tags: news.tags || [],
            titleKeywords: this.extractKeywords(news.title),
            contentKeywords: this.extractKeywords(news.content),
            featureVector: this.buildFeatureVector(news)
        };
    }

    extractKeywords(text, topN = 10) {
        if (!text) return [];
        
        const words = this.tokenize(text);
        const wordFreq = {};
        
        for (const word of words) {
            if (!this.stopWords.has(word) && word.length >= 2) {
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        }
        
        const sortedWords = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([word, freq]) => ({ word, freq }));
        
        return sortedWords;
    }

    tokenize(text) {
        const cleaned = text
            .toLowerCase()
            .replace(/[，。！？、；：""''（）【】《》\n\r\t]/g, ' ')
            .replace(/[!?,;:\-()\[\]{}<>\/\\@#$%^&*+=|~`]/g, ' ')
            .replace(/\d+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        const tokens = [];
        const chineseRegex = /[\u4e00-\u9fa5]/g;
        const chineseMatches = cleaned.match(chineseRegex);
        
        if (chineseMatches) {
            for (let i = 0; i < chineseMatches.length; i++) {
                if (i + 1 < chineseMatches.length) {
                    const bigram = chineseMatches[i] + chineseMatches[i + 1];
                    if (!this.stopWords.has(bigram)) {
                        tokens.push(bigram);
                    }
                }
            }
        }
        
        const englishWords = cleaned.match(/[a-zA-Z]+/g) || [];
        for (const word of englishWords) {
            if (word.length >= 2) {
                tokens.push(word);
            }
        }
        
        return tokens;
    }

    buildFeatureVector(news) {
        const vector = {};
        
        vector[news.category] = 2;
        
        if (news.tags) {
            for (const tag of news.tags) {
                vector[tag] = (vector[tag] || 0) + 1.5;
            }
        }
        
        const titleKeywords = this.extractKeywords(news.title, 5);
        for (const { word } of titleKeywords) {
            vector[word] = (vector[word] || 0) + 1;
        }
        
        const contentKeywords = this.extractKeywords(news.content, 8);
        for (const { word } of contentKeywords) {
            vector[word] = (vector[word] || 0) + 0.5;
        }
        
        return vector;
    }

    extractAllFeatures(newsList) {
        return newsList.map(news => this.extractFeatures(news));
    }
}
