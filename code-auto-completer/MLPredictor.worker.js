class CodeMLModel {
    constructor() {
        this.builtinCompletions = {
            keywords: [
                { label: 'var', kind: 'keyword', detail: '变量声明', insertText: 'var ', priority: 100 },
                { label: 'let', kind: 'keyword', detail: '块级作用域变量', insertText: 'let ', priority: 100 },
                { label: 'const', kind: 'keyword', detail: '常量声明', insertText: 'const ', priority: 100 },
                { label: 'function', kind: 'keyword', detail: '函数声明', insertText: 'function ${1:name}($2) {\n\t$0\n}', priority: 95, hasSnippet: true },
                { label: 'return', kind: 'keyword', detail: '返回语句', insertText: 'return ', priority: 90 },
                { label: 'if', kind: 'keyword', detail: '条件语句', insertText: 'if (${1:condition}) {\n\t$0\n}', priority: 90, hasSnippet: true },
                { label: 'else', kind: 'keyword', detail: '否则', insertText: ' else {\n\t$0\n}', priority: 85 },
                { label: 'for', kind: 'keyword', detail: 'for循环', insertText: 'for (${1:let i = 0}; ${2:i < 10}; ${3:i++}) {\n\t$0\n}', priority: 90, hasSnippet: true },
                { label: 'while', kind: 'keyword', detail: 'while循环', insertText: 'while (${1:condition}) {\n\t$0\n}', priority: 85, hasSnippet: true },
                { label: 'do', kind: 'keyword', detail: 'do-while循环', insertText: 'do {\n\t$0\n} while ($1);', priority: 80, hasSnippet: true },
                { label: 'switch', kind: 'keyword', detail: 'switch语句', insertText: 'switch (${1:expression}) {\n\tcase $2:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', priority: 80, hasSnippet: true },
                { label: 'case', kind: 'keyword', detail: 'case分支', insertText: 'case $1:\n\t$0\n\tbreak;', priority: 75, hasSnippet: true },
                { label: 'default', kind: 'keyword', detail: '默认分支', insertText: 'default:\n\t$0\n\tbreak;', priority: 75, hasSnippet: true },
                { label: 'break', kind: 'keyword', detail: '跳出循环', insertText: 'break;', priority: 80 },
                { label: 'continue', kind: 'keyword', detail: '继续循环', insertText: 'continue;', priority: 80 },
                { label: 'class', kind: 'keyword', detail: '类声明', insertText: 'class ${1:ClassName} {\n\t$0\n}', priority: 90, hasSnippet: true },
                { label: 'new', kind: 'keyword', detail: '创建实例', insertText: 'new ', priority: 85 },
                { label: 'try', kind: 'keyword', detail: 'try语句', insertText: 'try {\n\t$0\n} catch (${1:error}) {\n\t\n}', priority: 85, hasSnippet: true },
                { label: 'catch', kind: 'keyword', detail: '捕获异常', insertText: ' catch (${1:error}) {\n\t$0\n}', priority: 80, hasSnippet: true },
                { label: 'finally', kind: 'keyword', detail: '最终执行', insertText: ' finally {\n\t$0\n}', priority: 75, hasSnippet: true },
                { label: 'throw', kind: 'keyword', detail: '抛出异常', insertText: 'throw ', priority: 80 },
                { label: 'import', kind: 'keyword', detail: '导入模块', insertText: 'import ', priority: 85 },
                { label: 'export', kind: 'keyword', detail: '导出模块', insertText: 'export ', priority: 85 },
                { label: 'async', kind: 'keyword', detail: '异步函数', insertText: 'async ', priority: 85 },
                { label: 'await', kind: 'keyword', detail: '等待Promise', insertText: 'await ', priority: 85 }
            ],
            
            globalObjects: [
                { label: 'document', kind: 'class', detail: 'DOM文档对象', insertText: 'document', priority: 100 },
                { label: 'window', kind: 'class', detail: '浏览器窗口对象', insertText: 'window', priority: 100 },
                { label: 'console', kind: 'class', detail: '控制台对象', insertText: 'console', priority: 95 },
                { label: 'Math', kind: 'class', detail: '数学对象', insertText: 'Math', priority: 90 },
                { label: 'Date', kind: 'class', detail: '日期对象', insertText: 'Date', priority: 90 },
                { label: 'Array', kind: 'class', detail: '数组构造函数', insertText: 'Array', priority: 90 },
                { label: 'Object', kind: 'class', detail: '对象构造函数', insertText: 'Object', priority: 90 },
                { label: 'String', kind: 'class', detail: '字符串构造函数', insertText: 'String', priority: 90 },
                { label: 'Number', kind: 'class', detail: '数字构造函数', insertText: 'Number', priority: 90 },
                { label: 'Boolean', kind: 'class', detail: '布尔构造函数', insertText: 'Boolean', priority: 90 },
                { label: 'JSON', kind: 'class', detail: 'JSON处理对象', insertText: 'JSON', priority: 90 },
                { label: 'Promise', kind: 'class', detail: 'Promise对象', insertText: 'Promise', priority: 90 },
                { label: 'Map', kind: 'class', detail: 'Map对象', insertText: 'Map', priority: 85 },
                { label: 'Set', kind: 'class', detail: 'Set对象', insertText: 'Set', priority: 85 },
                { label: 'Symbol', kind: 'class', detail: 'Symbol对象', insertText: 'Symbol', priority: 85 }
            ],
            
            documentMethods: [
                { label: 'getElementById', kind: 'method', detail: 'document.getElementById()', insertText: 'getElementById(${1:id})', documentation: '通过ID获取DOM元素', priority: 100 },
                { label: 'getElementsByClassName', kind: 'method', detail: 'document.getElementsByClassName()', insertText: 'getElementsByClassName(${1:className})', documentation: '通过类名获取DOM元素', priority: 95 },
                { label: 'getElementsByTagName', kind: 'method', detail: 'document.getElementsByTagName()', insertText: 'getElementsByTagName(${1:tagName})', documentation: '通过标签名获取DOM元素', priority: 95 },
                { label: 'querySelector', kind: 'method', detail: 'document.querySelector()', insertText: 'querySelector(${1:selector})', documentation: '通过CSS选择器获取第一个匹配元素', priority: 100 },
                { label: 'querySelectorAll', kind: 'method', detail: 'document.querySelectorAll()', insertText: 'querySelectorAll(${1:selector})', documentation: '通过CSS选择器获取所有匹配元素', priority: 95 },
                { label: 'createElement', kind: 'method', detail: 'document.createElement()', insertText: 'createElement(${1:tagName})', documentation: '创建新的DOM元素', priority: 95 },
                { label: 'createTextNode', kind: 'method', detail: 'document.createTextNode()', insertText: 'createTextNode(${1:text})', documentation: '创建文本节点', priority: 85 },
                { label: 'addEventListener', kind: 'method', detail: 'element.addEventListener()', insertText: 'addEventListener(${1:event}, ${2:handler})', documentation: '添加事件监听器', priority: 90 },
                { label: 'removeEventListener', kind: 'method', detail: 'element.removeEventListener()', insertText: 'removeEventListener(${1:event}, ${2:handler})', documentation: '移除事件监听器', priority: 85 },
                { label: 'appendChild', kind: 'method', detail: 'element.appendChild()', insertText: 'appendChild(${1:node})', documentation: '追加子节点', priority: 90 },
                { label: 'insertBefore', kind: 'method', detail: 'element.insertBefore()', insertText: 'insertBefore(${1:newNode}, ${2:referenceNode})', documentation: '在指定位置插入节点', priority: 85 },
                { label: 'removeChild', kind: 'method', detail: 'element.removeChild()', insertText: 'removeChild(${1:node})', documentation: '移除子节点', priority: 85 }
            ],
            
            consoleMethods: [
                { label: 'log', kind: 'method', detail: 'console.log()', insertText: 'log(${1:message})', documentation: '输出日志', priority: 100 },
                { label: 'error', kind: 'method', detail: 'console.error()', insertText: 'error(${1:message})', documentation: '输出错误', priority: 95 },
                { label: 'warn', kind: 'method', detail: 'console.warn()', insertText: 'warn(${1:message})', documentation: '输出警告', priority: 90 },
                { label: 'info', kind: 'method', detail: 'console.info()', insertText: 'info(${1:message})', documentation: '输出信息', priority: 85 },
                { label: 'debug', kind: 'method', detail: 'console.debug()', insertText: 'debug(${1:message})', documentation: '输出调试信息', priority: 85 },
                { label: 'table', kind: 'method', detail: 'console.table()', insertText: 'table(${1:data})', documentation: '以表格形式输出', priority: 85 },
                { label: 'group', kind: 'method', detail: 'console.group()', insertText: 'group(${1:label})', documentation: '创建日志分组', priority: 80 },
                { label: 'groupEnd', kind: 'method', detail: 'console.groupEnd()', insertText: 'groupEnd()', documentation: '结束日志分组', priority: 80 },
                { label: 'time', kind: 'method', detail: 'console.time()', insertText: 'time(${1:label})', documentation: '开始计时', priority: 80 },
                { label: 'timeEnd', kind: 'method', detail: 'console.timeEnd()', insertText: 'timeEnd(${1:label})', documentation: '结束计时', priority: 80 }
            ],
            
            commonPatterns: [
                { label: 'console.log', kind: 'snippet', detail: '快速输出日志', insertText: 'console.log(${1:message});', priority: 90, hasSnippet: true },
                { label: 'function expression', kind: 'snippet', detail: '函数表达式', insertText: 'const ${1:name} = function($2) {\n\t$0\n};', priority: 85, hasSnippet: true },
                { label: 'arrow function', kind: 'snippet', detail: '箭头函数', insertText: 'const ${1:name} = ($2) => {\n\t$0\n};', priority: 90, hasSnippet: true },
                { label: 'iife', kind: 'snippet', detail: '立即执行函数', insertText: '(function() {\n\t$0\n})();', priority: 80, hasSnippet: true },
                { label: 'for each', kind: 'snippet', detail: 'forEach循环', insertText: '${1:array}.forEach((${2:item}) => {\n\t$0\n});', priority: 85, hasSnippet: true },
                { label: 'for of', kind: 'snippet', detail: 'for...of循环', insertText: 'for (const ${1:item} of ${2:iterable}) {\n\t$0\n}', priority: 85, hasSnippet: true },
                { label: 'if else', kind: 'snippet', detail: 'if-else语句', insertText: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}', priority: 85, hasSnippet: true },
                { label: 'ternary', kind: 'snippet', detail: '三元表达式', insertText: '${1:condition} ? ${2:trueValue} : ${3:falseValue}', priority: 80, hasSnippet: true },
                { label: 'try catch', kind: 'snippet', detail: 'try-catch语句', insertText: 'try {\n\t$1\n} catch (${2:error}) {\n\t$0\n}', priority: 85, hasSnippet: true },
                { label: 'fetch', kind: 'snippet', detail: 'fetch API', insertText: 'fetch(${1:url})\n\t.then(response => response.json())\n\t.then(data => {\n\t\t$0\n\t})\n\t.catch(error => console.error(error));', priority: 85, hasSnippet: true }
            ],
            
            objectProperties: {
                document: ['getElementById', 'getElementsByClassName', 'getElementsByTagName', 'querySelector', 'querySelectorAll', 'createElement', 'createTextNode', 'body', 'head', 'title', 'URL', 'domain', 'forms', 'images', 'links', 'cookie'],
                window: ['document', 'console', 'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'localStorage', 'sessionStorage', 'location', 'history', 'navigator', 'screen'],
                console: ['log', 'error', 'warn', 'info', 'debug', 'table', 'group', 'groupEnd', 'time', 'timeEnd', 'clear', 'count', 'trace', 'dir', 'dirxml'],
                Math: ['abs', 'ceil', 'floor', 'round', 'max', 'min', 'pow', 'sqrt', 'random', 'sin', 'cos', 'tan', 'log', 'exp', 'PI', 'E', 'LN2', 'LN10'],
                Date: ['now', 'parse', 'UTC', 'getFullYear', 'getMonth', 'getDate', 'getDay', 'getHours', 'getMinutes', 'getSeconds', 'setFullYear', 'setMonth', 'setDate'],
                Array: ['isArray', 'from', 'of', 'prototype', 'length'],
                Object: ['create', 'assign', 'keys', 'values', 'entries', 'freeze', 'seal', 'is', 'defineProperty', 'defineProperties'],
                JSON: ['parse', 'stringify'],
                String: ['fromCharCode', 'fromCodePoint', 'raw', 'prototype', 'length'],
                Number: ['isNaN', 'isFinite', 'isInteger', 'parseInt', 'parseFloat', 'MAX_VALUE', 'MIN_VALUE', 'NaN', 'NEGATIVE_INFINITY', 'POSITIVE_INFINITY'],
                Promise: ['resolve', 'reject', 'all', 'race', 'allSettled', 'any', 'then', 'catch', 'finally']
            }
        };

        this.propertyCompletions = {
            getElementById: [
                { label: 'innerText', kind: 'property', detail: 'DOM元素属性', priority: 90 },
                { label: 'innerHTML', kind: 'property', detail: 'DOM元素属性', priority: 90 },
                { label: 'textContent', kind: 'property', detail: 'DOM元素属性', priority: 90 },
                { label: 'value', kind: 'property', detail: '表单值', priority: 90 },
                { label: 'className', kind: 'property', detail: 'CSS类名', priority: 85 },
                { label: 'style', kind: 'property', detail: '样式对象', priority: 85 },
                { label: 'addEventListener', kind: 'method', detail: '添加事件监听器', priority: 90 },
                { label: 'appendChild', kind: 'method', detail: '追加子节点', priority: 85 },
                { label: 'setAttribute', kind: 'method', detail: '设置属性', priority: 85 },
                { label: 'getAttribute', kind: 'method', detail: '获取属性', priority: 85 }
            ]
        };

        this.nGramModel = this._buildNGramModel();
    }

    _buildNGramModel() {
        const commonSequences = [
            ['doc', 'ument', '.get', 'Element', 'ById'],
            ['doc', 'ument', '.query', 'Selector'],
            ['doc', 'ument', '.query', 'Selector', 'All'],
            ['con', 'sole', '.log'],
            ['con', 'sole', '.error'],
            ['con', 'sole', '.warn'],
            ['for', '(', 'let', 'i', '=', '0'],
            ['for', '(', 'var', 'i', '=', '0'],
            ['if', '(', 'condition'],
            ['else', '{'],
            ['function', 'name', '(', ')'],
            ['return', 'value'],
            ['const', 'name', '=', 'value'],
            ['let', 'name', '=', 'value'],
            ['var', 'name', '=', 'value'],
            ['new', 'Date', '()'],
            ['Math', '.random'],
            ['Math', '.floor'],
            ['Math', '.ceil'],
            ['Promise', '.resolve'],
            ['Promise', '.reject'],
            ['async', 'function', 'name'],
            ['await', 'promise'],
            ['try', '{'],
            ['catch', '(', 'error', ')'],
            ['throw', 'new', 'Error']
        ];

        const ngramMap = new Map();
        
        commonSequences.forEach(sequence => {
            for (let i = 0; i < sequence.length - 1; i++) {
                const key = sequence.slice(Math.max(0, i - 1), i + 1).join(' ');
                const next = sequence[i + 1];
                
                if (!ngramMap.has(key)) {
                    ngramMap.set(key, new Map());
                }
                
                const nextMap = ngramMap.get(key);
                nextMap.set(next, (nextMap.get(next) || 0) + 1);
            }
        });

        return ngramMap;
    }

    predict(context, code) {
        const predictions = [];
        const currentWord = context.currentWord || '';
        const contextType = context.contextType;
        const textBefore = context.textBeforeCursor;

        if (context.isInString || context.isInComment) {
            return [];
        }

        if (contextType === 'property') {
            const objectMatch = textBefore.match(/(\w+)\.\s*$/);
            if (objectMatch) {
                const objectName = objectMatch[1];
                const props = this.builtinCompletions.objectProperties[objectName];
                if (props) {
                    props.forEach(prop => {
                        if (prop.startsWith(currentWord)) {
                            predictions.push({
                                label: prop,
                                kind: 'property',
                                detail: `${objectName}.${prop}`,
                                insertText: prop,
                                priority: 95,
                                source: 'property'
                            });
                        }
                    });
                }

                if (this.propertyCompletions[objectName]) {
                    this.propertyCompletions[objectName].forEach(comp => {
                        if (comp.label.startsWith(currentWord)) {
                            predictions.push({
                                ...comp,
                                source: 'method',
                                priority: (comp.priority || 90) - 5
                            });
                        }
                    });
                }
            }
        }

        if (contextType === 'identifier' || contextType === 'unknown') {
            this.builtinCompletions.keywords.forEach(item => {
                if (item.label.startsWith(currentWord) && currentWord.length > 0) {
                    predictions.push({
                        ...item,
                        source: 'keyword'
                    });
                }
            });

            this.builtinCompletions.globalObjects.forEach(item => {
                if (item.label.startsWith(currentWord)) {
                    predictions.push({
                        ...item,
                        source: 'global'
                    });
                }
            });

            this.builtinCompletions.commonPatterns.forEach(item => {
                if (item.label.startsWith(currentWord)) {
                    predictions.push({
                        ...item,
                        source: 'pattern'
                    });
                }
            });
        }

        this._applyNGramPrediction(predictions, context, code);

        predictions.sort((a, b) => {
            const priorityDiff = (b.priority || 0) - (a.priority || 0);
            if (priorityDiff !== 0) return priorityDiff;
            
            if (currentWord) {
                const aStarts = a.label.startsWith(currentWord);
                const bStarts = b.label.startsWith(currentWord);
                if (aStarts !== bStarts) return aStarts ? -1 : 1;
            }
            
            return a.label.localeCompare(b.label);
        });

        return predictions.slice(0, 50);
    }

    _applyNGramPrediction(predictions, context, code) {
        const tokens = this._tokenize(code);
        if (tokens.length < 1) return;

        const lastToken = tokens[tokens.length - 1];
        const secondLastToken = tokens.length >= 2 ? tokens[tokens.length - 2] : '';
        
        let key = lastToken;
        if (secondLastToken) {
            key = `${secondLastToken} ${lastToken}`;
        }

        if (this.nGramModel.has(key)) {
            const nextMap = this.nGramModel.get(key);
            nextMap.forEach((count, nextToken) => {
                const existing = predictions.find(p => p.label === nextToken);
                if (existing) {
                    existing.priority = (existing.priority || 0) + count * 5;
                    existing.fromNgram = true;
                }
            });
        }
    }

    _tokenize(text) {
        const tokens = [];
        const regex = /[A-Za-z_][A-Za-z0-9_]*|\d+|[+\-*/=<>!&|%^~(){}[\];,.?:'"]/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            tokens.push(match[0]);
        }
        
        return tokens;
    }
}

const model = new CodeMLModel();

self.onmessage = function(e) {
    const { task, context, code, id, version } = e.data;
    
    console.log('[Worker] 收到消息:', { task, id, version, codeLength: code ? code.length : 0 });
    
    if (task === 'predict') {
        const predictions = model.predict(context, code);
        self.postMessage({
            task: 'predict',
            predictions: predictions,
            id: id,
            version: version
        });
    } else if (task === 'lint') {
        const issues = analyzeCode(code);
        console.log('[Worker] lint 完成，发现', issues.length, '个问题');
        self.postMessage({
            task: 'lint',
            issues: issues,
            id: id,
            version: version
        });
    }
};

function analyzeCode(code) {
    const issues = [];
    const lines = code.split('\n');
    
    const declarations = collectAllDeclarations(code);
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

    const variableIssues = checkVariableUsage(code, definedVariables, definedFunctions, definedParams);
    issues.push(...variableIssues);

    const deduplicated = deduplicateIssues(issues);
    return deduplicated;
}

function collectAllDeclarations(code) {
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

        const lineWithoutComments = removeStringsAndComments(line);
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

function removeStringsAndComments(line) {
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

function checkVariableUsage(code, definedVariables, definedFunctions, definedParams) {
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
    const declarationNames = new Set();

    lines.forEach((line, lineIndex) => {
        const lineNum = lineIndex + 1;
        const lineWithoutComments = removeStringsAndComments(line);
        
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

function deduplicateIssues(issues) {
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
