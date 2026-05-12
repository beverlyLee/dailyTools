class TextCleaner {
    constructor() {
        this.fillerWords = [
            '嗯', '啊', '哦', '呃', '那个', '这个', '然后', '就是',
            '其实', '对吧', '所以说', '那么', '好的', 'OK', 'ok',
            'Okay', 'okay', '哎', '嗨', '哈喽', '大家好', '那个那个'
        ];
    }

    clean(text) {
        if (!text || text.trim().length === 0) {
            return '';
        }

        let cleaned = text;
        
        cleaned = this.removeFillerWords(cleaned);
        cleaned = this.removeRepetitiveSentences(cleaned);
        cleaned = this.normalizePunctuation(cleaned);
        cleaned = this.removeExtraWhitespace(cleaned);
        cleaned = this.normalizeLineBreaks(cleaned);
        
        return cleaned.trim();
    }

    removeFillerWords(text) {
        let cleaned = text;
        for (const word of this.fillerWords) {
            const regex = new RegExp(`[${this.escapeRegExp(word)}]+`, 'g');
            cleaned = cleaned.replace(regex, ' ');
        }
        return cleaned;
    }

    removeRepetitiveSentences(text) {
        const sentences = text.split(/[。！？.!?\n]+/).filter(s => s.trim());
        const seen = new Set();
        const unique = [];
        
        for (const sentence of sentences) {
            const normalized = sentence.trim().toLowerCase();
            if (!seen.has(normalized) && normalized.length > 0) {
                seen.add(normalized);
                unique.push(sentence.trim());
            }
        }
        
        return unique.join('。') + (text.endsWith('。') ? '。' : '');
    }

    normalizePunctuation(text) {
        const punctuationMap = {
            '，': ',',
            '。': '.',
            '！': '!',
            '？': '?',
            '；': ';',
            '：': ':',
            '（': '(',
            '）': ')',
            '【': '[',
            '】': ']',
            '「': '"',
            '」': '"',
            '『': '"',
            '』': '"'
        };
        
        let normalized = text;
        for (const [chinese, english] of Object.entries(punctuationMap)) {
            normalized = normalized.split(chinese).join(english);
        }
        
        return normalized;
    }

    removeExtraWhitespace(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    normalizeLineBreaks(text) {
        return text.replace(/\n{3,}/g, '\n\n');
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextCleaner;
}
