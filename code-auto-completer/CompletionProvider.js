class CompletionProvider {
    constructor() {
        this.editor = null;
        this.monaco = null;
        this.syntaxAnalyzer = null;
        this.worker = null;
        this.workerReady = false;
        this.completionItems = this.initCompletionItems();
    }

    initCompletionItems() {
        return {
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
            keywords: [
                { label: 'function', kind: 'keyword', detail: '函数声明', insertText: 'function' },
                { label: 'class', kind: 'keyword', detail: '类声明', insertText: 'class' },
                { label: 'const', kind: 'keyword', detail: '常量声明', insertText: 'const' },
                { label: 'let', kind: 'keyword', detail: '变量声明', insertText: 'let' },
                { label: 'var', kind: 'keyword', detail: '变量声明', insertText: 'var' },
                { label: 'if', kind: 'keyword', detail: '条件语句', insertText: 'if' },
                { label: 'else', kind: 'keyword', detail: '否则', insertText: 'else' },
                { label: 'for', kind: 'keyword', detail: 'for 循环', insertText: 'for' },
                { label: 'while', kind: 'keyword', detail: 'while 循环', insertText: 'while' },
                { label: 'do', kind: 'keyword', detail: 'do-while 循环', insertText: 'do' },
                { label: 'switch', kind: 'keyword', detail: 'switch 语句', insertText: 'switch' },
                { label: 'case', kind: 'keyword', detail: 'case 分支', insertText: 'case' },
                { label: 'default', kind: 'keyword', detail: 'default 分支', insertText: 'default' },
                { label: 'return', kind: 'keyword', detail: '返回值', insertText: 'return' },
                { label: 'break', kind: 'keyword', detail: '跳出', insertText: 'break' },
                { label: 'continue', kind: 'keyword', detail: '继续', insertText: 'continue' },
                { label: 'try', kind: 'keyword', detail: '异常捕获', insertText: 'try' },
                { label: 'catch', kind: 'keyword', detail: '捕获异常', insertText: 'catch' },
                { label: 'finally', kind: 'keyword', detail: '最终执行', insertText: 'finally' },
                { label: 'throw', kind: 'keyword', detail: '抛出异常', insertText: 'throw' },
                { label: 'new', kind: 'keyword', detail: '创建实例', insertText: 'new' },
                { label: 'typeof', kind: 'keyword', detail: '类型检查', insertText: 'typeof' },
                { label: 'instanceof', kind: 'keyword', detail: '实例检查', insertText: 'instanceof' },
                { label: 'this', kind: 'keyword', detail: '当前对象', insertText: 'this' },
                { label: 'super', kind: 'keyword', detail: '父类引用', insertText: 'super' },
                { label: 'import', kind: 'keyword', detail: '导入模块', insertText: 'import' },
                { label: 'export', kind: 'keyword', detail: '导出模块', insertText: 'export' },
                { label: 'from', kind: 'keyword', detail: '从...导入', insertText: 'from' },
                { label: 'async', kind: 'keyword', detail: '异步函数', insertText: 'async' },
                { label: 'await', kind: 'keyword', detail: '等待 Promise', insertText: 'await' }
            ],
            document: [
                { label: 'getElementById', kind: 'method', detail: '通过 ID 获取元素', insertText: 'getElementById(${1:id})', insertTextRules: 'snippet' },
                { label: 'getElementsByClassName', kind: 'method', detail: '通过类名获取元素', insertText: 'getElementsByClassName(${1:className})', insertTextRules: 'snippet' },
                { label: 'getElementsByTagName', kind: 'method', detail: '通过标签名获取元素', insertText: 'getElementsByTagName(${1:tagName})', insertTextRules: 'snippet' },
                { label: 'querySelector', kind: 'method', detail: '查询选择器', insertText: 'querySelector(${1:selector})', insertTextRules: 'snippet' },
                { label: 'querySelectorAll', kind: 'method', detail: '查询所有选择器', insertText: 'querySelectorAll(${1:selector})', insertTextRules: 'snippet' },
                { label: 'createElement', kind: 'method', detail: '创建元素', insertText: 'createElement(${1:tagName})', insertTextRules: 'snippet' },
                { label: 'createTextNode', kind: 'method', detail: '创建文本节点', insertText: 'createTextNode(${1:text})', insertTextRules: 'snippet' },
                { label: 'getElementById', kind: 'method', detail: '通过 ID 获取元素', insertText: 'getElementById' },
                { label: 'body', kind: 'property', detail: 'body 元素', insertText: 'body' },
                { label: 'head', kind: 'property', detail: 'head 元素', insertText: 'head' },
                { label: 'title', kind: 'property', detail: '页面标题', insertText: 'title' },
                { label: 'URL', kind: 'property', detail: '页面 URL', insertText: 'URL' },
                { label: 'cookie', kind: 'property', detail: 'Cookie', insertText: 'cookie' },
                { label: 'forms', kind: 'property', detail: '表单集合', insertText: 'forms' },
                { label: 'images', kind: 'property', detail: '图片集合', insertText: 'images' },
                { label: 'links', kind: 'property', detail: '链接集合', insertText: 'links' },
                { label: 'scripts', kind: 'property', detail: '脚本集合', insertText: 'scripts' }
            ],
            console: [
                { label: 'log', kind: 'method', detail: '输出日志', insertText: 'log(${1:message})', insertTextRules: 'snippet' },
                { label: 'error', kind: 'method', detail: '输出错误', insertText: 'error(${1:message})', insertTextRules: 'snippet' },
                { label: 'warn', kind: 'method', detail: '输出警告', insertText: 'warn(${1:message})', insertTextRules: 'snippet' },
                { label: 'info', kind: 'method', detail: '输出信息', insertText: 'info(${1:message})', insertTextRules: 'snippet' },
                { label: 'table', kind: 'method', detail: '输出表格', insertText: 'table(${1:data})', insertTextRules: 'snippet' },
                { label: 'dir', kind: 'method', detail: '输出对象', insertText: 'dir(${1:object})', insertTextRules: 'snippet' },
                { label: 'clear', kind: 'method', detail: '清空控制台', insertText: 'clear()' },
                { label: 'assert', kind: 'method', detail: '断言', insertText: 'assert(${1:condition}, ${2:message})', insertTextRules: 'snippet' },
                { label: 'time', kind: 'method', detail: '开始计时', insertText: 'time(${1:label})', insertTextRules: 'snippet' },
                { label: 'timeEnd', kind: 'method', detail: '结束计时', insertText: 'timeEnd(${1:label})', insertTextRules: 'snippet' },
                { label: 'trace', kind: 'method', detail: '调用栈追踪', insertText: 'trace(${1:message})', insertTextRules: 'snippet' }
            ],
            array: [
                { label: 'push', kind: 'method', detail: '末尾添加元素', insertText: 'push(${1:item})', insertTextRules: 'snippet' },
                { label: 'pop', kind: 'method', detail: '移除末尾元素', insertText: 'pop()' },
                { label: 'shift', kind: 'method', detail: '移除开头元素', insertText: 'shift()' },
                { label: 'unshift', kind: 'method', detail: '开头添加元素', insertText: 'unshift(${1:item})', insertTextRules: 'snippet' },
                { label: 'splice', kind: 'method', detail: '修改数组', insertText: 'splice(${1:start}, ${2:deleteCount})', insertTextRules: 'snippet' },
                { label: 'slice', kind: 'method', detail: '截取数组', insertText: 'slice(${1:start}, ${2:end})', insertTextRules: 'snippet' },
                { label: 'concat', kind: 'method', detail: '连接数组', insertText: 'concat(${1:arrays})', insertTextRules: 'snippet' },
                { label: 'join', kind: 'method', detail: '连接为字符串', insertText: 'join(${1:separator})', insertTextRules: 'snippet' },
                { label: 'indexOf', kind: 'method', detail: '查找索引', insertText: 'indexOf(${1:item})', insertTextRules: 'snippet' },
                { label: 'lastIndexOf', kind: 'method', detail: '反向查找索引', insertText: 'lastIndexOf(${1:item})', insertTextRules: 'snippet' },
                { label: 'forEach', kind: 'method', detail: '遍历数组', insertText: 'forEach((${1:item}, ${2:index}) => {\n\t${3}\n})', insertTextRules: 'snippet' },
                { label: 'map', kind: 'method', detail: '映射数组', insertText: 'map((${1:item}, ${2:index}) => {\n\t${3}\n})', insertTextRules: 'snippet' },
                { label: 'filter', kind: 'method', detail: '过滤数组', insertText: 'filter((${1:item}, ${2:index}) => {\n\t${3}\n})', insertTextRules: 'snippet' },
                { label: 'reduce', kind: 'method', detail: '归约数组', insertText: 'reduce((${1:acc}, ${2:item}) => {\n\t${3}\n}, ${4:initialValue})', insertTextRules: 'snippet' },
                { label: 'find', kind: 'method', detail: '查找元素', insertText: 'find((${1:item}) => {\n\t${2}\n})', insertTextRules: 'snippet' },
                { label: 'findIndex', kind: 'method', detail: '查找索引', insertText: 'findIndex((${1:item}) => {\n\t${2}\n})', insertTextRules: 'snippet' },
                { label: 'some', kind: 'method', detail: '有任一满足', insertText: 'some((${1:item}) => {\n\t${2}\n})', insertTextRules: 'snippet' },
                { label: 'every', kind: 'method', detail: '全部满足', insertText: 'every((${1:item}) => {\n\t${2}\n})', insertTextRules: 'snippet' },
                { label: 'sort', kind: 'method', detail: '排序', insertText: 'sort((${1:a}, ${2:b}) => {\n\t${3}\n})', insertTextRules: 'snippet' },
                { label: 'reverse', kind: 'method', detail: '反转数组', insertText: 'reverse()' },
                { label: 'length', kind: 'property', detail: '数组长度', insertText: 'length' }
            ],
            Math: [
                { label: 'abs', kind: 'method', detail: '绝对值', insertText: 'abs(${1:x})', insertTextRules: 'snippet' },
                { label: 'ceil', kind: 'method', detail: '向上取整', insertText: 'ceil(${1:x})', insertTextRules: 'snippet' },
                { label: 'floor', kind: 'method', detail: '向下取整', insertText: 'floor(${1:x})', insertTextRules: 'snippet' },
                { label: 'round', kind: 'method', detail: '四舍五入', insertText: 'round(${1:x})', insertTextRules: 'snippet' },
                { label: 'random', kind: 'method', detail: '随机数', insertText: 'random()' },
                { label: 'max', kind: 'method', detail: '最大值', insertText: 'max(${1:values})', insertTextRules: 'snippet' },
                { label: 'min', kind: 'method', detail: '最小值', insertText: 'min(${1:values})', insertTextRules: 'snippet' },
                { label: 'pow', kind: 'method', detail: '幂运算', insertText: 'pow(${1:x}, ${2:y})', insertTextRules: 'snippet' },
                { label: 'sqrt', kind: 'method', detail: '平方根', insertText: 'sqrt(${1:x})', insertTextRules: 'snippet' },
                { label: 'PI', kind: 'property', detail: '圆周率', insertText: 'PI' },
                { label: 'E', kind: 'property', detail: '自然对数', insertText: 'E' },
                { label: 'sin', kind: 'method', detail: '正弦', insertText: 'sin(${1:x})', insertTextRules: 'snippet' },
                { label: 'cos', kind: 'method', detail: '余弦', insertText: 'cos(${1:x})', insertTextRules: 'snippet' },
                { label: 'tan', kind: 'method', detail: '正切', insertText: 'tan(${1:x})', insertTextRules: 'snippet' },
                { label: 'log', kind: 'method', detail: '自然对数', insertText: 'log(${1:x})', insertTextRules: 'snippet' }
            ],
            string: [
                { label: 'length', kind: 'property', detail: '字符串长度', insertText: 'length' },
                { label: 'charAt', kind: 'method', detail: '获取字符', insertText: 'charAt(${1:index})', insertTextRules: 'snippet' },
                { label: 'charCodeAt', kind: 'method', detail: '获取字符编码', insertText: 'charCodeAt(${1:index})', insertTextRules: 'snippet' },
                { label: 'indexOf', kind: 'method', detail: '查找索引', insertText: 'indexOf(${1:searchValue})', insertTextRules: 'snippet' },
                { label: 'lastIndexOf', kind: 'method', detail: '反向查找', insertText: 'lastIndexOf(${1:searchValue})', insertTextRules: 'snippet' },
                { label: 'slice', kind: 'method', detail: '截取字符串', insertText: 'slice(${1:start}, ${2:end})', insertTextRules: 'snippet' },
                { label: 'substring', kind: 'method', detail: '截取子串', insertText: 'substring(${1:start}, ${2:end})', insertTextRules: 'snippet' },
                { label: 'split', kind: 'method', detail: '分割字符串', insertText: 'split(${1:separator})', insertTextRules: 'snippet' },
                { label: 'toLowerCase', kind: 'method', detail: '转为小写', insertText: 'toLowerCase()' },
                { label: 'toUpperCase', kind: 'method', detail: '转为大写', insertText: 'toUpperCase()' },
                { label: 'trim', kind: 'method', detail: '去除空白', insertText: 'trim()' },
                { label: 'replace', kind: 'method', detail: '替换', insertText: 'replace(${1:searchValue}, ${2:replaceValue})', insertTextRules: 'snippet' },
                { label: 'concat', kind: 'method', detail: '连接字符串', insertText: 'concat(${1:strings})', insertTextRules: 'snippet' },
                { label: 'startsWith', kind: 'method', detail: '以...开头', insertText: 'startsWith(${1:searchString})', insertTextRules: 'snippet' },
                { label: 'endsWith', kind: 'method', detail: '以...结尾', insertText: 'endsWith(${1:searchString})', insertTextRules: 'snippet' },
                { label: 'includes', kind: 'method', detail: '包含', insertText: 'includes(${1:searchString})', insertTextRules: 'snippet' },
                { label: 'repeat', kind: 'method', detail: '重复', insertText: 'repeat(${1:count})', insertTextRules: 'snippet' }
            ],
            object: [
                { label: 'keys', kind: 'method', detail: '获取键', insertText: 'keys(${1:obj})', insertTextRules: 'snippet' },
                { label: 'values', kind: 'method', detail: '获取值', insertText: 'values(${1:obj})', insertTextRules: 'snippet' },
                { label: 'entries', kind: 'method', detail: '获取键值对', insertText: 'entries(${1:obj})', insertTextRules: 'snippet' },
                { label: 'assign', kind: 'method', detail: '合并对象', insertText: 'assign(${1:target}, ${2:sources})', insertTextRules: 'snippet' },
                { label: 'create', kind: 'method', detail: '创建对象', insertText: 'create(${1:proto})', insertTextRules: 'snippet' },
                { label: 'freeze', kind: 'method', detail: '冻结对象', insertText: 'freeze(${1:obj})', insertTextRules: 'snippet' },
                { label: 'seal', kind: 'method', detail: '密封对象', insertText: 'seal(${1:obj})', insertTextRules: 'snippet' },
                { label: 'hasOwnProperty', kind: 'method', detail: '检查自有属性', insertText: 'hasOwnProperty(${1:property})', insertTextRules: 'snippet' },
                { label: 'toString', kind: 'method', detail: '转为字符串', insertText: 'toString()' },
                { label: 'valueOf', kind: 'method', detail: '获取原始值', insertText: 'valueOf()' }
            ],
            JSON: [
                { label: 'parse', kind: 'method', detail: '解析 JSON', insertText: 'parse(${1:text})', insertTextRules: 'snippet' },
                { label: 'stringify', kind: 'method', detail: '序列化 JSON', insertText: 'stringify(${1:value}, ${2:replacer}, ${3:space})', insertTextRules: 'snippet' }
            ],
            Date: [
                { label: 'getDate', kind: 'method', detail: '获取日期', insertText: 'getDate()' },
                { label: 'getDay', kind: 'method', detail: '获取星期', insertText: 'getDay()' },
                { label: 'getFullYear', kind: 'method', detail: '获取年份', insertText: 'getFullYear()' },
                { label: 'getMonth', kind: 'method', detail: '获取月份', insertText: 'getMonth()' },
                { label: 'getHours', kind: 'method', detail: '获取小时', insertText: 'getHours()' },
                { label: 'getMinutes', kind: 'method', detail: '获取分钟', insertText: 'getMinutes()' },
                { label: 'getSeconds', kind: 'method', detail: '获取秒', insertText: 'getSeconds()' },
                { label: 'getTime', kind: 'method', detail: '获取时间戳', insertText: 'getTime()' },
                { label: 'toDateString', kind: 'method', detail: '转为日期字符串', insertText: 'toDateString()' },
                { label: 'toISOString', kind: 'method', detail: '转为 ISO 字符串', insertText: 'toISOString()' },
                { label: 'toLocaleDateString', kind: 'method', detail: '本地日期字符串', insertText: 'toLocaleDateString()' },
                { label: 'toLocaleTimeString', kind: 'method', detail: '本地时间字符串', insertText: 'toLocaleTimeString()' }
            ],
            Promise: [
                { label: 'all', kind: 'method', detail: '等待所有', insertText: 'all(${1:promises})', insertTextRules: 'snippet' },
                { label: 'allSettled', kind: 'method', detail: '等待所有完成', insertText: 'allSettled(${1:promises})', insertTextRules: 'snippet' },
                { label: 'race', kind: 'method', detail: '任一完成', insertText: 'race(${1:promises})', insertTextRules: 'snippet' },
                { label: 'any', kind: 'method', detail: '任一成功', insertText: 'any(${1:promises})', insertTextRules: 'snippet' },
                { label: 'resolve', kind: 'method', detail: '成功', insertText: 'resolve(${1:value})', insertTextRules: 'snippet' },
                { label: 'reject', kind: 'method', detail: '失败', insertText: 'reject(${1:reason})', insertTextRules: 'snippet' },
                { label: 'then', kind: 'method', detail: '成功回调', insertText: 'then(${1:onFulfilled})', insertTextRules: 'snippet' },
                { label: 'catch', kind: 'method', detail: '失败回调', insertText: 'catch(${1:onRejected})', insertTextRules: 'snippet' },
                { label: 'finally', kind: 'method', detail: '最终回调', insertText: 'finally(${1:onFinally})', insertTextRules: 'snippet' }
            ],
            window: [
                { label: 'alert', kind: 'method', detail: '警告框', insertText: 'alert(${1:message})', insertTextRules: 'snippet' },
                { label: 'confirm', kind: 'method', detail: '确认框', insertText: 'confirm(${1:message})', insertTextRules: 'snippet' },
                { label: 'prompt', kind: 'method', detail: '输入框', insertText: 'prompt(${1:message})', insertTextRules: 'snippet' },
                { label: 'setTimeout', kind: 'method', detail: '延时执行', insertText: 'setTimeout(${1:callback}, ${2:delay})', insertTextRules: 'snippet' },
                { label: 'setInterval', kind: 'method', detail: '定时执行', insertText: 'setInterval(${1:callback}, ${2:delay})', insertTextRules: 'snippet' },
                { label: 'clearTimeout', kind: 'method', detail: '清除延时', insertText: 'clearTimeout(${1:timeoutID})', insertTextRules: 'snippet' },
                { label: 'clearInterval', kind: 'method', detail: '清除定时', insertText: 'clearInterval(${1:intervalID})', insertTextRules: 'snippet' },
                { label: 'fetch', kind: 'method', detail: '网络请求', insertText: 'fetch(${1:url})', insertTextRules: 'snippet' },
                { label: 'addEventListener', kind: 'method', detail: '添加事件监听', insertText: 'addEventListener(${1:type}, ${2:listener})', insertTextRules: 'snippet' },
                { label: 'removeEventListener', kind: 'method', detail: '移除事件监听', insertText: 'removeEventListener(${1:type}, ${2:listener})', insertTextRules: 'snippet' },
                { label: 'open', kind: 'method', detail: '打开新窗口', insertText: 'open(${1:url})', insertTextRules: 'snippet' },
                { label: 'close', kind: 'method', detail: '关闭窗口', insertText: 'close()' },
                { label: 'scroll', kind: 'method', detail: '滚动', insertText: 'scroll(${1:x}, ${2:y})', insertTextRules: 'snippet' },
                { label: 'scrollTo', kind: 'method', detail: '滚动到', insertText: 'scrollTo(${1:x}, ${2:y})', insertTextRules: 'snippet' },
                { label: 'location', kind: 'property', detail: '位置对象', insertText: 'location' },
                { label: 'history', kind: 'property', detail: '历史对象', insertText: 'history' },
                { label: 'localStorage', kind: 'property', detail: '本地存储', insertText: 'localStorage' },
                { label: 'sessionStorage', kind: 'property', detail: '会话存储', insertText: 'sessionStorage' },
                { label: 'navigator', kind: 'property', detail: '浏览器信息', insertText: 'navigator' },
                { label: 'screen', kind: 'property', detail: '屏幕信息', insertText: 'screen' },
                { label: 'innerWidth', kind: 'property', detail: '窗口宽度', insertText: 'innerWidth' },
                { label: 'innerHeight', kind: 'property', detail: '窗口高度', insertText: 'innerHeight' }
            ]
        };
    }

    init(editor, monaco, syntaxAnalyzer, worker) {
        this.editor = editor;
        this.monaco = monaco;
        this.syntaxAnalyzer = syntaxAnalyzer;
        this.worker = worker;
        this.workerReady = !!worker;

        if (worker) {
            worker.onmessage = (event) => this.handleWorkerMessage(event);
            worker.onerror = (error) => console.error('[CompletionProvider] Worker 错误:', error);
        }

        this.registerCompletionProvider();
    }

    handleWorkerMessage(event) {
        const { type, data } = event.data;
        if (type === 'ready') {
            this.workerReady = true;
            console.log('[CompletionProvider] Worker 已就绪');
        }
    }

    registerCompletionProvider() {
        const self = this;

        this.monaco.languages.registerCompletionItemProvider('javascript', {
            triggerCharacters: ['.'],
            
            provideCompletionItems: (model, position) => {
                const context = self.syntaxAnalyzer.analyzeContext(position);
                const suggestions = self.getSuggestions(context, model);
                
                return {
                    suggestions: suggestions
                };
            }
        });
    }

    getSuggestions(context, model) {
        const { contextType, currentWord, prefix } = context;
        let suggestions = [];

        switch (contextType) {
            case 'member_access':
                suggestions = this.getMemberSuggestions(prefix);
                break;
            case 'builtin_member':
                suggestions = this.getBuiltinMemberSuggestions(prefix);
                break;
            case 'identifier':
            case 'identifier_at_start':
                suggestions = this.getIdentifierSuggestions(currentWord, model);
                break;
            case 'keyword_context':
                suggestions = this.getKeywordSuggestions(currentWord);
                break;
            default:
                suggestions = this.getDefaultSuggestions(currentWord, model);
        }

        return this.filterByPrefix(suggestions, currentWord);
    }

    getMemberSuggestions(prefix) {
        const objectMatch = prefix.match(/([a-zA-Z0-9_$]+)\.[a-zA-Z0-9_$]*$/);
        if (!objectMatch) return [];

        const objectName = objectMatch[1].toLowerCase();
        const mapping = {
            'document': 'document',
            'console': 'console',
            'array': 'array',
            'math': 'Math',
            'string': 'string',
            'object': 'object',
            'json': 'JSON',
            'date': 'Date',
            'promise': 'Promise',
            'window': 'window'
        };

        const key = mapping[objectName];
        if (key && this.completionItems[key]) {
            return this.completionItems[key].map(item => this.convertToMonacoItem(item));
        }

        return [
            ...this.convertToMonacoItems(this.completionItems.array),
            ...this.convertToMonacoItems(this.completionItems.object),
            ...this.convertToMonacoItems(this.completionItems.string)
        ];
    }

    getBuiltinMemberSuggestions(prefix) {
        const objectMatch = prefix.match(/([a-zA-Z0-9_$]+)\.$/);
        if (!objectMatch) return [];

        const objectName = objectMatch[1];
        const mapping = {
            'document': 'document',
            'console': 'console',
            'Array': 'array',
            'Math': 'Math',
            'String': 'string',
            'Object': 'object',
            'JSON': 'JSON',
            'Date': 'Date',
            'Promise': 'Promise',
            'window': 'window'
        };

        const key = mapping[objectName];
        if (key && this.completionItems[key]) {
            return this.convertToMonacoItems(this.completionItems[key]);
        }

        return [];
    }

    getIdentifierSuggestions(currentWord, model) {
        const code = model.getValue();
        const variables = this.syntaxAnalyzer.extractVariables(code);
        
        const variableSuggestions = variables.map(v => ({
            label: v,
            kind: 'variable',
            detail: '局部变量',
            insertText: v
        }));

        return [
            ...this.convertToMonacoItems(this.completionItems.global),
            ...this.convertToMonacoItems(this.completionItems.keywords),
            ...this.convertToMonacoItems(variableSuggestions)
        ];
    }

    getKeywordSuggestions(currentWord) {
        return this.convertToMonacoItems(this.completionItems.keywords);
    }

    getDefaultSuggestions(currentWord, model) {
        return this.getIdentifierSuggestions(currentWord, model);
    }

    filterByPrefix(suggestions, prefix) {
        if (!prefix) return suggestions;

        const lowerPrefix = prefix.toLowerCase();
        return suggestions.filter(item => 
            item.label.toLowerCase().startsWith(lowerPrefix)
        ).map(item => ({
            ...item,
            range: undefined,
            insertTextRules: item.insertTextRules || this.monaco.languages.CompletionItemInsertTextRule.None
        }));
    }

    convertToMonacoItems(items) {
        return items.map(item => this.convertToMonacoItem(item));
    }

    convertToMonacoItem(item) {
        const kindMap = {
            'method': this.monaco.languages.CompletionItemKind.Method,
            'function': this.monaco.languages.CompletionItemKind.Function,
            'class': this.monaco.languages.CompletionItemKind.Class,
            'keyword': this.monaco.languages.CompletionItemKind.Keyword,
            'variable': this.monaco.languages.CompletionItemKind.Variable,
            'value': this.monaco.languages.CompletionItemKind.Value,
            'property': this.monaco.languages.CompletionItemKind.Property,
            'field': this.monaco.languages.CompletionItemKind.Field,
            'snippet': this.monaco.languages.CompletionItemKind.Snippet
        };

        return {
            label: item.label,
            kind: kindMap[item.kind] || this.monaco.languages.CompletionItemKind.Text,
            detail: item.detail || '',
            insertText: item.insertText,
            insertTextRules: item.insertTextRules === 'snippet' 
                ? this.monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : this.monaco.languages.CompletionItemInsertTextRule.None,
            documentation: item.detail
        };
    }

    async predictWithContext(context) {
        if (!this.workerReady || !this.worker) {
            return [];
        }

        return new Promise((resolve) => {
            const requestId = Date.now().toString();
            
            const handleResponse = (event) => {
                if (event.data.type === 'predictions' && event.data.requestId === requestId) {
                    this.worker.removeEventListener('message', handleResponse);
                    resolve(event.data.predictions || []);
                }
            };

            this.worker.addEventListener('message', handleResponse);

            this.worker.postMessage({
                type: 'predict',
                requestId,
                data: context
            });

            setTimeout(() => {
                this.worker.removeEventListener('message', handleResponse);
                resolve([]);
            }, 1000);
        });
    }
}
