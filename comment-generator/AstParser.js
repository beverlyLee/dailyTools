export class AstParser {
    constructor(language = 'javascript') {
        this.language = language;
    }

    parse(code) {
        const nodes = [];
        const lines = code.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            if (this.language === 'javascript' || this.language === 'typescript') {
                const funcNode = this.parseJSFunction(trimmedLine, lines, i);
                if (funcNode) {
                    nodes.push(funcNode);
                    i = funcNode.endLine;
                    continue;
                }
                
                const regexNode = this.parseRegex(trimmedLine, i);
                if (regexNode) {
                    nodes.push(regexNode);
                }
                
                const classNode = this.parseJSClass(trimmedLine, lines, i);
                if (classNode) {
                    nodes.push(classNode);
                    i = classNode.endLine;
                }
            } else if (this.language === 'python') {
                const funcNode = this.parsePythonFunction(trimmedLine, lines, i);
                if (funcNode) {
                    nodes.push(funcNode);
                    i = funcNode.endLine;
                    continue;
                }
                
                const classNode = this.parsePythonClass(trimmedLine, lines, i);
                if (classNode) {
                    nodes.push(classNode);
                    i = classNode.endLine;
                }
            }
        }
        
        return {
            nodes,
            rawCode: code,
            language: this.language
        };
    }

    parseJSFunction(line, lines, startLine) {
        const funcPatterns = [
            /^function\s+(\w+)\s*\(([^)]*)\)/,
            /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/,
            /^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*[^=]+)?\s*=>/,
            /^(\w+)\s*\(([^)]*)\)\s*(?::{[^}]+})?\s*(?:\{|=>)/,
            /^async\s+function\s+(\w+)\s*\(([^)]*)\)/,
            /^async\s+(\w+)\s*\(([^)]*)\)/
        ];
        
        for (const pattern of funcPatterns) {
            const match = line.match(pattern);
            if (match) {
                const funcName = match[1];
                const paramsStr = match[2];
                const params = this.parseParams(paramsStr);
                const endLine = this.findFunctionEnd(lines, startLine);
                const code = lines.slice(startLine, endLine + 1).join('\n');
                
                return {
                    type: 'function',
                    name: funcName,
                    params,
                    returns: this.inferReturnType(code),
                    code,
                    startLine,
                    endLine,
                    isAsync: line.includes('async'),
                    isArrow: line.includes('=>')
                };
            }
        }
        
        return null;
    }

    parsePythonFunction(line, lines, startLine) {
        const match = line.match(/^def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/);
        if (match) {
            const funcName = match[1];
            const paramsStr = match[2];
            const returnType = match[3]?.trim();
            const params = this.parsePythonParams(paramsStr);
            const endLine = this.findPythonFunctionEnd(lines, startLine);
            const code = lines.slice(startLine, endLine + 1).join('\n');
            
            return {
                type: 'function',
                name: funcName,
                params,
                returns: returnType || this.inferPythonReturnType(code),
                code,
                startLine,
                endLine
            };
        }
        return null;
    }

    parseJSClass(line, lines, startLine) {
        const match = line.match(/^class\s+(\w+)/);
        if (match) {
            const className = match[1];
            const endLine = this.findBlockEnd(lines, startLine);
            const code = lines.slice(startLine, endLine + 1).join('\n');
            
            return {
                type: 'class',
                name: className,
                code,
                startLine,
                endLine
            };
        }
        return null;
    }

    parsePythonClass(line, lines, startLine) {
        const match = line.match(/^class\s+(\w+)/);
        if (match) {
            const className = match[1];
            const endLine = this.findPythonFunctionEnd(lines, startLine);
            const code = lines.slice(startLine, endLine + 1).join('\n');
            
            return {
                type: 'class',
                name: className,
                code,
                startLine,
                endLine
            };
        }
        return null;
    }

    parseRegex(line, lineNum) {
        const regexPattern = /\/(.+?)\/([gimsuy]*)/g;
        const regexes = [];
        let match;
        
        while ((match = regexPattern.exec(line)) !== null) {
            if (match.index > 0 && line[match.index - 1] === '.') {
                continue;
            }
            
            regexes.push({
                type: 'regex',
                pattern: match[1],
                flags: match[2],
                code: match[0],
                line: lineNum
            });
        }
        
        return regexes.length > 0 ? regexes[0] : null;
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

    findFunctionEnd(lines, startLine) {
        let depth = 0;
        let inString = false;
        let stringChar = '';
        let foundStart = false;
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if ((char === '"' || char === "'" || char === '`') && (j === 0 || line[j - 1] !== '\\')) {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                    }
                }
                
                if (!inString) {
                    if (char === '{' || char === '(') {
                        depth++;
                        foundStart = true;
                    } else if (char === '}' || char === ')') {
                        depth--;
                    }
                }
            }
            
            if (foundStart && depth === 0) {
                return i;
            }
        }
        
        return lines.length - 1;
    }

    findPythonFunctionEnd(lines, startLine) {
        const baseIndent = this.getIndentation(lines[startLine]);
        
        for (let i = startLine + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '') continue;
            
            const currentIndent = this.getIndentation(line);
            if (currentIndent <= baseIndent && !line.trim().startsWith('#')) {
                return i - 1;
            }
        }
        
        return lines.length - 1;
    }

    findBlockEnd(lines, startLine) {
        let depth = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if ((char === '"' || char === "'" || char === '`') && (j === 0 || line[j - 1] !== '\\')) {
                    if (!inString) {
                        inString = true;
                        stringChar = char;
                    } else if (char === stringChar) {
                        inString = false;
                    }
                }
                
                if (!inString) {
                    if (char === '{') depth++;
                    else if (char === '}') depth--;
                }
            }
            
            if (i > startLine && depth === 0) {
                return i;
            }
        }
        
        return lines.length - 1;
    }

    getIndentation(line) {
        let count = 0;
        for (const char of line) {
            if (char === ' ') count++;
            else if (char === '\t') count += 4;
            else break;
        }
        return count;
    }

    inferReturnType(code) {
        if (code.includes('return ')) {
            const returnMatch = code.match(/return\s+(.+?)(?:;|\n|$)/);
            if (returnMatch) {
                const value = returnMatch[1].trim();
                if (value === 'true' || value === 'false') return 'boolean';
                if (/^\d+/.test(value)) return 'number';
                if (value.startsWith("'") || value.startsWith('"') || value.startsWith('`')) return 'string';
                if (value.startsWith('[') || value.includes('.map(') || value.includes('.filter(')) return 'array';
                if (value.startsWith('{')) return 'object';
                if (value === 'null') return 'null';
                if (value === 'undefined') return 'undefined';
            }
        }
        if (code.includes('Promise') || code.includes('await')) return 'Promise';
        return 'void';
    }

    inferPythonReturnType(code) {
        if (code.includes('return ')) {
            const returnMatch = code.match(/return\s+(.+?)(?:\n|$)/);
            if (returnMatch) {
                const value = returnMatch[1].trim();
                if (value === 'True' || value === 'False') return 'bool';
                if (/^\d+/.test(value)) return 'int';
                if (value.startsWith("'") || value.startsWith('"')) return 'str';
                if (value.startsWith('[') || value.includes('.append(')) return 'list';
                if (value.startsWith('{')) return 'dict';
                if (value === 'None') return 'None';
            }
        }
        return 'None';
    }

    getSelectedCode(editor) {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
            const model = editor.getModel();
            return model.getValueInRange(selection);
        }
        return null;
    }
}