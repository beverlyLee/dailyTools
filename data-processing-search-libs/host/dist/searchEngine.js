"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchEngine = void 0;
class SearchEngine {
    constructor(wasmModule, defaultSortMethod = 'bm25') {
        this.wasmModule = wasmModule;
        this.defaultSortMethod = defaultSortMethod;
        this.engine = null;
    }
    async init() {
        if (this.wasmModule) {
            if (typeof this.wasmModule === 'function') {
                await this.wasmModule();
            }
            if (this.wasmModule && this.wasmModule.WasmSearchEngine) {
                this.engine = new this.wasmModule.WasmSearchEngine();
            }
        }
        if (!this.engine) {
            console.warn('WASM module not loaded, using fallback implementation');
            this.engine = new FallbackSearchEngine();
        }
    }
    addDocument(doc) {
        if (!this.engine) {
            throw new Error('Search engine not initialized. Call init() first.');
        }
        const docToAdd = {
            id: doc.id || 0,
            title: doc.title || '',
            content: doc.content || '',
            fields: doc.fields || {}
        };
        return this.engine.add_document(JSON.stringify(docToAdd));
    }
    getDocument(docId) {
        if (!this.engine) {
            throw new Error('Search engine not initialized. Call init() first.');
        }
        const result = this.engine.get_document(docId);
        if (!result) {
            return null;
        }
        return JSON.parse(result);
    }
    updateDocument(docId, doc) {
        if (!this.engine) {
            throw new Error('Search engine not initialized. Call init() first.');
        }
        const existingDoc = this.getDocument(docId);
        if (!existingDoc) {
            return false;
        }
        const updatedDoc = {
            ...existingDoc,
            ...doc,
            id: docId
        };
        return this.engine.update_document(docId, JSON.stringify(updatedDoc));
    }
    deleteDocument(docId) {
        if (!this.engine) {
            throw new Error('Search engine not initialized. Call init() first.');
        }
        return this.engine.delete_document(docId);
    }
    search(query, options = {}) {
        if (!this.engine) {
            throw new Error('Search engine not initialized. Call init() first.');
        }
        const sortMethod = options.sortMethod || this.defaultSortMethod;
        const useBm25 = sortMethod === 'bm25';
        const result = this.engine.search(query, useBm25);
        let results = JSON.parse(result);
        if (options.limit !== undefined) {
            results = results.slice(0, options.limit);
        }
        return results;
    }
    tokenize(text) {
        if (!this.engine) {
            throw new Error('Search engine not initialized. Call init() first.');
        }
        const result = this.engine.tokenize(text);
        return JSON.parse(result);
    }
    addDocuments(docs) {
        return docs.map(doc => this.addDocument(doc));
    }
    searchWithPagination(query, page = 1, pageSize = 10, options = {}) {
        const allResults = this.search(query, options);
        const total = allResults.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const results = allResults.slice(startIndex, startIndex + pageSize);
        return {
            results,
            total,
            page,
            pageSize,
            totalPages
        };
    }
}
exports.SearchEngine = SearchEngine;
class FallbackSearchEngine {
    constructor() {
        this.documents = new Map();
        this.invertedIndex = new Map();
        this.termFrequencies = new Map();
        this.docLengths = new Map();
        this.nextId = 1;
    }
    add_document(docJson) {
        const doc = JSON.parse(docJson);
        const docId = this.nextId++;
        doc.id = docId;
        const fullText = `${doc.title} ${doc.content}`;
        const tokens = this.tokenizeText(fullText);
        const uniqueTokens = new Set(tokens);
        const tfMap = new Map();
        for (const token of tokens) {
            tfMap.set(token, (tfMap.get(token) || 0) + 1);
        }
        this.documents.set(docId, doc);
        this.termFrequencies.set(docId, tfMap);
        this.docLengths.set(docId, tokens.length);
        for (const token of uniqueTokens) {
            if (!this.invertedIndex.has(token)) {
                this.invertedIndex.set(token, new Set());
            }
            this.invertedIndex.get(token).add(docId);
        }
        return docId;
    }
    get_document(docId) {
        const doc = this.documents.get(docId);
        if (!doc) {
            return '';
        }
        return JSON.stringify(doc);
    }
    update_document(docId, docJson) {
        if (!this.documents.has(docId)) {
            return false;
        }
        const tfMap = this.termFrequencies.get(docId);
        if (tfMap) {
            for (const term of tfMap.keys()) {
                const docs = this.invertedIndex.get(term);
                if (docs) {
                    docs.delete(docId);
                    if (docs.size === 0) {
                        this.invertedIndex.delete(term);
                    }
                }
            }
        }
        const doc = JSON.parse(docJson);
        const fullText = `${doc.title} ${doc.content}`;
        const tokens = this.tokenizeText(fullText);
        const uniqueTokens = new Set(tokens);
        const newTfMap = new Map();
        for (const token of tokens) {
            newTfMap.set(token, (newTfMap.get(token) || 0) + 1);
        }
        this.documents.set(docId, doc);
        this.termFrequencies.set(docId, newTfMap);
        this.docLengths.set(docId, tokens.length);
        for (const token of uniqueTokens) {
            if (!this.invertedIndex.has(token)) {
                this.invertedIndex.set(token, new Set());
            }
            this.invertedIndex.get(token).add(docId);
        }
        return true;
    }
    delete_document(docId) {
        if (!this.documents.has(docId)) {
            return false;
        }
        const tfMap = this.termFrequencies.get(docId);
        if (tfMap) {
            for (const term of tfMap.keys()) {
                const docs = this.invertedIndex.get(term);
                if (docs) {
                    docs.delete(docId);
                    if (docs.size === 0) {
                        this.invertedIndex.delete(term);
                    }
                }
            }
        }
        this.documents.delete(docId);
        this.termFrequencies.delete(docId);
        this.docLengths.delete(docId);
        return true;
    }
    search(query, useBm25) {
        const queryTerms = this.tokenizeText(query);
        const candidateDocs = new Set();
        for (const term of queryTerms) {
            const docs = this.invertedIndex.get(term);
            if (docs) {
                for (const docId of docs) {
                    candidateDocs.add(docId);
                }
            }
        }
        const results = [];
        const totalDocs = this.documents.size;
        for (const docId of candidateDocs) {
            let score = 0;
            if (useBm25) {
                score = this.calculateBM25(docId, queryTerms, totalDocs);
            }
            else {
                score = this.calculateTFIDF(docId, queryTerms, totalDocs);
            }
            if (score > 0) {
                const snippet = this.generateSnippet(docId, queryTerms);
                results.push({
                    doc_id: docId,
                    score,
                    snippet
                });
            }
        }
        results.sort((a, b) => b.score - a.score);
        return JSON.stringify(results);
    }
    tokenize(text) {
        return JSON.stringify(this.tokenizeText(text));
    }
    tokenizeText(text) {
        const tokens = [];
        const regex = /[\u4e00-\u9fa5]+|[a-zA-Z0-9]+/g;
        let match;
        while ((match = regex.exec(text.toLowerCase())) !== null) {
            tokens.push(match[0]);
        }
        return tokens;
    }
    calculateTFIDF(docId, terms, totalDocs) {
        let score = 0;
        const tfMap = this.termFrequencies.get(docId);
        if (!tfMap)
            return 0;
        for (const term of terms) {
            const tf = tfMap.get(term) || 0;
            const df = this.invertedIndex.get(term)?.size || 0;
            if (tf > 0 && df > 0) {
                const idf = Math.log((totalDocs + 1) / (df + 1));
                score += tf * idf;
            }
        }
        return score;
    }
    calculateBM25(docId, terms, totalDocs) {
        const k1 = 1.2;
        const b = 0.75;
        const avgDocLength = Array.from(this.docLengths.values()).reduce((a, b) => a + b, 0) /
            Math.max(1, this.docLengths.size);
        const docLength = this.docLengths.get(docId) || 0;
        const tfMap = this.termFrequencies.get(docId);
        if (!tfMap)
            return 0;
        let score = 0;
        for (const term of terms) {
            const df = this.invertedIndex.get(term)?.size || 0;
            if (df === 0)
                continue;
            const tf = tfMap.get(term) || 0;
            if (tf === 0)
                continue;
            const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
            const norm = k1 * ((1 - b) + b * (docLength / avgDocLength));
            const tfPart = ((k1 + 1) * tf) / (norm + tf);
            score += idf * tfPart;
        }
        return score;
    }
    generateSnippet(docId, terms) {
        const doc = this.documents.get(docId);
        if (!doc)
            return '';
        const text = `${doc.title} ${doc.content}`;
        const termSet = new Set(terms);
        let snippet = text;
        for (const term of terms) {
            const regex = new RegExp(term, 'gi');
            snippet = snippet.replace(regex, `[${term}]`);
        }
        if (snippet.length > 200) {
            return snippet.substring(0, 200) + '...';
        }
        return snippet;
    }
}
