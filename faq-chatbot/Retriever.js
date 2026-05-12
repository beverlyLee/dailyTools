export class Retriever {
    constructor(indexer) {
        this.indexer = indexer;
    }

    retrieve(query, topK = 3) {
        const results = this.indexer.search(query, topK);
        
        if (results.length === 0) {
            return {
                query: query,
                results: [],
                bestMatch: null,
                confidence: 0
            };
        }
        
        const bestMatch = results[0];
        
        return {
            query: query,
            results: results,
            bestMatch: bestMatch,
            confidence: bestMatch.confidence
        };
    }

    retrieveWithContext(query, conversationHistory = [], topK = 3) {
        let expandedQuery = query;
        
        if (conversationHistory && conversationHistory.length > 0) {
            const lastUserQuery = this.getLastUserQuery(conversationHistory);
            if (lastUserQuery) {
                expandedQuery = `${lastUserQuery} ${query}`;
            }
        }
        
        return this.retrieve(expandedQuery, topK);
    }

    getLastUserQuery(conversationHistory) {
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
            if (conversationHistory[i].role === 'user') {
                return conversationHistory[i].content;
            }
        }
        return null;
    }

    rerank(results, query) {
        if (results.length <= 1) return results;
        
        const queryTokens = this.tokenize(query);
        
        const scoredResults = results.map(result => {
            let keywordScore = 0;
            const entry = result.entry;
            
            for (const token of queryTokens) {
                for (const question of entry.questions) {
                    if (question.includes(token)) {
                        keywordScore += 1;
                    }
                }
                for (const keyword of entry.keywords) {
                    if (keyword.includes(token)) {
                        keywordScore += 0.5;
                    }
                }
            }
            
            const finalScore = result.confidence + (keywordScore * 0.1);
            
            return {
                ...result,
                rerankedScore: finalScore
            };
        });
        
        scoredResults.sort((a, b) => b.rerankedScore - a.rerankedScore);
        
        return scoredResults.map(r => ({
            entry: r.entry,
            score: r.score,
            confidence: r.rerankedScore
        }));
    }

    tokenize(text) {
        const cleaned = text
            .toLowerCase()
            .replace(/[，。！？、；：""''（）【】《》\n\r\t]/g, ' ')
            .replace(/[!?,;:\-()\[\]{}<>]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        return cleaned.split(' ').filter(word => word && word.length >= 2);
    }

    isGreeting(query) {
        const greetings = [
            '你好', '您好', '嗨', 'hi', 'hello', '在吗', '有人吗',
            '你好呀', '您好呀', '哈喽', 'hey', 'hola'
        ];
        
        const lowerQuery = query.toLowerCase().trim();
        
        for (const greeting of greetings) {
            if (lowerQuery === greeting || lowerQuery.includes(greeting)) {
                return true;
            }
        }
        
        return false;
    }
}
