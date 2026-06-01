export class Contextualizer {
    constructor() {
        this.semanticPatterns = {
            emailValidation: {
                patterns: ['@', 'email', 'mail'],
                regex: /[\w.+-]+@[\w-]+\.[\w.-]+/,
                purpose: '邮箱地址验证',
                category: 'validation',
                subCategory: 'email'
            },
            urlValidation: {
                patterns: ['http', 'https', 'url', 'www\\.', '://'],
                regex: /https?:\/\//,
                purpose: 'URL地址验证',
                category: 'validation',
                subCategory: 'url'
            },
            dateParsing: {
                patterns: ['date', 'time', '\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}', 'year', 'month', 'day'],
                regex: /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/,
                purpose: '日期时间处理',
                category: 'dateTime',
                subCategory: 'parsing'
            },
            jsonProcessing: {
                patterns: ['JSON', 'json', 'stringify', 'parse', '\\.json'],
                regex: /JSON\.stringify|JSON\.parse/,
                purpose: 'JSON数据序列化/反序列化',
                category: 'dataProcessing',
                subCategory: 'json'
            },
            apiRequest: {
                patterns: ['fetch', 'axios', 'api', 'request', 'response', 'endpoint', 'baseURL'],
                regex: /fetch\(|axios\.|XMLHttpRequest/,
                purpose: 'API网络请求',
                category: 'network',
                subCategory: 'api'
            },
            arrayFiltering: {
                patterns: ['filter', 'find', 'includes', 'indexOf', 'some', 'every'],
                regex: /\.filter\(|\.find\(|\.includes\(/,
                purpose: '数组条件筛选',
                category: 'dataManipulation',
                subCategory: 'filtering'
            },
            arrayMapping: {
                patterns: ['map', 'transform', 'forEach'],
                regex: /\.map\(|\.forEach\(/,
                purpose: '数组元素转换',
                category: 'dataManipulation',
                subCategory: 'transformation'
            },
            sorting: {
                patterns: ['sort', 'order', 'compare', 'asc', 'desc'],
                regex: /\.sort\(|\.reverse\(/,
                purpose: '数据排序',
                category: 'dataManipulation',
                subCategory: 'sorting'
            },
            encryption: {
                patterns: ['encrypt', 'decrypt', 'hash', 'crypto', 'md5', 'sha', 'aes'],
                regex: /crypto|encrypt|decrypt|hash|MD5|SHA/,
                purpose: '数据加密解密',
                category: 'security',
                subCategory: 'encryption'
            },
            authentication: {
                patterns: ['auth', 'token', 'jwt', 'login', 'logout', 'password', 'credentials'],
                regex: /token|jwt|auth|password|login/,
                purpose: '用户认证授权',
                category: 'security',
                subCategory: 'auth'
            },
            fileOperation: {
                patterns: ['file', 'read', 'write', 'save', 'load', 'upload', 'download'],
                regex: /FileReader|Blob|FormData|upload|download/,
                purpose: '文件读写操作',
                category: 'file',
                subCategory: 'io'
            },
            errorHandling: {
                patterns: ['try', 'catch', 'throw', 'error', 'exception'],
                regex: /try\s*\{|catch\s*\(/,
                purpose: '异常捕获处理',
                category: 'errorHandling',
                subCategory: 'tryCatch'
            },
            caching: {
                patterns: ['cache', 'localStorage', 'sessionStorage', 'cookie', 'memory'],
                regex: /localStorage|sessionStorage|cache|cookie/,
                purpose: '数据缓存管理',
                category: 'storage',
                subCategory: 'caching'
            },
            stringFormatting: {
                patterns: ['format', 'replace', 'trim', 'split', 'join', 'substring'],
                regex: /\.replace\(|\.trim\(|\.split\(|\.format/,
                purpose: '字符串格式化处理',
                category: 'string',
                subCategory: 'formatting'
            },
            numberCalculation: {
                patterns: ['sum', 'average', 'count', 'total', 'calculate', 'percent', 'rate'],
                regex: /sum|average|count|total|Math\.|\+|\-|\*|\//,
                purpose: '数值计算',
                category: 'calculation',
                subCategory: 'math'
            },
            validationGeneral: {
                patterns: ['validate', 'check', 'verify', 'is[A-Z]', 'has[A-Z]'],
                regex: /validate|check|verify|isValid|isCorrect/,
                purpose: '数据有效性验证',
                category: 'validation',
                subCategory: 'general'
            },
            parsing: {
                patterns: ['parse', 'decode', 'decodeURI', 'extract'],
                regex: /parse|decodeURI|decode|extract/,
                purpose: '数据解析提取',
                category: 'dataProcessing',
                subCategory: 'parsing'
            },
            listBuilding: {
                patterns: ['push', 'pop', 'shift', 'unshift', 'splice', 'concat'],
                regex: /\.push\(|\.concat\(|\.splice\(/,
                purpose: '列表数据构建',
                category: 'dataManipulation',
                subCategory: 'listBuilding'
            }
        };

        this.businessPatterns = {
            productionLine: {
                patterns: ['production', 'line', 'workflow', 'process', 'assembly', 'manufacture'],
                description: '生产线/工作流管理',
                keywords: ['生产', '流水线', '工艺流程', '装配']
            },
            userManagement: {
                patterns: ['user', 'account', 'profile', 'registration', 'signup'],
                description: '用户账户管理',
                keywords: ['用户', '账户', '注册', '个人资料']
            },
            orderProcessing: {
                patterns: ['order', 'checkout', 'cart', 'payment', 'purchase'],
                description: '订单支付处理',
                keywords: ['订单', '购物车', '支付', '购买']
            },
            inventory: {
                patterns: ['inventory', 'stock', 'warehouse', 'quantity'],
                description: '库存仓库管理',
                keywords: ['库存', '仓库', '存货', '数量']
            },
            reporting: {
                patterns: ['report', 'analytics', 'statistics', 'dashboard', 'metrics'],
                description: '报表统计分析',
                keywords: ['报表', '分析', '统计', '仪表盘']
            },
            notification: {
                patterns: ['notification', 'alert', 'message', 'email', 'sms'],
                description: '通知消息推送',
                keywords: ['通知', '消息', '提醒', '推送']
            },
            configManagement: {
                patterns: ['config', 'setting', 'preference', 'option', 'parameter'],
                description: '配置参数管理',
                keywords: ['配置', '设置', '参数', '选项']
            },
            logging: {
                patterns: ['log', 'logger', 'logging', 'debug', 'trace'],
                description: '日志记录追踪',
                keywords: ['日志', '记录', '调试', '追踪']
            }
        };

        this.actionVerbMapping = {
            parse: '解析',
            validate: '验证',
            get: '获取',
            set: '设置',
            create: '创建',
            update: '更新',
            delete: '删除',
            remove: '移除',
            add: '添加',
            fetch: '请求',
            save: '保存',
            load: '加载',
            send: '发送',
            receive: '接收',
            check: '检查',
            verify: '验证',
            extract: '提取',
            transform: '转换',
            format: '格式化',
            calculate: '计算',
            generate: '生成',
            build: '构建',
            find: '查找',
            filter: '筛选',
            sort: '排序',
            search: '搜索',
            convert: '转换',
            encode: '编码',
            decode: '解码',
            encrypt: '加密',
            decrypt: '解密',
            hash: '哈希',
            cache: '缓存',
            sync: '同步',
            async: '异步',
            init: '初始化',
            process: '处理',
            execute: '执行',
            run: '运行',
            start: '开始',
            stop: '停止',
            pause: '暂停',
            resume: '恢复',
            cancel: '取消',
            retry: '重试',
            import: '导入',
            export: '导出'
        };

        this.nounMapping = {
            email: '邮箱',
            mail: '邮件',
            url: 'URL地址',
            link: '链接',
            user: '用户',
            account: '账户',
            password: '密码',
            token: '令牌',
            data: '数据',
            config: '配置',
            setting: '设置',
            file: '文件',
            image: '图片',
            video: '视频',
            audio: '音频',
            text: '文本',
            string: '字符串',
            number: '数字',
            array: '数组',
            list: '列表',
            object: '对象',
            json: 'JSON',
            html: 'HTML',
            css: 'CSS',
            script: '脚本',
            api: 'API接口',
            endpoint: '端点',
            request: '请求',
            response: '响应',
            error: '错误',
            exception: '异常',
            cache: '缓存',
            session: '会话',
            cookie: 'Cookie',
            storage: '存储',
            date: '日期',
            time: '时间',
            datetime: '日期时间',
            timestamp: '时间戳',
            id: 'ID',
            name: '名称',
            title: '标题',
            description: '描述',
            content: '内容',
            message: '消息',
            notification: '通知',
            order: '订单',
            product: '产品',
            price: '价格',
            amount: '金额',
            quantity: '数量',
            total: '总计',
            page: '页面',
            index: '索引',
            offset: '偏移量',
            limit: '限制',
            status: '状态',
            result: '结果',
            value: '值',
            key: '键',
            map: '映射',
            set: '集合',
            queue: '队列',
            stack: '栈',
            tree: '树',
            graph: '图',
            node: '节点',
            edge: '边',
            path: '路径',
            route: '路由',
            component: '组件',
            module: '模块',
            class: '类',
            function: '函数',
            method: '方法',
            parameter: '参数',
            argument: '参数',
            return: '返回',
            input: '输入',
            output: '输出'
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
            purpose: '未知代码块',
            businessPurpose: '未识别业务语义',
            category: 'other',
            complexity: 'low',
            keywords: [],
            logicFlow: [],
            sideEffects: [],
            dependencies: []
        };
    }

    analyzeFunction(node) {
        const { name, code, params, astInfo } = node;
        const nameWords = this.splitCamelCase(name);
        const lowerCode = code.toLowerCase();
        const lowerName = name.toLowerCase();
        
        const semanticMatch = this.detectSemanticPattern(name, code);
        const businessMatch = this.detectBusinessPattern(name, code);
        const logicFlow = this.analyzeLogicFlow(code);
        const sideEffects = this.analyzeSideEffects(code);
        const dependencies = this.analyzeDependencies(code);
        const controlFlowAnalysis = this.analyzeControlFlow(code);
        const regexPatterns = this.extractRegexPatterns(code);
        
        let astAnalysis = null;
        if (astInfo) {
            astAnalysis = this.analyzeAstInfo(node, astInfo);
        }
        
        const purpose = this.generateSmartPurpose(name, nameWords, semanticMatch, businessMatch, code, params, astInfo);
        const businessPurpose = this.generateBusinessPurpose(semanticMatch, businessMatch, logicFlow, astInfo);
        
        const keywords = [];
        keywords.push(...nameWords);
        if (semanticMatch) {
            keywords.push(semanticMatch.subCategory || semanticMatch.category);
        }
        if (businessMatch) {
            keywords.push(...(businessMatch.keywords || []));
        }
        keywords.push(...this.extractDomainSpecificKeywords(code));
        
        if (astInfo?.calls) {
            const callKeywords = astInfo.calls
                .filter(c => !['console', 'Array', 'String', 'Object', 'Math'].includes(c.name))
                .map(c => c.method || c.name);
            keywords.push(...callKeywords.slice(0, 3));
        }
        
        const complexity = this.calculateComplexity(code, controlFlowAnalysis, astInfo);
        
        return {
            purpose,
            businessPurpose,
            category: semanticMatch?.category || 'general',
            subCategory: semanticMatch?.subCategory || businessMatch?.description || 'general',
            complexity,
            keywords: [...new Set(keywords)],
            isAsync: node.isAsync || (astInfo?.returns?.some(r => r.value.includes('await'))) || code.includes('async') || code.includes('await'),
            paramCount: params.length,
            logicFlow,
            sideEffects,
            dependencies,
            controlFlow: controlFlowAnalysis,
            semanticMatch: semanticMatch?.purpose || null,
            businessDomain: businessMatch?.description || null,
            hasSideEffects: sideEffects.length > 0,
            usesRegex: this.detectRegexUsage(code),
            hasNetworkCall: this.detectNetworkCall(code),
            hasDatabaseAccess: this.detectDatabaseAccess(code),
            hasFileIO: this.detectFileIO(code),
            regexPatterns,
            astAnalysis,
            isMethod: node.isMethod || false,
            funcType: node.funcType,
            detailedAnalysis: {
                nameWords,
                semanticPattern: semanticMatch,
                businessPattern: businessMatch,
                returnType: this.inferDetailedReturnType(code),
                paramRoles: this.analyzeParameterRoles(params, code, astInfo)
            }
        };
    }
    
    analyzeAstInfo(node, astInfo) {
        const analysis = {
            callGraph: [],
            dataFlow: [],
            controlPatterns: [],
            earlyReturns: [],
            methodCalls: [],
            variableAssignments: []
        };
        
        if (astInfo.calls && astInfo.calls.length > 0) {
            for (const call of astInfo.calls) {
                analysis.callGraph.push({
                    name: call.name,
                    type: call.isMethod ? 'method' : 'function',
                    receiver: call.receiver || null,
                    method: call.method || null
                });
                
                if (call.isMethod) {
                    analysis.methodCalls.push({
                        object: call.receiver,
                        method: call.method
                    });
                }
            }
            
            const apiMethods = ['fetch', 'axios', 'get', 'post', 'put', 'delete', 'request', 'ajax'];
            const hasApiCall = astInfo.calls.some(c => 
                apiMethods.includes(c.method) || apiMethods.includes(c.name)
            );
            if (hasApiCall) {
                analysis.controlPatterns.push('api-request');
            }
            
            const arrayMethods = ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every'];
            const hasArrayOp = astInfo.calls.some(c => arrayMethods.includes(c.method));
            if (hasArrayOp) {
                analysis.controlPatterns.push('array-transformation');
            }
        }
        
        if (astInfo.variables && astInfo.variables.length > 0) {
            for (const variable of astInfo.variables) {
                analysis.variableAssignments.push({
                    name: variable.name,
                    initializer: variable.initializer?.substring(0, 50) || 'undefined'
                });
                
                if (variable.initializer) {
                    if (variable.initializer.includes('[]') || variable.initializer.includes('new Array')) {
                        analysis.dataFlow.push(`初始化数组: ${variable.name}`);
                    } else if (variable.initializer.includes('{}') || variable.initializer.includes('new Object')) {
                        analysis.dataFlow.push(`初始化对象: ${variable.name}`);
                    } else if (variable.initializer.includes('/') && variable.initializer.includes('/')) {
                        analysis.dataFlow.push(`定义正则: ${variable.name}`);
                    }
                }
            }
        }
        
        if (astInfo.returns && astInfo.returns.length > 0) {
            for (const ret of astInfo.returns) {
                if (ret.isEarly) {
                    analysis.earlyReturns.push({
                        value: ret.value.substring(0, 40),
                        line: ret.line
                    });
                }
            }
            
            const hasMultipleReturns = astInfo.returns.length > 1;
            if (hasMultipleReturns) {
                analysis.controlPatterns.push('multiple-returns');
            }
        }
        
        if (astInfo.conditionals && astInfo.conditionals.length > 0) {
            const ifCount = astInfo.conditionals.filter(c => c.type === 'if').length;
            const elseCount = astInfo.conditionals.filter(c => c.type === 'else-if' || c.type === 'else').length;
            
            if (ifCount > 2) {
                analysis.controlPatterns.push('complex-conditionals');
            }
            if (elseCount > 0) {
                analysis.controlPatterns.push('branching-logic');
            }
        }
        
        if (astInfo.loops && astInfo.loops.length > 0) {
            analysis.controlPatterns.push('looping');
        }
        
        return analysis;
    }
    
    generateSmartPurpose(name, nameWords, semanticMatch, businessMatch, code, params, astInfo) {
        if (semanticMatch?.purpose) {
            return semanticMatch.purpose;
        }
        
        const nameDescriptions = {
            'parse': '解析',
            'validate': '验证',
            'fetch': '获取',
            'get': '获取',
            'set': '设置',
            'create': '创建',
            'update': '更新',
            'delete': '删除',
            'calculate': '计算',
            'process': '处理',
            'convert': '转换',
            'format': '格式化',
            'build': '构建',
            'generate': '生成',
            'extract': '提取',
            'filter': '筛选',
            'sort': '排序',
            'find': '查找',
            'search': '搜索',
            'check': '检查',
            'verify': '校验',
            'normalize': '标准化',
            'transform': '转换'
        };
        
        let action = '执行';
        let target = '';
        
        for (const [key, desc] of Object.entries(nameDescriptions)) {
            if (name.toLowerCase().includes(key)) {
                action = desc;
                break;
            }
        }
        
        const targetWords = nameWords.filter(w => 
            !['parse', 'validate', 'fetch', 'get', 'set', 'create', 'update', 'delete', 
              'calculate', 'process', 'convert', 'format', 'build', 'generate', 'extract',
              'filter', 'sort', 'find', 'search', 'check', 'verify', 'normalize', 'transform',
              'list', 'get', 'set', 'is', 'has', 'can', 'should', 'will', 'to', 'from', 'by'].includes(w.toLowerCase())
        );
        
        if (targetWords.length > 0) {
            target = targetWords.join('');
        }
        
        if (astInfo?.calls) {
            const emailCall = astInfo.calls.find(c => c.name.toLowerCase().includes('email') || c.method?.toLowerCase().includes('email'));
            const urlCall = astInfo.calls.find(c => c.name.toLowerCase().includes('url') || c.method?.toLowerCase().includes('url'));
            
            if (emailCall) target = '邮箱';
            if (urlCall) target = 'URL';
        }
        
        if (target) {
            return `${action}${target}`;
        }
        
        return `${action}指定操作`;
    }
    
    generateBusinessPurpose(semanticMatch, businessMatch, logicFlow, astInfo) {
        const parts = [];
        
        if (semanticMatch) {
            parts.push(`技术目的：${semanticMatch.subCategory || semanticMatch.category}`);
        }
        
        if (astInfo?.earlyReturns && astInfo.earlyReturns.length > 0) {
            parts.push(`使用守卫检查进行${astInfo.earlyReturns.length}次提前返回`);
        }
        
        if (astInfo?.methodCalls && astInfo.methodCalls.length > 0) {
            const uniqueMethods = [...new Set(astInfo.methodCalls.map(m => m.method))];
            if (uniqueMethods.length > 0 && uniqueMethods.length <= 3) {
                parts.push(`调用${uniqueMethods.join('、')}方法`);
            }
        }
        
        if (astInfo?.controlPatterns && astInfo.controlPatterns.length > 0) {
            const patternDescriptions = {
                'api-request': '包含网络请求',
                'array-transformation': '执行数组转换',
                'multiple-returns': '多返回路径',
                'complex-conditionals': '复杂条件判断'
            };
            
            const patterns = astInfo.controlPatterns
                .filter(p => p !== 'looping' && p !== 'branching-logic')
                .slice(0, 2)
                .map(p => patternDescriptions[p] || p)
                .join('，');
            
            if (patterns) {
                parts.push(patterns);
            }
        }
        
        if (businessMatch) {
            parts.push(`业务场景：${businessMatch.description}`);
        }
        
        return parts.join(' | ');
    }
    
    analyzeParameterRoles(params, code, astInfo) {
        const roles = [];
        
        for (const param of params) {
            const role = this.detectParamRole(param.name, code, astInfo);
            roles.push({
                name: param.name,
                role: role.type,
                description: role.description,
                usagePattern: role.pattern
            });
        }
        
        return roles;
    }
    
    detectParamRole(paramName, code, astInfo) {
        const lowerName = paramName.toLowerCase();
        
        const rolePatterns = [
            {
                keywords: ['config', 'option', 'setting', 'param'],
                type: 'configuration',
                description: '配置参数，用于控制函数行为',
                pattern: '可选对象参数'
            },
            {
                keywords: ['callback', 'fn', 'handler', 'listener'],
                type: 'callback',
                description: '回调函数，用于异步通知',
                pattern: '函数参数'
            },
            {
                keywords: ['id', 'identifier', 'key', 'token'],
                type: 'identifier',
                description: '唯一标识符，用于定位资源',
                pattern: '必填查找键'
            },
            {
                keywords: ['data', 'payload', 'body', 'item'],
                type: 'data',
                description: '主要数据对象，核心处理对象',
                pattern: '核心输入数据'
            },
            {
                keywords: ['path', 'url', 'location'],
                type: 'location',
                description: '路径或URL，资源定位符',
                pattern: '字符串路径'
            },
            {
                keywords: ['limit', 'page', 'offset', 'size'],
                type: 'pagination',
                description: '分页参数，控制数据范围',
                pattern: '数值参数'
            },
            {
                keywords: ['timeout', 'delay', 'duration', 'expire'],
                type: 'timing',
                description: '时间参数，控制执行时机',
                pattern: '毫秒/秒数值'
            },
            {
                keywords: ['filter', 'query', 'search', 'criteria'],
                type: 'filter',
                description: '筛选条件，用于数据过滤',
                pattern: '条件表达式'
            },
            {
                keywords: ['sort', 'order', 'direction'],
                type: 'sorting',
                description: '排序规则，控制输出顺序',
                pattern: '排序配置'
            },
            {
                keywords: ['email', 'mail'],
                type: 'email',
                description: '邮箱地址输入',
                pattern: '邮箱格式字符串'
            },
            {
                keywords: ['url', 'link', 'href'],
                type: 'url',
                description: 'URL地址输入',
                pattern: 'URL格式字符串'
            }
        ];
        
        for (const pattern of rolePatterns) {
            for (const keyword of pattern.keywords) {
                if (lowerName.includes(keyword)) {
                    return pattern;
                }
            }
        }
        
        if (astInfo?.methodCalls) {
            const usedInFetch = astInfo.methodCalls.some(c => 
                ['fetch', 'get', 'post', 'put', 'delete'].includes(c.method)
            );
            if (usedInFetch && lowerName.includes('id')) {
                return {
                    type: 'resource-id',
                    description: '资源ID，用于API请求',
                    pattern: '用于URL路径参数'
                };
            }
        }
        
        return {
            type: 'input',
            description: '输入参数',
            pattern: '通用输入'
        };
    }
    
    extractRegexPatterns(code) {
        const patterns = [];
        const regexMatches = code.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*\/([^/]+)\/([gimsuy]*)/g);
        
        for (const match of regexMatches) {
            const [, name, pattern, flags] = match;
            const analysis = this.analyzeRegexPattern(pattern);
            
            patterns.push({
                name,
                pattern,
                flags,
                fullPattern: `/${pattern}/${flags}`,
                format: analysis.matchesFormat,
                humanReadable: this.generateHumanReadableRegex(pattern, analysis),
                validationRules: analysis.validationRules.slice(0, 4),
                examples: analysis.examples.slice(0, 2)
            });
        }
        
        const inlineMatches = code.matchAll(/\.[a-z]+\(\/([^/]+)\/([gimsuy]*)\)/g);
        for (const match of inlineMatches) {
            const [, pattern, flags] = match;
            const analysis = this.analyzeRegexPattern(pattern);
            
            if (!patterns.some(p => p.pattern === pattern)) {
                patterns.push({
                    name: 'inline',
                    pattern,
                    flags,
                    fullPattern: `/${pattern}/${flags}`,
                    format: analysis.matchesFormat,
                    humanReadable: this.generateHumanReadableRegex(pattern, analysis),
                    validationRules: analysis.validationRules.slice(0, 3),
                    examples: analysis.examples.slice(0, 1)
                });
            }
        }
        
        return patterns;
    }
    
    generateHumanReadableRegex(pattern, analysis) {
        if (analysis.matchesFormat.includes('邮箱地址')) {
            return '匹配标准邮箱格式：用户名@域名.顶级域名';
        }
        if (analysis.matchesFormat.includes('URL链接')) {
            return '匹配HTTP/HTTPS协议的URL地址';
        }
        
        const parts = [];
        if (analysis.anchors.includes('行首')) parts.push('从字符串开头');
        if (analysis.anchors.includes('行尾')) parts.push('到字符串结尾');
        
        const uniqueClasses = [...new Set(analysis.characterClasses)];
        if (uniqueClasses.length > 0) {
            parts.push(`匹配${uniqueClasses.join('、')}`);
        }
        
        const uniqueQuantifiers = [...new Set(analysis.quantifiers)];
        if (uniqueQuantifiers.length > 0 && uniqueQuantifiers.length <= 2) {
            parts.push(`量词：${uniqueQuantifiers.join('、')}`);
        }
        
        return parts.length > 0 ? parts.join('，') : '正则表达式模式匹配';
    }

    splitCamelCase(name) {
        const words = name.match(/[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)|\d+/g) || [name];
        return words.map(w => w.toLowerCase()).filter(w => w.length > 1);
    }

    detectSemanticPattern(name, code) {
        const lowerName = name.toLowerCase();
        const lowerCode = code.toLowerCase();
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [key, pattern] of Object.entries(this.semanticPatterns)) {
            let score = 0;
            
            for (const p of pattern.patterns) {
                const regex = new RegExp(p, 'i');
                if (regex.test(lowerName)) score += 3;
                if (regex.test(lowerCode)) score += 1;
            }
            
            if (pattern.regex && pattern.regex.test(code)) {
                score += 5;
            }
            
            if (score > bestScore && score >= 2) {
                bestScore = score;
                bestMatch = pattern;
            }
        }
        
        return bestMatch;
    }

    detectBusinessPattern(name, code) {
        const lowerName = name.toLowerCase();
        const lowerCode = code.toLowerCase();
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [key, pattern] of Object.entries(this.businessPatterns)) {
            let score = 0;
            
            for (const p of pattern.patterns) {
                const regex = new RegExp(p, 'i');
                if (regex.test(lowerName)) score += 3;
                if (regex.test(lowerCode)) score += 1;
            }
            
            if (score > bestScore && score >= 2) {
                bestScore = score;
                bestMatch = pattern;
            }
        }
        
        return bestMatch;
    }

    analyzeLogicFlow(code) {
        const flow = [];
        const lines = code.split('\n');
        let inString = false;
        let stringChar = '';
        let depth = 0;
        let ifDepth = 0;
        let earlyReturned = false;
        let loopDepth = 0;
        let currentLoopTarget = null;
        let loopActions = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const rawLine = lines[i];
            
            if (earlyReturned) break;
            
            for (let j = 0; j < rawLine.length; j++) {
                const char = rawLine[j];
                if ((char === '"' || char === "'" || char === '`') && 
                    (j === 0 || rawLine[j - 1] !== '\\')) {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                    }
                }
            }
            
            if (inString) continue;
            
            const openBraces = (rawLine.match(/{/g) || []).length;
            const closeBraces = (rawLine.match(/}/g) || []).length;
            const prevDepth = depth;
            depth += openBraces - closeBraces;
            
            if (line.match(/^if\s*\(/)) {
                const condition = this.extractCondition(line);
                const isEarlyReturnCheck = this.isEarlyReturnCheck(lines, i);
                
                if (isEarlyReturnCheck) {
                    flow.push({
                        step: flow.length + 1,
                        type: 'guard',
                        action: '守卫检查',
                        detail: `前置验证: ${condition}`,
                        line: i + 1,
                        isEarlyReturn: true
                    });
                } else {
                    flow.push({
                        step: flow.length + 1,
                        type: 'condition',
                        action: '条件判断',
                        detail: `检查: ${condition}`,
                        line: i + 1
                    });
                }
                ifDepth++;
            } else if (line.match(/^else\s*if\s*\(/)) {
                const condition = this.extractCondition(line.replace(/^else\s*/, ''));
                flow.push({
                    step: flow.length + 1,
                    type: 'condition',
                    action: '否则判断',
                    detail: `否则检查: ${condition}`,
                    line: i + 1
                });
            } else if (line.match(/^else\s*\{?/)) {
                flow.push({
                    step: flow.length + 1,
                    type: 'condition',
                    action: '否则分支',
                    detail: '条件不满足时执行',
                    line: i + 1
                });
            } else if (line.match(/^for\s*\(/)) {
                if (loopDepth === 0) {
                    currentLoopTarget = this.extractLoopVar(line);
                    loopActions = [];
                }
                loopDepth++;
                
                flow.push({
                    step: flow.length + 1,
                    type: 'loop',
                    action: '开始遍历',
                    detail: `遍历 ${currentLoopTarget || '集合'}`,
                    line: i + 1,
                    loopTarget: currentLoopTarget
                });
            } else if (line.match(/^while\s*\(/)) {
                if (loopDepth === 0) {
                    loopActions = [];
                }
                loopDepth++;
                flow.push({
                    step: flow.length + 1,
                    type: 'loop',
                    action: '条件循环',
                    detail: '满足条件时重复执行',
                    line: i + 1
                });
            } else if (line.match(/\.(push|unshift|add)\s*\(/)) {
                const target = this.extractTargetVar(line);
                
                if (loopDepth > 0 && currentLoopTarget) {
                    const loopAction = this.analyzeLoopAction(currentLoopTarget, target, line, lines, i);
                    loopActions.push(loopAction);
                    
                    const lastLoopStep = flow.filter(s => s.type === 'loop').pop();
                    if (lastLoopStep) {
                        lastLoopStep.detail = loopAction;
                    }
                    
                    continue;
                }
                
                flow.push({
                    step: flow.length + 1,
                    type: 'data',
                    action: '收集数据',
                    detail: `添加到 ${target || '结果集合'}`,
                    line: i + 1
                });
            } else if (line.match(/\.(test|match|search)\s*\(/)) {
                const patternName = this.extractPatternName(line);
                const validationPurpose = this.analyzeValidationPurpose(line, patternName);
                
                flow.push({
                    step: flow.length + 1,
                    type: 'validation',
                    action: '格式验证',
                    detail: validationPurpose,
                    line: i + 1
                });
            } else if (line.match(/\*|\+|\/|%/) && line.match(/\w+\s*=\s*\w+/) && !line.includes('function') && !line.includes('for')) {
                const calcDesc = this.analyzeCalculation(line);
                if (calcDesc) {
                    flow.push({
                        step: flow.length + 1,
                        type: 'calculation',
                        action: '数值计算',
                        detail: calcDesc,
                        line: i + 1
                    });
                }
            } else if (line.match(/^return\s+/)) {
                const returnValue = line.replace(/^return\s+/, '').replace(/;?\s*$/, '');
                
                if (ifDepth > 0 && depth > 0) {
                    flow.push({
                        step: flow.length + 1,
                        type: 'return',
                        action: '提前返回',
                        detail: `验证失败时返回: ${this.simplifyReturnValue(returnValue)}`,
                        line: i + 1,
                        isEarlyReturn: true
                    });
                    ifDepth = 0;
                } else {
                    flow.push({
                        step: flow.length + 1,
                        type: 'return',
                        action: '最终返回',
                        detail: `返回: ${this.simplifyReturnValue(returnValue)}`,
                        line: i + 1
                    });
                }
            } else if (line.match(/^try\s*\{/)) {
                flow.push({
                    step: flow.length + 1,
                    type: 'error',
                    action: '异常保护',
                    detail: '开始受保护代码块',
                    line: i + 1
                });
            } else if (line.match(/^catch\s*\(/)) {
                flow.push({
                    step: flow.length + 1,
                    type: 'error',
                    action: '异常处理',
                    detail: '捕获错误并处理',
                    line: i + 1
                });
            } else if (line.match(/fetch\(|axios\.|\.ajax\(/)) {
                flow.push({
                    step: flow.length + 1,
                    type: 'network',
                    action: '网络请求',
                    detail: '调用外部API',
                    line: i + 1
                });
            } else if (line.match(/await\s+/)) {
                flow.push({
                    step: flow.length + 1,
                    type: 'async',
                    action: '等待异步',
                    detail: '等待异步操作完成',
                    line: i + 1
                });
            }
            
            if (depth < prevDepth && loopDepth > 0 && depth === prevDepth - loopDepth) {
                loopDepth = 0;
                currentLoopTarget = null;
            }
        }
        
        return flow;
    }
    
    analyzeLoopAction(loopTarget, pushTarget, line, allLines, currentIndex) {
        const context = this.getLoopContext(allLines, currentIndex);
        
        const loopActionPatterns = {
            'email': ['邮箱验证', '收集有效邮箱', '验证并收集邮箱'],
            'user': ['处理用户数据', '收集用户信息'],
            'order': ['处理订单项', '计算订单金额', '累加订单小计'],
            'item': ['处理数据项', '收集有效项'],
            'product': ['处理商品', '计算商品价格'],
            'line': ['处理每行数据', '逐行处理']
        };
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [key, actions] of Object.entries(loopActionPatterns)) {
            if (loopTarget?.toLowerCase().includes(key) || context.toLowerCase().includes(key)) {
                if (actions.length > 0) {
                    return actions[0];
                }
            }
        }
        
        if (context.includes('test') || context.includes('validate') || context.includes('match')) {
            return `验证并收集有效项到 ${pushTarget}`;
        }
        
        if (context.includes('*') || context.includes('+')) {
            return `累加计算到 ${pushTarget}`;
        }
        
        return `处理 ${loopTarget} 并添加到 ${pushTarget}`;
    }
    
    getLoopContext(lines, currentIndex) {
        const start = Math.max(0, currentIndex - 5);
        const end = Math.min(lines.length, currentIndex + 5);
        return lines.slice(start, end).join(' ').toLowerCase();
    }
    
    analyzeValidationPurpose(line, patternName) {
        const lowerLine = line.toLowerCase();
        
        if (patternName?.toLowerCase().includes('email') || lowerLine.includes('email')) {
            return '验证邮箱格式有效性';
        }
        if (patternName?.toLowerCase().includes('url') || lowerLine.includes('url')) {
            return '验证URL格式有效性';
        }
        if (patternName?.toLowerCase().includes('phone') || lowerLine.includes('phone')) {
            return '验证电话号码格式';
        }
        
        return `用 ${patternName || '正则'} 验证格式`;
    }
    
    analyzeCalculation(line) {
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.includes('total') || lowerLine.includes('sum')) {
            const targetMatch = line.match(/(\w+)\s*=/);
            if (targetMatch) {
                return `计算 ${targetMatch[1]} 总计`;
            }
        }
        
        if (lowerLine.includes('price') || lowerLine.includes('cost')) {
            const targetMatch = line.match(/(\w+)\s*=/);
            if (targetMatch) {
                return `计算 ${targetMatch[1]} 价格`;
            }
        }
        
        if (line.includes('*')) {
            return '执行乘法运算';
        }
        if (line.includes('+')) {
            return '执行加法运算';
        }
        
        return null;
    }
    
    isEarlyReturnCheck(lines, currentLine) {
        for (let i = currentLine + 1; i < Math.min(currentLine + 5, lines.length); i++) {
            const line = lines[i].trim();
            if (line.match(/^return\s+/)) {
                return true;
            }
            if (line.match(/^for\s*\(/) || line.match(/^function\s*\(/)) {
                return false;
            }
        }
        return false;
    }
    
    extractLoopVar(line) {
        const match = line.match(/for\s*\(\s*(?:const|let|var)?\s*(\w+)\s+of|for\s*\(\s*(?:const|let|var)?\s*(\w+)\s+in/);
        if (match) return match[1] || match[2];
        return null;
    }
    
    extractTargetVar(line) {
        const match = line.match(/(\w+)\.(push|unshift|add)\s*\(/);
        return match ? match[1] : null;
    }
    
    extractPatternName(line) {
        const match = line.match(/(\w+)\.(test|match|search)\s*\(/);
        return match ? match[1] : null;
    }
    
    simplifyReturnValue(value) {
        if (value === 'null') return 'null';
        if (value === 'undefined') return 'undefined';
        if (value === '[]') return '空数组';
        if (value === '{}') return '空对象';
        if (value === 'true') return 'true';
        if (value === 'false') return 'false';
        if (value.length > 30) return value.substring(0, 30) + '...';
        return value;
    }

    extractCondition(line) {
        const match = line.match(/if\s*\(([^)]+)\)/);
        if (match) {
            return match[1].trim();
        }
        return '未知条件';
    }

    analyzeSideEffects(code) {
        const effects = [];
        const lowerCode = code.toLowerCase();
        
        if (code.includes('localStorage.') || code.includes('sessionStorage.')) {
            effects.push({
                type: 'storage',
                description: '修改本地存储',
                severity: 'medium'
            });
        }
        
        if (code.includes('document.cookie')) {
            effects.push({
                type: 'cookie',
                description: '修改Cookie',
                severity: 'medium'
            });
        }
        
        if (code.includes('.push(') || code.includes('.pop(') || 
            code.includes('.shift(') || code.includes('.unshift(') ||
            code.includes('.splice(')) {
            effects.push({
                type: 'mutation',
                description: '修改数组/对象',
                severity: 'low'
            });
        }
        
        if (code.includes('fetch(') || code.includes('axios.') || 
            code.includes('XMLHttpRequest')) {
            effects.push({
                type: 'network',
                description: '发起网络请求',
                severity: 'high'
            });
        }
        
        if (code.includes('console.')) {
            effects.push({
                type: 'log',
                description: '控制台输出',
                severity: 'low'
            });
        }
        
        if (code.includes('new Error') || code.includes('throw ')) {
            effects.push({
                type: 'error',
                description: '可能抛出异常',
                severity: 'medium'
            });
        }
        
        if (code.includes('document.') || code.includes('window.')) {
            effects.push({
                type: 'dom',
                description: '操作DOM/浏览器API',
                severity: 'medium'
            });
        }
        
        return effects;
    }

    analyzeDependencies(code) {
        const deps = [];
        const lowerCode = code.toLowerCase();
        
        if (code.includes('fetch') || code.includes('axios') || code.includes('XMLHttpRequest')) {
            deps.push({
                name: 'Network',
                description: '网络请求能力',
                type: 'external'
            });
        }
        
        if (code.includes('JSON.parse') || code.includes('JSON.stringify')) {
            deps.push({
                name: 'JSON',
                description: 'JSON序列化',
                type: 'builtin'
            });
        }
        
        if (code.includes('Math.')) {
            deps.push({
                name: 'Math',
                description: '数学计算',
                type: 'builtin'
            });
        }
        
        if (code.includes('Date.') || code.includes('new Date')) {
            deps.push({
                name: 'Date',
                description: '日期时间',
                type: 'builtin'
            });
        }
        
        if (code.includes('Array.') || code.includes('.filter(') || 
            code.includes('.map(') || code.includes('.reduce(')) {
            deps.push({
                name: 'Array',
                description: '数组操作',
                type: 'builtin'
            });
        }
        
        if (code.includes('Promise') || code.includes('async') || code.includes('await')) {
            deps.push({
                name: 'Promise',
                description: '异步编程',
                type: 'builtin'
            });
        }
        
        if (code.includes('RegExp') || /\/.+\/[gimsuy]*/.test(code)) {
            deps.push({
                name: 'RegExp',
                description: '正则表达式',
                type: 'builtin'
            });
        }
        
        if (code.includes('localStorage') || code.includes('sessionStorage')) {
            deps.push({
                name: 'Storage',
                description: 'Web存储',
                type: 'webapi'
            });
        }
        
        return [...new Map(deps.map(d => [d.name, d])).values()];
    }

    analyzeControlFlow(code) {
        const analysis = {
            conditionCount: 0,
            loopCount: 0,
            tryCatchCount: 0,
            returnCount: 0,
            maxNestingDepth: 0,
            hasEarlyReturn: false,
            hasErrorHandling: false
        };
        
        let nestingDepth = 0;
        let maxDepth = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            
            if ((char === '"' || char === "'" || char === '`') && 
                (i === 0 || code[i - 1] !== '\\')) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
            }
            
            if (inString) continue;
            
            if (char === '{') {
                nestingDepth++;
                maxDepth = Math.max(maxDepth, nestingDepth);
            } else if (char === '}') {
                nestingDepth--;
            }
        }
        
        analysis.maxNestingDepth = maxDepth;
        analysis.conditionCount = (code.match(/\bif\b|\bswitch\b/g) || []).length;
        analysis.loopCount = (code.match(/\bfor\b|\bwhile\b|\.forEach\(|\.map\(|\.filter\(/g) || []).length;
        analysis.tryCatchCount = (code.match(/\btry\b|\bcatch\b/g) || []).length / 2;
        analysis.returnCount = (code.match(/\breturn\b/g) || []).length;
        analysis.hasEarlyReturn = analysis.returnCount > 1;
        analysis.hasErrorHandling = analysis.tryCatchCount > 0;
        
        return analysis;
    }

    analyzeParameterRoles(params, code) {
        return params.map(param => {
            const role = this.detectParamRole(param.name, code);
            return {
                name: param.name,
                type: param.type || 'unknown',
                role,
                description: this.describeParamRole(role)
            };
        });
    }

    detectParamRole(name, code) {
        const lowerName = name.toLowerCase();
        
        if (lowerName.includes('config') || lowerName.includes('option') || 
            lowerName.includes('setting')) {
            return 'configuration';
        }
        if (lowerName.includes('callback') || lowerName.includes('handler') || 
            lowerName.includes('fn')) {
            return 'callback';
        }
        if (lowerName.includes('id') || lowerName.includes('key')) {
            return 'identifier';
        }
        if (lowerName.includes('data') || lowerName.includes('payload') || 
            lowerName.includes('body')) {
            return 'data';
        }
        if (lowerName.includes('url') || lowerName.includes('path')) {
            return 'location';
        }
        if (lowerName.includes('limit') || lowerName.includes('offset') || 
            lowerName.includes('page') || lowerName.includes('size')) {
            return 'pagination';
        }
        if (lowerName.includes('timeout') || lowerName.includes('delay') || 
            lowerName.includes('interval')) {
            return 'timing';
        }
        if (lowerName.includes('filter') || lowerName.includes('query') || 
            lowerName.includes('search')) {
            return 'filter';
        }
        if (lowerName.includes('sort') || lowerName.includes('order')) {
            return 'sorting';
        }
        
        return 'input';
    }

    describeParamRole(role) {
        const descriptions = {
            configuration: '配置参数，控制函数行为',
            callback: '回调函数，用于异步通知',
            identifier: '标识符，用于唯一标识',
            data: '数据载荷，主要处理对象',
            location: '位置信息（URL/路径）',
            pagination: '分页参数',
            timing: '时间控制参数',
            filter: '筛选条件',
            sorting: '排序规则',
            input: '通用输入参数'
        };
        return descriptions[role] || '输入参数';
    }

    generateSmartPurpose(name, nameWords, semanticMatch, businessMatch, code, params) {
        const parts = [];
        
        const actionVerb = this.extractActionVerb(nameWords);
        const targetNoun = this.extractTargetNoun(nameWords);
        const chineseAction = this.actionVerbMapping[actionVerb] || actionVerb;
        const chineseNoun = this.nounMapping[targetNoun] || targetNoun;
        
        if (semanticMatch) {
            parts.push(semanticMatch.purpose);
        } else if (actionVerb && targetNoun) {
            parts.push(`${chineseAction}${chineseNoun}`);
        } else {
            parts.push(`处理${chineseNoun || '数据'}`);
        }
        
        const details = this.generatePurposeDetails(code, params);
        if (details) {
            parts.push(`，${details}`);
        }
        
        if (businessMatch) {
            parts.push(`【业务领域：${businessMatch.description}】`);
        }
        
        return parts.join('');
    }

    generatePurposeDetails(code, params) {
        const details = [];
        const lowerCode = code.toLowerCase();
        
        if (code.includes('.filter(') || code.includes('.find(') || 
            code.includes('.some(') || code.includes('.every(')) {
            details.push('按条件筛选');
        }
        
        if (code.includes('.map(') || code.includes('.reduce(')) {
            details.push('进行数据转换');
        }
        
        if (code.includes('.sort(')) {
            details.push('进行排序');
        }
        
        if (code.includes('/.+/') || code.includes('RegExp') || 
            code.includes('.test(') || code.includes('.match(')) {
            details.push('使用正则验证');
        }
        
        if (code.includes('try') && code.includes('catch')) {
            details.push('包含异常处理');
        }
        
        if (code.includes('async') || code.includes('await') || 
            code.includes('fetch') || code.includes('Promise')) {
            details.push('异步执行');
        }
        
        if (code.includes('localStorage') || code.includes('sessionStorage')) {
            details.push('涉及缓存操作');
        }
        
        return details.length > 0 ? details.join('，') : null;
    }

    generateBusinessPurpose(semanticMatch, businessMatch, logicFlow) {
        const parts = [];
        
        if (businessMatch) {
            parts.push(`业务场景：${businessMatch.description}`);
        }
        
        if (semanticMatch) {
            parts.push(`技术目的：${semanticMatch.purpose}`);
        }
        
        if (logicFlow && logicFlow.length > 0) {
            const steps = logicFlow.slice(0, 3).map(f => f.action).join(' → ');
            if (steps) {
                parts.push(`执行流程：${steps}`);
            }
        }
        
        return parts.length > 0 ? parts.join(' | ') : '通用功能函数';
    }

    extractActionVerb(words) {
        const actionVerbs = Object.keys(this.actionVerbMapping);
        for (const word of words) {
            if (actionVerbs.includes(word)) {
                return word;
            }
        }
        return words[0] || null;
    }

    extractTargetNoun(words) {
        const nouns = Object.keys(this.nounMapping);
        for (const word of words) {
            if (nouns.includes(word)) {
                return word;
            }
        }
        return words[words.length - 1] || null;
    }

    extractDomainSpecificKeywords(code) {
        const keywords = [];
        const lowerCode = code.toLowerCase();
        
        const domainPatterns = [
            { pattern: /email|mail/, keyword: '邮箱' },
            { pattern: /url|link/, keyword: '链接' },
            { pattern: /password|passwd/, keyword: '密码' },
            { pattern: /token|jwt/, keyword: '令牌' },
            { pattern: /user|account/, keyword: '用户' },
            { pattern: /order|purchase/, keyword: '订单' },
            { pattern: /product|item/, keyword: '商品' },
            { pattern: /price|amount|cost/, keyword: '金额' },
            { pattern: /date|time|datetime/, keyword: '时间' },
            { pattern: /cache|storage/, keyword: '缓存' },
            { pattern: /api|endpoint/, keyword: 'API' },
            { pattern: /error|exception/, keyword: '异常' }
        ];
        
        for (const { pattern, keyword } of domainPatterns) {
            if (pattern.test(lowerCode)) {
                keywords.push(keyword);
            }
        }
        
        return keywords;
    }

    detectRegexUsage(code) {
        return /\/.+\/[gimsuy]*|RegExp\(/.test(code);
    }

    detectNetworkCall(code) {
        return /fetch\(|axios\.|XMLHttpRequest|\.ajax\(/.test(code);
    }

    detectDatabaseAccess(code) {
        return /query|select|insert|update|delete|SQL|mongodb|redis/i.test(code);
    }

    detectFileIO(code) {
        return /FileReader|Blob|FormData|upload|download|fs\./i.test(code);
    }

    inferDetailedReturnType(code) {
        const returns = [];
        
        if (code.includes('return []')) {
            returns.push('空数组');
        }
        if (code.includes('return {}')) {
            returns.push('空对象');
        }
        if (code.includes('return true') || code.includes('return false')) {
            returns.push('布尔值');
        }
        if (code.includes('return null')) {
            returns.push('可能返回null');
        }
        if (code.includes('return undefined')) {
            returns.push('可能返回undefined');
        }
        if (code.includes('throw new')) {
            returns.push('可能抛出异常');
        }
        if (code.includes('await') || code.includes('async')) {
            returns.push('Promise包装');
        }
        if (code.includes('.push(') || code.includes('.concat(')) {
            returns.push('可能返回数组');
        }
        if (code.includes('.map(') || code.includes('.filter(')) {
            returns.push('返回处理后的数组');
        }
        
        return returns.length > 0 ? returns : ['未知返回类型'];
    }

    calculateComplexity(code, controlFlow, astInfo = null) {
        let complexity = 0;
        
        complexity += controlFlow.conditionCount * 2;
        complexity += controlFlow.loopCount * 3;
        complexity += controlFlow.tryCatchCount * 2;
        complexity += controlFlow.maxNestingDepth * 2;
        complexity += (controlFlow.returnCount - 1);
        
        complexity += (code.match(/&&|\|\||\?.*:/g) || []).length;
        
        if (this.detectNetworkCall(code)) complexity += 3;
        if (this.detectRegexUsage(code)) complexity += 2;
        if (this.detectFileIO(code)) complexity += 2;
        
        if (astInfo) {
            if (astInfo.conditionals) complexity += astInfo.conditionals.length;
            if (astInfo.loops) complexity += astInfo.loops.length * 2;
            if (astInfo.calls) {
                const externalCalls = astInfo.calls.filter(c => 
                    !['console', 'Array', 'String', 'Object', 'Math', 'JSON', 'Date'].includes(c.name)
                );
                complexity += externalCalls.length;
            }
        }
        
        if (complexity <= 3) return 'low';
        if (complexity <= 8) return 'medium';
        if (complexity <= 15) return 'high';
        return 'very-high';
    }

    analyzeRegex(node) {
        const { pattern, flags } = node;
        const analysis = this.analyzeRegexPattern(pattern);
        
        return {
            purpose: analysis.purpose,
            businessPurpose: analysis.businessPurpose,
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
            examples: analysis.examples,
            detailedAnalysis: {
                humanReadable: analysis.humanReadable,
                validationRules: analysis.validationRules,
                edgeCases: analysis.edgeCases
            }
        };
    }

    analyzeRegexPattern(pattern) {
        const analysis = {
            groups: [],
            anchors: [],
            quantifiers: [],
            characterClasses: [],
            matchesFormat: [],
            examples: [],
            humanReadable: [],
            validationRules: [],
            edgeCases: [],
            complexity: 'low'
        };
        
        let groupDepth = 0;
        let inCharClass = false;
        let complexityScore = 0;
        let charClassContent = [];
        
        for (let i = 0; i < pattern.length; i++) {
            const char = pattern[i];
            
            if (char === '\\') {
                const nextChar = pattern[i + 1];
                if (nextChar) {
                    switch (nextChar) {
                        case 'd':
                            analysis.characterClasses.push('数字 [0-9]');
                            analysis.humanReadable.push('数字');
                            analysis.validationRules.push('必须包含数字');
                            break;
                        case 'D':
                            analysis.characterClasses.push('非数字');
                            analysis.humanReadable.push('非数字字符');
                            break;
                        case 'w':
                            analysis.characterClasses.push('单词字符 [a-zA-Z0-9_]');
                            analysis.humanReadable.push('字母数字或下划线');
                            break;
                        case 'W':
                            analysis.characterClasses.push('非单词字符');
                            analysis.humanReadable.push('特殊字符');
                            break;
                        case 's':
                            analysis.characterClasses.push('空白字符');
                            analysis.humanReadable.push('空格或制表符');
                            break;
                        case 'S':
                            analysis.characterClasses.push('非空白字符');
                            analysis.humanReadable.push('非空白字符');
                            break;
                        case 'b':
                            analysis.anchors.push('单词边界');
                            analysis.validationRules.push('匹配完整单词');
                            break;
                        case 'B':
                            analysis.anchors.push('非单词边界');
                            break;
                        case '.':
                            analysis.humanReadable.push('点号');
                            break;
                        case '+':
                        case '*':
                        case '?':
                            analysis.humanReadable.push(`量词 ${nextChar}`);
                            break;
                        default:
                            analysis.humanReadable.push(`转义字符 ${nextChar}`);
                    }
                    i++;
                }
                continue;
            }
            
            if (char === '[') {
                inCharClass = true;
                charClassContent = [];
                complexityScore += 2;
                continue;
            }
            if (char === ']') {
                inCharClass = false;
                if (charClassContent.length > 0) {
                    const classDesc = this.describeCharClass(charClassContent);
                    analysis.characterClasses.push(classDesc);
                    analysis.humanReadable.push(classDesc);
                }
                continue;
            }
            
            if (inCharClass) {
                if (char !== '^' && char !== '-') {
                    charClassContent.push(char);
                }
                continue;
            }
            
            switch (char) {
                case '^':
                    analysis.anchors.push('行首');
                    analysis.validationRules.push('必须从字符串开头匹配');
                    complexityScore++;
                    break;
                case '$':
                    analysis.anchors.push('行尾');
                    analysis.validationRules.push('必须匹配到字符串结尾');
                    complexityScore++;
                    break;
                case '(':
                    groupDepth++;
                    const lookahead = pattern.slice(i, i + 3);
                    if (lookahead === '(?:') {
                        analysis.groups.push('非捕获组');
                        analysis.humanReadable.push('非捕获分组');
                    } else if (lookahead === '(?=') {
                        analysis.groups.push('正向先行断言');
                        analysis.humanReadable.push('正向先行断言');
                        analysis.validationRules.push('后面必须跟随指定内容');
                        complexityScore += 3;
                    } else if (lookahead === '(?!') {
                        analysis.groups.push('负向先行断言');
                        analysis.humanReadable.push('负向先行断言');
                        analysis.validationRules.push('后面不能跟随指定内容');
                        complexityScore += 4;
                    } else if (lookahead === '(?<=') {
                        analysis.groups.push('正向后行断言');
                        analysis.humanReadable.push('正向后行断言');
                        complexityScore += 3;
                    } else if (lookahead === '(?<!') {
                        analysis.groups.push('负向后行断言');
                        analysis.humanReadable.push('负向后行断言');
                        complexityScore += 4;
                    } else if (lookahead === '(?<') {
                        analysis.groups.push('命名捕获组');
                        analysis.humanReadable.push('命名捕获分组');
                        complexityScore += 2;
                    } else {
                        analysis.groups.push('捕获组');
                        analysis.humanReadable.push('捕获分组');
                    }
                    complexityScore++;
                    break;
                case ')':
                    groupDepth--;
                    break;
                case '*':
                    analysis.quantifiers.push('0个或多个 (*)');
                    analysis.humanReadable.push('重复0次或多次');
                    analysis.edgeCases.push('可能匹配空字符串');
                    complexityScore++;
                    break;
                case '+':
                    analysis.quantifiers.push('1个或多个 (+)');
                    analysis.humanReadable.push('重复1次或多次');
                    analysis.validationRules.push('至少出现1次');
                    complexityScore++;
                    break;
                case '?':
                    if (pattern[i - 1] !== ')' && pattern[i - 1] !== ']' && 
                        !/[*+?]/.test(pattern[i - 1])) {
                        analysis.quantifiers.push('0个或1个 (?)');
                        analysis.humanReadable.push('可选（0次或1次）');
                        analysis.edgeCases.push('该部分是可选的');
                    } else {
                        analysis.quantifiers.push('非贪婪匹配');
                        analysis.humanReadable.push('非贪婪模式');
                    }
                    complexityScore++;
                    break;
                case '{':
                    const quantMatch = pattern.slice(i).match(/^\{(\d+)(,(\d*))?\}/);
                    if (quantMatch) {
                        if (quantMatch[3] === '') {
                            analysis.quantifiers.push(`至少 ${quantMatch[1]} 个`);
                            analysis.humanReadable.push(`至少${quantMatch[1]}次`);
                            analysis.validationRules.push(`最少${quantMatch[1]}个字符`);
                        } else if (quantMatch[2]) {
                            analysis.quantifiers.push(`${quantMatch[1]}-${quantMatch[3] || '多'} 个`);
                            analysis.humanReadable.push(`${quantMatch[1]}到${quantMatch[3] || '多'}次`);
                            analysis.validationRules.push(`${quantMatch[1]}-${quantMatch[3] || '多'}个字符`);
                        } else {
                            analysis.quantifiers.push(`恰好 ${quantMatch[1]} 个`);
                            analysis.humanReadable.push(`恰好${quantMatch[1]}次`);
                            analysis.validationRules.push(`必须${quantMatch[1]}个字符`);
                        }
                        complexityScore += 2;
                    }
                    break;
                case '|':
                    analysis.quantifiers.push('或 (|)');
                    analysis.humanReadable.push('或（多选一）');
                    complexityScore++;
                    break;
                case '.':
                    analysis.characterClasses.push('任意字符 (.)');
                    analysis.humanReadable.push('任意字符（除换行）');
                    break;
                default:
                    if (/[a-zA-Z0-9]/.test(char)) {
                        analysis.humanReadable.push(`字面量 "${char}"`);
                    }
            }
        }
        
        analysis.matchesFormat = this.detectRegexFormat(pattern);
        analysis.examples = this.generateRegexExamples(pattern, analysis);
        analysis.purpose = this.generateRegexPurpose(pattern, analysis);
        analysis.businessPurpose = this.generateRegexBusinessPurpose(analysis);
        
        if (complexityScore <= 3) analysis.complexity = 'low';
        else if (complexityScore <= 8) analysis.complexity = 'medium';
        else if (complexityScore <= 15) analysis.complexity = 'high';
        else analysis.complexity = 'very-high';
        
        return analysis;
    }

    describeCharClass(chars) {
        const uniqueChars = [...new Set(chars)];
        
        if (uniqueChars.every(c => /[a-z]/.test(c))) {
            return '小写字母';
        }
        if (uniqueChars.every(c => /[A-Z]/.test(c))) {
            return '大写字母';
        }
        if (uniqueChars.every(c => /[a-zA-Z]/.test(c))) {
            return '英文字母';
        }
        if (uniqueChars.every(c => /[0-9]/.test(c))) {
            return '数字';
        }
        if (uniqueChars.some(c => /[a-zA-Z]/.test(c)) && uniqueChars.some(c => /[0-9]/.test(c))) {
            return '字母数字组合';
        }
        
        return `字符集合 [${uniqueChars.join('')}]`;
    }

    detectRegexFormat(pattern) {
        const formats = [];
        
        if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(pattern) || 
            (pattern.includes('@') && pattern.includes('\\.') && pattern.includes('a-zA-Z'))) {
            formats.push('邮箱地址');
        }
        
        if ((pattern.includes('http') || pattern.includes('://')) && 
            (pattern.includes('www') || pattern.includes('[a-zA-Z]'))) {
            formats.push('URL链接');
        }
        
        if (pattern.includes('\\d') && pattern.includes('\\{4\\}') && pattern.includes('\\.')) {
            if (pattern.includes('\\d\\{1,3\\}\\.\\d\\{1,3\\}')) {
                formats.push('IP地址');
            }
        }
        
        if (pattern.includes('#') && pattern.includes('0-9a-fA-F')) {
            formats.push('十六进制颜色值');
        }
        
        if (pattern.match(/[a-fA-F0-9]\{8\}.*-[a-fA-F0-9]/)) {
            formats.push('UUID');
        }
        
        if (pattern.includes('\\d') && pattern.includes('-') && 
            pattern.includes('\\{') && !pattern.includes('@')) {
            if (pattern.includes('\\d\\{3\\}') && pattern.includes('\\d\\{4\\}')) {
                formats.push('电话号码');
            }
        }
        
        if (pattern.includes('\\d') && pattern.match(/[-\\/.].*\\d.*[-\\/]/)) {
            formats.push('日期格式');
        }
        
        return formats;
    }

    generateRegexExamples(pattern, analysis) {
        const examples = [];
        
        if (analysis.matchesFormat.includes('邮箱地址')) {
            examples.push('✓ 匹配: user@example.com');
            examples.push('✓ 匹配: test.name+tag@domain.co.uk');
            examples.push('✗ 不匹配: invalid-email');
            examples.push('✗ 不匹配: missing@domain');
        } else if (analysis.matchesFormat.includes('URL链接')) {
            examples.push('✓ 匹配: https://www.example.com');
            examples.push('✓ 匹配: http://api.domain.com/path?query=1');
            examples.push('✗ 不匹配: ftp://invalid.com');
        } else if (analysis.matchesFormat.includes('IP地址')) {
            examples.push('✓ 匹配: 192.168.1.1');
            examples.push('✓ 匹配: 10.0.0.255');
            examples.push('✗ 不匹配: 256.1.1.1');
        } else if (analysis.matchesFormat.includes('十六进制颜色值')) {
            examples.push('✓ 匹配: #FF5733');
            examples.push('✓ 匹配: #fff');
            examples.push('✗ 不匹配: #GGGGGG');
        } else if (analysis.matchesFormat.includes('电话号码')) {
            examples.push('✓ 匹配: 138-1234-5678');
            examples.push('✓ 匹配: (010) 1234-5678');
        } else if (analysis.matchesFormat.includes('日期格式')) {
            examples.push('✓ 匹配: 2024-01-15');
            examples.push('✓ 匹配: 2024/01/15');
        } else {
            try {
                const regex = new RegExp(pattern);
                examples.push('(请根据正则规则自行构造测试用例)');
            } catch (e) {
                examples.push('(正则表达式语法可能有问题)');
            }
        }
        
        return examples;
    }

    generateRegexPurpose(pattern, analysis) {
        const parts = [];
        
        if (analysis.matchesFormat.length > 0) {
            parts.push(`验证${analysis.matchesFormat.join('、')}格式`);
        }
        
        if (analysis.anchors.length > 0) {
            parts.push(`使用${analysis.anchors.join('、')}`);
        }
        
        if (analysis.humanReadable.length > 0) {
            const uniqueReadable = [...new Set(analysis.humanReadable)];
            if (uniqueReadable.length <= 4) {
                parts.push(`匹配${uniqueReadable.join('、')}`);
            }
        }
        
        if (parts.length === 0) {
            parts.push('正则表达式模式匹配');
        }
        
        return parts.join('；');
    }

    generateRegexBusinessPurpose(analysis) {
        const parts = [];
        
        if (analysis.matchesFormat.length > 0) {
            parts.push(`业务用途：验证${analysis.matchesFormat.join('或')}的格式正确性`);
        }
        
        if (analysis.validationRules.length > 0) {
            parts.push(`验证规则：${analysis.validationRules.slice(0, 3).join('；')}`);
        }
        
        if (analysis.edgeCases.length > 0) {
            parts.push(`注意事项：${analysis.edgeCases.slice(0, 2).join('；')}`);
        }
        
        return parts.length > 0 ? parts.join(' | ') : '通用正则匹配';
    }

    analyzeClass(node) {
        const { name, code, astInfo, extends: extendsClass } = node;
        const keywords = this.splitCamelCase(name);
        const methods = this.extractMethods(code);
        const businessMatch = this.detectBusinessPattern(name, code);
        
        const methodAnalysis = methods.map(m => {
            const words = this.splitCamelCase(m);
            return {
                name: m,
                purpose: words.join(' '),
                category: this.inferMethodCategory(m),
                visibility: m.startsWith('_') ? 'private' : 'public',
                isStatic: false
            };
        });
        
        const lifecycleMethods = ['constructor', 'init', 'initialize', 'dispose', 'destroy', 'cleanup'];
        const getterSetterMethods = ['get', 'set'];
        
        const constructorMethods = methodAnalysis.filter(m => lifecycleMethods.includes(m.name));
        const dataMethods = methodAnalysis.filter(m => 
            m.name.includes('get') || m.name.includes('set') || 
            m.name.includes('add') || m.name.includes('remove') ||
            m.name.includes('find') || m.name.includes('list')
        );
        const businessMethods = methodAnalysis.filter(m => 
            !lifecycleMethods.includes(m.name) && 
            !dataMethods.includes(m)
        );
        
        const classPurpose = this.generateClassPurpose(name, methods, businessMatch, extendsClass);
        
        return {
            purpose: classPurpose,
            businessPurpose: businessMatch?.description || '面向对象封装',
            category: 'class',
            className: name,
            extends: extendsClass || null,
            complexity: this.calculateComplexity(code, {
                conditionCount: (code.match(/\bif\b/g) || []).length,
                loopCount: (code.match(/\bfor\b|\bwhile\b/g) || []).length,
                tryCatchCount: (code.match(/\btry\b/g) || []).length,
                maxNestingDepth: 2,
                returnCount: (code.match(/\breturn\b/g) || []).length
            }),
            keywords,
            methods,
            methodAnalysis,
            methodCategories: {
                lifecycle: constructorMethods.map(m => m.name),
                data: dataMethods.map(m => m.name),
                business: businessMethods.map(m => m.name)
            },
            hasConstructor: code.includes('constructor'),
            hasPrivateMethods: methods.some(m => m.startsWith('_')),
            methodCount: methods.length,
            isManagerClass: name.toLowerCase().includes('manager'),
            isServiceClass: name.toLowerCase().includes('service'),
            isControllerClass: name.toLowerCase().includes('controller'),
            isHandlerClass: name.toLowerCase().includes('handler'),
            astInfo: astInfo || null
        };
    }
    
    generateClassPurpose(className, methods, businessMatch, extendsClass) {
        const lowerName = className.toLowerCase();
        
        const patterns = [
            { keywords: ['manager', 'controller'], purpose: '资源管理器' },
            { keywords: ['service', 'handler'], purpose: '业务服务层' },
            { keywords: ['repository', 'store'], purpose: '数据存储层' },
            { keywords: ['factory', 'builder'], purpose: '对象工厂' },
            { keywords: ['validator', 'checker'], purpose: '验证器' },
            { keywords: ['parser', 'decoder'], purpose: '解析器' },
            { keywords: ['converter', 'transformer'], purpose: '转换器' },
            { keywords: ['cache', 'buffer'], purpose: '缓存管理' },
            { keywords: ['config', 'setting'], purpose: '配置管理' },
            { keywords: ['logger', 'audit'], purpose: '日志记录' }
        ];
        
        let role = '通用类';
        for (const pattern of patterns) {
            if (pattern.keywords.some(k => lowerName.includes(k))) {
                role = pattern.purpose;
                break;
            }
        }
        
        let extendsInfo = '';
        if (extendsClass) {
            extendsInfo = `，继承自 ${extendsClass}`;
        }
        
        let methodInfo = '';
        if (methods.length > 0 && methods.length <= 5) {
            const publicMethods = methods.filter(m => !m.startsWith('_'));
            if (publicMethods.length > 0) {
                methodInfo = `，包含 ${publicMethods.slice(0, 3).join('、')}${publicMethods.length > 3 ? ' 等' : ''} 方法`;
            }
        }
        
        if (businessMatch) {
            return `${className}：${businessMatch.description}${extendsInfo}${methodInfo}`;
        }
        
        return `${className}：${role}${extendsInfo}${methodInfo}`;
    }
    
    inferMethodCategory(methodName) {
        const lowerName = methodName.toLowerCase();
        
        if (['constructor', 'init', 'initialize'].includes(methodName)) {
            return 'constructor';
        }
        
        const categories = {
            'getter': ['get', 'fetch', 'retrieve', 'find', 'lookup'],
            'setter': ['set', 'update', 'modify'],
            'creator': ['create', 'add', 'insert', 'build', 'generate'],
            'deleter': ['delete', 'remove', 'destroy', 'clear'],
            'validator': ['validate', 'check', 'verify', 'is', 'has', 'can'],
            'processor': ['process', 'handle', 'execute', 'run', 'perform'],
            'converter': ['convert', 'transform', 'translate'],
            'parser': ['parse', 'decode', 'extract'],
            'formatter': ['format', 'render', 'serialize'],
            'lifecycle': ['dispose', 'destroy', 'cleanup', 'release'],
            'event': ['on', 'emit', 'fire', 'trigger', 'listen']
        };
        
        for (const [category, keywords] of Object.entries(categories)) {
            for (const keyword of keywords) {
                if (lowerName.includes(keyword)) {
                    return category;
                }
            }
        }
        
        return 'other';
    }

    extractMethods(code) {
        const methods = [];
        const methodPatterns = [
            /(\w+)\s*\([^)]*\)\s*\{/g,
            /(\w+)\s*:\s*(?:async\s+)?function/g,
            /(\w+)\s*=\s*(?:async\s+)?\(/g,
            /(?:static\s+)?(\w+)\s*\([^)]*\)/g
        ];
        
        for (const pattern of methodPatterns) {
            let match;
            while ((match = pattern.exec(code)) !== null) {
                if (!['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'class', 'new'].includes(match[1])) {
                    methods.push(match[1]);
                }
            }
        }
        
        return [...new Set(methods)];
    }

    inferMethodCategory(name) {
        const lowerName = name.toLowerCase();
        
        if (lowerName.startsWith('get') || lowerName.startsWith('fetch')) {
            return 'getter';
        }
        if (lowerName.startsWith('set')) {
            return 'setter';
        }
        if (lowerName.startsWith('is') || lowerName.startsWith('has') || 
            lowerName.startsWith('check') || lowerName.startsWith('validate')) {
            return 'validation';
        }
        if (lowerName.includes('init') || lowerName.includes('constructor')) {
            return 'initialization';
        }
        if (lowerName.includes('render') || lowerName.includes('draw')) {
            return 'rendering';
        }
        if (lowerName.includes('update') || lowerName.includes('refresh')) {
            return 'update';
        }
        if (lowerName.includes('delete') || lowerName.includes('remove')) {
            return 'deletion';
        }
        if (lowerName.includes('create') || lowerName.includes('build') || 
            lowerName.includes('generate')) {
            return 'creation';
        }
        
        return 'general';
    }
}
