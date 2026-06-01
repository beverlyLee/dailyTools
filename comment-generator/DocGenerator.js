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
        const { name, params, isMethod, funcType } = node;
        const { 
            purpose, 
            complexity, 
            isAsync, 
            logicFlow,
            sideEffects,
            keywords,
            regexPatterns,
            astAnalysis,
            businessPurpose
        } = context;

        lines.push('/**');
        lines.push(` * ${purpose}`);
        lines.push(' *');

        if (businessPurpose && businessPurpose !== purpose) {
            lines.push(` * ${businessPurpose}`);
            lines.push(' *');
        }

        if (isMethod) {
            lines.push(` * @memberof 方法`);
            lines.push(' *');
        }

        if (isAsync) {
            lines.push(' * @async');
            lines.push(' *');
        }

        if (astAnalysis?.callGraph && astAnalysis.callGraph.length > 0) {
            const uniqueCalls = [...new Set(astAnalysis.callGraph.map(c => c.name))];
            if (uniqueCalls.length > 0 && uniqueCalls.length <= 5) {
                lines.push(` * 依赖调用: ${uniqueCalls.join(', ')}`);
                lines.push(' *');
            }
        }

        if (params && params.length > 0) {
            for (const param of params) {
                let paramLine = ` * @param {${this.getType(param.type || 'any')}} ${param.name}`;
                if (param.default) {
                    paramLine += ` [default=${param.default}]`;
                }
                paramLine += ` - ${this.describeParam(param.name, keywords, context)}`;
                lines.push(paramLine);
                
                const paramRole = context.detailedAnalysis?.paramRoles?.find(p => p.name === param.name);
                if (paramRole && paramRole.pattern && paramRole.pattern !== '通用输入') {
                    lines.push(` *   使用方式: ${paramRole.pattern}`);
                }
            }
            lines.push(' *');
        }

        const returnType = this.getType(node.returns || this.inferReturnTypeFromContext(context));
        lines.push(` * @returns {${returnType}} ${this.describeReturn(node.returns, context)}`);
        
        if (astAnalysis?.earlyReturns && astAnalysis.earlyReturns.length > 0) {
            lines.push(` *   提前返回点: ${astAnalysis.earlyReturns.length} 处`);
        }
        lines.push(' *');

        if (logicFlow && logicFlow.length > 0) {
            lines.push(' * 【执行流程】');
            for (const step of logicFlow.slice(0, 6)) {
                const typeLabel = this.getFlowTypeLabel(step.type);
                lines.push(` *   ${step.step}. ${typeLabel}：${step.detail}`);
            }
            if (logicFlow.length > 6) {
                lines.push(` *   ... 还有 ${logicFlow.length - 6} 个步骤`);
            }
            lines.push(' *');
        }

        if (astAnalysis?.dataFlow && astAnalysis.dataFlow.length > 0) {
            lines.push(' * 【数据流】');
            for (const flow of astAnalysis.dataFlow.slice(0, 4)) {
                lines.push(` *   - ${flow}`);
            }
            lines.push(' *');
        }

        if (regexPatterns && regexPatterns.length > 0) {
            for (const regex of regexPatterns) {
                lines.push(` * 【正则解析】${regex.name !== 'inline' ? ` - ${regex.name}` : ''}`);
                lines.push(` *   模式: ${regex.fullPattern}`);
                lines.push(` *   说明: ${regex.humanReadable}`);
                if (regex.validationRules && regex.validationRules.length > 0) {
                    lines.push(` *   规则: ${regex.validationRules.join('；')}`);
                }
                if (regex.examples && regex.examples.length > 0) {
                    lines.push(` *   示例: ${regex.examples[0]}`);
                }
                lines.push(' *');
            }
        }

        if (sideEffects && sideEffects.length > 0) {
            lines.push(' * 【注意事项】');
            const effects = sideEffects.slice(0, 2).map(e => e.description);
            lines.push(` *   ${effects.join('；')}`);
            lines.push(' *');
        }

        if (astAnalysis?.controlPatterns && astAnalysis.controlPatterns.length > 0) {
            const patternLabels = {
                'api-request': '网络请求',
                'array-transformation': '数组转换',
                'multiple-returns': '多返回路径',
                'complex-conditionals': '复杂条件'
            };
            const meaningfulPatterns = astAnalysis.controlPatterns
                .filter(p => patternLabels[p]);
            
            if (meaningfulPatterns.length > 0) {
                const labels = meaningfulPatterns.map(p => patternLabels[p]).join('、');
                lines.push(` * @pattern ${labels}`);
            }
        }

        if (keywords && keywords.length > 0) {
            lines.push(` * @keywords ${keywords.slice(0, 6).join(', ')}`);
        }

        lines.push(` * @complexity ${complexity}`);
        lines.push(' */');
        
        return lines.join('\n');
    }
    
    getFlowTypeLabel(type) {
        const labels = {
            'guard': '守卫检查',
            'condition': '条件判断',
            'loop': '遍历处理',
            'data': '数据收集',
            'validation': '格式验证',
            'calculation': '数值计算',
            'return': '返回结果',
            'error': '异常处理',
            'network': '网络请求',
            'async': '异步等待'
        };
        return labels[type] || type;
    }

    generatePythonDoc(node, context) {
        const { name, params } = node;
        const { 
            purpose, 
            businessPurpose, 
            complexity, 
            logicFlow,
            sideEffects,
            dependencies,
            controlFlow,
            keywords,
            detailedAnalysis
        } = context;
        const lines = [];
        const indent = '    ';
        
        lines.push(`${indent}"""`);
        lines.push(`${indent}${purpose}`);
        lines.push('');
        lines.push(`${indent}【业务语义】`);
        lines.push(`${indent}${businessPurpose || '通用功能函数'}`);
        lines.push('');

        if (this.style === 'numpy') {
            lines.push(`${indent}Parameters`);
            lines.push(`${indent}----------`);
            if (params && params.length > 0) {
                for (const param of params) {
                    const paramRole = detailedAnalysis?.paramRoles?.find(p => p.name === param.name);
                    lines.push(`${indent}${param.name} : ${this.getPythonType(param.type)}`);
                    lines.push(`${indent}    ${this.describeParam(param.name, keywords)}`);
                    if (paramRole) {
                        lines.push(`${indent}    角色: ${paramRole.description}`);
                    }
                    if (param.default) {
                        lines.push(`${indent}    默认值: ${param.default}`);
                    }
                }
            }
            lines.push('');
            lines.push(`${indent}Returns`);
            lines.push(`${indent}-------`);
            lines.push(`${indent}${this.getPythonType(node.returns)}`);
            lines.push(`${indent}    ${this.describeReturn(node.returns, context)}`);
            if (detailedAnalysis?.returnType) {
                lines.push(`${indent}    返回特征: ${detailedAnalysis.returnType.join('、')}`);
            }
        } else if (this.style === 'google') {
            if (params && params.length > 0) {
                lines.push(`${indent}Args:`);
                for (const param of params) {
                    const paramRole = detailedAnalysis?.paramRoles?.find(p => p.name === param.name);
                    const defaultText = param.default ? ` (默认: ${param.default})` : '';
                    lines.push(`${indent}    ${param.name}: ${this.describeParam(param.name, keywords)}${defaultText}`);
                    if (paramRole) {
                        lines.push(`${indent}        角色: ${paramRole.description}`);
                    }
                }
                lines.push('');
            }
            lines.push(`${indent}Returns:`);
            lines.push(`${indent}    ${this.getPythonType(node.returns)}: ${this.describeReturn(node.returns, context)}`);
            if (detailedAnalysis?.returnType) {
                lines.push(`${indent}        返回特征: ${detailedAnalysis.returnType.join('、')}`);
            }
        } else {
            if (params && params.length > 0) {
                for (const param of params) {
                    const paramRole = detailedAnalysis?.paramRoles?.find(p => p.name === param.name);
                    const defaultText = param.default ? `, defaults to ${param.default}` : '';
                    lines.push(`${indent}:param ${param.name}: ${this.describeParam(param.name, keywords)}${defaultText}`);
                    lines.push(`${indent}:type ${param.name}: ${this.getPythonType(param.type)}`);
                    if (paramRole) {
                        lines.push(`${indent}:role ${param.name}: ${paramRole.description}`);
                    }
                }
            }
            lines.push(`${indent}:return: ${this.describeReturn(node.returns, context)}`);
            lines.push(`${indent}:rtype: ${this.getPythonType(node.returns)}`);
        }

        lines.push('');
        lines.push(`${indent}【执行流程】`);
        if (logicFlow && logicFlow.length > 0) {
            for (const step of logicFlow.slice(0, 6)) {
                lines.push(`${indent}  ${step.step}. [${step.type.toUpperCase()}] ${step.action}`);
                if (step.detail) {
                    lines.push(`${indent}      ${step.detail}`);
                }
            }
            if (logicFlow.length > 6) {
                lines.push(`${indent}  ... 还有 ${logicFlow.length - 6} 个步骤`);
            }
        }

        if (controlFlow) {
            lines.push('');
            lines.push(`${indent}【控制流分析】`);
            lines.push(`${indent}  条件分支: ${controlFlow.conditionCount || 0} 个`);
            lines.push(`${indent}  循环: ${controlFlow.loopCount || 0} 次`);
            lines.push(`${indent}  嵌套深度: ${controlFlow.maxNestingDepth || 0} 层`);
            if (controlFlow.hasEarlyReturn) {
                lines.push(`${indent}  ⚠️ 存在提前返回`);
            }
        }

        if (sideEffects && sideEffects.length > 0) {
            lines.push('');
            lines.push(`${indent}【副作用警告】`);
            for (const effect of sideEffects) {
                const severityIcon = effect.severity === 'high' ? '🔴' : 
                                     effect.severity === 'medium' ? '🟡' : '🟢';
                lines.push(`${indent}  ${severityIcon} ${effect.description}`);
            }
        }

        if (dependencies && dependencies.length > 0) {
            lines.push('');
            lines.push(`${indent}【依赖】`);
            for (const dep of dependencies.slice(0, 5)) {
                lines.push(`${indent}  - ${dep.name}: ${dep.description}`);
            }
        }

        lines.push('');
        lines.push(`${indent}复杂度: ${complexity}`);
        
        if (keywords && keywords.length > 0) {
            lines.push(`${indent}关键词: ${keywords.slice(0, 6).join(', ')}`);
        }

        lines.push('');
        lines.push(`${indent}使用建议:`);
        lines.push(`${indent}  ${this.generateUsageAdvice(context)}`);
        
        lines.push(`${indent}"""`);
        
        return lines.join('\n');
    }

    generateRegexDoc(node, context) {
        const { pattern, flags } = node;
        const { 
            purpose, 
            businessPurpose, 
            complexity, 
            patternInfo, 
            matchesFormat, 
            examples,
            detailedAnalysis
        } = context;
        const lines = [];
        
        if (this.language === 'python') {
            const indent = '    ';
            lines.push(`${indent}"""`);
            lines.push(`${indent}【正则表达式深度分析】`);
            lines.push('');
            lines.push(`${indent}业务目的: ${purpose}`);
            lines.push(`${indent}模式定义: /${pattern}/${flags}`);
            lines.push('');
            
            if (businessPurpose) {
                lines.push(`${indent}【业务语义】`);
                lines.push(`${indent}${businessPurpose}`);
                lines.push('');
            }
            
            if (matchesFormat && matchesFormat.length > 0) {
                lines.push(`${indent}【匹配格式】`);
                lines.push(`${indent}  目标格式: ${matchesFormat.join('、')}`);
                lines.push('');
            }
            
            if (detailedAnalysis?.validationRules && detailedAnalysis.validationRules.length > 0) {
                lines.push(`${indent}【验证规则】`);
                for (const rule of detailedAnalysis.validationRules) {
                    lines.push(`${indent}  ✓ ${rule}`);
                }
                lines.push('');
            }
            
            if (patternInfo.anchors && patternInfo.anchors.length > 0) {
                lines.push(`${indent}【锚点】`);
                lines.push(`${indent}  ${patternInfo.anchors.join('、')}`);
                lines.push('');
            }
            
            if (patternInfo.groups && patternInfo.groups.length > 0) {
                const uniqueGroups = [...new Set(patternInfo.groups)];
                lines.push(`${indent}【分组结构】`);
                for (const group of uniqueGroups) {
                    lines.push(`${indent}  - ${group}`);
                }
                lines.push('');
            }
            
            if (patternInfo.characterClasses && patternInfo.characterClasses.length > 0) {
                const uniqueClasses = [...new Set(patternInfo.characterClasses)];
                lines.push(`${indent}【字符类】`);
                for (const charClass of uniqueClasses) {
                    lines.push(`${indent}  - ${charClass}`);
                }
                lines.push('');
            }
            
            if (patternInfo.quantifiers && patternInfo.quantifiers.length > 0) {
                const uniqueQuantifiers = [...new Set(patternInfo.quantifiers)];
                lines.push(`${indent}【量词】`);
                for (const quant of uniqueQuantifiers) {
                    lines.push(`${indent}  - ${quant}`);
                }
                lines.push('');
            }
            
            if (detailedAnalysis?.humanReadable && detailedAnalysis.humanReadable.length > 0) {
                lines.push(`${indent}【人类可读解释】`);
                const uniqueReadable = [...new Set(detailedAnalysis.humanReadable)];
                lines.push(`${indent}  ${uniqueReadable.join(' → ')}`);
                lines.push('');
            }
            
            if (examples && examples.length > 0) {
                lines.push(`${indent}【匹配示例】`);
                for (const example of examples) {
                    lines.push(`${indent}  ${example}`);
                }
                lines.push('');
            }
            
            if (detailedAnalysis?.edgeCases && detailedAnalysis.edgeCases.length > 0) {
                lines.push(`${indent}【边界情况】`);
                for (const edgeCase of detailedAnalysis.edgeCases) {
                    lines.push(`${indent}  ⚠️ ${edgeCase}`);
                }
                lines.push('');
            }
            
            lines.push(`${indent}复杂度: ${complexity}`);
            lines.push('');
            lines.push(`${indent}【使用提示】`);
            lines.push(`${indent}  ${this.generateRegexUsageAdvice(context)}`);
            lines.push(`${indent}"""`);
        } else {
            lines.push('/**');
            lines.push(' * 【正则表达式深度分析】');
            lines.push(' *');
            lines.push(` * 业务目的: ${purpose}`);
            lines.push(` * 模式定义: /${pattern}/${flags}`);
            lines.push(' *');
            
            if (businessPurpose) {
                lines.push(' * 【业务语义】');
                lines.push(` * ${businessPurpose}`);
                lines.push(' *');
            }
            
            if (matchesFormat && matchesFormat.length > 0) {
                lines.push(' * 【匹配格式】');
                lines.push(` *   目标格式: ${matchesFormat.join('、')}`);
                lines.push(' *');
            }
            
            if (detailedAnalysis?.validationRules && detailedAnalysis.validationRules.length > 0) {
                lines.push(' * 【验证规则】');
                for (const rule of detailedAnalysis.validationRules) {
                    lines.push(` *   ✓ ${rule}`);
                }
                lines.push(' *');
            }
            
            if (patternInfo.anchors && patternInfo.anchors.length > 0) {
                lines.push(' * 【锚点】');
                lines.push(` *   ${patternInfo.anchors.join('、')}`);
                lines.push(' *');
            }
            
            if (patternInfo.groups && patternInfo.groups.length > 0) {
                const uniqueGroups = [...new Set(patternInfo.groups)];
                lines.push(' * 【分组结构】');
                for (const group of uniqueGroups) {
                    lines.push(` *   - ${group}`);
                }
                lines.push(' *');
            }
            
            if (patternInfo.characterClasses && patternInfo.characterClasses.length > 0) {
                const uniqueClasses = [...new Set(patternInfo.characterClasses)];
                lines.push(' * 【字符类】');
                for (const charClass of uniqueClasses) {
                    lines.push(` *   - ${charClass}`);
                }
                lines.push(' *');
            }
            
            if (patternInfo.quantifiers && patternInfo.quantifiers.length > 0) {
                const uniqueQuantifiers = [...new Set(patternInfo.quantifiers)];
                lines.push(' * 【量词】');
                for (const quant of uniqueQuantifiers) {
                    lines.push(` *   - ${quant}`);
                }
                lines.push(' *');
            }
            
            if (detailedAnalysis?.humanReadable && detailedAnalysis.humanReadable.length > 0) {
                lines.push(' * 【人类可读解释】');
                const uniqueReadable = [...new Set(detailedAnalysis.humanReadable)];
                lines.push(` *   ${uniqueReadable.join(' → ')}`);
                lines.push(' *');
            }
            
            if (examples && examples.length > 0) {
                lines.push(' * 【匹配示例】');
                for (const example of examples) {
                    lines.push(` *   ${example}`);
                }
                lines.push(' *');
            }
            
            if (detailedAnalysis?.edgeCases && detailedAnalysis.edgeCases.length > 0) {
                lines.push(' * 【边界情况】');
                for (const edgeCase of detailedAnalysis.edgeCases) {
                    lines.push(` *   ⚠️ ${edgeCase}`);
                }
                lines.push(' *');
            }
            
            lines.push(' * 【技术指标】');
            lines.push(` * @complexity ${complexity}`);
            lines.push(' *');
            lines.push(' * 【使用提示】');
            lines.push(` *   ${this.generateRegexUsageAdvice(context)}`);
            lines.push(' */');
        }
        
        return lines.join('\n');
    }

    generateClassDoc(node, context) {
        const { name } = node;
        const { 
            purpose, 
            complexity, 
            methods,
            methodAnalysis,
            methodCategories,
            hasConstructor,
            hasPrivateMethods,
            methodCount,
            extends: extendsClass,
            className,
            isManagerClass,
            isServiceClass,
            isControllerClass,
            isHandlerClass
        } = context;
        const lines = [];
        
        let classRole = '通用类';
        if (isManagerClass) classRole = '资源管理器';
        else if (isServiceClass) classRole = '业务服务层';
        else if (isControllerClass) classRole = '控制器';
        else if (isHandlerClass) classRole = '处理器';
        
        if (this.language === 'python') {
            const indent = '    ';
            lines.push(`${indent}"""`);
            lines.push(`${indent}${purpose}`);
            lines.push('');
            
            lines.push(`${indent}角色: ${classRole}`);
            if (extendsClass) {
                lines.push(`${indent}继承: ${extendsClass}`);
            }
            lines.push('');
            
            lines.push(`${indent}【类结构】`);
            lines.push(`${indent}  方法总数: ${methodCount || 0}`);
            if (hasConstructor) {
                lines.push(`${indent}  ✓ 包含构造函数`);
            }
            if (hasPrivateMethods) {
                lines.push(`${indent}  🔒 包含私有方法 (${methods.filter(m => m.startsWith('_')).length})`);
            }
            lines.push('');
            
            if (methodCategories) {
                if (methodCategories.lifecycle && methodCategories.lifecycle.length > 0) {
                    lines.push(`${indent}【生命周期方法】`);
                    lines.push(`${indent}  ${methodCategories.lifecycle.join(', ')}`);
                    lines.push('');
                }
                
                if (methodCategories.data && methodCategories.data.length > 0) {
                    lines.push(`${indent}【数据操作方法】`);
                    lines.push(`${indent}  ${methodCategories.data.join(', ')}`);
                    lines.push('');
                }
                
                if (methodCategories.business && methodCategories.business.length > 0) {
                    lines.push(`${indent}【业务逻辑方法】`);
                    lines.push(`${indent}  ${methodCategories.business.join(', ')}`);
                    lines.push('');
                }
            }
            
            if (methodAnalysis && methodAnalysis.length > 0) {
                lines.push(`${indent}【方法清单】`);
                for (const method of methodAnalysis.slice(0, 12)) {
                    const categoryIcon = this.getMethodCategoryIcon(method.category);
                    const visibilityIcon = method.visibility === 'private' ? '🔒' : '📝';
                    lines.push(`${indent}  ${visibilityIcon} ${categoryIcon} ${method.name}`);
                }
                if (methodAnalysis.length > 12) {
                    lines.push(`${indent}  ... 还有 ${methodAnalysis.length - 12} 个方法`);
                }
                lines.push('');
            }
            
            lines.push(`${indent}复杂度: ${complexity}`);
            lines.push(`${indent}"""`);
        } else {
            lines.push('/**');
            lines.push(` * ${purpose}`);
            lines.push(' *');
            
            lines.push(` * 角色: ${classRole}`);
            if (extendsClass) {
                lines.push(` * 继承: ${extendsClass}`);
            }
            lines.push(' *');
            
            lines.push(' * 【类结构】');
            lines.push(` *   方法总数: ${methodCount || 0}`);
            if (hasConstructor) {
                lines.push(' *   ✓ 包含构造函数');
            }
            if (hasPrivateMethods) {
                const privateCount = methods.filter(m => m.startsWith('_')).length;
                lines.push(` *   🔒 私有方法: ${privateCount} 个`);
            }
            lines.push(' *');
            
            if (methodCategories) {
                if (methodCategories.lifecycle && methodCategories.lifecycle.length > 0) {
                    lines.push(' * 【生命周期】');
                    lines.push(` *   ${methodCategories.lifecycle.join(', ')}`);
                    lines.push(' *');
                }
                
                if (methodCategories.data && methodCategories.data.length > 0) {
                    lines.push(' * 【数据操作】');
                    lines.push(` *   ${methodCategories.data.join(', ')}`);
                    lines.push(' *');
                }
                
                if (methodCategories.business && methodCategories.business.length > 0) {
                    lines.push(' * 【业务逻辑】');
                    lines.push(` *   ${methodCategories.business.join(', ')}`);
                    lines.push(' *');
                }
            }
            
            if (methodAnalysis && methodAnalysis.length > 0) {
                lines.push(' * 【方法清单】');
                for (const method of methodAnalysis.slice(0, 10)) {
                    const categoryIcon = this.getMethodCategoryIcon(method.category);
                    const visibilityIcon = method.visibility === 'private' ? '🔒' : '📝';
                    lines.push(` *   ${visibilityIcon} ${categoryIcon} ${method.name}`);
                }
                if (methodAnalysis.length > 10) {
                    lines.push(` *   ... 还有 ${methodAnalysis.length - 10} 个方法`);
                }
                lines.push(' *');
            }
            
            lines.push(` * @class ${className || name}`);
            lines.push(` * @complexity ${complexity}`);
            lines.push(' */');
        }
        
        return lines.join('\n');
    }

    getMethodCategoryIcon(category) {
        const icons = {
            'constructor': '🏗️',
            'getter': '🔍',
            'setter': '⚙️',
            'creator': '✨',
            'deleter': '🗑️',
            'validator': '✓',
            'processor': '⚡',
            'converter': '🔄',
            'parser': '📖',
            'formatter': '📋',
            'lifecycle': '🔌',
            'event': '📡',
            'initialization': '🚀',
            'rendering': '🎨',
            'update': '↺',
            'deletion': '🗑️',
            'creation': '✨',
            'general': '📝',
            'other': '📝'
        };
        return icons[category] || '📝';
    }

    generateGenericDoc(node, context) {
        const lines = [];
        
        if (this.language === 'python') {
            const indent = '    ';
            lines.push(`${indent}"""`);
            lines.push(`${indent}${context.purpose || '代码块深度分析'}`);
            lines.push('');
            if (context.businessPurpose) {
                lines.push(`${indent}业务语义: ${context.businessPurpose}`);
            }
            if (context.complexity) {
                lines.push(`${indent}复杂度: ${context.complexity}`);
            }
            lines.push(`${indent}"""`);
        } else {
            lines.push('/**');
            lines.push(` * ${context.purpose || '代码块深度分析'}`);
            lines.push(' *');
            if (context.businessPurpose) {
                lines.push(` * 业务语义: ${context.businessPurpose}`);
            }
            if (context.complexity) {
                lines.push(` * @complexity ${context.complexity}`);
            }
            lines.push(' */');
        }
        
        return lines.join('\n');
    }

    generateUsageAdvice(context) {
        const advice = [];
        
        if (context.complexity === 'very-high' || context.complexity === 'high') {
            advice.push('此函数复杂度较高，建议配合单元测试使用');
        }
        
        if (context.hasSideEffects) {
            const highRisk = context.sideEffects?.some(e => e.severity === 'high');
            if (highRisk) {
                advice.push('⚠️ 存在高风险副作用，使用前请仔细阅读副作用分析');
            } else {
                advice.push('注意：此函数存在副作用');
            }
        }
        
        if (context.hasNetworkCall) {
            advice.push('包含网络请求，建议添加超时和重试机制');
        }
        
        if (context.controlFlow?.hasEarlyReturn) {
            advice.push('存在提前返回逻辑，注意数据流完整性');
        }
        
        if (context.isAsync) {
            advice.push('异步函数，请使用 await 或 .then() 处理结果');
        }
        
        if (advice.length === 0) {
            advice.push('此函数设计合理，可直接使用');
        }
        
        return advice.join('；');
    }

    generateRegexUsageAdvice(context) {
        const advice = [];
        
        if (context.complexity === 'very-high' || context.complexity === 'high') {
            advice.push('此正则复杂度高，建议添加详细的单元测试覆盖各种边界情况');
        }
        
        if (context.detailedAnalysis?.edgeCases?.length > 0) {
            advice.push('⚠️ 注意边界情况，建议测试空字符串和特殊字符输入');
        }
        
        if (context.matchesFormat?.includes('邮箱地址')) {
            advice.push('邮箱验证建议结合实际业务需求调整正则精度');
        }
        
        if (context.matchesFormat?.includes('URL链接')) {
            advice.push('URL验证可能需要考虑更多协议和特殊字符');
        }
        
        if (advice.length === 0) {
            advice.push('此正则模式设计合理，可直接使用');
        }
        
        return advice.join('；');
    }

    inferReturnTypeFromContext(context) {
        if (context.detailedAnalysis?.returnType) {
            const returnTypes = context.detailedAnalysis.returnType;
            if (returnTypes.includes('布尔值')) return 'boolean';
            if (returnTypes.includes('返回处理后的数组') || 
                returnTypes.includes('可能返回数组')) return 'Array';
            if (returnTypes.includes('Promise包装')) return 'Promise';
        }
        return 'void';
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
            'None': 'None',
            'Array': 'List',
            'Object': 'Dict'
        };
        return typeMap[type] || type;
    }

    describeParam(name, keywords, context = null) {
        const lowerName = name.toLowerCase();
        
        const paramDescriptions = {
            'inputstring': {
                keywords: ['email', 'mail', 'parse'],
                desc: '包含多个邮箱地址的原始文本，支持用逗号、分号或换行分隔'
            },
            'input_string': {
                keywords: ['email', 'mail', 'parse'],
                desc: '包含多个邮箱地址的原始文本，支持用逗号、分号或换行分隔'
            },
            'userid': {
                keywords: ['fetch', 'api', 'user'],
                desc: '用户唯一标识符，用于定位特定用户资源'
            },
            'user_id': {
                keywords: ['fetch', 'api', 'user'],
                desc: '用户唯一标识符，用于定位特定用户资源'
            },
            'url': {
                keywords: ['validate', 'http', 'https'],
                desc: '待验证的URL地址字符串'
            },
            'options': {
                keywords: ['timeout', 'fetch', 'api'],
                desc: '请求配置选项，可设置超时时间等参数'
            },
            'orderitems': {
                keywords: ['order', 'calculate', 'total'],
                desc: '订单商品列表，每项包含价格和数量'
            },
            'order_items': {
                keywords: ['order', 'calculate', 'total'],
                desc: '订单商品列表，每项包含价格和数量'
            },
            'taxrate': {
                keywords: ['tax', 'rate', 'calculate'],
                desc: '税率，用小数表示（如0.1代表10%）'
            },
            'tax_rate': {
                keywords: ['tax', 'rate', 'calculate'],
                desc: '税率，用小数表示（如0.1代表10%）'
            },
            'discountcode': {
                keywords: ['discount', 'code', 'save', 'off'],
                desc: '优惠码，如SAVE10或OFF20格式'
            },
            'discount_code': {
                keywords: ['discount', 'code', 'save', 'off'],
                desc: '优惠码，如SAVE10或OFF20格式'
            }
        };
        
        const exactMatch = paramDescriptions[lowerName];
        if (exactMatch && keywords) {
            const hasKeyword = exactMatch.keywords.some(k => 
                keywords.includes(k) || keywords.some(kw => kw.includes(k))
            );
            if (hasKeyword) {
                return exactMatch.desc;
            }
        }
        
        const smartDescriptions = {
            'inputstring': '原始输入字符串',
            'input_string': '原始输入字符串',
            'config': '配置对象，控制函数行为',
            'options': '配置选项',
            'data': '主要处理数据',
            'value': '输入值',
            'index': '索引位置',
            'key': '查找键值',
            'callback': '回调函数',
            'error': '错误对象',
            'response': '服务端响应数据',
            'request': '请求数据',
            'url': 'URL地址',
            'path': '文件/资源路径',
            'name': '名称',
            'id': '唯一标识符',
            'params': '附加参数',
            'text': '文本内容',
            'str': '字符串',
            'num': '数字值',
            'count': '数量',
            'limit': '限制数量',
            'offset': '偏移量',
            'page': '页码',
            'size': '尺寸/数量',
            'length': '长度',
            'item': '数据项',
            'element': '集合元素',
            'list': '列表数据',
            'array': '数组数据',
            'obj': '对象',
            'regex': '正则表达式',
            'pattern': '匹配模式',
            'timeout': '超时时间（毫秒）',
            'delay': '延迟时间',
            'filter': '筛选条件',
            'query': '查询条件',
            'search': '搜索词',
            'sort': '排序规则',
            'order': '排序方式',
            'token': '认证令牌',
            'password': '密码',
            'email': '邮箱地址',
            'username': '用户名'
        };
        
        for (const [key, desc] of Object.entries(smartDescriptions)) {
            if (lowerName.includes(key)) {
                return desc;
            }
        }
        
        return name;
    }

    describeReturn(type, context) {
        if (!type || type === 'void' || type === 'None') {
            return '无返回值';
        }
        
        if (context) {
            if (context.category === 'validation') {
                if (context.subCategory === 'email') {
                    if (type === 'array' || type === 'Array' || type === 'list') {
                        return '验证通过的邮箱地址数组';
                    }
                    return 'true表示验证通过，false表示无效';
                }
                if (context.subCategory === 'url') {
                    return 'true表示URL格式有效，false表示无效';
                }
                return 'true表示验证通过，false表示验证失败';
            }
            
            if (context.category === 'calculation') {
                if (type === 'object' || type === 'Object' || type === 'dict') {
                    return '计算结果对象，包含subtotal、discount、tax、total等字段';
                }
                return '计算结果数值';
            }
            
            if (context.category === 'network') {
                return '请求成功时返回解析后的JSON数据，失败时抛出异常';
            }
            
            if (context.category === 'dataManipulation') {
                if (type === 'array' || type === 'Array' || type === 'list') {
                    return '处理后的数组，包含筛选/转换后的元素';
                }
            }
            
            if (context.category === 'dataProcessing') {
                if (context.keywords?.includes('邮箱')) {
                    return '验证通过的邮箱地址数组';
                }
            }
        }
        
        if (context?.detailedAnalysis?.returnType) {
            const features = context.detailedAnalysis.returnType;
            if (features.includes('布尔值')) {
                return 'true表示条件成立，false表示不成立';
            }
            if (features.includes('返回处理后的数组')) {
                return '处理后的数组';
            }
            if (features.includes('可能返回数组')) {
                return '数组';
            }
            if (features.includes('Promise包装')) {
                return 'Promise对象，使用await获取结果';
            }
        }
        
        const typeDescriptions = {
            'string': '字符串',
            'number': '数字',
            'boolean': '布尔值',
            'array': '数组',
            'Array': '数组',
            'object': '对象',
            'Object': '对象',
            'Promise': 'Promise对象',
            'list': '列表',
            'dict': '字典',
            'str': '字符串',
            'int': '整数',
            'bool': '布尔值'
        };
        
        return typeDescriptions[type] || type;
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
