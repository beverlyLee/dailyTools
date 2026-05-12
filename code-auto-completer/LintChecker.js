class LintChecker {
    constructor() {
        this.editor = null;
        this.monaco = null;
        this.worker = null;
        this.decorations = [];
        this.lintTimeout = null;
        this.onIssuesChange = null;
        this.pendingRequests = new Map();
        this.requestIdCounter = 0;
        this.currentVersion = 0;
        this.latestProcessedCode = null;
        this.lastKnownIssues = [];
    }

    init(editor, monaco, workerPath, callbacks = {}) {
        this.editor = editor;
        this.monaco = monaco;
        this.onIssuesChange = callbacks.onIssuesChange || (() => {});

        if (workerPath) {
            console.log('[LintChecker] 尝试初始化 Worker:', workerPath);
            this._initWorker(workerPath);
        } else {
            console.log('[LintChecker] workerPath 为空，使用同步模式');
            this.worker = null;
        }

        this._setupEventListeners();
        this.lint(true);
    }

    _initWorker(workerPath) {
        try {
            if (!workerPath) {
                throw new Error('workerPath 为空');
            }
            
            this.worker = new Worker(workerPath);
            
            this.worker.onmessage = (e) => {
                this._handleWorkerResponse(e.data);
            };

            this.worker.onerror = (error) => {
                console.warn('[LintChecker] Worker 错误（使用同步模式）:', error);
                this.worker = null;
            };
        } catch (e) {
            console.warn('[LintChecker] 无法创建 Web Worker，使用同步模式:', e.message);
            this.worker = null;
        }
    }

    _handleWorkerResponse(data) {
        const { task, id, issues, version } = data;
        const request = this.pendingRequests.get(id);
        
        if (!request) {
            return;
        }

        this.pendingRequests.delete(id);
        
        if (task === 'lint' && request.resolve) {
            if (version !== undefined && version < this.currentVersion) {
                console.log(`忽略旧版本的 lint 结果 (版本: ${version}, 当前版本: ${this.currentVersion})`);
                return;
            }

            if (request.code !== this.editor.getValue()) {
                console.log('忽略过期的 lint 结果：代码已变化');
                return;
            }

            this.latestProcessedCode = request.code;
            this.lastKnownIssues = issues;
            request.resolve(issues);
        }
    }

    _setupEventListeners() {
        this.editor.onDidChangeModelContent(() => {
            if (this.lintTimeout) {
                clearTimeout(this.lintTimeout);
            }
            
            this.currentVersion++;
            
            this.pendingRequests.forEach((req, id) => {
                if (req.resolve) {
                    req.resolve([]);
                }
                clearTimeout(req.timeout);
            });
            this.pendingRequests.clear();
            
            this.lintTimeout = setTimeout(() => {
                this.lint();
            }, 250);
        });
    }

    async lint(force = false) {
        const code = this.editor.getValue();
        
        if (!force && code === this.latestProcessedCode) {
            return;
        }

        console.log('[LintChecker] 开始检查代码，版本:', this.currentVersion);
        console.log('[LintChecker] 代码内容:', code.substring(0, 200) + (code.length > 200 ? '...' : ''));

        this.currentVersion++;
        const version = this.currentVersion;
        
        let issues = [];

        try {
            if (this.worker) {
                console.log('[LintChecker] 使用 Web Worker 检查代码');
                issues = await this._getIssuesFromWorker(code, version);
            } else {
                console.log('[LintChecker] 使用同步模式检查代码');
                issues = this._analyzeCodeSync(code);
            }
            console.log('[LintChecker] 检查完成，发现', issues.length, '个问题');
        } catch (e) {
            console.error('[LintChecker] 代码检查失败:', e);
            issues = [];
        }

        if (code !== this.editor.getValue()) {
            console.log('[LintChecker] lint 完成但代码已变化，跳过更新');
            return;
        }

        this.latestProcessedCode = code;
        this.lastKnownIssues = issues;

        this._updateDecorations(issues);
        this.onIssuesChange(issues);
    }

    _getIssuesFromWorker(code, version) {
        return new Promise((resolve) => {
            const id = ++this.requestIdCounter;
            
            const timeoutId = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    console.log('Lint 请求超时');
                    resolve([]);
                }
            }, 1500);

            this.pendingRequests.set(id, { 
                resolve, 
                code: code, 
                version: version,
                timeout: timeoutId
            });
            
            this.worker.postMessage({
                task: 'lint',
                code: code,
                id: id,
                version: version
            });
        });
    }

    _analyzeCodeSync(code) {
        return this._analyzeCode(code);
    }

    _analyzeCode(code) {
        const issues = [];
        const lines = code.split('\n');
        
        const declarations = this._collectAllDeclarations(code);
        const definedVariables = declarations.variables;
        const definedFunctions = declarations.functions;
        const definedParams = declarations.parameters;
        
        const openParensTotal = (code.match(/\(/g) || []).length;
        const closeParensTotal = (code.match(/\)/g) || []).length;
        const totalParensMismatch = openParensTotal - closeParensTotal;
        
        const openBracesTotal = (code.match(/\{/g) || []).length;
        const closeBracesTotal = (code.match(/\}/g) || []).length;
        const totalBracesMismatch = openBracesTotal - closeBracesTotal;
        
        const openBracketsTotal = (code.match(/\[/g) || []).length;
        const closeBracketsTotal = (code.match(/\]/g) || []).length;
        const totalBracketsMismatch = openBracketsTotal - closeBracketsTotal;

        lines.forEach((line, lineIndex) => {
            const lineNum = lineIndex + 1;
            const trimmedLine = line.trim();
            
            const forLoopMatch = line.match(/for\s*\(([^)]*)\)\s*$/);
            if (forLoopMatch) {
                const nextLine = lines[lineIndex + 1] || '';
                if (!nextLine.trim().startsWith('{') && !line.includes('{')) {
                    issues.push({
                        type: 'warning',
                        message: '缺少花括号，建议使用花括号包裹循环体',
                        line: lineNum,
                        column: line.length + 1,
                        severity: 'warning'
                    });
                }
            }
            
            const ifMatch = line.match(/if\s*\(([^)]*)\)\s*$/);
            if (ifMatch) {
                const nextLine = lines[lineIndex + 1] || '';
                if (!nextLine.trim().startsWith('{') && !line.includes('{')) {
                    issues.push({
                        type: 'warning',
                        message: '缺少花括号，建议使用花括号包裹代码块',
                        line: lineNum,
                        column: line.length + 1,
                        severity: 'warning'
                    });
                }
            }

            if (totalParensMismatch > 0) {
                const lineOpenParens = (line.match(/\(/g) || []).length;
                const lineCloseParens = (line.match(/\)/g) || []).length;
                const lineParensDelta = lineOpenParens - lineCloseParens;
                
                if (lineParensDelta > 0) {
                    issues.push({
                        type: 'warning',
                        message: '可能缺少右括号 )',
                        line: lineNum,
                        column: line.length + 1,
                        severity: 'warning'
                    });
                }
            }
            
            if (totalBracesMismatch > 0) {
                const lineOpenBraces = (line.match(/\{/g) || []).length;
                const lineCloseBraces = (line.match(/\}/g) || []).length;
                const lineBracesDelta = lineOpenBraces - lineCloseBraces;
                
                if (lineBracesDelta > 0) {
                    issues.push({
                        type: 'warning',
                        message: '可能缺少右花括号 }',
                        line: lineNum,
                        column: line.length + 1,
                        severity: 'warning'
                    });
                }
            }
            
            if (totalBracketsMismatch > 0) {
                const lineOpenBrackets = (line.match(/\[/g) || []).length;
                const lineCloseBrackets = (line.match(/\]/g) || []).length;
                const lineBracketsDelta = lineOpenBrackets - lineCloseBrackets;
                
                if (lineBracketsDelta > 0) {
                    issues.push({
                        type: 'warning',
                        message: '可能缺少右方括号 ]',
                        line: lineNum,
                        column: line.length + 1,
                        severity: 'warning'
                    });
                }
            }
            
            const semicolonStatements = [
                /^.*var\s+\w+\s*=.*[^;{}]\s*$/,
                /^.*let\s+\w+\s*=.*[^;{}]\s*$/,
                /^.*const\s+\w+\s*=.*[^;{}]\s*$/,
                /^.*return\s+\w+.*[^;{}]\s*$/
            ];
            
            const jsKeywords = ['if', 'else', 'for', 'while', 'do', 'switch', 'function', 'class', 'try', 'catch', 'finally'];
            const isBlockStart = jsKeywords.some(kw => trimmedLine.startsWith(kw + '(')) || 
                               trimmedLine.includes('{') ||
                               trimmedLine.endsWith('{') ||
                               trimmedLine.startsWith('//') ||
                               trimmedLine.startsWith('/*') ||
                               trimmedLine.startsWith('*') ||
                               trimmedLine === '';
            
            if (!isBlockStart && trimmedLine.length > 0 && !trimmedLine.endsWith(';') && !trimmedLine.endsWith('{') && !trimmedLine.endsWith('}')) {
                if (semicolonStatements.some(re => re.test(trimmedLine))) {
                    issues.push({
                        type: 'warning',
                        message: '建议添加分号',
                        line: lineNum,
                        column: line.length,
                        severity: 'warning'
                    });
                }
            }
        });

        const variableIssues = this._checkVariableUsage(code, definedVariables, definedFunctions, definedParams);
        issues.push(...variableIssues);

        const deduplicated = this._deduplicateIssues(issues);
        return deduplicated;
    }

    _collectAllDeclarations(code) {
        const variables = new Set();
        const functions = new Set();
        const parameters = new Set();
        
        const lines = code.split('\n');
        let inMultilineComment = false;
        let inString = false;
        let stringType = null;
        let escapeNext = false;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const nextChar = line[i + 1] || '';
                
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                
                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }
                
                if (!inString) {
                    if (char === '/' && nextChar === '*') {
                        inMultilineComment = true;
                        i++;
                        continue;
                    }
                    
                    if (inMultilineComment && char === '*' && nextChar === '/') {
                        inMultilineComment = false;
                        i++;
                        continue;
                    }
                    
                    if (char === '/' && nextChar === '/') {
                        break;
                    }
                }
                
                if (!inMultilineComment) {
                    if (inString) {
                        if (char === stringType) {
                            inString = false;
                            stringType = null;
                        }
                    } else if (char === '"' || char === "'" || char === '`') {
                        inString = true;
                        stringType = char;
                    }
                }
            }
            
            if (inMultilineComment) {
                continue;
            }

            const lineWithoutComments = this._removeStringsAndComments(line);
            if (!lineWithoutComments.trim()) continue;

            const varDeclRegex = /\b(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            let match;
            while ((match = varDeclRegex.exec(lineWithoutComments)) !== null) {
                variables.add(match[1]);
            }

            const funcDeclRegex = /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
            while ((match = funcDeclRegex.exec(lineWithoutComments)) !== null) {
                functions.add(match[1]);
            }

            const funcExprRegex = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:function\s*\(|\([^)]*\)\s*=>)/g;
            while ((match = funcExprRegex.exec(lineWithoutComments)) !== null) {
                functions.add(match[1]);
            }

            const classDeclRegex = /\bclass\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            while ((match = classDeclRegex.exec(lineWithoutComments)) !== null) {
                functions.add(match[1]);
            }

            const importRegex = /\bimport\s+(?:\{[^}]*\}\s+from\s+)?['"][^'"]+['"]/g;
            const importMatches = lineWithoutComments.match(importRegex);
            if (importMatches) {
                const importNames = lineWithoutComments.match(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:,\s*\{|\s+from\s+|,|\})/g);
                if (importNames) {
                    importNames.forEach(name => {
                        const cleanName = name.match(/[a-zA-Z_$][a-zA-Z0-9_$]*/);
                        if (cleanName) variables.add(cleanName[0]);
                    });
                }
                
                const defaultImport = lineWithoutComments.match(/import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:,|\s+from)/);
                if (defaultImport) variables.add(defaultImport[1]);
            }

            const funcParamRegex = /(?:function\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(|function\s*\(|=>\s*\(|[a-zA-Z_$][a-zA-Z0-9_$]*\s*=\s*function\s*\(|\([^)]*\)\s*=>)/g;
            const funcMatches = lineWithoutComments.match(funcParamRegex);
            if (funcMatches) {
                funcMatches.forEach(funcMatch => {
                    const paramsMatch = funcMatch.match(/\(([^)]*)\)/);
                    if (paramsMatch) {
                        const params = paramsMatch[1].split(',').map(p => p.trim());
                        params.forEach(param => {
                            const paramName = param.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
                            if (paramName) {
                                parameters.add(paramName[1]);
                            }
                        });
                    }
                });
            }

            const forInRegex = /\bfor\s*\(\s*(?:var|let|const)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s+(?:in|of)\s+/g;
            while ((match = forInRegex.exec(lineWithoutComments)) !== null) {
                variables.add(match[1]);
            }

            const forInitRegex = /\bfor\s*\(\s*(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g;
            while ((match = forInitRegex.exec(lineWithoutComments)) !== null) {
                variables.add(match[1]);
            }

            const catchRegex = /\bcatch\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g;
            while ((match = catchRegex.exec(lineWithoutComments)) !== null) {
                parameters.add(match[1]);
            }
        }

        return { variables, functions, parameters };
    }

    _removeStringsAndComments(line) {
        let result = '';
        let inString = false;
        let stringType = null;
        let escapeNext = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1] || '';

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            if (!inString && char === '/' && nextChar === '/') {
                break;
            }

            if (!inString) {
                if (char === '"' || char === "'" || char === '`') {
                    inString = true;
                    stringType = char;
                    continue;
                }
            } else {
                if (char === stringType) {
                    inString = false;
                    stringType = null;
                    continue;
                }
            }

            if (!inString) {
                result += char;
            }
        }

        return result;
    }

    _checkVariableUsage(code, definedVariables, definedFunctions, definedParams) {
        const issues = [];
        const lines = code.split('\n');
        
        const globalBuiltins = new Set([
            'document', 'window', 'console', 'Math', 'Date', 'Array', 'Object', 'String', 'Number',
            'Boolean', 'JSON', 'Promise', 'Map', 'Set', 'Symbol', 'Function', 'RegExp', 'Error',
            'undefined', 'null', 'true', 'false', 'this', 'new', 'typeof', 'instanceof',
            'in', 'delete', 'void', 'arguments', 'eval', 'isNaN', 'isFinite', 'parseFloat',
            'parseInt', 'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent',
            'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
            'localStorage', 'sessionStorage', 'fetch', 'location', 'history', 'navigator', 'screen',
            'performance', 'Intl', 'ArrayBuffer', 'DataView', 'Float32Array', 'Float64Array',
            'Int8Array', 'Int16Array', 'Int32Array', 'Uint8Array', 'Uint16Array', 'Uint32Array',
            'WeakMap', 'WeakSet', 'Proxy', 'Reflect', 'Atomics', 'SharedArrayBuffer',
            'BigInt', 'BigInt64Array', 'BigUint64Array', 'FinalizationRegistry', 'WeakRef',
            'TextDecoder', 'TextEncoder', 'URL', 'URLSearchParams', 'FormData', 'Blob',
            'File', 'FileReader', 'Headers', 'Request', 'Response', 'AbortController',
            'AbortSignal', 'EventSource', 'WebSocket', 'MutationObserver', 'IntersectionObserver',
            'ResizeObserver', 'queueMicrotask', 'structuredClone'
        ]);

        const commonDOMObjects = new Set([
            'element', 'el', 'div', 'span', 'input', 'button', 'form', 'ul', 'li',
            'e', 'event', 'evt', 'error', 'err', 'data', 'response', 'res', 'result',
            'item', 'items', 'obj', 'arr', 'list', 'map', 'value', 'val', 'key', 'keys',
            'index', 'idx', 'i', 'j', 'k', 'n', 'x', 'y', 'z', 'count', 'length',
            'callback', 'cb', 'handler', 'fn', 'func', 'name', 'id', 'class', 'className'
        ]);

        const variableUsageRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const usedNames = new Set();
        const declarationNames = new Set();

        lines.forEach((line, lineIndex) => {
            const lineNum = lineIndex + 1;
            const lineWithoutComments = this._removeStringsAndComments(line);
            
            let match;
            const lineUsed = new Set();
            const lineDeclared = new Set();

            const declRegex = /\b(?:var|let|const|function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
            while ((match = declRegex.exec(lineWithoutComments)) !== null) {
                lineDeclared.add(match[1]);
                declarationNames.add(match[1]);
            }

            const assignDeclRegex = /(?:^|[\s;{(,])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=[^=]/g;
            while ((match = assignDeclRegex.exec(lineWithoutComments)) !== null) {
                if (!match[1].match(/^(?:break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield|async|await|let|static|as|from|of|constructor|get|set|arguments|eval)$/)) {
                    lineDeclared.add(match[1]);
                    declarationNames.add(match[1]);
                }
            }

            while ((match = variableUsageRegex.exec(lineWithoutComments)) !== null) {
                const varName = match[1];
                
                const isKeyword = /^(?:break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield|async|await|let|static|as|from|of|constructor|get|set|arguments|eval)$/.test(varName);
                const isNumber = /^\d+$/.test(varName);
                const isPropertyAccessor = match.index > 0 && lineWithoutComments[match.index - 1] === '.';
                const isMethodCall = match.index > 0 && lineWithoutComments[match.index - 1] === '.';
                
                if (isKeyword || isNumber || isPropertyAccessor || isMethodCall) {
                    continue;
                }

                if (lineDeclared.has(varName)) {
                    continue;
                }

                if (lineUsed.has(varName)) {
                    continue;
                }

                if (globalBuiltins.has(varName)) {
                    continue;
                }

                if (definedVariables.has(varName) || definedFunctions.has(varName) || definedParams.has(varName)) {
                    continue;
                }

                if (declarationNames.has(varName)) {
                    continue;
                }

                lineUsed.add(varName);
                usedNames.add(varName);

                if (commonDOMObjects.has(varName.toLowerCase()) || commonDOMObjects.has(varName)) {
                    continue;
                }

                if (varName.length <= 2) {
                    continue;
                }

                if (varName.startsWith('on') && varName.length > 3) {
                    continue;
                }

                issues.push({
                    type: 'warning',
                    message: `变量 '${varName}' 可能未定义`,
                    line: lineNum,
                    column: match.index + 1,
                    severity: 'warning'
                });
            }
        });

        return issues;
    }

    _deduplicateIssues(issues) {
        const seen = new Set();
        const unique = [];

        for (const issue of issues) {
            const key = `${issue.line}:${issue.column}:${issue.message}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(issue);
            }
        }

        return unique;
    }

    _updateDecorations(issues) {
        const model = this.editor.getModel();
        const oldDecorations = this.decorations;
        const newDecorations = [];

        issues.forEach(issue => {
            const lineNumber = issue.line;
            const column = issue.column || 1;
            const lineContent = model.getLineContent(lineNumber) || '';
            const endColumn = Math.min(column + 1, lineContent.length + 1);

            newDecorations.push({
                range: new this.monaco.Range(
                    lineNumber,
                    Math.max(1, column),
                    lineNumber,
                    endColumn
                ),
                options: {
                    isWholeLine: issue.type === 'error' ? false : true,
                    className: issue.severity === 'error' 
                        ? 'lint-decoration-error' 
                        : 'lint-decoration-warning',
                    glyphMarginClassName: issue.severity === 'error' 
                        ? 'lint-glyph-error' 
                        : 'lint-glyph-warning',
                    minimap: {
                        color: issue.severity === 'error' ? '#ff0000' : '#ffa500'
                    }
                }
            });
        });

        const markers = issues.map(issue => ({
            startLineNumber: issue.line,
            startColumn: issue.column || 1,
            endLineNumber: issue.line,
            endColumn: (issue.column || 1) + 1,
            message: issue.message,
            severity: issue.severity === 'error' 
                ? 8 
                : 4
        }));

        this.monaco.editor.setModelMarkers(model, 'code-auto-completer', markers);

        this.decorations = this.editor.deltaDecorations(oldDecorations, newDecorations);
    }

    forceLint() {
        if (this.lintTimeout) {
            clearTimeout(this.lintTimeout);
        }
        this.currentVersion++;
        this.lint(true);
    }

    getCurrentIssues() {
        return this.lastKnownIssues || [];
    }

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        if (this.lintTimeout) {
            clearTimeout(this.lintTimeout);
        }
        this.pendingRequests.forEach(req => clearTimeout(req.timeout));
        this.pendingRequests.clear();
    }
}
