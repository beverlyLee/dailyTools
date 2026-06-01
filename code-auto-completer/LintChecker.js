class LintChecker {
    constructor() {
        this.editor = null;
        this.monaco = null;
        this.worker = null;
        this.callbacks = {};
        this.debounceTimer = null;
        this.decorations = [];
        this.currentIssues = [];
    }

    init(editor, monaco, worker, callbacks = {}) {
        this.editor = editor;
        this.monaco = monaco;
        this.worker = worker;
        this.callbacks = callbacks;

        if (worker) {
            worker.onmessage = (event) => this.handleWorkerMessage(event);
            worker.onerror = (error) => console.error('[LintChecker] Worker 错误:', error);
        }

        editor.onDidChangeModelContent((event) => {
            this.scheduleLint();
        });

        this.scheduleLint();
    }

    scheduleLint() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.performLint();
        }, 300);
    }

    forceLint() {
        this.performLint();
    }

    handleWorkerMessage(event) {
        const { type, data } = event.data;
        if (type === 'lint_result') {
            this.processLintResults(data.issues || []);
        }
    }

    performLint() {
        const model = this.editor.getModel();
        const code = model.getValue();

        const issues = this.analyzeCode(code, model);
        this.processLintResults(issues);

        if (this.worker) {
            this.worker.postMessage({
                type: 'lint',
                data: { code }
            });
        }
    }

    analyzeCode(code, model) {
        const issues = [];

        issues.push(...this.checkSyntaxErrors(code, model));
        issues.push(...this.checkUndefinedVariables(code, model));
        issues.push(...this.checkMissingBraces(code, model));
        issues.push(...this.checkUnclosedStrings(code, model));
        issues.push(...this.checkMissingParentheses(code, model));
        issues.push(...this.checkMissingSemicolons(code, model));
        issues.push(...this.checkDuplicateDeclarations(code, model));

        return this.deduplicateIssues(issues);
    }

    checkSyntaxErrors(code, model) {
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
            const open = (lines[i].match(new RegExp(`\\${openChar}`, 'g')) || []).length;
            const close = (lines[i].match(new RegExp(`\\${closeChar}`, 'g')) || []).length;
            balance += (open - close);
        }
        return balance === 0;
    }

    checkUndefinedVariables(code, model) {
        const issues = [];
        const definedVars = new Set([
            'console', 'document', 'window', 'Math', 'Array', 'Object', 'String', 'Number',
            'Boolean', 'JSON', 'Date', 'RegExp', 'Map', 'Set', 'Promise', 'NaN', 'Infinity',
            'undefined', 'null', 'true', 'false', 'this', 'arguments', 'globalThis',
            'eval', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'decodeURI',
            'decodeURIComponent', 'encodeURI', 'encodeURIComponent', 'escape', 'unescape',
            'Symbol', 'BigInt', 'Intl', 'Atomics', 'SharedArrayBuffer', 'WebAssembly'
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

        const paramRegex = /\bfunction\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(([^)]*)\)/g;
        while ((match = paramRegex.exec(code)) !== null) {
            const params = match[1].split(',').map(p => p.trim().split('=')[0].trim());
            params.forEach(p => {
                if (p) definedVars.add(p);
            });
        }

        const arrowFuncRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*|\([^)]*\))\s*=>/g;
        while ((match = arrowFuncRegex.exec(code)) !== null) {
            let params = match[1];
            if (params.startsWith('(')) {
                params = params.slice(1, -1).split(',').map(p => p.trim().split('=')[0].trim());
            } else {
                params = [params];
            }
            params.forEach(p => {
                if (p && p !== '...') definedVars.add(p);
            });
        }

        const lines = code.split('\n');
        const identifiers = /[a-zA-Z_$][a-zA-Z0-9_$]*/g;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWithoutStrings = this.removeStringsAndComments(line);
            let idMatch;

            while ((idMatch = identifiers.exec(lineWithoutStrings)) !== null) {
                const identifier = idMatch[0];
                if (!definedVars.has(identifier)) {
                    if (this.isLikelyPropertyAccess(code, identifier, idMatch.index)) {
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

    removeStringsAndComments(line) {
        return line
            .replace(/\/\/.*$/, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(['"`])[^'"`]*?\1/g, match => ' '.repeat(match.length))
            .replace(/\.[a-zA-Z_$][a-zA-Z0-9_$]*/g, match => ' '.repeat(match.length))
            .replace(/\b(new\s+)[a-zA-Z_$][a-zA-Z0-9_$]*/g, (match, prefix) => prefix + ' '.repeat(match.length - prefix.length));
    }

    isLikelyPropertyAccess(code, identifier, position) {
        const before = Math.max(0, position - 50);
        const context = code.substring(before, position);
        return /\.\s*$/.test(context);
    }

    checkMissingBraces(code, model) {
        const issues = [];
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            const missingBracePatterns = [
                {
                    pattern: /^(if|for|while|switch|with)\s*\([^)]*\)\s*$/,
                    message: '控制语句缺少花括号或语句体',
                    severity: 'warning'
                },
                {
                    pattern: /^(if|for|while|switch|with)\s*\([^)]*\)\s*[^{]\s*$/,
                    message: '建议使用花括号包围代码块',
                    severity: 'warning'
                }
            ];

            for (const { pattern, message, severity } of missingBracePatterns) {
                if (pattern.test(trimmed)) {
                    const braceBalance = this.checkBraceBalance(code, i);
                    if (!braceBalance.balanced) {
                        issues.push({
                            line: i + 1,
                            column: line.length + 1,
                            message: message + (braceBalance.missing > 0 ? ` (缺少 ${braceBalance.missing} 个右花括号)` : ''),
                            severity
                        });
                    }
                    break;
                }
            }

            const forLoopPattern = /^for\s*\([^)]*\)\s*$/;
            if (forLoopPattern.test(trimmed)) {
                issues.push({
                    line: i + 1,
                    column: line.length + 1,
                    message: 'for 循环缺少花括号或循环体',
                    severity: 'warning'
                });
            }
        }

        const totalOpen = (code.match(/{/g) || []).length;
        const totalClose = (code.match(/}/g) || []).length;
        if (totalOpen !== totalClose) {
            const missing = Math.abs(totalOpen - totalClose);
            const lineWithProblem = totalOpen > totalClose 
                ? this.findLastLineWithChar(lines, '{')
                : this.findLastLineWithChar(lines, '}');
            
            issues.push({
                line: lineWithProblem + 1,
                column: 1,
                message: totalOpen > totalClose 
                    ? `代码块缺少 ${missing} 个右花括号 '}'`
                    : `有 ${missing} 个多余的右花括号 '}'`,
                severity: 'error'
            });
        }

        return issues;
    }

    findLastLineWithChar(lines, char) {
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].includes(char)) {
                return i;
            }
        }
        return 0;
    }

    checkBraceBalance(code, lineIndex) {
        const lines = code.split('\n');
        let openCount = 0;
        let closeCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].replace(/['"`][^'"`]*['"`]/g, '').replace(/\/\/.*$/, '');
            openCount += (line.match(/{/g) || []).length;
            closeCount += (line.match(/}/g) || []).length;
        }

        return {
            balanced: openCount === closeCount,
            missing: openCount - closeCount
        };
    }

    checkUnclosedStrings(code, model) {
        const issues = [];
        const lines = code.split('\n');

        let inMultiLineComment = false;
        let stringDelimiter = null;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let lineForCheck = line;

            if (inMultiLineComment) {
                const commentEnd = line.indexOf('*/');
                if (commentEnd !== -1) {
                    inMultiLineComment = false;
                    lineForCheck = line.substring(commentEnd + 2);
                } else {
                    continue;
                }
            }

            lineForCheck = lineForCheck.replace(/\/\*[\s\S]*?\*\//g, '');

            const multiLineStart = lineForCheck.indexOf('/*');
            if (multiLineStart !== -1 && lineForCheck.indexOf('*/', multiLineStart) === -1) {
                inMultiLineComment = true;
            }

            lineForCheck = lineForCheck.replace(/\/\/.*$/, '');

            if (stringDelimiter) {
                const stringEnd = lineForCheck.indexOf(stringDelimiter);
                if (stringEnd === -1 || (stringDelimiter !== '`' && lineForCheck.lastIndexOf('\\', stringEnd) === stringEnd - 1)) {
                    continue;
                }
                stringDelimiter = null;
            }

            let j = 0;
            while (j < lineForCheck.length) {
                const char = lineForCheck[j];
                
                if (char === '\\' && j < lineForCheck.length - 1) {
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

    checkMissingParentheses(code, model) {
        const issues = [];
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWithoutStrings = line
                .replace(/['"`][^'"`]*['"`]/g, '')
                .replace(/\/\/.*$/, '');

            const ifWhileForPattern = /\b(if|while|for|switch|catch)\s*([^(])/g;
            let match;

            while ((match = ifWhileForPattern.exec(lineWithoutStrings)) !== null) {
                if (match[2] !== '(') {
                    issues.push({
                        line: i + 1,
                        column: match.index + match[1].length + 2,
                        message: `${match[1]} 语句需要使用括号`,
                        severity: 'error'
                    });
                }
            }
        }

        return issues;
    }

    checkMissingSemicolons(code, model) {
        const issues = [];
        const lines = code.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!trimmed || trimmed.endsWith(';') || trimmed.endsWith('{') || trimmed.endsWith('}') ||
                trimmed.endsWith(',') || trimmed.startsWith('//') || trimmed.startsWith('/*') ||
                trimmed.endsWith('*/') || trimmed.endsWith(')') || trimmed.endsWith(']') ||
                trimmed.endsWith('`') || trimmed.startsWith('{') || trimmed.startsWith('}') ||
                trimmed.startsWith('if') || trimmed.startsWith('else') || trimmed.startsWith('for') ||
                trimmed.startsWith('while') || trimmed.startsWith('do') || trimmed.startsWith('switch') ||
                trimmed.startsWith('case') || trimmed.startsWith('class') || trimmed.startsWith('function') ||
                trimmed.startsWith('return') || trimmed.startsWith('throw') || trimmed.startsWith('try') ||
                trimmed.startsWith('catch') || trimmed.startsWith('finally') || trimmed.startsWith('import') ||
                trimmed.startsWith('export') || trimmed.startsWith('async') || trimmed.startsWith('await')) {
                continue;
            }

            const needsSemicolon = /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*[^;]+$/.test(trimmed) ||
                                   /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\)\s*[^;{]*$/.test(trimmed);

            if (needsSemicolon) {
                issues.push({
                    line: i + 1,
                    column: line.length + 1,
                    message: '可能缺少分号',
                    severity: 'warning'
                });
            }
        }

        return issues;
    }

    checkDuplicateDeclarations(code, model) {
        const issues = [];
        const lines = code.split('\n');
        const declarations = new Map();

        const constLetRegex = /\b(const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        let match;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWithoutStrings = line
                .replace(/['"`][^'"`]*['"`]/g, '')
                .replace(/\/\/.*$/, '');

            while ((match = constLetRegex.exec(lineWithoutStrings)) !== null) {
                const varName = match[2];
                const type = match[1];

                if (declarations.has(varName)) {
                    issues.push({
                        line: i + 1,
                        column: match.index + 1,
                        message: `重复声明: ${varName} (${type} 不能重复声明)`,
                        severity: 'error'
                    });
                } else {
                    declarations.set(varName, { line: i + 1, type });
                }
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

    processLintResults(issues) {
        this.currentIssues = issues;

        this.updateDecorations(issues);

        if (this.callbacks.onIssuesChange) {
            this.callbacks.onIssuesChange(issues);
        }
    }

    updateDecorations(issues) {
        const model = this.editor.getModel();
        if (!model) return;

        const newDecorations = issues.map(issue => {
            const lineNumber = Math.min(issue.line, model.getLineCount());
            const lineContent = model.getLineContent(lineNumber) || '';
            const column = Math.min(issue.column || 1, lineContent.length + 1);

            return {
                range: new this.monaco.Range(
                    lineNumber,
                    1,
                    lineNumber,
                    lineContent.length + 1
                ),
                options: {
                    isWholeLine: false,
                    className: issue.severity === 'error' 
                        ? 'lint-decoration-error' 
                        : 'lint-decoration-warning',
                    glyphMarginClassName: issue.severity === 'error' 
                        ? 'lint-glyph-error' 
                        : 'lint-glyph-warning',
                    glyphMarginHoverMessage: { value: issue.message }
                }
            };
        });

        this.decorations = model.deltaDecorations(this.decorations, newDecorations);
    }

    getCurrentIssues() {
        return this.currentIssues;
    }
}
