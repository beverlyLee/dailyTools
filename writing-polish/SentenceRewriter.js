export class SentenceRewriter {
    constructor() {
        this.rewriteRules = this.loadRewriteRules();
        this.styleRules = this.loadStyleRules();
        this.passiveVoicePatterns = this.loadPassiveVoicePatterns();
    }

    loadRewriteRules() {
        return {
            colloquialToFormal: {
                "wanna": "want to",
                "gonna": "going to",
                "gotta": "have to",
                "ain't": "is not",
                "isn't": "is not",
                "aren't": "are not",
                "wasn't": "was not",
                "weren't": "were not",
                "haven't": "have not",
                "hasn't": "has not",
                "hadn't": "had not",
                "won't": "will not",
                "wouldn't": "would not",
                "don't": "do not",
                "doesn't": "does not",
                "didn't": "did not",
                "can't": "cannot",
                "couldn't": "could not",
                "shouldn't": "should not",
                "mightn't": "might not",
                "mustn't": "must not",
                "needn't": "need not",
                "it's": "it is",
                "it’ll": "it will",
                "I'm": "I am",
                "I'll": "I will",
                "I'd": "I would",
                "I've": "I have",
                "you're": "you are",
                "you'll": "you will",
                "you've": "you have",
                "you'd": "you would",
                "he's": "he is",
                "he'll": "he will",
                "he'd": "he would",
                "she's": "she is",
                "she'll": "she will",
                "she'd": "she would",
                "we're": "we are",
                "we'll": "we will",
                "we've": "we have",
                "we'd": "we would",
                "they're": "they are",
                "they'll": "they will",
                "they've": "they have",
                "they'd": "they would",
                "let's": "let us",
                "that's": "that is",
                "what's": "what is",
                "who's": "who is",
                "where's": "where is",
                "when's": "when is",
                "how's": "how is",
                "why's": "why is",
                "there's": "there is",
                "here's": "here is",
                " kinda ": " kind of ",
                " sort of ": " rather ",
                " lots of ": " a great deal of ",
                " a lot of ": " a significant amount of ",
                " big ": " substantial ",
                " small ": " modest ",
                " nice ": " pleasant ",
                " really ": " genuinely ",
                " just ": " merely ",
                " actually ": " in fact ",
                " basically ": " fundamentally ",
                " literally ": " effectively ",
                " totally ": " completely ",
                " absolutely ": " entirely ",
                " very ": " exceedingly "
            },
            passiveToActive: [
                {
                    pattern: /(\w+)\s+is\s+being\s+(\w+ed)\s+by\s+(\w+)/gi,
                    transform: (subject, verb, agent) => {
                        const baseVerb = this.getBaseForm(verb);
                        return `${agent} ${this.getThirdPerson(baseVerb)} ${subject}`;
                    }
                },
                {
                    pattern: /(\w+)\s+was\s+(\w+ed)\s+by\s+(\w+)/gi,
                    transform: (subject, verb, agent) => {
                        const pastVerb = this.getPastTense(this.getBaseForm(verb));
                        return `${agent} ${pastVerb} ${subject}`;
                    }
                },
                {
                    pattern: /(\w+)\s+were\s+(\w+ed)\s+by\s+(\w+)/gi,
                    transform: (subject, verb, agent) => {
                        const pastVerb = this.getPastTense(this.getBaseForm(verb));
                        return `${agent} ${pastVerb} ${subject}`;
                    }
                }
            ]
        };
    }

    loadStyleRules() {
        return [
            {
                name: "expressiveAdverbs",
                description: "将平淡的副词替换为更具表现力的词汇",
                patterns: [
                    { from: "very good", to: ["exceptionally good", "remarkably good", "impressively good"] },
                    { from: "very bad", to: ["terribly bad", "extremely bad", "dreadfully bad"] },
                    { from: "very important", to: ["critically important", "vitally important", "crucially important"] },
                    { from: "very happy", to: ["extremely happy", "deliriously happy", "ecstatically happy"] },
                    { from: "very sad", to: ["deeply sad", "profoundly sad", "intensely sad"] },
                    { from: "very fast", to: ["incredibly fast", "astonishingly fast", "remarkably fast"] },
                    { from: "very slow", to: ["painfully slow", "excruciatingly slow", "agonizingly slow"] },
                    { from: "very beautiful", to: ["stunningly beautiful", "breathtakingly beautiful", "exquisitely beautiful"] },
                    { from: "very interesting", to: ["fascinatingly interesting", "intriguingly interesting", "compellingly interesting"] },
                    { from: "very difficult", to: ["extremely difficult", "incredibly difficult", "tremendously difficult"] },
                    { from: "very easy", to: ["surprisingly easy", "remarkably easy", "incredibly easy"] },
                    { from: "very much", to: ["a great deal", "significantly", "considerably"] }
                ]
            },
            {
                name: "phraseVariations",
                description: "提供句式的多样表达",
                patterns: [
                    { from: "I think that", to: ["I believe that", "It is my belief that", "From my perspective"] },
                    { from: "I am sure that", to: ["I am confident that", "There is no doubt that", "I am certain that"] },
                    { from: "It is important to", to: ["It is crucial to", "It is essential to", "It is vital to"] },
                    { from: "We should", to: ["It is advisable to", "One should", "It would be prudent to"] },
                    { from: "I want to", to: ["I would like to", "I am eager to", "I aspire to"] },
                    { from: "He is a", to: ["He is an exceptionally", "He is a truly", "He is an outstanding"] },
                    { from: "She is a", to: ["She is an exceptionally", "She is a truly", "She is an outstanding"] },
                    { from: "It is a", to: ["It is an exceptionally", "It is a truly", "It is an outstanding"] }
                ]
            },
            {
                name: "sentenceOpeners",
                description: "多样化的句子开头",
                patterns: [
                    { from: "In my opinion", to: ["From my perspective", "In my view", "It seems to me"] },
                    { from: "First of all", to: ["To begin with", "In the first place", "Initially"] },
                    { from: "In conclusion", to: ["In summary", "To summarize", "In closing"] },
                    { from: "For example", to: ["For instance", "To illustrate", "As an illustration"] },
                    { from: "However", to: ["Nevertheless", "Nonetheless", "On the other hand"] },
                    { from: "Also", to: ["Furthermore", "In addition", "Moreover"] },
                    { from: "But", to: ["However", "Nevertheless", "On the contrary"] }
                ]
            }
        ];
    }

    loadPassiveVoicePatterns() {
        return {
            patterns: [
                /\bis\s+being\s+\w+ed\b/gi,
                /\bare\s+being\s+\w+ed\b/gi,
                /\bwas\s+\w+ed\b/gi,
                /\bwere\s+\w+ed\b/gi,
                /\bhas\s+been\s+\w+ed\b/gi,
                /\bhave\s+been\s+\w+ed\b/gi
            ]
        };
    }

    isModalVerb(word) {
        const modals = ['can', 'could', 'may', 'might', 'shall', 'should', 'will', 'would', 'must', 'ought'];
        return modals.includes(word.toLowerCase());
    }

    getThirdPerson(verb) {
        const lower = verb.toLowerCase();
        const specials = {
            'do': 'does',
            'go': 'goes',
            'pass': 'passes',
            'miss': 'misses'
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
            'was': 'be', 'were': 'be', 'is': 'be', 'are': 'be', 'am': 'be',
            'went': 'go', 'did': 'do', 'ate': 'eat', 'saw': 'see', 'spoke': 'speak',
            'took': 'take', 'made': 'make', 'came': 'come', 'ran': 'run', 'gave': 'give',
            'knew': 'know', 'got': 'get', 'found': 'find', 'told': 'tell', 'thought': 'think'
        };
        
        if (irregulars[lower]) {
            return irregulars[lower];
        }
        
        if (lower.endsWith('ied')) {
            return verb.slice(0, -3) + 'y';
        }
        
        if (lower.endsWith('ed')) {
            return verb.slice(0, -2);
        }
        
        return verb;
    }

    getPastTense(verb) {
        const lower = verb.toLowerCase();
        const irregulars = {
            'go': 'went', 'do': 'did', 'eat': 'ate', 'see': 'saw', 'speak': 'spoke',
            'take': 'took', 'make': 'made', 'come': 'came', 'run': 'ran', 'give': 'gave',
            'know': 'knew', 'get': 'got', 'find': 'found', 'tell': 'told', 'think': 'thought',
            'want': 'wanted', 'use': 'used', 'is': 'was', 'are': 'were', 'am': 'was'
        };
        
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

    async rewrite(text) {
        const rewrites = [];
        let rewrittenText = text;

        const colloquialCorrections = this.convertColloquialToFormal(text);
        for (const corr of colloquialCorrections) {
            if (!rewrites.some(r => r.original === corr.original && r.replacement === corr.replacement)) {
                rewrites.push(corr);
                const regex = new RegExp(this.escapeRegex(corr.original), 'gi');
                rewrittenText = rewrittenText.replace(regex, corr.replacement);
            }
        }

        const styleSuggestions = this.getStyleSuggestions(rewrittenText);
        for (const suggestion of styleSuggestions) {
            if (!rewrites.some(r => r.original === suggestion.original && r.replacement === suggestion.replacement)) {
                rewrites.push(suggestion);
            }
        }

        const passiveAnalysis = this.analyzePassiveVoice(rewrittenText);
        if (passiveAnalysis.length > 0) {
            for (const passive of passiveAnalysis) {
                if (!rewrites.some(r => r.original === passive.original)) {
                    rewrites.push(passive);
                }
            }
        }

        return {
            rewrittenText,
            rewrites
        };
    }

    convertColloquialToFormal(text) {
        const corrections = [];
        const colloquialMap = this.rewriteRules.colloquialToFormal;

        for (const [colloquial, formal] of Object.entries(colloquialMap)) {
            const pattern = new RegExp(this.escapeRegex(colloquial), 'gi');
            let match;
            
            while ((match = pattern.exec(text)) !== null) {
                const original = match[0];
                const replacement = this.preserveCase(original, formal);
                
                if (original.toLowerCase() !== replacement.toLowerCase()) {
                    corrections.push({
                        original,
                        replacement,
                        explanation: '口语化表达转换为书面语',
                        type: 'rewrite',
                        category: 'colloquial'
                    });
                }
            }
        }

        return corrections;
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

    getStyleSuggestions(text) {
        const suggestions = [];

        for (const rule of this.styleRules) {
            for (const pattern of rule.patterns) {
                const regex = new RegExp(`\\b${this.escapeRegex(pattern.from)}\\b`, 'gi');
                let match;

                while ((match = regex.exec(text)) !== null) {
                    const original = match[0];
                    const alternatives = pattern.to.map(alt => 
                        this.preserveCase(original, alt)
                    );

                    suggestions.push({
                        original,
                        replacement: alternatives[0],
                        alternatives: alternatives.slice(1),
                        explanation: rule.description,
                        type: 'rewrite',
                        category: 'style'
                    });
                }
            }
        }

        return suggestions;
    }

    analyzePassiveVoice(text) {
        const findings = [];
        const sentences = text.split(/(?<=[.!?])\s+/);

        for (const sentence of sentences) {
            for (const pattern of this.passiveVoicePatterns.patterns) {
                const matches = sentence.match(pattern);
                if (matches) {
                    for (const match of matches) {
                        findings.push({
                            original: match,
                            replacement: null,
                            explanation: '检测到被动语态，考虑转换为主动语态以增强表达力',
                            type: 'rewrite',
                            category: 'voice'
                        });
                    }
                }
            }
        }

        return findings;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    generateEnhancedVariations(text) {
        const variations = [];
        const sentences = text.split(/(?<=[.!?])\s+/);

        for (const sentence of sentences) {
            if (sentence.trim()) {
                const variation = this.generateSentenceVariation(sentence);
                if (variation && variation !== sentence) {
                    variations.push({
                        original: sentence,
                        variation,
                        explanation: '句式变化建议'
                    });
                }
            }
        }

        return variations;
    }

    generateSentenceVariation(sentence) {
        const words = sentence.split(/\s+/);
        if (words.length < 3) return sentence;

        let variation = sentence;

        if (sentence.startsWith('I ')) {
            variation = sentence.replace(/^I /, 'From my perspective, I ');
        }

        if (sentence.includes('very ')) {
            const alternatives = ['exceptionally ', 'remarkably ', 'truly ', 'genuinely '];
            const randomAlt = alternatives[Math.floor(Math.random() * alternatives.length)];
            variation = variation.replace('very ', randomAlt);
        }

        return variation;
    }
}
