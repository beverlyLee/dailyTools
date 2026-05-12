export class Indexer {
    constructor(knowledgeBase) {
        this.knowledgeBase = knowledgeBase;
        this.indexedData = [];
        this.fuse = null;
        this.stopWords = new Set([
            '的', '了', '和', '是', '在', '我', '有', '就', '不', '人', '都', '一', '一个',
            '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
            '自己', '这', '那', '这是', '那是', '怎么', '如何', '什么', '为什么', '怎么办',
            '吗', '呢', '啊', '吧', '呀', '哦', '嗯', '哈', '啦', '嘛', '呗', '哦', '恩',
            '可以', '能够', '应该', '需要', '想要', '想', '要', '会', '能', '应该',
            '请问', '请问一下', '请问你', '我想', '我想知道', '我想问', '我想请问',
            '一下', '一个', '一下', '一下下', '有点', '一些', '一点', '一点点',
            '请', '您', '你', '他', '她', '它', '们', '这个', '那个', '这些', '那些',
            '吗？', '呢？', '啊？', '吧？', '呀？', '？', '？？', '？？？'
        ]);
    }

    init() {
        this.buildIndex();
        this.initFuse();
        console.log('[Indexer] 索引构建完成');
    }

    buildIndex() {
        this.indexedData = [];
        
        for (const entry of this.knowledgeBase.entries) {
            const allTexts = [];
            
            for (const question of entry.questions) {
                allTexts.push(this.tokenize(question));
            }
            
            for (const keyword of entry.keywords) {
                allTexts.push(this.tokenize(keyword));
            }
            
            for (const step of entry.answer.steps) {
                allTexts.push(this.tokenize(step));
            }
            
            this.indexedData.push({
                id: entry.id,
                entry: entry,
                tokens: allTexts,
                category: entry.category
            });
        }
    }

    initFuse() {
        const fuseData = [];
        
        for (const entry of this.knowledgeBase.entries) {
            for (const question of entry.questions) {
                fuseData.push({
                    id: entry.id,
                    text: question,
                    entry: entry
                });
            }
            
            for (const keyword of entry.keywords) {
                fuseData.push({
                    id: entry.id,
                    text: keyword,
                    entry: entry
                });
            }
        }
        
        const options = {
            keys: ['text'],
            includeScore: true,
            threshold: 0.4,
            ignoreLocation: true,
            ignoreFieldNorm: true,
            minMatchCharLength: 2,
            useExtendedSearch: true,
            tokenize: true,
            matchAllTokens: false
        };
        
        this.fuse = new Fuse(fuseData, options);
    }

    tokenize(text) {
        const cleaned = text
            .toLowerCase()
            .replace(/[，。！？、；：""''（）【】《》\n\r\t]/g, ' ')
            .replace(/[!?,;:\-()\[\]{}<>]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        const tokens = [];
        const words = cleaned.split(' ');
        
        for (const word of words) {
            if (!word || word.length < 2) continue;
            if (this.stopWords.has(word)) continue;
            tokens.push(word);
        }
        
        return tokens;
    }

    search(query, topK = 3) {
        if (!this.fuse) {
            return [];
        }
        
        const results = this.fuse.search(query);
        const seenIds = new Set();
        const uniqueResults = [];
        
        for (const result of results) {
            if (!seenIds.has(result.item.id)) {
                seenIds.add(result.item.id);
                uniqueResults.push({
                    entry: result.item.entry,
                    score: result.score,
                    confidence: Math.max(0, 1 - result.score)
                });
            }
            if (uniqueResults.length >= topK) break;
        }
        
        return uniqueResults;
    }

    getIndexedData() {
        return this.indexedData;
    }

    getCategories() {
        const categories = new Set();
        for (const entry of this.knowledgeBase.entries) {
            categories.add(entry.category);
        }
        return Array.from(categories);
    }
}
