import { detectLanguage, LANGUAGES } from './MultilingualData.js';

export class GrammarCorrector {
    constructor(language = 'auto') {
        this.currentLanguage = language;
        this.grammarRules = this.loadGrammarRules();
        this.tenseRules = this.loadTenseRules();
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

    loadGrammarRules() {
        return {
            en: [
                {
                    pattern: /\b(don't|doesn't|didn't|do not|does not|did not)\s+([a-z]+)ed\b/gi,
                    replacement: (match, neg, verb) => {
                        const base = this.getBaseForm(verb);
                        return `${neg} ${base}`;
                    },
                    explanation: '否定句中动词应使用原形'
                },
                {
                    pattern: /\b(I|you|we|they|You|We|They)\s+is\b/g,
                    replacement: '$1 are',
                    explanation: '主语与be动词不一致'
                },
                {
                    pattern: /\b(He|She|It|he|she|it)\s+are\b/g,
                    replacement: '$1 is',
                    explanation: '主语与be动词不一致'
                },
                {
                    pattern: /\b(He|She|It|he|she|it|A\s+\w+|The\s+\w+|This|That|this|that)\s+don't\b/g,
                    replacement: (match, subject) => subject + " doesn't",
                    explanation: '第三人称单数主语应使用doesn\'t'
                },
                {
                    pattern: /\b(He|She|It|he|she|it|A\s+\w+|The\s+\w+|This|That|this|that)\s+do\b(?!\s+not)/g,
                    replacement: (match, subject) => subject + " does",
                    explanation: '第三人称单数主语应使用does'
                },
                {
                    pattern: /\b(I|You|We|They|you|we|they)\s+doesn't\b/g,
                    replacement: '$1 don\'t',
                    explanation: '非第三人称单数主语应使用don\'t'
                },
                {
                    pattern: /\b(He|She|It|he|she|it)\s+have\b(?!\s+been)/g,
                    replacement: '$1 has',
                    explanation: '第三人称单数主语应使用has'
                },
                {
                    pattern: /\b(I|You|We|They|you|we|they)\s+has\b/g,
                    replacement: '$1 have',
                    explanation: '非第三人称单数主语应使用have'
                },
                {
                    pattern: /\b(He|She|It|he|she|it)\s+([a-z]+)\b(?!\s+(ed|s|es|ing))/g,
                    replacement: (match, subject, verb) => {
                        if (this.isModalVerb(verb) || this.isAuxiliary(verb)) {
                            return match;
                        }
                        const thirdPerson = this.getThirdPerson(verb);
                        return `${subject} ${thirdPerson}`;
                    },
                    explanation: '第三人称单数现在时动词需加s/es'
                },
                {
                    pattern: /\b(was|were|is|are|be|been|being)\s+(go|do|eat|see|write|speak|take|make|come|run|give|know|get|find|tell|think|see|want|use|find|give|tell)\b/gi,
                    replacement: (match, aux, verb) => {
                        const pastParticiple = this.getPastParticiple(verb);
                        return `${aux} ${pastParticiple}`;
                    },
                    explanation: '完成时或被动语态应使用过去分词'
                },
                {
                    pattern: /\ba\s+([aeiou][a-z]*)\b/gi,
                    replacement: (match, word) => {
                        const wordLower = word.toLowerCase();
                        const exceptions = ['one', 'once', 'university', 'uniform', 'European'];
                        if (exceptions.some(ex => wordLower.startsWith(ex))) {
                            return match;
                        }
                        return `an ${word}`;
                    },
                    explanation: '元音开头的单词前应使用an'
                },
                {
                    pattern: /\ban\s+(university|uniform|European|one|once|unique|united|useful|useless|usual)/gi,
                    replacement: (match, word) => `a ${word}`,
                    explanation: '以元音字母开头但发音为辅音的单词前应使用a'
                },
                {
                    pattern: /\b(I|me|Me)\s+and\s+(he|she|it|him|her|He|She|It|Him|Her)\b/g,
                    replacement: (match, p1, p2) => {
                        const objMap = { 'I': 'me', 'me': 'me', 'Me': 'Me' };
                        const subjMap = { 'he': 'he', 'she': 'she', 'it': 'it', 'him': 'he', 'her': 'she', 'He': 'He', 'She': 'She', 'It': 'It', 'Him': 'He', 'Her': 'She' };
                        return `${subjMap[p2] || p2} and ${objMap[p1] || p1}`;
                    },
                    explanation: '英语中其他人称应放在I前面'
                },
                {
                    pattern: /\b(there|There)\s+is\s+(\d+)\s+([a-z]+)s\b/gi,
                    replacement: (match, there, num, noun) => {
                        const number = parseInt(num);
                        if (number > 1) {
                            return `${there} are ${num} ${noun}s`;
                        }
                        return match;
                    },
                    explanation: 'There be句型中be动词应与后面的名词保持一致'
                },
                {
                    pattern: /\b(yesterday|last\s+week|last\s+month|last\s+year|ago|in\s+20\d{2})\s+.*?\b(is|are|am|do|does|go|come|see|eat|take|make|give|know|get|find|tell|think|want|use|run|speak|write)\b/gi,
                    replacement: (match, time, verb) => {
                        const past = this.getPastTense(verb);
                        return match.replace(new RegExp(`\\b${verb}\\b`, 'i'), past);
                    },
                    explanation: '过去时间状语应与过去时态搭配'
                },
                {
                    pattern: /\b(tomorrow|next\s+week|next\s+month|next\s+year|soon|later)\s+.*?\b(was|were|did|went|came|saw|ate|took|made|gave|knew|got|found|told|thought|wanted|used|ran|spoke|wrote)\b/gi,
                    replacement: (match, time, verb) => {
                        const base = this.getBaseFormFromPast(verb);
                        return match.replace(new RegExp(`\\b${verb}\\b`, 'i'), `will ${base}`);
                    },
                    explanation: '将来时间状语应与将来时态搭配'
                }
            ],
            de: [
                {
                    pattern: /\b(ich|Ich)\s+ist\b/g,
                    replacement: '$1 bin',
                    explanation: 'Ich 应该与 bin 搭配'
                },
                {
                    pattern: /\b(du|Du)\s+ist\b/g,
                    replacement: '$1 bist',
                    explanation: 'Du 应该与 bist 搭配'
                },
                {
                    pattern: /\b(er|sie|Es|Er|Sie)\s+bist\b/g,
                    replacement: '$1 ist',
                    explanation: 'Er/Sie/Es 应该与 ist 搭配'
                },
                {
                    pattern: /\b(wir|Wir)\s+ist\b/g,
                    replacement: '$1 sind',
                    explanation: 'Wir 应该与 sind 搭配'
                },
                {
                    pattern: /\b(ihr|Ihr)\s+ist\b/g,
                    replacement: '$1 seid',
                    explanation: 'Ihr 应该与 seid 搭配'
                },
                {
                    pattern: /\b(sie|Sie)\s+bist\b/g,
                    replacement: '$1 sind',
                    explanation: 'Sie (他们) 应该与 sind 搭配'
                }
            ],
            fr: [
                {
                    pattern: /\b(je|Je)\s+est\b/g,
                    replacement: '$1 suis',
                    explanation: 'Je 应该与 suis 搭配'
                },
                {
                    pattern: /\b(tu|Tu)\s+est\b/g,
                    replacement: '$1 es',
                    explanation: 'Tu 应该与 es 搭配'
                },
                {
                    pattern: /\b(il|elle|on|Il|Elle|On)\s+sont\b/g,
                    replacement: '$1 est',
                    explanation: 'Il/Elle/On 应该与 est 搭配'
                },
                {
                    pattern: /\b(nous|Nous)\s+est\b/g,
                    replacement: '$1 sommes',
                    explanation: 'Nous 应该与 sommes 搭配'
                },
                {
                    pattern: /\b(vous|Vous)\s+est\b/g,
                    replacement: '$1 êtes',
                    explanation: 'Vous 应该与 êtes 搭配'
                },
                {
                    pattern: /\b(ils|elles|Ils|Elles)\s+est\b/g,
                    replacement: '$1 sont',
                    explanation: 'Ils/Elles 应该与 sont 搭配'
                }
            ],
            zh: [],
            ja: [],
            ko: []
        };
    }

    loadTenseRules() {
        return {
            pastTenseVerbs: {
                'go': 'went',
                'do': 'did',
                'eat': 'ate',
                'see': 'saw',
                'speak': 'spoke',
                'take': 'took',
                'make': 'made',
                'come': 'came',
                'run': 'ran',
                'give': 'gave',
                'know': 'knew',
                'get': 'got',
                'find': 'found',
                'tell': 'told',
                'think': 'thought',
                'want': 'wanted',
                'use': 'used',
                'is': 'was',
                'are': 'were',
                'am': 'was',
                'has': 'had',
                'have': 'had'
            },
            pastParticiples: {
                'go': 'gone',
                'do': 'done',
                'eat': 'eaten',
                'see': 'seen',
                'speak': 'spoken',
                'take': 'taken',
                'make': 'made',
                'come': 'come',
                'run': 'run',
                'give': 'given',
                'know': 'known',
                'get': 'gotten',
                'find': 'found',
                'tell': 'told',
                'think': 'thought'
            }
        };
    }

    isModalVerb(word) {
        const modals = ['can', 'could', 'may', 'might', 'shall', 'should', 'will', 'would', 'must', 'ought'];
        return modals.includes(word.toLowerCase());
    }

    isAuxiliary(word) {
        const auxiliaries = ['is', 'are', 'am', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did'];
        return auxiliaries.includes(word.toLowerCase());
    }

    getThirdPerson(verb) {
        const lower = verb.toLowerCase();
        const specials = {
            'do': 'does',
            'go': 'goes',
            'pass': 'passes',
            'miss': 'misses',
            'fix': 'fixes',
            'mix': 'mixes',
            'watch': 'watches',
            'wash': 'washes',
            'teach': 'teaches',
            'reach': 'reaches',
            'push': 'pushes',
            'rush': 'rushes'
        };
        
        if (specials[lower]) {
            return specials[lower];
        }
        
        if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') || 
            lower.endsWith('ch') || lower.endsWith('sh')) {
            return verb + 'es';
        }
        
        if (lower.endsWith('y') && !'aeiou'.includes(lower[lower.length - 2])) {
            return verb.slice(0, -1) + 'ies';
        }
        
        return verb + 's';
    }

    getBaseForm(verb) {
        const lower = verb.toLowerCase();
        const irregulars = {
            'was': 'be',
            'were': 'be',
            'is': 'be',
            'are': 'be',
            'am': 'be',
            'went': 'go',
            'did': 'do',
            'ate': 'eat',
            'saw': 'see',
            'spoke': 'speak',
            'took': 'take',
            'made': 'make',
            'came': 'come',
            'ran': 'run',
            'gave': 'give',
            'knew': 'know',
            'got': 'get',
            'found': 'find',
            'told': 'tell',
            'thought': 'think',
            'had': 'have',
            'made': 'make'
        };
        
        if (irregulars[lower]) {
            return irregulars[lower];
        }
        
        if (lower.endsWith('ied')) {
            return verb.slice(0, -3) + 'y';
        }
        
        if (lower.endsWith('ed')) {
            if (lower.length > 3 && lower[lower.length - 3] === lower[lower.length - 4]) {
                return verb.slice(0, -3);
            }
            return verb.slice(0, -2);
        }
        
        return verb;
    }

    getBaseFormFromPast(verb) {
        return this.getBaseForm(verb);
    }

    getPastTense(verb) {
        const lower = verb.toLowerCase();
        const irregulars = this.tenseRules.pastTenseVerbs;
        
        if (irregulars[lower]) {
            return irregulars[lower];
        }
        
        if (lower.endsWith('y') && !'aeiou'.includes(lower[lower.length - 2])) {
            return verb.slice(0, -1) + 'ied';
        }
        
        if (lower.endsWith('e')) {
            return verb + 'd';
        }
        
        return verb + 'ed';
    }

    getPastParticiple(verb) {
        const lower = verb.toLowerCase();
        const participles = this.tenseRules.pastParticiples;
        
        if (participles[lower]) {
            return participles[lower];
        }
        
        if (lower.endsWith('y') && !'aeiou'.includes(lower[lower.length - 2])) {
            return verb.slice(0, -1) + 'ied';
        }
        
        if (lower.endsWith('e')) {
            return verb + 'd';
        }
        
        return verb + 'ed';
    }

    async correct(text) {
        const language = this.getLanguage(text);
        const rules = this.grammarRules[language] || [];
        const corrections = [];
        let correctedText = text;

        if (rules.length === 0) {
            return {
                correctedText,
                corrections: []
            };
        }

        for (const rule of rules) {
            let match;
            const newCorrections = [];
            const globalPattern = new RegExp(rule.pattern.source, rule.pattern.flags);
            
            while ((match = globalPattern.exec(text)) !== null) {
                const original = match[0];
                let replacement;
                
                if (typeof rule.replacement === 'function') {
                    replacement = rule.replacement(...match);
                } else {
                    replacement = match[0].replace(rule.pattern, rule.replacement);
                }
                
                if (original !== replacement) {
                    newCorrections.push({
                        original,
                        replacement,
                        explanation: rule.explanation,
                        index: match.index,
                        type: 'grammar'
                    });
                }
            }
            
            for (const corr of newCorrections) {
                if (!corrections.some(c => c.original === corr.original && c.replacement === corr.replacement)) {
                    corrections.push(corr);
                    const regex = new RegExp(this.escapeRegex(corr.original), 'g');
                    correctedText = correctedText.replace(regex, corr.replacement);
                }
            }
        }

        if (language === 'en') {
            const subjectVerbCorrections = this.checkSubjectVerbAgreement(text);
            for (const corr of subjectVerbCorrections) {
                if (!corrections.some(c => c.original === corr.original && c.replacement === corr.replacement)) {
                    corrections.push(corr);
                    const regex = new RegExp(this.escapeRegex(corr.original), 'g');
                    correctedText = correctedText.replace(regex, corr.replacement);
                }
            }
        }

        return {
            correctedText,
            corrections
        };
    }

    checkSubjectVerbAgreement(text) {
        const corrections = [];
        const sentences = text.split(/(?<=[.!?])\s+/);
        
        for (const sentence of sentences) {
            const words = sentence.split(/\s+/);
            const firstWord = words[0]?.toLowerCase();
            
            if (['he', 'she', 'it'].includes(firstWord) && words.length >= 2) {
                const verb = words[1];
                if (verb && !this.isModalVerb(verb) && !this.isAuxiliary(verb)) {
                    const correctVerb = this.getThirdPerson(verb);
                    if (verb !== correctVerb && !verb.endsWith('s')) {
                        corrections.push({
                            original: `${words[0]} ${verb}`,
                            replacement: `${words[0]} ${correctVerb}`,
                            explanation: '第三人称单数现在时动词需加s/es',
                            type: 'grammar'
                        });
                    }
                }
            }
        }
        
        return corrections;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
