class CodeWorker {
    constructor() {
        this.ready = false;
        this.completionCache = new Map();
        this.lintCache = new Map();
        
        this.initCompletionDatabase();
        this.initLintRules();
        
        this.ready = true;
        this.sendMessage('ready', { timestamp: Date.now() });
    }

    initCompletionDatabase() {
        this.completionDB = {
            global: [
                { label: 'console', kind: 'value', detail: 'Console 对象', insertText: 'console' },
                { label: 'document', kind: 'value', detail: 'Document 对象', insertText: 'document' },
                { label: 'window', kind: 'value', detail: 'Window 对象', insertText: 'window' },
                { label: 'Math', kind: 'class', detail: '数学对象', insertText: 'Math' },
                { label: 'Array', kind: 'class', detail: '数组构造函数', insertText: 'Array' },
                { label: 'Object', kind: 'class', detail: '对象构造函数', insertText: 'Object' },
                { label: 'String', kind: 'class', detail: '字符串构造函数', insertText: 'String' },
                { label: 'Number', kind: 'class', detail: '数字构造函数', insertText: 'Number' },
                { label: 'Boolean', kind: 'class', detail: '布尔构造函数', insertText: 'Boolean' },
                { label: 'JSON', kind: 'value', detail: 'JSON 对象', insertText: 'JSON' },
                { label: 'Date', kind: 'class', detail: '日期构造函数', insertText: 'Date' },
                { label: 'RegExp', kind: 'class', detail: '正则表达式构造函数', insertText: 'RegExp' },
                { label: 'Map', kind: 'class', detail: 'Map 构造函数', insertText: 'Map' },
                { label: 'Set', kind: 'class', detail: 'Set 构造函数', insertText: 'Set' },
                { label: 'Promise', kind: 'class', detail: 'Promise 构造函数', insertText: 'Promise' }
            ],
            document: [
                { label: 'getElementById', kind: 'method', detail: '通过 ID 获取元素', insertText: 'getElementById(${1:id})', insertTextRules: 'snippet' },
                { label: 'getElementsByClassName', kind: 'method', detail: '通过类名获取元素', insertText: 'getElementsByClassName(${1:className})', insertTextRules: 'snippet' },
                { label: 'getElementsByTagName', kind: 'method', detail: '通过标签名获取元素', insertText: 'getElementsByTagName(${1:tagName})', insertTextRules: 'snippet' },
                { label: 'querySelector', kind: 'method', detail: '查询选择器', insertText: 'querySelector(${1:selector})', insertTextRules: 'snippet' },
                { label: 'querySelectorAll', kind: 'method', detail: '查询所有选择器', insertText: 'querySelectorAll(${1:selector})', insertTextRules: 'snippet' },
                { label: 'createElement', kind: 'method', detail: '创建元素', insertText: 'createElement(${1:tagName})', insertTextRules: 'snippet' },
                { label: 'body', kind: 'property', detail: 'body 元素', insertText: 'body' },
                { label: 'head', kind: 'property', detail: 'head 元素', insertText: 'head' },
                { label: 'title', kind: 'property', detail: '页面标题', insertText: 'title' },
                { label: 'URL', kind: 'property', detail: '页面 URL', insertText: 'URL' }
            ],
            console: [
                { label: 'log', kind: 'method', detail: '输出日志', insertText: 'log(${1:message})', insertTextRules: 'snippet' },
                { label: 'error', kind: 'method', detail: '输出错误', insertText: 'error(${1:message})', insertTextRules: 'snippet' },
                { label: 'warn', kind: 'method', detail: '输出警告', insertText: 'warn(${1:message})', insertTextRules: 'snippet' },
                { label: 'info', kind: 'method', detail: '输出信息', insertText: 'info(${1:message})', insertTextRules: 'snippet' },
                { label: 'table', kind: 'method', detail: '输出表格', insertText: 'table(${1:data})', insertTextRules: 'snippet' }
            ]
        };

        this.nGramModel = new Map();
        this.trainNGram();
    }

    trainNGram() {
        const corpus = [
            'const x = 1',
            'const y = 2',
            'let z = x + y',
            'document.getElementById',
            'document.querySelector',
            'document.createElement',
            'console.log',
            'console.error',
            'console.warn',
            'for(i=0;i<10;i++)',
            'if(condition)',
            'while(true)',
            'function name(params)',
            'class Name',
            'return value',
            'Array.prototype.map',
            'Array.prototype.filter',
            'Array.prototype.forEach',
            'String.prototype.split',
            'String.prototype.join',
            'Math.random',
            'Math.floor',
            'Math.ceil',
            'JSON.parse',
            'JSON.stringify',
            'new Date',
            'new Map',
            'new Set',
            'Promise.all',
            'Promise.resolve'
        ];

        corpus.forEach(sentence => {
            const tokens = this.tokenize(sentence);
            for (let i = 0; i < tokens.length - 1; i++) {
                const current = tokens[i];
                const next = tokens[i + 1];
                
                if (!this.nGramModel.has(current)) {
                    this.nGramModel.set(current, new Map());
                }
                
                const nextMap = this.nGramModel.get(current);
                nextMap.set(next, (nextMap.get(next) || 0) + 1);
            }
        });
    }

    tokenize(text) {
        const tokens = [];
        const regex = /[a-zA-Z0-9_$]+|[(){}\[\];,.=+\-*/%<>!&|?:]/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            tokens.push(match[0]);
        }
        
        return tokens;
    }

    initLintRules() {
        this.lintRules = {
            syntax: this.checkSyntax.bind(this),
            undefinedVariables: this.checkUndefinedVariables.bind(this),
            missingBraces: this.checkMissingBraces.bind(this),
            unclosedStrings: this.checkUnclosedStrings.bind(this),
            missingParentheses: this.checkMissingParentheses.bind(this)
        };
    }

    sendMessage(type, data) {
        self.postMessage({ type, data });
    }

    handleMessage(event) {
        const { type, requestId, data } = event.data;
        
        switch (type) {
            case 'predict':
                this.handlePredict(requestId, data);
                break;
            case 'lint':
                this.handleLint(requestId, data);
                break;
            case 'cache_clear':
                this.clearCache();
                break;
            default:
                console.log('[CodeWorker] 未知消息类型:', type);
        }
    }

    handlePredict(requestId, context) {
        const { prefix, currentWord, contextType } = context;
        const cacheKey = `${contextType}|${currentWord}|${prefix.slice(-50)}`;
        
        if (this.completionCache.has(cacheKey)) {
            this.sendMessage('predictions', {
                requestId,
                predictions: this.completionCache.get(cacheKey)
            });
            return;
        }

        const predictions = this.generatePredictions(context);
        
        this.completionCache.set(cacheKey, predictions);
        if (this.completionCache.size > 1000) {
            this.completionCache.clear();
        }

        this.sendMessage('predictions', {
            requestId,
            predictions
        });
    }

    generatePredictions(context) {
        const { prefix, currentWord, contextType } = context;
        const predictions = [];

        if (contextType === 'member_access' || contextType === 'builtin_member') {
            const objectMatch = prefix.match(/([a-zA-Z0-9_$]+)\.[a-zA-Z0-9_$]*$/);
            if (objectMatch) {
                const objectName = objectMatch[1];
                if (this.completionDB[objectName]) {
                    predictions.push(...this.completionDB[objectName]);
                } else if (objectName.toLowerCase() === 'document') {
                    predictions.push(...this.completionDB.document);
                } else if (objectName.toLowerCase() === 'console') {
                    predictions.push(...this.completionDB.console);
                }
            }
        }

        const nGrams = this.getNGramPredictions(prefix, currentWord);
        predictions.push(...nGrams);

        return predictions
            .filter(p => !currentWord || p.label.toLowerCase().startsWith(currentWord.toLowerCase()))
            .slice(0, 50);
    }

    getNGramPredictions(prefix, currentWord) {
        const tokens = this.tokenize(prefix);
        if (tokens.length === 0) return [];

        const lastToken = tokens[tokens.length - 1];
        const predictions = [];

        if (this.nGramModel.has(lastToken)) {
            const nextMap = this.nGramModel.get(lastToken);
            const sorted = Array.from(nextMap.entries()).sort((a, b) => b[1] - a[1]);
            
            sorted.forEach(([token, count]) => {
                if (!currentWord || token.toLowerCase().startsWith(currentWord.toLowerCase())) {
                    predictions.push({
                        label: token,
                        kind: 'value',
                        detail: `概率: ${(count / sorted.reduce((acc, [_, c]) => acc + c, 0) * 100).toFixed(0)}%`,
                        insertText: token,
                        score: count
                    });
                }
            });
        }

        return predictions.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    handleLint(requestId, data) {
        const { code } = data;
        const cacheKey = this.hashString(code);
        
        if (this.lintCache.has(cacheKey)) {
            this.sendMessage('lint_result', {
                requestId,
                issues: this.lintCache.get(cacheKey)
            });
            return;
        }

        const issues = [];
        for (const [ruleName, ruleCheck] of Object.entries(this.lintRules)) {
            try {
                const ruleIssues = ruleCheck(code);
                issues.push(...ruleIssues);
            } catch (error) {
                console.error(`[CodeWorker] 规则 ${ruleName} 执行失败:`, error);
            }
        }

        const deduplicated = this.deduplicateIssues(issues);
        
        this.lintCache.set(cacheKey, deduplicated);
        if (this.lintCache.size > 100) {
            this.lintCache.clear();
        }

        this.sendMessage('lint_result', {
            requestId,
            issues: deduplicated
        });
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    checkSyntax(code) {
        const issues = [];
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const openParen = (line.match(/\(/g) || []).length;
            const closeParen = (line.match(/\)/g) || []).length;
            
            if (openParen !== closeParen) {
                const net = openParen - closeParen;
                if (net > 0 && !this.isBalancedAcrossLines(lines, i, '(', ')')) {
                    issues.push({
                        line: i + 1,
                        column: line.length + 1,
                        message: `缺少 ${net} 个右括号 ')'`,
                        severity: 'error'
                    });
                } else if (net < 0) {
                    issues.push({
                        line: i + 1,
                        column: line.lastIndexOf(')') + 1,
                        message: '多余的右括号',
                        severity: 'error'
                    });
                }
            }

            const openBracket = (line.match(/\[/g) || []).length;
            const closeBracket = (line.match(/\]/g) || []).length;
            if (openBracket !== closeBracket) {
                const net = openBracket - closeBracket;
                if (net > 0 && !this.isBalancedAcrossLines(lines, i, '[', ']')) {
                    issues.push({
                        line: i + 1,
                        column: line.length + 1,
                        message: `缺少 ${net} 个右方括号 ']'`,
                        severity: 'error'
                    });
                } else if (net < 0) {
                    issues.push({
                        line: i + 1,
                        column: line.lastIndexOf(']') + 1,
                        message: '多余的右方括号',
                        severity: 'error'
                    });
                }
            }
        }

        return issues;
    }

    isBalancedAcrossLines(lines, startLine, openChar, closeChar) {
        let balance = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const open = (line.match(new RegExp(`\\${openChar}`, 'g')) || []).length;
            const close = (line.match(new RegExp(`\\${closeChar}`, 'g')) || []).length;
            balance += (open - close);
        }
        return balance === 0;
    }

    checkUndefinedVariables(code) {
        const issues = [];
        const definedVars = new Set([
            'console', 'document', 'window', 'Math', 'Array', 'Object', 'String', 'Number',
            'Boolean', 'JSON', 'Date', 'RegExp', 'Map', 'Set', 'Promise', 'NaN', 'Infinity',
            'undefined', 'null', 'true', 'false', 'this', 'arguments', 'globalThis'
        ]);

        const varDeclRegex = /\b(?:const|let|var|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const classDeclRegex = /\bclass\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let match;

        while ((match = varDeclRegex.exec(code)) !== null) {
            definedVars.add(match[1]);
        }

        while ((match = classDeclRegex.exec(code)) !== null) {
            definedVars.add(match[1]);
        }

        const lines = code.split('\n');
        const identifiers = /[a-zA-Z_$][a-zA-Z0-9_$]*/g;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWithoutStrings = line
                .replace(/\/\/.*$/, '')
                .replace(/['"`][^'"`]*?['"`]/g, ' '.repeat);
            
            let idMatch;
            while ((idMatch = identifiers.exec(lineWithoutStrings)) !== null) {
                const identifier = idMatch[0];
                if (!definedVars.has(identifier)) {
                    const beforeContext = code.substring(Math.max(0, idMatch.index + i * 50 - 5), idMatch.index + i * 50);
                    if (!/[.\s]$/.test(beforeContext)) {
                        continue;
                    }
                    issues.push({
                        line: i + 1,
                        column: idMatch.index + 1,
                        message: `可能未定义的变量: ${identifier}`,
                        severity: 'warning'
                    });
                }
            }
        }

        return issues;
    }

    checkMissingBraces(code) {
        const issues = [];
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            const forLoopPattern = /^for\s*\([^)]*\)\s*$/;
            if (forLoopPattern.test(trimmed)) {
                issues.push({
                    line: i + 1,
                    column: line.length + 1,
                    message: 'for 循环缺少花括号或循环体',
                    severity: 'warning'
                });
            }

            const ifWhilePattern = /^(if|while)\s*\([^)]*\)\s*$/;
            if (ifWhilePattern.test(trimmed)) {
                issues.push({
                    line: i + 1,
                    column: line.length + 1,
                    message: '控制语句缺少花括号或语句体',
                    severity: 'warning'
                });
            }
        }

        const totalOpen = (code.match(/{/g) || []).length;
        const totalClose = (code.match(/}/g) || []).length;
        if (totalOpen !== totalClose) {
            const missing = Math.abs(totalOpen - totalClose);
            issues.push({
                line: 1,
                column: 1,
                message: totalOpen > totalClose 
                    ? `代码块缺少 ${missing} 个右花括号 '}'`
                    : `有 ${missing} 个多余的右花括号 '}'`,
                severity: 'error'
            });
        }

        return issues;
    }

    checkUnclosedStrings(code) {
        const issues = [];
        const lines = code.split('\n');
        let stringDelimiter = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let j = 0;
            
            while (j < line.length) {
                const char = line[j];
                
                if (char === '\\' && j < line.length - 1) {
                    j += 2;
                    continue;
                }

                if (char === "'" || char === '"' || char === '`') {
                    if (stringDelimiter === null) {
                        stringDelimiter = char;
                    } else if (stringDelimiter === char) {
                        stringDelimiter = null;
                    }
                }
                j++;
            }

            if (stringDelimiter) {
                issues.push({
                    line: i + 1,
                    column: line.length + 1,
                    message: `字符串未闭合 (缺少 ${stringDelimiter})`,
                    severity: 'error'
                });
                break;
            }
        }

        return issues;
    }

    checkMissingParentheses(code) {
        const issues = [];
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWithoutStrings = line.replace(/['"`][^'"`]*['"`]/g, '');
            
            const ifWhileForPattern = /\b(if|while|for|switch|catch)\s+[^(]/g;
            let match;
            
            while ((match = ifWhileForPattern.exec(lineWithoutStrings)) !== null) {
                issues.push({
                    line: i + 1,
                    column: match.index + match[1].length + 2,
                    message: `${match[1]} 语句需要使用括号`,
                    severity: 'error'
                });
            }
        }

        return issues;
    }

    deduplicateIssues(issues) {
        const seen = new Set();
        return issues.filter(issue => {
            const key = `${issue.line}-${issue.column}-${issue.message}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    clearCache() {
        this.completionCache.clear();
        this.lintCache.clear();
    }
}

const worker = new CodeWorker();

self.onmessage = function(event) {
    worker.handleMessage(event);
};

self.onerror = function(error) {
    console.error('[CodeWorker] 全局错误:', error);
    return true;
};
