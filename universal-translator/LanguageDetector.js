const LANGUAGE_PROFILES = {
    zh: { name: 'Chinese', code: 'zh', chars: /[\u4e00-\u9fff]/ },
    ja: { name: 'Japanese', code: 'ja', chars: /[\u3040-\u309f\u30a0-\u30ff]/ },
    ko: { name: 'Korean', code: 'ko', chars: /[\uac00-\ud7af]/ },
    ar: { name: 'Arabic', code: 'ar', chars: /[\u0600-\u06ff]/ },
    ru: { name: 'Russian', code: 'ru', chars: /[\u0400-\u04ff]/ },
    fr: { name: 'French', code: 'fr', chars: /[àâäéèêëîïôöùûüÿçœ]/i },
    es: { name: 'Spanish', code: 'es', chars: /[áéíóúüñ¿¡]/i },
    de: { name: 'German', code: 'de', chars: /[äöüß]/i },
    it: { name: 'Italian', code: 'it', chars: /[àèéìòù]/i },
    pt: { name: 'Portuguese', code: 'pt', chars: /[áâãàçéêëíóôõúü]/i },
    en: { name: 'English', code: 'en', chars: /[a-zA-Z]/ }
};

const COMMON_WORDS = {
    en: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this'],
    fr: ['le', 'la', 'de', 'et', 'un', 'être', 'à', 'en', 'que', 'pour', 'dans', 'ce', 'il', 'qui', 'ne', 'sur', 'se', 'pas', 'plus', 'par'],
    es: ['el', 'la', 'de', 'y', 'que', 'en', 'un', 'ser', 'se', 'no', 'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'los'],
    de: ['der', 'die', 'das', 'und', 'in', 'den', 'von', 'zu', 'ist', 'sie', 'ich', 'nicht', 'auf', 'ein', 'ich', 'mit', 'der', 'dem', 'es', 'an'],
    it: ['il', 'la', 'di', 'e', 'che', 'in', 'un', 'per', 'a', 'con', 'da', 'su', 'del', 'alla', 'come', 'è', 'ha', 'ho', 'ma', 'non'],
    pt: ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos'],
    ja: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'し', 'と', 'う', 'い', 'な', 'ん', 'か', 'よ', 'せ', 'ち', 'も', 'り'],
    zh: ['的', '是', '在', '有', '和', '了', '不', '这', '我', '他', '人', '们', '说', '要', '中', '会', '大', '上', '她', '国'],
    ko: ['의', '에', '은', '를', '가', '이', '는', '로', '와', '과', '도', '에서', '까지', '만', '부터', '다', '아', '어', '요', '그'],
    ar: ['ال', 'من', 'في', 'و', 'أن', 'إلى', 'هذا', 'عن', 'ما', 'كما', 'لم', 'لن', 'إذ', 'إلا', 'أي', 'هؤلاء', 'هذه', 'هكذا', 'كذلك', 'مثل'],
    ru: ['и', 'в', 'не', 'на', 'с', 'как', 'что', 'он', 'это', 'а', 'по', 'но', 'о', 'из', 'за', 'у', 'его', 'к', 'было', 'при']
};

class LanguageDetector {
    constructor() {
        this.supportedLanguages = Object.keys(LANGUAGE_PROFILES);
        this.minLength = 3;
    }

    detect(text) {
        if (!text || typeof text !== 'string') {
            return { language: 'en', confidence: 0.5, name: 'English' };
        }

        const cleanedText = text.trim();
        if (cleanedText.length < this.minLength) {
            return { language: 'en', confidence: 0.3, name: 'English' };
        }

        const scores = this.calculateScores(cleanedText);
        const sortedLanguages = Object.entries(scores)
            .sort((a, b) => b[1] - a[1]);

        if (sortedLanguages.length === 0) {
            return { language: 'en', confidence: 0.3, name: 'English' };
        }

        const topLang = sortedLanguages[0];
        const secondLang = sortedLanguages[1];

        let confidence = topLang[1];
        if (secondLang) {
            confidence = topLang[1] / (topLang[1] + secondLang[1] + 0.001);
        }

        return {
            language: topLang[0],
            name: LANGUAGE_PROFILES[topLang[0]]?.name || topLang[0],
            confidence: Math.min(1, Math.max(0, confidence))
        };
    }

    calculateScores(text) {
        const scores = {};
        const charCount = text.length;
        const lowerText = text.toLowerCase();

        for (const [lang, profile] of Object.entries(LANGUAGE_PROFILES)) {
            scores[lang] = 0;

            if (profile.chars) {
                const matches = text.match(profile.chars);
                if (matches && matches.length > 0) {
                    scores[lang] += (matches.length / charCount) * 0.7;
                }
            }

            if (COMMON_WORDS[lang]) {
                const words = this.tokenize(text);
                let wordMatches = 0;
                for (const word of words) {
                    if (COMMON_WORDS[lang].includes(word.toLowerCase())) {
                        wordMatches++;
                    }
                }
                if (words.length > 0) {
                    scores[lang] += (wordMatches / words.length) * 0.3;
                }
            }
        }

        return scores;
    }

    tokenize(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 1);
    }

    isSupported(lang) {
        return this.supportedLanguages.includes(lang);
    }

    getLanguageName(code) {
        return LANGUAGE_PROFILES[code]?.name || code;
    }

    getLanguageCode(name) {
        const entry = Object.entries(LANGUAGE_PROFILES).find(
            ([, profile]) => profile.name.toLowerCase() === name.toLowerCase()
        );
        return entry ? entry[0] : null;
    }

    getAllLanguages() {
        return this.supportedLanguages.map(code => ({
            code,
            name: LANGUAGE_PROFILES[code].name
        }));
    }

    async detectWithConfidence(text) {
        const result = this.detect(text);

        const additionalChecks = this.performAdditionalChecks(text, result.language);
        result.confidence = Math.max(0, Math.min(1, result.confidence + additionalChecks * 0.1));

        return result;
    }

    performAdditionalChecks(text, detectedLang) {
        let boost = 0;

        if (detectedLang === 'zh') {
            const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
            if (chineseChars > text.length * 0.3) {
                boost = 0.3;
            }
        }

        if (detectedLang === 'ja') {
            const kanaChars = (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
            if (kanaChars > text.length * 0.2) {
                boost = 0.3;
            }
        }

        if (['fr', 'es', 'de', 'it', 'pt'].includes(detectedLang)) {
            const specialChars = text.match(LANGUAGE_PROFILES[detectedLang].chars);
            if (specialChars && specialChars.length > 0) {
                boost = 0.2;
            }
        }

        return boost;
    }
}

export { LanguageDetector, LANGUAGE_PROFILES };
