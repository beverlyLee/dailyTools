class TextRank {
    constructor(options = {}) {
        this.dampingFactor = options.dampingFactor || 0.85;
        this.maxIterations = options.maxIterations || 100;
        this.tolerance = options.tolerance || 0.0001;
        this.windowSize = options.windowSize || 4;
        
        this.domainKeywords = new Set([
            '闪退', '崩溃', '退出', '关闭', '终止', '卡住', '无响应', '停止运行',
            '卡', '卡顿', '慢', '延迟', '等待', '加载', '转圈', '响应', '迟钝', '速度',
            '太卡了', '卡爆了', '卡得要死', '卡死了', '太卡', '很慢', '太慢', '加载慢', '不流畅',
            '广告', '推广', '弹窗', '开屏', '插播', '强制看广告',
            '广告太多', '满屏广告', '广告软件', '广告多', '弹窗广告', '开屏广告',
            '客服', '售后', '反馈', '工单', '人工', '机器人', '回复', '态度',
            '客服差', '客服烂', '没人管', '不理人', '联系不上', '态度恶劣',
            'UI', '界面', '设计', '好看', '简洁', '清爽', '漂亮', '现代化', '深色模式',
            '新UI', '新界面', 'UI好看', '界面好看', '设计不错', 'UI设计',
            'bug', 'Bug', 'BUG', '修复', '适配',
            '更新', '升级', '版本', '新版本', '老版本',
            '用户', '体验', '功能', '使用', '推荐', '好评', '差评', '垃圾',
            '失望', '满意', '舒服', '流畅', '方便', '专业', '简洁', '漂亮',
            '好用', '不好用', '喜欢', '讨厌', '赞', '棒', '差', '烂',
            '速度', '效率', '稳定', '不稳定', '更新', '升级', '卸载',
            '登录', '启动', '打开', '使用', '操作', '响应', '问题', '解决',
            '疯狂闪退', '频繁闪退', '总是闪退', '打开就退', '启动就退',
            'iOS', 'iPhone', 'Android', '安卓'
        ]);
        
        this.positiveWords = new Set([
            '好', '棒', '赞', '优秀', '不错', '完美', '满意', '舒服',
            '流畅', '好用', '方便', '简洁', '漂亮', '爽', '推荐', '五星',
            '好评', '实用', '强大', '给力', '超赞', '点赞', '贴心', '专业',
            '喜欢', '爱', '欣赏', '认可', '肯定', '支持', '感谢', '开心',
            '惊喜', '惊艳', '出色', '卓越', '一流', '顶级', '优质', '良心',
            '值', '值得', '划算', '超值', '用心', '细致', '耐心', '及时',
            '快速', '迅速', '高效', '稳定', '顺畅', '灵活', '智能', '人性化',
            '很好', '非常好', '特别好', '相当好', '太好了', '超级好',
            '很棒', '非常棒', '特别棒', '太棒了', '很赞', '非常赞', '特别赞',
            '很不错', '真不错', '相当不错', '很满意', '非常满意', '特别满意', '超满意',
            '很好用', '非常好用', '特别好用', '真好用', '很方便', '非常方便', '特别方便',
            '很舒服', '非常舒服', '特别舒服', '很流畅', '非常流畅', '特别流畅',
            '很喜欢', '非常喜欢', '特别喜欢', '超喜欢', '强烈推荐', '真心推荐',
            '客服好', '服务好', '态度好', '回复快', '回复及时',
            '设计不错', '界面好看', 'UI好看', '体验好', '体验不错'
        ]);
        
        this.negativeWords = new Set([
            '差', '烂', '垃圾', '坏', '讨厌', '烦', '崩溃', '闪退', '卡', '慢',
            '糟', '坑', '骗', '失望', '生气', '愤怒', '吐槽', '卸载',
            '恶劣', '后悔', '可惜', '遗憾', '恶心', '渣', '屎',
            '坑人', '骗人', '忽悠', '不值', '亏', '浪费',
            '不好', '很差', '太差', '很不好', '非常差', '特别差',
            '不好用', '很难用', '太不好用', '一点不好用',
            '很烂', '非常烂', '特别烂', '太烂了',
            '太垃圾', '真垃圾', '垃圾软件', '很失望', '非常失望', '特别失望', '太失望',
            '很生气', '非常生气', '特别生气', '气死我了',
            '很卡', '非常卡', '特别卡', '卡死了', '卡爆了', '卡得要死',
            '很慢', '非常慢', '特别慢', '太慢了', '广告太多', '广告多', '太多广告',
            '客服差', '态度差', '态度恶劣', '不理人', '没人管',
            '联系不上', '找不到人', '没人回复', '越更新越差', '越升级越烂',
            '后悔买了', '后悔用了', '后悔下载', '浪费时间', '浪费钱', '浪费精力',
            '恶心人', '太恶心', '真恶心', '想卸载', '准备卸载', '已卸载',
            '不好看', '很丑', '太丑了', '设计不合理', '体验差', '体验很差', '体验不好',
            '没解决', '没修复', '没处理', '没人管'
        ]);
    }

    computeSimilarity(sentence1, sentence2) {
        const words1 = this.getWords(sentence1);
        const words2 = this.getWords(sentence2);
        
        if (words1.length === 0 || words2.length === 0) {
            return 0;
        }
        
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        let commonWeight = 0;
        let totalWeight1 = 0;
        let totalWeight2 = 0;
        
        for (const word of set1) {
            const weight = this._getWordWeight(word);
            totalWeight1 += weight;
            if (set2.has(word)) {
                commonWeight += weight;
            }
        }
        
        for (const word of set2) {
            totalWeight2 += this._getWordWeight(word);
        }
        
        if (commonWeight === 0) {
            return 0;
        }
        
        return commonWeight / Math.max(Math.sqrt(totalWeight1 * totalWeight2), 1);
    }

    _getWordWeight(word) {
        if (this.domainKeywords.has(word)) {
            return 3.0;
        }
        if (this.positiveWords.has(word) || this.negativeWords.has(word)) {
            return 2.0;
        }
        if (word.length >= 2 && /[\u4e00-\u9fa5]/.test(word)) {
            return 1.5;
        }
        if (/^[a-zA-Z]{2,}$/.test(word)) {
            return 1.5;
        }
        return 0.5;
    }

    computeJaccardSimilarity(sentence1, sentence2) {
        const words1 = this.getWords(sentence1);
        const words2 = this.getWords(sentence2);
        
        if (words1.length === 0 || words2.length === 0) {
            return 0;
        }
        
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        let intersection = 0;
        const union = new Set([...set1, ...set2]);
        
        for (const word of set1) {
            if (set2.has(word)) {
                intersection++;
            }
        }
        
        return intersection / union.size;
    }

    computeCosineSimilarity(sentence1, sentence2) {
        const vector1 = this.getWordVector(sentence1);
        const vector2 = this.getWordVector(sentence2);
        
        const allWords = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
        
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        
        for (const word of allWords) {
            const v1 = vector1[word] || 0;
            const v2 = vector2[word] || 0;
            
            dotProduct += v1 * v2;
            magnitude1 += v1 * v1;
            magnitude2 += v2 * v2;
        }
        
        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        
        return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
    }

    getWords(sentence) {
        const text = typeof sentence === 'object' ? sentence.text : sentence;
        return this._extractMeaningfulWords(text);
    }

    _extractMeaningfulWords(text) {
        const words = [];
        const stopwords = new Set([
            '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
            '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
            '自己', '这', '那', '还', '跟', '个', '我们', '能', '吗', '呢', '啊', '吧', '呀',
            '哦', '嘛', '给', '让', '被', '把', '哪', '什么', '怎么', '为什么',
            '多', '少', '大', '小', '太', '真', '最', '更', '比较', '挺', '蛮', '非常',
            '特别', '十分', '格外', '尤其', 'app', '软件', '应用', '这个', '那个',
            '它', '他', '她', '们', '啦', '哦', '呢', '吧', '啊', '吗', '呀',
            '可以', '能够', '应该', '需要', '可能', '已经', '正在', '以后',
            '这个', '那个', '什么', '怎么', '为什么', '还有', '而且', '但是',
            '因为', '所以', '如果', '虽然', '不过', '其实', '真的', '还是',
            '太', '真', '很', '非常', '特别', '十分', '格外', '尤其', '比较',
            'app', '软件', '应用', '这个', '那个', '它', '他', '她', '们'
        ]);

        const lowerText = text.toLowerCase();
        
        for (const kw of this.domainKeywords) {
            if (lowerText.includes(kw.toLowerCase())) {
                words.push(kw);
            }
        }
        
        for (const kw of this.positiveWords) {
            if (lowerText.includes(kw.toLowerCase())) {
                words.push(kw);
            }
        }
        
        for (const kw of this.negativeWords) {
            if (lowerText.includes(kw.toLowerCase())) {
                words.push(kw);
            }
        }

        let i = 0;
        while (i < text.length) {
            const char = text[i];
            
            if (/[\u4e00-\u9fa5]/.test(char)) {
                if (!stopwords.has(char)) {
                    words.push(char);
                }
                i++;
            } else if (/[a-zA-Z]/.test(char)) {
                let word = '';
                while (i < text.length && /[a-zA-Z0-9]/.test(text[i])) {
                    word += text[i];
                    i++;
                }
                const lowerWord = word.toLowerCase();
                if (word.length >= 2 && !stopwords.has(lowerWord)) {
                    words.push(lowerWord);
                }
            } else if (/[0-9]/.test(char)) {
                let num = '';
                while (i < text.length && /[0-9]/.test(text[i])) {
                    num += text[i];
                    i++;
                }
                if (num.length >= 2) {
                    words.push(num);
                }
            } else {
                i++;
            }
        }

        return [...new Set(words)];
    }

    getWordVector(sentence) {
        const words = this.getWords(sentence);
        const vector = {};
        
        for (const word of words) {
            vector[word] = (vector[word] || 0) + 1;
        }
        
        return vector;
    }

    buildGraph(sentences) {
        const n = sentences.length;
        const graph = [];
        
        for (let i = 0; i < n; i++) {
            graph[i] = [];
            for (let j = 0; j < n; j++) {
                if (i === j) {
                    graph[i][j] = 0;
                } else {
                    const similarity = this.computeSimilarity(sentences[i], sentences[j]);
                    graph[i][j] = similarity;
                }
            }
        }
        
        return graph;
    }

    pageRank(graph, sentences) {
        const n = sentences.length;
        if (n === 0) return [];
        
        let scores = new Array(n).fill(1.0 / n);
        let prevScores = new Array(n).fill(0);
        
        const outlinks = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (graph[i][j] > 0) {
                    outlinks[i]++;
                }
            }
        }
        
        for (let iteration = 0; iteration < this.maxIterations; iteration++) {
            for (let i = 0; i < n; i++) {
                let sum = 0;
                for (let j = 0; j < n; j++) {
                    if (graph[j][i] > 0 && outlinks[j] > 0) {
                        sum += scores[j] * graph[j][i] / outlinks[j];
                    }
                }
                scores[i] = (1 - this.dampingFactor) / n + this.dampingFactor * sum;
            }
            
            let diff = 0;
            for (let i = 0; i < n; i++) {
                diff += Math.abs(scores[i] - prevScores[i]);
            }
            
            if (diff < this.tolerance) {
                break;
            }
            
            prevScores = [...scores];
        }
        
        const scoredSentences = sentences.map((sentence, index) => ({
            ...sentence,
            score: scores[index],
            index: index
        }));
        
        return scoredSentences.sort((a, b) => b.score - a.score);
    }

    rankSentences(sentences) {
        if (!Array.isArray(sentences)) {
            console.warn('TextRank.rankSentences: 输入 sentences 不是数组，返回空数组');
            return [];
        }
        
        if (sentences.length === 0) {
            return [];
        }
        
        const graph = this.buildGraph(sentences);
        return this.pageRank(graph, sentences);
    }

    extractKeywords(sentences, topN = 10) {
        if (!Array.isArray(sentences)) {
            console.warn('TextRank.extractKeywords: 输入 sentences 不是数组，返回空数组');
            return [];
        }
        
        const wordFreq = {};
        const wordScore = {};
        const docFreq = {};
        const totalDocs = sentences.length;
        
        for (const sentence of sentences) {
            const words = this.getWords(sentence.text || sentence);
            const seenInDoc = new Set();
            
            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                
                if (!this._isValidKeyword(word)) continue;
                
                if (!seenInDoc.has(word)) {
                    docFreq[word] = (docFreq[word] || 0) + 1;
                    seenInDoc.add(word);
                }
                
                wordFreq[word] = (wordFreq[word] || 0) + 1;
                
                const start = Math.max(0, i - this.windowSize);
                const end = Math.min(words.length, i + this.windowSize + 1);
                
                for (let j = start; j < end; j++) {
                    if (i !== j) {
                        const otherWord = words[j];
                        if (!this._isValidKeyword(otherWord)) continue;
                        
                        if (!wordScore[word]) wordScore[word] = {};
                        wordScore[word][otherWord] = (wordScore[word][otherWord] || 0) + 1;
                    }
                }
            }
        }
        
        let scores = {};
        for (const word in wordFreq) {
            scores[word] = 1.0;
        }
        
        for (let iteration = 0; iteration < 30; iteration++) {
            const newScores = {};
            
            for (const word in wordFreq) {
                let sum = 0;
                if (wordScore[word]) {
                    for (const otherWord in wordScore[word]) {
                        const weight = wordScore[word][otherWord];
                        const degree = Object.keys(wordScore[otherWord] || {}).reduce(
                            (sum, w) => sum + (wordScore[otherWord][w] || 0), 0
                        );
                        if (degree > 0) {
                            sum += weight / degree * (scores[otherWord] || 0);
                        }
                    }
                }
                newScores[word] = (1 - this.dampingFactor) + this.dampingFactor * sum;
            }
            
            scores = newScores;
        }
        
        const tfidfEnhanced = [];
        for (const [word, score] of Object.entries(scores)) {
            const df = docFreq[word] || 1;
            const tf = wordFreq[word] || 1;
            const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
            const tfidf = tf * idf;
            
            let finalScore = score * 0.6 + tfidf * 0.4;
            
            if (this.domainKeywords.has(word)) {
                finalScore *= 2.0;
            }
            
            if (this.positiveWords.has(word) || this.negativeWords.has(word)) {
                finalScore *= 1.5;
            }
            
            tfidfEnhanced.push({ word, score: finalScore });
        }
        
        tfidfEnhanced.sort((a, b) => b.score - a.score);
        
        const deduplicated = [];
        const seen = new Set();
        
        for (const item of tfidfEnhanced) {
            let isRedundant = false;
            for (const existing of deduplicated) {
                if (existing.word.includes(item.word) || item.word.includes(existing.word)) {
                    isRedundant = true;
                    break;
                }
            }
            
            if (!isRedundant && !seen.has(item.word)) {
                deduplicated.push(item);
                seen.add(item.word);
            }
            
            if (deduplicated.length >= topN) break;
        }
        
        return deduplicated.slice(0, topN);
    }

    _isValidKeyword(word) {
        if (!word) return false;
        if (word.length < 2) return false;
        if (word.length > 10) return false;
        
        const stopPhrases = new Set([
            '这个', '那个', '什么', '怎么', '为什么', '还有', '而且', '但是',
            '因为', '所以', '如果', '虽然', '不过', '其实', '真的', '还是',
            '可以', '能够', '应该', '需要', '可能', '已经', '正在', '以后',
            'app', '软件', '应用', '这个', '那个', '一个', '一些', '一下'
        ]);
        
        if (stopPhrases.has(word.toLowerCase())) return false;
        
        if (/^[0-9]+$/.test(word)) return false;
        
        return true;
    }
}

window.TextRank = TextRank;
