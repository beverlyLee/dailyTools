import { VOCAB_DATA, LANGUAGES, detectLanguage } from './MultilingualData.js';

export class VocabEnhancer {
    constructor(language = 'auto') {
        this.currentLanguage = language;
        this.contextRules = this.loadContextRules();
    }

    setLanguage(language) {
        if (LANGUAGES[language]) {
            this.currentLanguage = language;
        }
    }

    getLanguage(text) {
        if (this.currentLanguage !== 'auto') {
            return this.currentLanguage;
        }
        return detectLanguage(text);
    }

    getVocabData(language) {
        return VOCAB_DATA[language] || VOCAB_DATA['en'] || null;
    }

    loadContextRules() {
        return {
            en: [
                {
                    pattern: /\bvery\s+good\b/gi,
                    suggestions: [
                        { replacement: "exceptionally good", score: 0.95 },
                        { replacement: "remarkably good", score: 0.93 },
                        { replacement: "truly excellent", score: 0.91 },
                        { replacement: "genuinely outstanding", score: 0.90 }
                    ],
                    explanation: "使用更具表现力的副词+形容词组合"
                },
                {
                    pattern: /\ba\s+very\s+good\b/gi,
                    suggestions: [
                        { replacement: "an exceptionally good", score: 0.95 },
                        { replacement: "a truly excellent", score: 0.93 },
                        { replacement: "an outstanding", score: 0.91 }
                    ],
                    explanation: "使用更精确的冠词和形容词组合"
                },
                {
                    pattern: /\bHe\s+is\s+a\s+very\s+good\b/gi,
                    suggestions: [
                        { replacement: "He is an exceptionally good", score: 0.95 },
                        { replacement: "He is a truly excellent", score: 0.93 },
                        { replacement: "He is an outstanding", score: 0.91 },
                        { replacement: "He is a remarkably good", score: 0.90 }
                    ],
                    explanation: "使用更具表现力的形容词和冠词"
                }
            ],
            zh: [
                {
                    pattern: /很好/g,
                    suggestions: [
                        { replacement: "非常优秀", score: 0.95 },
                        { replacement: "极其出色", score: 0.93 },
                        { replacement: "格外卓越", score: 0.91 }
                    ],
                    explanation: "使用更具表现力的词汇组合"
                },
                {
                    pattern: /很/g,
                    suggestions: [
                        { replacement: "非常", score: 0.90 },
                        { replacement: "极其", score: 0.85 }
                    ],
                    explanation: "使用更精确的副词"
                }
            ],
            ja: [
                {
                    pattern: /とても良い/g,
                    suggestions: [
                        { replacement: "非常に素晴らしい", score: 0.95 },
                        { replacement: "極めて優れている", score: 0.93 }
                    ],
                    explanation: "より表現豊かな言葉遣いを使用"
                }
            ],
            ko: [
                {
                    pattern: /매우 좋다/g,
                    suggestions: [
                        { replacement: "아주 훌륭하다", score: 0.95 },
                        { replacement: "극히 우수하다", score: 0.93 }
                    ],
                    explanation: "더 표현적인 어휘 조합 사용"
                }
            ],
            de: [
                {
                    pattern: /sehr gut/gi,
                    suggestions: [
                        { replacement: "ausgezeichnet", score: 0.95 },
                        { replacement: "hervorragend", score: 0.93 }
                    ],
                    explanation: "Verwenden Sie ausdrucksstärkere Vokabeln"
                }
            ],
            fr: [
                {
                    pattern: /très bon/gi,
                    suggestions: [
                        { replacement: "excellent", score: 0.95 },
                        { replacement: "remarquable", score: 0.93 }
                    ],
                    explanation: "Utiliser un vocabulaire plus expressif"
                }
            ]
        };
    }

    async enhance(text) {
        const language = this.getLanguage(text);
        const vocabData = this.getVocabData(language);
        const enhancements = [];
        let enhancedText = text;

        if (!vocabData) {
            return {
                enhancedText,
                enhancements: []
            };
        }

        const simpleEnhancements = this.findSimpleEnhancements(text, vocabData, language);
        for (const enh of simpleEnhancements) {
            if (!enhancements.some(e => e.original === enh.original && e.replacement === enh.replacement)) {
                enhancements.push(enh);
            }
        }

        const contextEnhancements = this.findContextEnhancements(text, language);
        for (const enh of contextEnhancements) {
            if (!enhancements.some(e => e.original === enh.original && e.replacement === enh.replacement)) {
                enhancements.push(enh);
            }
        }

        enhancements.sort((a, b) => {
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            return scoreB - scoreA;
        });

        let appliedText = text;
        for (const enh of enhancements) {
            if (enh.replacement) {
                const regex = new RegExp(this.escapeRegex(enh.original), language === 'zh' || language === 'ja' || language === 'ko' ? 'g' : 'gi');
                appliedText = appliedText.replace(regex, (match) => {
                    if (language === 'en') {
                        return this.preserveCase(match, enh.replacement);
                    }
                    return enh.replacement;
                });
            }
        }

        enhancedText = appliedText;

        return {
            enhancedText,
            enhancements
        };
    }

    findSimpleEnhancements(text, vocabData, language) {
        const enhancements = [];

        for (const [category, words] of Object.entries(vocabData)) {
            for (const [word, data] of Object.entries(words)) {
                let pattern;
                if (language === 'zh' || language === 'ja' || language === 'ko') {
                    pattern = new RegExp(this.escapeRegex(word), 'g');
                } else {
                    pattern = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
                }
                let match;

                while ((match = pattern.exec(text)) !== null) {
                    const original = match[0];
                    const bestReplacement = data.replacements[0];
                    
                    if (bestReplacement) {
                        const alternatives = data.replacements.slice(1, 4).map(r => r.word);
                        
                        enhancements.push({
                            original,
                            replacement: bestReplacement.word,
                            alternatives,
                            score: bestReplacement.score,
                            explanation: data.explanation,
                            context: bestReplacement.context,
                            type: 'vocab',
                            category
                        });
                    }
                }
            }
        }

        return enhancements;
    }

    findContextEnhancements(text, language) {
        const enhancements = [];
        const rules = this.contextRules[language] || [];

        for (const rule of rules) {
            let match;
            const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);

            while ((match = pattern.exec(text)) !== null) {
                const original = match[0];
                const bestSuggestion = rule.suggestions[0];
                
                if (bestSuggestion) {
                    const alternatives = rule.suggestions.slice(1).map(s => s.replacement);
                    
                    enhancements.push({
                        original,
                        replacement: bestSuggestion.replacement,
                        alternatives,
                        score: bestSuggestion.score,
                        explanation: rule.explanation,
                        type: 'vocab',
                        category: 'context'
                    });
                }
            }
        }

        return enhancements;
    }

    getRecommendationsForWord(word, language = 'en') {
        const vocabData = this.getVocabData(language);
        if (!vocabData) return null;

        const lowerWord = word.toLowerCase();
        
        for (const [category, words] of Object.entries(vocabData)) {
            if (words[lowerWord] || words[word]) {
                const data = words[lowerWord] || words[word];
                return {
                    word,
                    category,
                    explanation: data.explanation,
                    recommendations: data.replacements.map(r => ({
                        word: r.word,
                        score: r.score,
                        context: r.context
                    }))
                };
            }
        }

        return null;
    }

    analyzeWordUsage(text) {
        const words = text.toLowerCase().split(/[\s，。、！？；：""''（）\[\]{}.,!?;:()]+/).filter(w => w.length > 1);
        const wordCounts = {};
        const vagueWords = [];
        const vagueWordList = ["thing", "stuff", "way", "nice", "good", "bad", "big", "small", "很", "非常", "好", "坏", "大", "小"];

        for (const word of words) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
            
            if (vagueWordList.some(v => word.includes(v))) {
                vagueWords.push(word);
            }
        }

        const overusedWords = Object.entries(wordCounts)
            .filter(([word, count]) => count >= 3 && word.length > 2)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count);

        return {
            totalWords: words.length,
            uniqueWords: Object.keys(wordCounts).length,
            vagueWords: [...new Set(vagueWords)],
            overusedWords
        };
    }

    preserveCase(original, replacement) {
        if (original === original.toUpperCase()) {
            return replacement.toUpperCase();
        }
        if (original[0] === original[0].toUpperCase()) {
            return replacement.charAt(0).toUpperCase() + replacement.slice(1);
        }
        return replacement;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
