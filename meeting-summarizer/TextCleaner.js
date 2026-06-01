class TextCleaner {
    constructor() {
        this.fillerWords = [
            '嗯', '啊', '哦', '呃', '那个', '这个', '然后', '就是',
            '其实', '对吧', '所以说', '那么', '好的', 'OK', 'ok',
            'Okay', 'okay', '哎', '嗨', '哈喽', '大家好', '那个那个',
            '对了', '还有', '另外', '接下来', '首先', '其次', '最后',
            '我觉得', '我认为', '你知道', '你看', '你那边', '这边'
        ];
    }

    clean(text) {
        if (!text || text.trim().length === 0) {
            return '';
        }

        let cleaned = text;
        
        cleaned = this.removeFillerWords(cleaned);
        cleaned = this.cleanupPunctuation(cleaned);
        cleaned = this.removeRepetitiveSentences(cleaned);
        cleaned = this.finalCleanup(cleaned);
        
        return cleaned.trim();
    }

    removeFillerWords(text) {
        let cleaned = text;
        
        for (const word of this.fillerWords) {
            const escapedWord = this.escapeRegExp(word);
            const patterns = [
                new RegExp(`\\s*${escapedWord}\\s*`, 'g'),
                new RegExp(`^${escapedWord}[，,。.!?？！]?\\s*`),
                new RegExp(`\\s*${escapedWord}$`)
            ];
            
            for (const regex of patterns) {
                cleaned = cleaned.replace(regex, ' ');
            }
        }
        
        return cleaned;
    }

    cleanupPunctuation(text) {
        let cleaned = text;
        
        cleaned = cleaned.replace(/[，,]+/g, '，');
        cleaned = cleaned.replace(/[。.]+/g, '。');
        cleaned = cleaned.replace(/[！!]+/g, '！');
        cleaned = cleaned.replace(/[？?]+/g, '？');
        cleaned = cleaned.replace(/[；;]+/g, '；');
        cleaned = cleaned.replace(/[：:]+/g, '：');
        
        cleaned = cleaned.replace(/\s*[，,]\s*/g, '，');
        cleaned = cleaned.replace(/\s*[。.]\s*/g, '。');
        cleaned = cleaned.replace(/\s*[！!]\s*/g, '！');
        cleaned = cleaned.replace(/\s*[？?]\s*/g, '？');
        cleaned = cleaned.replace(/\s*[；;]\s*/g, '；');
        cleaned = cleaned.replace(/\s*[：:]\s*/g, '：');
        
        cleaned = cleaned.replace(/^[，,。.！!？?；;：:\s]+/, '');
        
        return cleaned;
    }

    removeRepetitiveSentences(text) {
        const sentences = text.split(/[。！？.!?\n]+/).filter(s => s.trim());
        const seen = new Set();
        const unique = [];
        
        for (const sentence of sentences) {
            const trimmed = sentence.trim();
            if (trimmed.length < 3) continue;
            
            const normalized = trimmed.toLowerCase();
            if (!seen.has(normalized)) {
                seen.add(normalized);
                unique.push(trimmed);
            }
        }
        
        return unique.join('。') + '。';
    }

    finalCleanup(text) {
        let cleaned = text;
        
        cleaned = cleaned.replace(/\s+/g, ' ');
        cleaned = cleaned.replace(/[，,]+/g, '，');
        cleaned = cleaned.replace(/[。.]+/g, '。');
        
        cleaned = cleaned.replace(/\s*，\s*/g, '，');
        cleaned = cleaned.replace(/\s*。\s*/g, '。');
        
        cleaned = cleaned.replace(/^[，,。.！!？?；;：:\s]+/, '');
        cleaned = cleaned.replace(/[，,]+$/, '。');
        
        return cleaned.trim();
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextCleaner;
}
