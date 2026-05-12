export class Contextualizer {
    constructor() {
        this.functionPatterns = {
            sorting: ['sort', 'order', 'arrange', 'rank'],
            filtering: ['filter', 'find', 'search', 'query', 'select'],
            transformation: ['transform', 'convert', 'parse', 'decode', 'encode', 'format', 'normalize'],
            validation: ['validate', 'check', 'verify', 'is', 'has'],
            calculation: ['calculate', 'compute', 'sum', 'average', 'count', 'total'],
            dataManipulation: ['map', 'reduce', 'flatten', 'group', 'join', 'merge', 'split'],
            stringManipulation: ['string', 'text', 'substring', 'replace', 'trim'],
            network: ['fetch', 'request', 'api', 'http', 'url'],
            file: ['file', 'read', 'write', 'save', 'load'],
            security: ['encrypt', 'decrypt', 'hash', 'auth', 'token', 'password'],
            regex: ['regex', 'pattern', 'match', 'replace'],
            utility: ['util', 'helper', 'tool', 'common']
        };
        
        this.regexPatterns = {
            email: /[\w.+-]+@[\w-]+\.[\w.-]+/,
            url: /https?:\/\/[^\s]+/,
            phone: /[\d\-\(\)\s]{7,}/,
            date: /\d{1,4}[-\/\.]\d{1,2}[-\/\.]\d{1,4}/,
            ip: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
            hex: /#[0-9a-fA-F]{3,6}/,
            uuid: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
            creditCard: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/
        };
    }

    analyze(node) {
        if (node.type === 'function') {
            return this.analyzeFunction(node);
        } else if (node.type === 'regex') {
            return this.analyzeRegex(node);
        } else if (node.type === 'class') {
            return this.analyzeClass(node);
        }
        
        return {
            purpose: '未知',
            category: 'other',
            complexity: 'low',
            keywords: []
        };
    }

    analyzeFunction(node) {
        const { name, code, params } = node;
        const keywords = [];
        const category = this.detectCategory(name, code);
        const complexity = this.calculateComplexity(code);
        
        keywords.push(...this.extractKeywords(name));
        keywords.push(...this.extractKeywordsFromCode(code));
        
        const paramNames = params.map(p => p.name);
        keywords.push(...paramNames);
        
        return {
            purpose: this.generatePurpose(name, category, params),
            category,
            complexity,
            keywords: [...new Set(keywords)],
            isAsync: node.isAsync || false,
            paramCount: params.length,
            hasSideEffects: this.checkSideEffects(code),
            usesRegex: code.includes('/') && /\/.+\/[gimsuy]*/.test(code)
        };
    }

    analyzeRegex(node) {
        const { pattern, flags } = node;
        const analysis = this.analyzeRegexPattern(pattern);
        
        return {
            purpose: analysis.purpose,
            category: 'regex',
            complexity: analysis.complexity,
            patternInfo: {
                raw: pattern,
                flags,
                groups: analysis.groups,
                anchors: analysis.anchors,
                quantifiers: analysis.quantifiers,
                characterClasses: analysis.characterClasses
            },
            matchesFormat: analysis.matchesFormat,
            examples: analysis.examples
        };
    }

    analyzeClass(node) {
        const { name, code } = node;
        const keywords = this.extractKeywords(name);
        
        return {
            purpose: `类 ${name} 的定义`,
            category: 'class',
            complexity: this.calculateComplexity(code),
            keywords,
            methods: this.extractMethods(code)
        };
    }

    detectCategory(name, code) {
        const lowerName = name.toLowerCase();
        
        for (const [category, patterns] of Object.entries(this.functionPatterns)) {
            for (const pattern of patterns) {
                if (lowerName.includes(pattern)) {
                    return category;
                }
            }
        }
        
        if (code.includes('await') || code.includes('fetch') || code.includes('Promise')) {
            return 'async';
        }
        
        if (code.includes('try') && code.includes('catch')) {
            return 'error-handling';
        }
        
        if (code.includes('if') || code.includes('switch')) {
            return 'conditional';
        }
        
        if (code.includes('for') || code.includes('while')) {
            return 'loop';
        }
        
        return 'general';
    }

    generatePurpose(name, category, params) {
        const paramNames = params.map(p => p.name).join(', ');
        const paramText = paramNames ? `接收参数 ${paramNames}` : '';
        
        const categoryDescriptions = {
            sorting: '用于排序或排列数据',
            filtering: '用于筛选或查找数据',
            transformation: '用于转换或格式化数据',
            validation: '用于验证数据有效性',
            calculation: '用于执行计算操作',
            dataManipulation: '用于操作和处理数据结构',
            stringManipulation: '用于处理字符串',
            network: '用于网络请求或API调用',
            file: '用于文件操作',
            security: '用于安全相关操作',
            regex: '用于正则表达式处理',
            utility: '通用工具函数',
            async: '异步操作函数',
            conditional: '包含条件判断逻辑',
            loop: '包含循环处理',
            general: '通用函数',
            other: '其他类型函数'
        };
        
        let purpose = `函数 ${name}`;
        if (categoryDescriptions[category]) {
            purpose += ` ${categoryDescriptions[category]}`;
        }
        if (paramText) {
            purpose += `，${paramText}`;
        }
        
        return purpose;
    }

    calculateComplexity(code) {
        let complexity = 0;
        
        complexity += (code.match(/\bif\b/g) || []).length;
        complexity += (code.match(/\belse\b/g) || []).length;
        complexity += (code.match(/\bswitch\b/g) || []).length * 2;
        complexity += (code.match(/\bcase\b/g) || []).length;
        complexity += (code.match(/\bfor\b/g) || []).length * 2;
        complexity += (code.match(/\bwhile\b/g) || []).length * 2;
        complexity += (code.match(/\btry\b/g) || []).length;
        complexity += (code.match(/\bcatch\b/g) || []).length;
        complexity += (code.match(/&&|\|\|/g) || []).length;
        complexity += (code.match(/\?.*:/g) || []).length;
        complexity += (code.match(/\breturn\b/g) || []).length;
        
        if (complexity <= 3) return 'low';
        if (complexity <= 8) return 'medium';
        if (complexity <= 15) return 'high';
        return 'very-high';
    }

    extractKeywords(name) {
        const words = name.match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)|\d+/g) || [name];
        return words.map(w => w.toLowerCase()).filter(w => w.length > 1);
    }

    extractKeywordsFromCode(code) {
        const keywords = [];
        
        const commonKeywords = [
            'async', 'await', 'Promise', 'fetch', 'axios',
            'Array', 'Object', 'String', 'Number', 'Map', 'Set',
            'JSON', 'parse', 'stringify',
            'try', 'catch', 'throw', 'error',
            'console', 'log', 'debug',
            'return', 'break', 'continue',
            'class', 'new', 'this', 'super',
            'import', 'export', 'require',
            'if', 'else', 'switch', 'case', 'default',
            'for', 'while', 'do', 'forEach', 'map', 'filter', 'reduce'
        ];
        
        for (const keyword of commonKeywords) {
            if (code.includes(keyword)) {
                keywords.push(keyword.toLowerCase());
            }
        }
        
        return keywords;
    }

    checkSideEffects(code) {
        const sideEffectPatterns = [
            'localStorage', 'sessionStorage', 'cookie',
            'document.', 'window.',
            'fetch(', 'axios.', 'XMLHttpRequest',
            'fs.', 'writeFile', 'appendFile',
            'console.',
            'push(', 'pop(', 'shift(', 'unshift(', 'splice(',
            '= [^=]'
        ];
        
        return sideEffectPatterns.some(pattern => code.includes(pattern));
    }

    extractMethods(code) {
        const methods = [];
        const methodPatterns = [
            /(\w+)\s*\([^)]*\)\s*\{/g,
            /(\w+)\s*:\s*(?:async\s+)?function/g,
            /(\w+)\s*=\s*(?:async\s+)?\(/g
        ];
        
        for (const pattern of methodPatterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                if (!['if', 'for', 'while', 'switch', 'catch', 'function'].includes(match[1])) {
                    methods.push(match[1]);
                }
            }
        }
        
        return [...new Set(methods)];
    }

    analyzeRegexPattern(pattern) {
        const analysis = {
            groups: [],
            anchors: [],
            quantifiers: [],
            characterClasses: [],
            matchesFormat: [],
            examples: [],
            complexity: 'low'
        };
        
        let groupDepth = 0;
        let inCharClass = false;
        let complexityScore = 0;
        
        for (let i = 0; i < pattern.length; i++) {
            const char = pattern[i];
            
            if (char === '\\') {
                const nextChar = pattern[i + 1];
                if (nextChar) {
                    switch (nextChar) {
                        case 'd':
                            analysis.characterClasses.push('数字 [0-9]');
                            break;
                        case 'w':
                            analysis.characterClasses.push('单词字符 [a-zA-Z0-9_]');
                            break;
                        case 's':
                            analysis.characterClasses.push('空白字符');
                            break;
                        case 'b':
                            analysis.anchors.push('单词边界');
                            break;
                    }
                    i++;
                }
                continue;
            }
            
            if (char === '[') {
                inCharClass = true;
                complexityScore += 2;
                continue;
            }
            if (char === ']') {
                inCharClass = false;
                continue;
            }
            
            if (inCharClass) continue;
            
            switch (char) {
                case '^':
                    analysis.anchors.push('行首');
                    complexityScore++;
                    break;
                case '$':
                    analysis.anchors.push('行尾');
                    complexityScore++;
                    break;
                case '(':
                    groupDepth++;
                    const lookahead = pattern.slice(i, i + 3);
                    if (lookahead === '(?:') {
                        analysis.groups.push('非捕获组');
                    } else if (lookahead === '(?=') {
                        analysis.groups.push('正向先行断言');
                        complexityScore += 2;
                    } else if (lookahead === '(?!') {
                        analysis.groups.push('负向先行断言');
                        complexityScore += 3;
                    } else if (lookahead === '(?<') {
                        analysis.groups.push('命名捕获组');
                        complexityScore += 2;
                    } else {
                        analysis.groups.push('捕获组');
                    }
                    complexityScore++;
                    break;
                case ')':
                    groupDepth--;
                    break;
                case '*':
                    analysis.quantifiers.push('0个或多个 (*)');
                    complexityScore++;
                    break;
                case '+':
                    analysis.quantifiers.push('1个或多个 (+)');
                    complexityScore++;
                    break;
                case '?':
                    if (pattern[i - 1] !== ')' && pattern[i - 1] !== ']' && 
                        !/[*+?]/.test(pattern[i - 1])) {
                        analysis.quantifiers.push('0个或1个 (?)');
                    } else {
                        analysis.quantifiers.push('非贪婪匹配');
                    }
                    complexityScore++;
                    break;
                case '{':
                    const quantMatch = pattern.slice(i).match(/^\{(\d+)(,(\d*))?\}/);
                    if (quantMatch) {
                        if (quantMatch[3] === '') {
                            analysis.quantifiers.push(`至少 ${quantMatch[1]} 个`);
                        } else if (quantMatch[2]) {
                            analysis.quantifiers.push(`${quantMatch[1]}-${quantMatch[3] || '多'} 个`);
                        } else {
                            analysis.quantifiers.push(`恰好 ${quantMatch[1]} 个`);
                        }
                        complexityScore += 2;
                    }
                    break;
                case '|':
                    analysis.quantifiers.push('或 (|)');
                    complexityScore++;
                    break;
                case '.':
                    analysis.characterClasses.push('任意字符 (.)');
                    break;
            }
        }
        
        analysis.matchesFormat = this.detectRegexFormat(pattern);
        analysis.examples = this.generateRegexExamples(pattern);
        analysis.purpose = this.generateRegexPurpose(pattern, analysis);
        
        if (complexityScore <= 3) analysis.complexity = 'low';
        else if (complexityScore <= 8) analysis.complexity = 'medium';
        else if (complexityScore <= 15) analysis.complexity = 'high';
        else analysis.complexity = 'very-high';
        
        return analysis;
    }

    detectRegexFormat(pattern) {
        const formats = [];
        
        if (/^[\^]?[\w.+-]+@[\w-]+\.[\w.-]+/.test(pattern) || pattern.includes('@')) {
            formats.push('邮箱地址');
        }
        
        if (pattern.includes('http') || pattern.includes('://')) {
            formats.push('URL链接');
        }
        
        if (pattern.includes('\\d') || pattern.includes('[0-9]')) {
            if (pattern.match(/\\d\{4\}.*\\d\{4\}/)) {
                formats.push('电话号码');
            }
            if (pattern.match(/\\d\{1,3\}\.\\d\{1,3\}/)) {
                formats.push('IP地址');
            }
        }
        
        if (pattern.match(/\\d.*[-\\/.].*\\d.*[-\\/.].*\\d/)) {
            formats.push('日期格式');
        }
        
        if (pattern.includes('#') && (pattern.includes('[0-9a-fA-F]') || pattern.includes('\\w'))) {
            formats.push('十六进制颜色值');
        }
        
        if (pattern.match(/[a-fA-F0-9]\{8\}.*-[a-fA-F0-9]/)) {
            formats.push('UUID');
        }
        
        return formats;
    }

    generateRegexExamples(pattern) {
        const examples = [];
        
        try {
            const regex = new RegExp(pattern);
            
            if (pattern.includes('@')) {
                examples.push('test@example.com');
            }
            if (pattern.includes('http') || pattern.includes('://')) {
                examples.push('https://www.example.com');
            }
            if (pattern.includes('\\d') && !pattern.includes('@')) {
                examples.push('12345');
            }
            if (pattern.includes('#') && pattern.includes('[0-9a-fA-F]')) {
                examples.push('#FF5733');
            }
            
        } catch (e) {
            examples.push('(无法生成示例：正则表达式可能无效)');
        }
        
        return examples;
    }

    generateRegexPurpose(pattern, analysis) {
        const parts = [];
        
        if (analysis.matchesFormat.length > 0) {
            parts.push(`匹配 ${analysis.matchesFormat.join('、')} 格式`);
        }
        
        if (analysis.anchors.length > 0) {
            parts.push(`使用 ${analysis.anchors.join('、')}`);
        }
        
        if (analysis.groups.length > 0) {
            const uniqueGroups = [...new Set(analysis.groups)];
            parts.push(`包含 ${uniqueGroups.join('、')}`);
        }
        
        if (analysis.characterClasses.length > 0) {
            const uniqueClasses = [...new Set(analysis.characterClasses)];
            if (uniqueClasses.length <= 3) {
                parts.push(`匹配 ${uniqueClasses.join('、')}`);
            }
        }
        
        if (parts.length === 0) {
            parts.push('正则表达式匹配');
        }
        
        return parts.join('；');
    }
}