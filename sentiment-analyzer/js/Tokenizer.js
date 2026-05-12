class Tokenizer {
    constructor() {
        this.initialized = false;
        this.maxSequenceLength = 512;
        
        this.stopWords = new Set([
            '的', '了', '是', '在', '我', '有', '和', '就', '不', '人',
            '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
            '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '他',
            '啊', '呀', '吧', '呢', '哦', '嗯', '啊', '嘛', '哈', '啦',
            '哎', '喂', '呵', '哼', '嘿', '嘛', '诶',
            '这个', '那个', '什么', '怎么', '为什么', '哪', '谁',
            '能', '可以', '能够', '应该', '必须', '需要',
            '从', '到', '在', '于', '向', '对', '给', '为', '以',
            '把', '被', '将', '让', '使', '比', '跟', '同', '或',
            '的话', '而已', '罢了', '不过', '就是', '只是',
            '吗', '么', '啦', '哟', '啰', '啵', '喽',
            '啊哈', '哎呀', '哎哟', '喔唷', '啧啧',
            'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
            'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
            'i', 'me', 'my', 'mine', 'you', 'your', 'yours', 'he', 'him', 'his',
            'she', 'her', 'hers', 'it', 'its', 'we', 'us', 'our', 'ours',
            'they', 'them', 'their', 'theirs', 'this', 'that', 'these', 'those',
            'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
            'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
            'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
            'very', 'just', 'as', 'at', 'by', 'for', 'from', 'in', 'into', 'of',
            'off', 'on', 'onto', 'out', 'over', 'to', 'up', 'upon', 'with',
            'about', 'above', 'across', 'after', 'against', 'along', 'among',
            'around', 'before', 'behind', 'below', 'beneath', 'beside', 'between',
            'beyond', 'during', 'except', 'inside', 'near', 'outside', 'through',
            'throughout', 'toward', 'under', 'underneath', 'until', 'up', 'upon',
            'with', 'within', 'without',
            'if', 'then', 'else', 'although', 'though', 'while', 'unless',
            'until', 'since', 'because', 'as', 'so', 'that', 'than', 'whether',
            'can', 'cannot', 'could', 'may', 'might', 'must', 'shall', 'should',
            'will', 'would', 'ought',
            'here', 'there', 'where', 'when', 'why', 'how', 'anywhere', 'everywhere',
            'nowhere', 'somewhere', 'anytime', 'everytime', 'sometime',
            'always', 'never', 'sometimes', 'often', 'usually', 'rarely', 'seldom',
            'already', 'yet', 'still', 'just', 'almost', 'nearly', 'hardly',
            'barely', 'scarcely', 'quite', 'rather', 'somewhat', 'enough',
            'oh', 'ah', 'eh', 'uh', 'um', 'er', 'hm', 'ha', 'ho', 'hey',
            'hi', 'hello', 'bye', 'goodbye', 'okay', 'ok', 'yes', 'no',
            'please', 'thank', 'thanks', 'sorry', 'excuse', 'pardon',
            'well', 'now', 'then', 'so', 'thus', 'therefore', 'hence',
            'however', 'moreover', 'furthermore', 'nevertheless', 'nonetheless',
            'besides', 'additionally', 'also', 'too', 'either', 'neither'
        ]);
    }

    async init() {
        this.initialized = true;
        console.log('Tokenizer 初始化完成');
        return true;
    }

    tokenize(text) {
        const originalLength = text.length;
        
        const cleanedText = this.cleanText(text);
        const cleanedLength = cleanedText.length;
        
        const tokens = this.splitIntoTokens(cleanedText);
        
        const filteredTokens = [];
        let stopWordsRemoved = 0;
        
        for (const token of tokens) {
            const lowerToken = token.toLowerCase();
            if (this.isStopWord(lowerToken)) {
                stopWordsRemoved++;
            } else if (token.length > 0) {
                filteredTokens.push(token);
            }
        }
        
        const truncatedTokens = filteredTokens.slice(0, this.maxSequenceLength);
        
        return {
            originalText: text,
            cleanedText: cleanedText,
            originalLength: originalLength,
            cleanedLength: cleanedLength,
            tokens: truncatedTokens,
            stopWordsRemoved: stopWordsRemoved,
            tokenCount: truncatedTokens.length
        };
    }

    cleanText(text) {
        let cleaned = text;
        
        cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, ' ');
        cleaned = cleaned.replace(/@\w+/g, ' ');
        cleaned = cleaned.replace(/#\w+/g, ' ');
        
        cleaned = cleaned.replace(/<[^>]*>/g, ' ');
        
        cleaned = cleaned.replace(/\s+/g, ' ');
        
        cleaned = cleaned.trim();
        
        return cleaned;
    }

    splitIntoTokens(text) {
        const tokens = [];
        
        const patterns = [
            /[\u4e00-\u9fff]/g,
            /[a-zA-Z]+/g,
            /\d+(?:\.\d+)?/g,
            /[^\s\w\u4e00-\u9fff]/g
        ];
        
        let remaining = text;
        let hasMore = true;
        
        while (hasMore && remaining.length > 0) {
            let earliestMatch = null;
            let matchedPattern = null;
            
            for (const pattern of patterns) {
                pattern.lastIndex = 0;
                const match = pattern.exec(remaining);
                if (match && match.index === 0) {
                    earliestMatch = match[0];
                    matchedPattern = pattern;
                    break;
                }
            }
            
            if (earliestMatch) {
                if (earliestMatch.trim().length > 0) {
                    tokens.push(earliestMatch);
                }
                remaining = remaining.slice(earliestMatch.length);
            } else {
                hasMore = false;
            }
        }
        
        return tokens;
    }

    isStopWord(token) {
        return this.stopWords.has(token.toLowerCase());
    }

    addStopWord(word) {
        this.stopWords.add(word.toLowerCase());
    }

    removeStopWord(word) {
        this.stopWords.delete(word.toLowerCase());
    }

    setMaxSequenceLength(length) {
        this.maxSequenceLength = length;
    }

    getVocabSize() {
        return this.stopWords.size;
    }
}
