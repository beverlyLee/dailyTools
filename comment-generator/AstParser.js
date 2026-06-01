export class AstParser {
    constructor(language = 'javascript') {
        this.language = language;
    }

    parse(code) {
        const ast = this.buildAst(code);
        const nodes = this.extractTopLevelNodes(ast);
        
        return {
            ast,
            nodes,
            rawCode: code,
            language: this.language,
            summary: this.generateAstSummary(ast)
        };
    }

    buildAst(code) {
        const lines = code.split('\n');
        const root = {
            type: 'Program',
            children: [],
            rawCode: code,
            lineCount: lines.length
        };

        let currentScope = root;
        const scopeStack = [root];
        let inString = false;
        let stringChar = '';
        let inComment = false;
        let commentType = null;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
                const commentNode = {
                    type: 'Comment',
                    content: trimmedLine,
                    line: lineIndex
                };
                currentScope.children.push(commentNode);
                continue;
            }

            if (trimmedLine.startsWith('/*') || trimmedLine.startsWith('"""')) {
                inComment = true;
                commentType = trimmedLine.startsWith('/*') ? 'block' : 'docstring';
                continue;
            }

            if (inComment) {
                if (trimmedLine.endsWith('*/') || (commentType === 'docstring' && trimmedLine.endsWith('"""'))) {
                    inComment = false;
                }
                continue;
            }

            const classNode = this.parseClassDeclaration(trimmedLine, line, lineIndex);
            if (classNode) {
                classNode.parent = currentScope;
                currentScope.children.push(classNode);
                scopeStack.push(classNode);
                currentScope = classNode;
                continue;
            }

            const funcNode = this.parseFunctionDeclaration(trimmedLine, lineIndex, code, lines);
            if (funcNode) {
                funcNode.parent = currentScope;
                currentScope.children.push(funcNode);
                scopeStack.push(funcNode);
                currentScope = funcNode;
                
                const funcBody = this.extractFunctionBody(code, funcNode);
                funcNode.bodyAst = this.analyzeFunctionBody(funcBody);
                funcNode.calls = funcNode.bodyAst.calls;
                funcNode.variableDeclarations = funcNode.bodyAst.variables;
                funcNode.internalCalls = funcNode.bodyAst.internalCalls;
                funcNode.returnStatements = funcNode.bodyAst.returns;
                funcNode.conditionalBranches = funcNode.bodyAst.conditionals;
                funcNode.loops = funcNode.bodyAst.loops;
                
                scopeStack.pop();
                currentScope = scopeStack[scopeStack.length - 1];
                continue;
            }

            const varDecl = this.parseVariableDeclaration(trimmedLine, lineIndex);
            if (varDecl) {
                varDecl.parent = currentScope;
                currentScope.children.push(varDecl);
                
                if (varDecl.initializer) {
                    const initAnalysis = this.analyzeExpression(varDecl.initializer);
                    if (initAnalysis.calls) {
                        varDecl.initializerCalls = initAnalysis.calls;
                    }
                    if (initAnalysis.regex) {
                        varDecl.isRegex = true;
                        varDecl.regexPattern = initAnalysis.regex;
                    }
                }
            }

            const callExpr = this.parseCallExpression(trimmedLine, lineIndex);
            if (callExpr) {
                callExpr.parent = currentScope;
                currentScope.children.push(callExpr);
            }

            const openBraces = this.countBraces(line, '{');
            const closeBraces = this.countBraces(line, '}');
            const netBraces = openBraces - closeBraces;

            if (netBraces < 0 && scopeStack.length > 1) {
                for (let i = 0; i < Math.abs(netBraces) && scopeStack.length > 1; i++) {
                    scopeStack.pop();
                    currentScope = scopeStack[scopeStack.length - 1];
                }
            }
        }

        return root;
    }

    parseClassDeclaration(line, rawLine, lineIndex) {
        let match;
        
        if (this.language === 'python') {
            match = line.match(/^class\s+(\w+)(?:\(([^)]+)\))?\s*:/);
            if (match) {
                return {
                    type: 'ClassDeclaration',
                    name: match[1],
                    extends: match[2] ? match[2].trim() : null,
                    line: lineIndex,
                    children: [],
                    methods: [],
                    properties: [],
                    parentMethods: match[2] ? this.analyzeParentClass(match[2]) : []
                };
            }
        } else {
            match = line.match(/^class\s+(\w+)(?:\s+extends\s+(\w+))?/);
            if (match) {
                return {
                    type: 'ClassDeclaration',
                    name: match[1],
                    extends: match[2] || null,
                    line: lineIndex,
                    children: [],
                    methods: [],
                    properties: [],
                    parentMethods: match[2] ? this.analyzeParentClass(match[2]) : []
                };
            }
        }
        
        return null;
    }

    parseFunctionDeclaration(line, lineIndex, fullCode, lines) {
        let match;
        let funcType = 'function';
        let isAsync = false;
        let isArrow = false;
        let isMethod = false;

        if (this.language === 'python') {
            match = line.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/);
            if (match) {
                const paramsStr = match[2];
                const params = this.parsePythonParams(paramsStr);
                
                return {
                    type: 'FunctionDeclaration',
                    funcType: 'function',
                    name: match[1],
                    params,
                    returnType: match[3]?.trim() || null,
                    line: lineIndex,
                    children: [],
                    isAsync: false,
                    isMethod: paramsStr.includes('self') || paramsStr.includes('cls')
                };
            }
        } else {
            match = line.match(/^async\s+function\s+(\w+)\s*\(([^)]*)\)/);
            if (match) {
                return {
                    type: 'FunctionDeclaration',
                    funcType: 'function',
                    name: match[1],
                    params: this.parseParams(match[2]),
                    line: lineIndex,
                    children: [],
                    isAsync: true,
                    isArrow: false,
                    isMethod: false
                };
            }

            match = line.match(/^function\s+(\w+)\s*\(([^)]*)\)/);
            if (match) {
                return {
                    type: 'FunctionDeclaration',
                    funcType: 'function',
                    name: match[1],
                    params: this.parseParams(match[2]),
                    line: lineIndex,
                    children: [],
                    isAsync: false,
                    isArrow: false,
                    isMethod: false
                };
            }

            match = line.match(/^async\s+(\w+)\s*\(([^)]*)\)/);
            if (match && !line.includes('=')) {
                return {
                    type: 'FunctionDeclaration',
                    funcType: 'method',
                    name: match[1],
                    params: this.parseParams(match[2]),
                    line: lineIndex,
                    children: [],
                    isAsync: true,
                    isArrow: false,
                    isMethod: true
                };
            }

            match = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/);
            if (match) {
                return {
                    type: 'FunctionDeclaration',
                    funcType: 'function',
                    name: match[1],
                    params: this.parseParams(match[2]),
                    line: lineIndex,
                    children: [],
                    isAsync: line.includes('async'),
                    isArrow: false,
                    isMethod: false
                };
            }

            match = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/);
            if (match) {
                return {
                    type: 'FunctionDeclaration',
                    funcType: 'arrow',
                    name: match[1],
                    params: this.parseParams(match[2]),
                    line: lineIndex,
                    children: [],
                    isAsync: line.includes('async'),
                    isArrow: true,
                    isMethod: false
                };
            }

            match = line.match(/^(\w+)\s*\(([^)]*)\)/);
            if (match && !line.includes('=') && !line.includes('return')) {
                return {
                    type: 'FunctionDeclaration',
                    funcType: 'method',
                    name: match[1],
                    params: this.parseParams(match[2]),
                    line: lineIndex,
                    children: [],
                    isAsync: false,
                    isArrow: false,
                    isMethod: true
                };
            }
        }

        return null;
    }

    analyzeFunctionBody(bodyCode) {
        const analysis = {
            calls: [],
            variables: [],
            internalCalls: [],
            returns: [],
            conditionals: [],
            loops: [],
            regexPatterns: []
        };

        const lines = bodyCode.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            const callMatch = line.match(/(\w+(?:\.\w+)*)\s*\(([^)]*)\)/g);
            if (callMatch) {
                for (const call of callMatch) {
                    const funcMatch = call.match(/(\w+(?:\.\w+)*)\s*\(/);
                    if (funcMatch) {
                        const funcName = funcMatch[1];
                        analysis.calls.push({
                            name: funcName,
                            line: i,
                            isMethod: funcName.includes('.'),
                            receiver: funcName.includes('.') ? funcName.split('.')[0] : null,
                            method: funcName.includes('.') ? funcName.split('.').pop() : null
                        });
                    }
                }
            }

            const varMatch = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(.+)$/);
            if (varMatch) {
                analysis.variables.push({
                    name: varMatch[1],
                    initializer: varMatch[2].trim(),
                    line: i
                });
            }

            const regexMatch = line.match(/\/([^/]+)\/([gimsuy]*)/);
            if (regexMatch && !line.includes('//')) {
                analysis.regexPatterns.push({
                    pattern: regexMatch[1],
                    flags: regexMatch[2],
                    line: i
                });
            }

            if (line.match(/^if\s*\(/)) {
                analysis.conditionals.push({
                    type: 'if',
                    line: i
                });
            } else if (line.match(/^else\s*if\s*\(/)) {
                analysis.conditionals.push({
                    type: 'else-if',
                    line: i
                });
            } else if (line.match(/^else\s*\{?/)) {
                analysis.conditionals.push({
                    type: 'else',
                    line: i
                });
            }

            if (line.match(/^for\s*\(/)) {
                analysis.loops.push({
                    type: 'for',
                    line: i
                });
            } else if (line.match(/^while\s*\(/)) {
                analysis.loops.push({
                    type: 'while',
                    line: i
                });
            }

            const returnMatch = line.match(/^return\s*(.+)?$/);
            if (returnMatch) {
                analysis.returns.push({
                    value: returnMatch[1]?.trim() || 'undefined',
                    line: i,
                    isEarly: i < lines.length - 3
                });
            }
        }

        const uniqueCalls = [...new Map(analysis.calls.map(c => [c.name, c])).values()];
        analysis.calls = uniqueCalls;

        return analysis;
    }

    extractFunctionBody(fullCode, funcNode) {
        const lines = fullCode.split('\n');
        const startLine = funcNode.line;
        let depth = 0;
        let foundStart = false;
        const bodyLines = [];

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            for (const char of line) {
                if (char === '{') {
                    depth++;
                    foundStart = true;
                } else if (char === '}') {
                    depth--;
                }
            }

            if (foundStart) {
                bodyLines.push(line);
            }

            if (foundStart && depth === 0) {
                break;
            }
        }

        return bodyLines.join('\n');
    }

    parseVariableDeclaration(line, lineIndex) {
        if (this.language === 'python') {
            const match = line.match(/^(\w+)\s*=\s*(.+)$/);
            if (match) {
                return {
                    type: 'VariableDeclaration',
                    name: match[1],
                    initializer: match[2].trim(),
                    line: lineIndex,
                    kind: 'assignment'
                };
            }
        } else {
            const match = line.match(/^(const|let|var)\s+(\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/);
            if (match) {
                return {
                    type: 'VariableDeclaration',
                    kind: match[1],
                    name: match[2],
                    typeAnnotation: match[3]?.trim() || null,
                    initializer: match[4]?.trim() || null,
                    line: lineIndex
                };
            }
        }
        return null;
    }

    parseCallExpression(line, lineIndex) {
        const match = line.match(/(\w+(?:\.\w+)*)\s*\(([^)]*)\)/);
        if (match && !line.startsWith('function') && !line.startsWith('def')) {
            return {
                type: 'CallExpression',
                callee: match[1],
                arguments: match[2],
                line: lineIndex,
                isMethodCall: match[1].includes('.')
            };
        }
        return null;
    }

    analyzeExpression(expr) {
        const result = { calls: [], regex: null };

        const callMatch = expr.match(/(\w+(?:\.\w+)*)\s*\(([^)]*)\)/g);
        if (callMatch) {
            for (const call of callMatch) {
                const funcMatch = call.match(/(\w+(?:\.\w+)*)\s*\(/);
                if (funcMatch) {
                    result.calls.push({
                        name: funcMatch[1],
                        isMethod: funcMatch[1].includes('.')
                    });
                }
            }
        }

        const regexMatch = expr.match(/^\/([^/]+)\/([gimsuy]*)$/);
        if (regexMatch) {
            result.regex = {
                pattern: regexMatch[1],
                flags: regexMatch[2]
            };
        }

        return result;
    }

    extractTopLevelNodes(ast) {
        const nodes = [];
        
        for (const child of ast.children) {
            if (child.type === 'FunctionDeclaration') {
                nodes.push(this.convertToLegacyNode(child));
            } else if (child.type === 'ClassDeclaration') {
                nodes.push(this.convertClassToLegacyNode(child));
            }
        }
        
        return nodes;
    }

    convertToLegacyNode(astNode) {
        return {
            type: 'function',
            name: astNode.name,
            params: astNode.params || [],
            returns: astNode.returnType || this.inferReturnTypeFromAst(astNode),
            code: astNode.bodyAst ? this.reconstructCode(astNode) : '',
            startLine: astNode.line,
            endLine: astNode.line,
            isAsync: astNode.isAsync || false,
            isArrow: astNode.isArrow || false,
            isMethod: astNode.isMethod || false,
            funcType: astNode.funcType,
            astInfo: {
                calls: astNode.calls || [],
                variables: astNode.variableDeclarations || [],
                returns: astNode.returnStatements || [],
                conditionals: astNode.conditionalBranches || [],
                loops: astNode.loops || []
            }
        };
    }

    convertClassToLegacyNode(classNode) {
        return {
            type: 'class',
            name: classNode.name,
            extends: classNode.extends,
            code: '',
            startLine: classNode.line,
            endLine: classNode.line,
            astInfo: {
                methods: classNode.methods || [],
                properties: classNode.properties || [],
                parentMethods: classNode.parentMethods || []
            }
        };
    }

    parseParams(paramsStr) {
        if (!paramsStr.trim()) return [];
        
        const params = [];
        const parts = this.splitParams(paramsStr);
        
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            
            const paramMatch = trimmed.match(/^(\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?$/);
            if (paramMatch) {
                params.push({
                    name: paramMatch[1],
                    type: paramMatch[2]?.trim(),
                    default: paramMatch[3]?.trim()
                });
            } else if (trimmed.startsWith('...')) {
                params.push({
                    name: trimmed,
                    type: 'rest',
                    isRest: true
                });
            } else {
                params.push({ name: trimmed });
            }
        }
        
        return params;
    }

    parsePythonParams(paramsStr) {
        if (!paramsStr.trim()) return [];
        
        const params = [];
        const parts = this.splitParams(paramsStr);
        
        for (const part of parts) {
            const trimmed = part.trim();
            if (!trimmed || trimmed === 'self' || trimmed === 'cls') continue;
            
            const paramMatch = trimmed.match(/^(\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?$/);
            if (paramMatch) {
                params.push({
                    name: paramMatch[1],
                    type: paramMatch[2]?.trim(),
                    default: paramMatch[3]?.trim()
                });
            } else {
                params.push({ name: trimmed });
            }
        }
        
        return params;
    }

    splitParams(paramsStr) {
        const parts = [];
        let current = '';
        let depth = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < paramsStr.length; i++) {
            const char = paramsStr[i];
            
            if ((char === '"' || char === "'") && (i === 0 || paramsStr[i - 1] !== '\\')) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
            }
            
            if (!inString) {
                if (char === '(' || char === '[' || char === '{') depth++;
                else if (char === ')' || char === ']' || char === '}') depth--;
                else if (char === ',' && depth === 0) {
                    parts.push(current);
                    current = '';
                    continue;
                }
            }
            
            current += char;
        }
        
        if (current.trim()) parts.push(current);
        return parts;
    }

    countBraces(line, brace) {
        let count = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if ((char === '"' || char === "'" || char === '`') && (i === 0 || line[i - 1] !== '\\')) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
            }
            
            if (!inString && char === brace) {
                count++;
            }
        }
        
        return count;
    }

    inferReturnTypeFromAst(astNode) {
        if (!astNode.returnStatements || astNode.returnStatements.length === 0) {
            return 'void';
        }

        const returns = astNode.returnStatements;
        const hasArray = returns.some(r => r.value.includes('[') || r.value.includes('.map') || r.value.includes('.filter'));
        const hasObject = returns.some(r => r.value.startsWith('{'));
        const hasBoolean = returns.some(r => r.value === 'true' || r.value === 'false');
        const hasPromise = returns.some(r => r.value.includes('await') || r.value.includes('Promise'));

        if (hasPromise || astNode.isAsync) return 'Promise';
        if (hasArray) return 'array';
        if (hasObject) return 'object';
        if (hasBoolean) return 'boolean';
        
        return 'any';
    }

    analyzeParentClass(parentName) {
        const commonMethods = {
            'Object': ['toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf'],
            'Array': ['map', 'filter', 'reduce', 'forEach', 'find', 'push', 'pop'],
            'Error': ['message', 'name', 'stack'],
            'EventEmitter': ['on', 'emit', 'off', 'once'],
            'Component': ['render', 'componentDidMount', 'componentWillUnmount', 'setState']
        };
        
        return commonMethods[parentName] || [];
    }

    reconstructCode(astNode) {
        if (!astNode.bodyAst) return '';
        
        const params = astNode.params?.map(p => {
            let str = p.name;
            if (p.type) str += `: ${p.type}`;
            if (p.default) str += ` = ${p.default}`;
            return str;
        }).join(', ') || '';
        
        const async = astNode.isAsync ? 'async ' : '';
        
        return `${async}function ${astNode.name}(${params}) { ... }`;
    }

    generateAstSummary(ast) {
        const summary = {
            totalNodes: 0,
            functionCount: 0,
            classCount: 0,
            methodCount: 0,
            callCount: 0,
            variableCount: 0
        };

        const traverse = (node) => {
            summary.totalNodes++;
            
            if (node.type === 'FunctionDeclaration') {
                summary.functionCount++;
                if (node.isMethod) summary.methodCount++;
                if (node.calls) summary.callCount += node.calls.length;
                if (node.variableDeclarations) summary.variableCount += node.variableDeclarations.length;
            }
            if (node.type === 'ClassDeclaration') {
                summary.classCount++;
            }
            
            if (node.children) {
                for (const child of node.children) {
                    traverse(child);
                }
            }
        };

        traverse(ast);
        return summary;
    }
}
