export class DocGenerator {
    constructor(language = 'javascript', style = 'jsdoc') {
        this.language = language;
        this.style = style;
    }

    generate(node, context) {
        if (node.type === 'function') {
            return this.generateFunctionDoc(node, context);
        } else if (node.type === 'regex') {
            return this.generateRegexDoc(node, context);
        } else if (node.type === 'class') {
            return this.generateClassDoc(node, context);
        }
        
        return this.generateGenericDoc(node, context);
    }

    generateFunctionDoc(node, context) {
        if (this.language === 'python') {
            return this.generatePythonDoc(node, context);
        }
        return this.generateJSDoc(node, context);
    }

    generateJSDoc(node, context) {
        const lines = [];
        const { name, params, returns } = node;
        const { purpose, complexity, isAsync, hasSideEffects, keywords } = context;
        
        lines.push('/**');
        lines.push(` * ${purpose}`);
        lines.push(' *');
        
        if (isAsync) {
            lines.push(' * @async');
        }
        
        if (params && params.length > 0) {
            for (const param of params) {
                let paramLine = ` * @param {${this.getType(param.type || 'any')}} ${param.name}`;
                if (param.default) {
                    paramLine += ` [default=${param.default}]`;
                }
                paramLine += ` - ${this.describeParam(param.name, keywords)}`;
                lines.push(paramLine);
            }
        }
        
        lines.push(` * @returns {${this.getType(returns || 'void')}} ${this.describeReturn(returns, context)}`);
        
        if (complexity !== 'low') {
            lines.push(` * @complexity ${complexity}`);
        }
        
        if (hasSideEffects) {
            lines.push(' * @sideEffects 可能产生副作用');
        }
        
        if (keywords && keywords.length > 0) {
            lines.push(` * @keywords ${keywords.slice(0, 5).join(', ')}`);
        }
        
        lines.push(' */');
        
        return lines.join('\n');
    }

    generatePythonDoc(node, context) {
        const { name, params, returns } = node;
        const { purpose, complexity, hasSideEffects, keywords } = context;
        const lines = [];
        
        const indent = '    ';
        lines.push(`${indent}"""`);
        lines.push(`${indent}${purpose}`);
        lines.push('');
        
        if (this.style === 'numpy' || this.style === 'google') {
            if (params && params.length > 0) {
                if (this.style === 'numpy') {
                    lines.push(`${indent}Parameters`);
                    lines.push(`${indent}----------`);
                    for (const param of params) {
                        lines.push(`${indent}${param.name} : ${this.getPythonType(param.type)}`);
                        lines.push(`${indent}    ${this.describeParam(param.name, keywords)}`);
                        if (param.default) {
                            lines.push(`${indent}    默认值: ${param.default}`);
                        }
                    }
                    lines.push('');
                    lines.push(`${indent}Returns`);
                    lines.push(`${indent}-------`);
                    lines.push(`${indent}${this.getPythonType(returns)}`);
                    lines.push(`${indent}    ${this.describeReturn(returns, context)}`);
                } else {
                    lines.push(`${indent}Args:`);
                    for (const param of params) {
                        const defaultText = param.default ? ` (默认: ${param.default})` : '';
                        lines.push(`${indent}    ${param.name}: ${this.describeParam(param.name, keywords)}${defaultText}`);
                    }
                    lines.push('');
                    lines.push(`${indent}Returns:`);
                    lines.push(`${indent}    ${this.getPythonType(returns)}: ${this.describeReturn(returns, context)}`);
                }
            }
        } else {
            if (params && params.length > 0) {
                for (const param of params) {
                    const defaultText = param.default ? `, defaults to ${param.default}` : '';
                    lines.push(`${indent}:param ${param.name}: ${this.describeParam(param.name, keywords)}${defaultText}`);
                    lines.push(`${indent}:type ${param.name}: ${this.getPythonType(param.type)}`);
                }
            }
            lines.push(`${indent}:return: ${this.describeReturn(returns, context)}`);
            lines.push(`${indent}:rtype: ${this.getPythonType(returns)}`);
        }
        
        if (complexity !== 'low') {
            lines.push('');
            lines.push(`${indent}复杂度: ${complexity}`);
        }
        
        if (hasSideEffects) {
            lines.push(`${indent}注意: 可能产生副作用`);
        }
        
        lines.push(`${indent}"""`);
        
        return lines.join('\n');
    }

    generateRegexDoc(node, context) {
        const { pattern, flags } = node;
        const { purpose, complexity, patternInfo, matchesFormat, examples } = context;
        const lines = [];
        
        if (this.language === 'python') {
            const indent = '    ';
            lines.push(`${indent}"""`);
            lines.push(`${indent}正则表达式说明`);
            lines.push('');
            lines.push(`${indent}用途: ${purpose}`);
            lines.push(`${indent}模式: /${pattern}/${flags}`);
            lines.push('');
            
            if (matchesFormat && matchesFormat.length > 0) {
                lines.push(`${indent}匹配格式: ${matchesFormat.join('、')}`);
            }
            
            if (patternInfo.anchors && patternInfo.anchors.length > 0) {
                lines.push(`${indent}锚点: ${patternInfo.anchors.join('、')}`);
            }
            
            if (patternInfo.groups && patternInfo.groups.length > 0) {
                const uniqueGroups = [...new Set(patternInfo.groups)];
                lines.push(`${indent}分组: ${uniqueGroups.join('、')}`);
            }
            
            if (patternInfo.characterClasses && patternInfo.characterClasses.length > 0) {
                const uniqueClasses = [...new Set(patternInfo.characterClasses)];
                lines.push(`${indent}字符类: ${uniqueClasses.join('、')}`);
            }
            
            if (patternInfo.quantifiers && patternInfo.quantifiers.length > 0) {
                const uniqueQuantifiers = [...new Set(patternInfo.quantifiers)];
                lines.push(`${indent}量词: ${uniqueQuantifiers.join('、')}`);
            }
            
            if (examples && examples.length > 0) {
                lines.push('');
                lines.push(`${indent}匹配示例:`);
                for (const example of examples) {
                    lines.push(`${indent}  - ${example}`);
                }
            }
            
            lines.push('');
            lines.push(`${indent}复杂度: ${complexity}`);
            lines.push(`${indent}"""`);
        } else {
            lines.push('/**');
            lines.push(' * 正则表达式说明');
            lines.push(' *');
            lines.push(` * 用途: ${purpose}`);
            lines.push(` * 模式: /${pattern}/${flags}`);
            lines.push(' *');
            
            if (matchesFormat && matchesFormat.length > 0) {
                lines.push(` * 匹配格式: ${matchesFormat.join('、')}`);
            }
            
            if (patternInfo.anchors && patternInfo.anchors.length > 0) {
                lines.push(` * 锚点: ${patternInfo.anchors.join('、')}`);
            }
            
            if (patternInfo.groups && patternInfo.groups.length > 0) {
                const uniqueGroups = [...new Set(patternInfo.groups)];
                lines.push(` * 分组: ${uniqueGroups.join('、')}`);
            }
            
            if (patternInfo.characterClasses && patternInfo.characterClasses.length > 0) {
                const uniqueClasses = [...new Set(patternInfo.characterClasses)];
                lines.push(` * 字符类: ${uniqueClasses.join('、')}`);
            }
            
            if (patternInfo.quantifiers && patternInfo.quantifiers.length > 0) {
                const uniqueQuantifiers = [...new Set(patternInfo.quantifiers)];
                lines.push(` * 量词: ${uniqueQuantifiers.join('、')}`);
            }
            
            if (examples && examples.length > 0) {
                lines.push(' *');
                lines.push(' * 匹配示例:');
                for (const example of examples) {
                    lines.push(` *   - ${example}`);
                }
            }
            
            lines.push(' *');
            lines.push(` * 复杂度: ${complexity}`);
            lines.push(' */');
        }
        
        return lines.join('\n');
    }

    generateClassDoc(node, context) {
        const { name } = node;
        const { purpose, complexity, methods } = context;
        const lines = [];
        
        if (this.language === 'python') {
            const indent = '    ';
            lines.push(`${indent}"""`);
            lines.push(`${indent}${purpose}`);
            lines.push('');
            
            if (methods && methods.length > 0) {
                lines.push(`${indent}主要方法:`);
                for (const method of methods.slice(0, 10)) {
                    lines.push(`${indent}  - ${method}`);
                }
                if (methods.length > 10) {
                    lines.push(`${indent}  - ... 还有 ${methods.length - 10} 个方法`);
                }
            }
            
            lines.push('');
            lines.push(`${indent}复杂度: ${complexity}`);
            lines.push(`${indent}"""`);
        } else {
            lines.push('/**');
            lines.push(` * ${purpose}`);
            lines.push(' *');
            
            if (methods && methods.length > 0) {
                lines.push(' * 主要方法:');
                for (const method of methods.slice(0, 10)) {
                    lines.push(` *   - ${method}`);
                }
                if (methods.length > 10) {
                    lines.push(` *   - ... 还有 ${methods.length - 10} 个方法`);
                }
                lines.push(' *');
            }
            
            lines.push(` * @class ${name}`);
            lines.push(` * @complexity ${complexity}`);
            lines.push(' */');
        }
        
        return lines.join('\n');
    }

    generateGenericDoc(node, context) {
        const lines = [];
        
        if (this.language === 'python') {
            const indent = '    ';
            lines.push(`${indent}"""`);
            lines.push(`${indent}${context.purpose || '代码块说明'}`);
            if (context.complexity) {
                lines.push(`${indent}复杂度: ${context.complexity}`);
            }
            lines.push(`${indent}"""`);
        } else {
            lines.push('/**');
            lines.push(` * ${context.purpose || '代码块说明'}`);
            if (context.complexity) {
                lines.push(` * @complexity ${context.complexity}`);
            }
            lines.push(' */');
        }
        
        return lines.join('\n');
    }

    getType(type) {
        const typeMap = {
            'string': 'string',
            'number': 'number',
            'boolean': 'boolean',
            'array': 'Array',
            'object': 'Object',
            'function': 'Function',
            'null': 'null',
            'undefined': 'undefined',
            'void': 'void',
            'Promise': 'Promise',
            'any': '*'
        };
        return typeMap[type] || type || '*';
    }

    getPythonType(type) {
        if (!type) return 'Any';
        const typeMap = {
            'string': 'str',
            'number': 'int',
            'boolean': 'bool',
            'array': 'list',
            'object': 'dict',
            'function': 'Callable',
            'null': 'None',
            'void': 'None',
            'None': 'None'
        };
        return typeMap[type] || type;
    }

    describeParam(name, keywords) {
        const lowerName = name.toLowerCase();
        
        const descriptions = {
            'config': '配置对象',
            'options': '选项参数',
            'data': '数据对象',
            'value': '输入值',
            'index': '索引位置',
            'key': '键值',
            'callback': '回调函数',
            'error': '错误对象',
            'response': '响应数据',
            'request': '请求数据',
            'url': 'URL地址',
            'path': '路径字符串',
            'name': '名称字符串',
            'id': '唯一标识符',
            'params': '参数对象',
            'args': '参数列表',
            'kwargs': '关键字参数',
            'text': '文本内容',
            'str': '字符串',
            'num': '数字',
            'count': '数量',
            'limit': '限制值',
            'offset': '偏移量',
            'page': '页码',
            'size': '大小',
            'length': '长度',
            'width': '宽度',
            'height': '高度',
            'result': '结果值',
            'item': '项目对象',
            'element': '元素',
            'node': '节点对象',
            'list': '列表数据',
            'array': '数组数据',
            'obj': '对象',
            'map': '映射表',
            'set': '集合',
            'regex': '正则表达式',
            'pattern': '匹配模式',
            'flags': '标志位'
        };
        
        for (const [key, desc] of Object.entries(descriptions)) {
            if (lowerName.includes(key)) {
                return desc;
            }
        }
        
        return '输入参数';
    }

    describeReturn(type, context) {
        if (!type || type === 'void' || type === 'None') {
            return '无返回值';
        }
        
        const returnDescriptions = {
            'string': '处理后的字符串',
            'number': '计算结果数值',
            'boolean': '布尔判断结果',
            'array': '处理后的数组',
            'object': '处理后的对象',
            'Promise': '异步操作的Promise',
            'list': '处理后的列表',
            'dict': '处理后的字典',
            'str': '处理后的字符串',
            'int': '计算结果整数',
            'bool': '布尔判断结果'
        };
        
        if (context && context.category) {
            const categoryDescriptions = {
                'sorting': '排序后的结果',
                'filtering': '筛选后的结果',
                'transformation': '转换后的结果',
                'validation': '验证结果',
                'calculation': '计算结果',
                'dataManipulation': '处理后的数据',
                'stringManipulation': '处理后的字符串',
                'network': '网络请求结果',
                'file': '文件操作结果',
                'security': '安全处理结果'
            };
            
            if (categoryDescriptions[context.category]) {
                return categoryDescriptions[context.category];
            }
        }
        
        return returnDescriptions[type] || '函数执行结果';
    }

    insertComment(code, comment, node) {
        const lines = code.split('\n');
        const startLine = node.startLine || 0;
        
        const commentLines = comment.split('\n');
        const indentation = this.getIndentation(lines[startLine] || '');
        
        const indentedComment = commentLines.map(line => {
            if (line.trim() === '') return '';
            return indentation + line;
        }).join('\n');
        
        const before = lines.slice(0, startLine).join('\n');
        const after = lines.slice(startLine).join('\n');
        
        let separator = '\n';
        if (before && !before.endsWith('\n')) separator = '\n';
        
        return before + (before ? separator : '') + indentedComment + '\n' + after;
    }

    getIndentation(line) {
        let indent = '';
        for (const char of line) {
            if (char === ' ' || char === '\t') {
                indent += char;
            } else {
                break;
            }
        }
        return indent;
    }
}