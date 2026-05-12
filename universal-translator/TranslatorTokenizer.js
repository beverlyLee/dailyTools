const PAD_TOKEN = '<pad>';
const UNK_TOKEN = '<unk>';
const BOS_TOKEN = '<s>';
const EOS_TOKEN = '</s>';
const CLS_TOKEN = '<[BOS_never_used_51bce0c785ca2f68081bfa7d91973934]>';
const SEP_TOKEN = '[SEP]';

class TranslatorTokenizer {
    constructor(options = {}) {
        this.vocabPath = options.vocabPath || null;
        this.vocab = {};
        this.invVocab = {};
        this.maxLength = options.maxLength || 512;
        this.padToMaxLength = options.padToMaxLength || false;
        this.lowercase = options.lowercase !== false;
        
        this.specialTokens = {
            [PAD_TOKEN]: 0,
            [UNK_TOKEN]: 1,
            [BOS_TOKEN]: 2,
            [EOS_TOKEN]: 3,
            [CLS_TOKEN]: 4,
            [SEP_TOKEN]: 5
        };
        
        this._initializeVocab();
    }

    _initializeVocab() {
        Object.entries(this.specialTokens).forEach(([token, id]) => {
            this.vocab[token] = id;
            this.invVocab[id] = token;
        });
    }

    setVocab(vocabDict) {
        this.vocab = { ...this.specialTokens };
        this.invVocab = {};
        
        Object.entries(this.specialTokens).forEach(([token, id]) => {
            this.invVocab[id] = token;
        });

        let nextId = Object.keys(this.specialTokens).length;
        for (const [token, id] of Object.entries(vocabDict)) {
            if (!(token in this.vocab)) {
                const finalId = typeof id === 'number' ? id : nextId++;
                this.vocab[token] = finalId;
                this.invVocab[finalId] = token;
            }
        }
    }

    tokenize(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        let processedText = this.lowercase ? text.toLowerCase() : text;
        processedText = this._preprocessText(processedText);
        
        const tokens = [];
        const words = this._splitIntoWords(processedText);

        for (const word of words) {
            if (this.vocab[word]) {
                tokens.push(word);
            } else {
                const subwords = this._subwordTokenize(word);
                tokens.push(...subwords);
            }
        }

        return tokens;
    }

    _preprocessText(text) {
        let processed = text;
        
        processed = processed.replace(/\s+/g, ' ');
        
        processed = processed.replace(/([.,!?;:()\[\]{}"'`])/g, ' $1 ');
        processed = processed.replace(/\s+/g, ' ').trim();
        
        return processed;
    }

    _splitIntoWords(text) {
        const words = [];
        let current = '';
        
        for (const char of text) {
            if (this._isChinese(char) || this._isJapanese(char) || this._isKorean(char)) {
                if (current) {
                    words.push(current);
                    current = '';
                }
                words.push(char);
            } else if (/\s/.test(char)) {
                if (current) {
                    words.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }
        
        if (current) {
            words.push(current);
        }
        
        return words;
    }

    _isChinese(char) {
        return /[\u4e00-\u9fff]/.test(char);
    }

    _isJapanese(char) {
        return /[\u3040-\u309f\u30a0-\u30ff]/.test(char);
    }

    _isKorean(char) {
        return /[\uac00-\ud7af]/.test(char);
    }

    _subwordTokenize(word) {
        const subwords = [];
        let remaining = word;
        let iterations = 0;
        const maxIterations = 100;

        while (remaining.length > 0 && iterations < maxIterations) {
            iterations++;
            let found = false;

            for (let length = remaining.length; length >= 1; length--) {
                const candidate = length === remaining.length 
                    ? remaining 
                    : remaining.slice(0, length) + '##';

                if (this.vocab[candidate]) {
                    subwords.push(candidate);
                    remaining = remaining.slice(length);
                    found = true;
                    break;
                }
            }

            if (!found) {
                subwords.push(UNK_TOKEN);
                remaining = remaining.slice(1);
            }
        }

        return subwords.length > 0 ? subwords : [UNK_TOKEN];
    }

    encode(text, options = {}) {
        const { 
            addSpecialTokens = true, 
            maxLength = this.maxLength,
            truncation = true,
            padding = false,
            returnAttentionMask = true,
            returnTokenTypeIds = false
        } = options;

        const tokens = this.tokenize(text);
        let inputIds = tokens.map(token => this.tokenToId(token));

        if (addSpecialTokens) {
            inputIds = [
                this.tokenToId(BOS_TOKEN),
                ...inputIds,
                this.tokenToId(EOS_TOKEN)
            ];
        }

        if (truncation && inputIds.length > maxLength) {
            inputIds = inputIds.slice(0, maxLength);
        }

        let attentionMask = null;
        if (returnAttentionMask) {
            attentionMask = inputIds.map(() => 1);
        }

        if (padding) {
            const padLength = maxLength - inputIds.length;
            if (padLength > 0) {
                inputIds = [...inputIds, ...Array(padLength).fill(this.tokenToId(PAD_TOKEN))];
                if (attentionMask) {
                    attentionMask = [...attentionMask, ...Array(padLength).fill(0)];
                }
            }
        }

        const result = {
            inputIds,
            tokens: addSpecialTokens ? [BOS_TOKEN, ...tokens, EOS_TOKEN] : tokens
        };

        if (attentionMask) {
            result.attentionMask = attentionMask;
        }

        if (returnTokenTypeIds) {
            result.tokenTypeIds = inputIds.map(() => 0);
        }

        return result;
    }

    decode(ids, options = {}) {
        const { 
            skipSpecialTokens = true, 
            cleanUpTokenizationSpaces = true 
        } = options;

        let tokens = ids.map(id => this.idToToken(id));

        if (skipSpecialTokens) {
            tokens = tokens.filter(token => !this.isSpecialToken(token));
        }

        let text = tokens.join(' ');

        if (cleanUpTokenizationSpaces) {
            text = this._cleanUpText(text);
        }

        return text;
    }

    _cleanUpText(text) {
        let cleaned = text;
        
        cleaned = cleaned.replace(/ ##/g, '');
        cleaned = cleaned.replace(/\s+([.,!?;:()\[\]{}"'`])/g, '$1');
        cleaned = cleaned.replace(/([({])\s+/g, '$1');
        cleaned = cleaned.replace(/\s+([)\]}])/g, '$1');
        cleaned = cleaned.replace(/\s+'/g, "'");
        cleaned = cleaned.replace(/'\s+/g, "'");
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        return cleaned;
    }

    tokenToId(token) {
        return this.vocab[token] !== undefined ? this.vocab[token] : this.vocab[UNK_TOKEN];
    }

    idToToken(id) {
        return this.invVocab[id] !== undefined ? this.invVocab[id] : UNK_TOKEN;
    }

    isSpecialToken(token) {
        return token in this.specialTokens;
    }

    getVocabSize() {
        return Object.keys(this.vocab).length;
    }

    getSpecialTokens() {
        return { ...this.specialTokens };
    }

    encodeBatch(texts, options = {}) {
        return texts.map(text => this.encode(text, options));
    }

    decodeBatch(idsList, options = {}) {
        return idsList.map(ids => this.decode(ids, options));
    }

    buildVocabFromTexts(texts, options = {}) {
        const { 
            minFrequency = 2, 
            maxVocabSize = 30000,
            useSubwords = true 
        } = options;

        const wordFrequency = {};

        for (const text of texts) {
            const words = this._splitIntoWords(this._preprocessText(text));
            for (const word of words) {
                wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            }
        }

        const sortedWords = Object.entries(wordFrequency)
            .filter(([, freq]) => freq >= minFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxVocabSize - Object.keys(this.specialTokens).length);

        let nextId = Object.keys(this.specialTokens).length;
        for (const [word] of sortedWords) {
            this.vocab[word] = nextId;
            this.invVocab[nextId] = word;
            nextId++;
        }

        return this.vocab;
    }

    async loadVocab(vocabPath) {
        try {
            const response = await fetch(vocabPath);
            const vocabData = await response.json();
            this.setVocab(vocabData);
            return true;
        } catch (error) {
            console.warn('[Tokenizer] Failed to load vocab:', error);
            return false;
        }
    }
}

class BPETokenizer extends TranslatorTokenizer {
    constructor(options = {}) {
        super(options);
        this.merges = options.merges || [];
        this.unkToken = UNK_TOKEN;
    }

    setMerges(merges) {
        this.merges = merges;
    }

    bpeTokenize(word) {
        if (this.vocab[word]) {
            return [word];
        }

        let tokens = word.split('');
        let changed = true;
        let iterations = 0;
        const maxIterations = 1000;

        while (changed && iterations < maxIterations) {
            changed = false;
            iterations++;

            for (const merge of this.merges) {
                const [a, b] = merge.split(' ');
                const newToken = a + b;

                let i = 0;
                while (i < tokens.length - 1) {
                    if (tokens[i] === a && tokens[i + 1] === b) {
                        tokens = [...tokens.slice(0, i), newToken, ...tokens.slice(i + 2)];
                        changed = true;
                    } else {
                        i++;
                    }
                }

                if (changed) break;
            }
        }

        return tokens.map(token => 
            this.vocab[token] !== undefined ? token : UNK_TOKEN
        );
    }

    _subwordTokenize(word) {
        if (this.merges.length > 0) {
            return this.bpeTokenize(word);
        }
        return super._subwordTokenize(word);
    }
}

class SentencePieceTokenizer extends TranslatorTokenizer {
    constructor(options = {}) {
        super(options);
        this.modelPath = options.modelPath || null;
    }

    encodeForModel(text) {
        const encoded = this.encode(text, {
            addSpecialTokens: true,
            padding: this.padToMaxLength,
            returnAttentionMask: true
        });

        return {
            inputIds: new Int32Array(encoded.inputIds),
            attentionMask: new Int32Array(encoded.attentionMask),
            length: encoded.inputIds.length
        };
    }
}

export { 
    TranslatorTokenizer, 
    BPETokenizer, 
    SentencePieceTokenizer,
    PAD_TOKEN,
    UNK_TOKEN,
    BOS_TOKEN,
    EOS_TOKEN
};
