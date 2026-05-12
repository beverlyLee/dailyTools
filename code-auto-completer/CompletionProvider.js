class CompletionProvider {
    constructor() {
        this.worker = null;
        this.pendingRequests = new Map();
        this.requestIdCounter = 0;
        this.editor = null;
        this.monaco = null;
        this.syntaxAnalyzer = null;
    }

    init(editor, monaco, syntaxAnalyzer, workerPath) {
        this.editor = editor;
        this.monaco = monaco;
        this.syntaxAnalyzer = syntaxAnalyzer;
        
        if (workerPath) {
            console.log('[CompletionProvider] 尝试初始化 Worker:', workerPath);
            this._initWorker(workerPath);
        } else {
            console.log('[CompletionProvider] workerPath 为空，使用同步模式');
            this.worker = null;
        }
        
        this._registerCompletionProvider();
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
                console.warn('[CompletionProvider] Worker 错误（使用同步模式）:', error);
                this.worker = null;
            };
        } catch (e) {
            console.warn('[CompletionProvider] 无法创建 Web Worker，使用同步模式:', e.message);
            this.worker = null;
        }
    }

    _handleWorkerResponse(data) {
        const { task, id, predictions, issues } = data;
        const request = this.pendingRequests.get(id);
        
        if (request) {
            this.pendingRequests.delete(id);
            if (task === 'predict' && request.resolve) {
                request.resolve(predictions);
            }
        }
    }

    _registerCompletionProvider() {
        const self = this;
        
        this.monaco.languages.registerCompletionItemProvider('javascript', {
            triggerCharacters: ['.', '(', ',', ' ', '\n'],
            provideCompletionItems: function(model, position, context, token) {
                return self._provideCompletionItems(model, position, context, token);
            }
        });
    }

    async _provideCompletionItems(model, position, context, token) {
        const contextInfo = this.syntaxAnalyzer.analyzeContext(position);
        const code = model.getValue();
        
        let predictions = [];
        
        try {
            if (this.worker) {
                predictions = await this._getPredictionsFromWorker(contextInfo, code);
            } else {
                predictions = this._getPredictionsSync(contextInfo, code);
            }
        } catch (e) {
            console.error('获取预测失败:', e);
            predictions = [];
        }
        
        const suggestions = predictions.map((prediction, index) => {
            return this._convertToMonacoSuggestion(prediction, index);
        });

        return {
            suggestions: suggestions
        };
    }

    _getPredictionsFromWorker(context, code) {
        return new Promise((resolve) => {
            const id = ++this.requestIdCounter;
            
            this.pendingRequests.set(id, { resolve });
            
            this.worker.postMessage({
                task: 'predict',
                context: context,
                code: code,
                id: id
            });

            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    resolve([]);
                }
            }, 1000);
        });
    }

    _getPredictionsSync(context, code) {
        const predictions = [];
        const currentWord = context.currentWord || '';
        const contextType = context.contextType;
        const textBefore = context.textBeforeCursor;

        if (context.isInString || context.isInComment) {
            return [];
        }

        const builtin = this._getBuiltinCompletions();

        if (contextType === 'property') {
            const objectMatch = textBefore.match(/(\w+)\.\s*$/);
            if (objectMatch) {
                const objectName = objectMatch[1];
                const props = builtin.objectProperties[objectName];
                if (props) {
                    props.forEach(prop => {
                        if (prop.startsWith(currentWord)) {
                            predictions.push({
                                label: prop,
                                kind: 'property',
                                detail: `${objectName}.${prop}`,
                                insertText: prop,
                                priority: 95
                            });
                        }
                    });
                }

                if (builtin.propertyCompletions[objectName]) {
                    builtin.propertyCompletions[objectName].forEach(comp => {
                        if (comp.label.startsWith(currentWord)) {
                            predictions.push({
                                ...comp,
                                priority: (comp.priority || 90) - 5
                            });
                        }
                    });
                }
            }
        }

        if (contextType === 'identifier' || contextType === 'unknown') {
            builtin.keywords.forEach(item => {
                if (item.label.startsWith(currentWord) && currentWord.length > 0) {
                    predictions.push({
                        ...item
                    });
                }
            });

            builtin.globalObjects.forEach(item => {
                if (item.label.startsWith(currentWord)) {
                    predictions.push({
                        ...item
                    });
                }
            });

            builtin.commonPatterns.forEach(item => {
                if (item.label.startsWith(currentWord)) {
                    predictions.push({
                        ...item
                    });
                }
            });
        }

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

    _getBuiltinCompletions() {
        return {
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
                { label: 'class', kind: 'keyword', detail: '类声明', insertText: 'class ${1:ClassName} {\n\t$0\n}', priority: 90, hasSnippet: true },
                { label: 'new', kind: 'keyword', detail: '创建实例', insertText: 'new ', priority: 85 },
                { label: 'try', kind: 'keyword', detail: 'try语句', insertText: 'try {\n\t$0\n} catch (${1:error}) {\n\t\n}', priority: 85, hasSnippet: true },
                { label: 'catch', kind: 'keyword', detail: '捕获异常', insertText: ' catch (${1:error}) {\n\t$0\n}', priority: 80, hasSnippet: true },
                { label: 'throw', kind: 'keyword', detail: '抛出异常', insertText: 'throw ', priority: 80 },
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
                { label: 'JSON', kind: 'class', detail: 'JSON处理对象', insertText: 'JSON', priority: 90 },
                { label: 'Promise', kind: 'class', detail: 'Promise对象', insertText: 'Promise', priority: 90 }
            ],
            
            commonPatterns: [
                { label: 'console.log', kind: 'snippet', detail: '快速输出日志', insertText: 'console.log(${1:message});', priority: 90, hasSnippet: true },
                { label: 'function expression', kind: 'snippet', detail: '函数表达式', insertText: 'const ${1:name} = function($2) {\n\t$0\n};', priority: 85, hasSnippet: true },
                { label: 'arrow function', kind: 'snippet', detail: '箭头函数', insertText: 'const ${1:name} = ($2) => {\n\t$0\n};', priority: 90, hasSnippet: true },
                { label: 'for each', kind: 'snippet', detail: 'forEach循环', insertText: '${1:array}.forEach((${2:item}) => {\n\t$0\n});', priority: 85, hasSnippet: true },
                { label: 'for of', kind: 'snippet', detail: 'for...of循环', insertText: 'for (const ${1:item} of ${2:iterable}) {\n\t$0\n}', priority: 85, hasSnippet: true },
                { label: 'if else', kind: 'snippet', detail: 'if-else语句', insertText: 'if (${1:condition}) {\n\t$2\n} else {\n\t$0\n}', priority: 85, hasSnippet: true },
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
            },
            
            propertyCompletions: {
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
            }
        };
    }

    _convertToMonacoSuggestion(prediction, index) {
        const kindMap = {
            'keyword': this.monaco.languages.CompletionItemKind.Keyword,
            'class': this.monaco.languages.CompletionItemKind.Class,
            'method': this.monaco.languages.CompletionItemKind.Method,
            'property': this.monaco.languages.CompletionItemKind.Property,
            'variable': this.monaco.languages.CompletionItemKind.Variable,
            'function': this.monaco.languages.CompletionItemKind.Function,
            'snippet': this.monaco.languages.CompletionItemKind.Snippet,
            'module': this.monaco.languages.CompletionItemKind.Module,
            'field': this.monaco.languages.CompletionItemKind.Field
        };

        const kind = kindMap[prediction.kind] || this.monaco.languages.CompletionItemKind.Text;
        
        const insertText = prediction.insertText || prediction.label;
        const insertTextRules = prediction.hasSnippet 
            ? this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet 
            : undefined;

        const suggestion = {
            label: prediction.label,
            kind: kind,
            detail: prediction.detail,
            insertText: insertText,
            documentation: prediction.documentation,
            sortText: String(1000 - (prediction.priority || 50)).padStart(4, '0') + '_' + String(index).padStart(4, '0'),
            filterText: prediction.label,
            range: undefined
        };

        if (insertTextRules) {
            suggestion.insertTextRules = insertTextRules;
        }

        return suggestion;
    }

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingRequests.clear();
    }
}
