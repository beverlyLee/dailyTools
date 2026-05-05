import { fileSystemUtils } from './fileSystem.js';

class CommentExtractor {
  constructor() {
    this.languageParsers = {
      javascript: this.parseJavaScriptComments.bind(this),
      typescript: this.parseJavaScriptComments.bind(this),
      python: this.parsePythonComments.bind(this),
      java: this.parseJavaComments.bind(this),
      go: this.parseGoComments.bind(this)
    };
  }

  extract(fileInfo) {
    const parser = this.languageParsers[fileInfo.language];
    if (!parser) {
      throw new Error(`不支持的语言: ${fileInfo.language}`);
    }
    
    return parser(fileInfo);
  }

  parseJavaScriptComments(fileInfo) {
    const comments = [];
    const content = fileInfo.content;
    
    const blockCommentRegex = /\/\*\*[\s\S]*?\*\//g;
    const lineCommentRegex = /\/\/.*$/gm;
    
    let match;
    
    while ((match = blockCommentRegex.exec(content)) !== null) {
      const comment = this.parseJSDocComment(match[0]);
      const precedingContent = content.substring(0, match.index);
      const lineNumber = (precedingContent.match(/\n/g) || []).length + 1;
      
      const nextCode = this.getNextFunction(content, match.index + match[0].length);
      
      comments.push({
        type: 'jsdoc',
        comment: match[0],
        parsed: comment,
        lineNumber,
        associatedCode: nextCode,
        raw: match[0]
      });
    }
    
    while ((match = lineCommentRegex.exec(content)) !== null) {
      const precedingContent = content.substring(0, match.index);
      const lineNumber = (precedingContent.match(/\n/g) || []).length + 1;
      
      comments.push({
        type: 'line',
        comment: match[0],
        parsed: {
          description: match[0].replace(/^\/\/\s*/, '').trim()
        },
        lineNumber,
        raw: match[0]
      });
    }
    
    return comments;
  }

  parseJSDocComment(commentText) {
    const result = {
      description: '',
      params: [],
      returns: null,
      example: null,
      throws: [],
      tags: []
    };
    
    const lines = commentText.split('\n');
    let inDescription = true;
    let currentTag = null;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      line = line.replace(/^\/\*\*/, '');
      line = line.replace(/^\*\//, '');
      line = line.replace(/^\*\s*/, '');
      
      if (!line) continue;
      
      if (line.startsWith('@')) {
        inDescription = false;
        const parts = line.match(/^@(\w+)(?:\s+(.*))?$/);
        if (parts) {
          const tagName = parts[1];
          const tagContent = parts[2] || '';
          
          switch (tagName) {
            case 'param':
              const paramMatch = tagContent.match(/^(?:\{([^}]+)\})?\s*(?:\[?([^\s\]=]+)(?:=([^\]]+))?\]?)?\s*(-?\s*(.*))?$/);
              if (paramMatch) {
                result.params.push({
                  type: paramMatch[1] || 'any',
                  name: paramMatch[2] || 'unknown',
                  defaultValue: paramMatch[3],
                  description: paramMatch[5] ? paramMatch[5].trim() : ''
                });
              }
              break;
            case 'returns':
            case 'return':
              const returnMatch = tagContent.match(/^(?:\{([^}]+)\})?\s*(.*)$/);
              if (returnMatch) {
                result.returns = {
                  type: returnMatch[1] || 'any',
                  description: returnMatch[2] ? returnMatch[2].trim() : ''
                };
              }
              break;
            case 'example':
              result.example = tagContent;
              break;
            case 'throws':
            case 'exception':
              const throwMatch = tagContent.match(/^(?:\{([^}]+)\})?\s*(.*)$/);
              result.throws.push({
                type: throwMatch ? throwMatch[1] : 'Error',
                description: throwMatch ? throwMatch[2] : tagContent
              });
              break;
            default:
              result.tags.push({
                name: tagName,
                content: tagContent
              });
          }
        }
      } else if (inDescription) {
        result.description += (result.description ? ' ' : '') + line;
      }
    }
    
    return result;
  }

  parsePythonComments(fileInfo) {
    const comments = [];
    const content = fileInfo.content;
    
    const docstringRegex = /(["'])\1\1[\s\S]*?\1\1\1/g;
    const lineCommentRegex = /#.*$/gm;
    
    let match;
    
    while ((match = docstringRegex.exec(content)) !== null) {
      const precedingContent = content.substring(0, match.index);
      const lineNumber = (precedingContent.match(/\n/g) || []).length + 1;
      
      const parsed = this.parsePythonDocstring(match[0]);
      const functionInfo = this.getPythonFunctionInfo(content, match.index);
      
      comments.push({
        type: 'docstring',
        comment: match[0],
        parsed,
        lineNumber,
        functionInfo,
        raw: match[0]
      });
    }
    
    while ((match = lineCommentRegex.exec(content)) !== null) {
      const precedingContent = content.substring(0, match.index);
      const lineNumber = (precedingContent.match(/\n/g) || []).length + 1;
      
      comments.push({
        type: 'line',
        comment: match[0],
        parsed: {
          description: match[0].replace(/^#\s*/, '').trim()
        },
        lineNumber,
        raw: match[0]
      });
    }
    
    return comments;
  }

  parsePythonDocstring(docstring) {
    const result = {
      description: '',
      params: [],
      returns: null,
      example: null,
      raises: []
    };
    
    const cleanDocstring = docstring
      .replace(/^["']{3}/, '')
      .replace(/["']{3}$/, '')
      .trim();
    
    const lines = cleanDocstring.split('\n');
    let currentSection = 'description';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().startsWith('args:') || 
          trimmed.toLowerCase().startsWith('parameters:')) {
        currentSection = 'params';
        continue;
      }
      if (trimmed.toLowerCase().startsWith('returns:') || 
          trimmed.toLowerCase().startsWith('return:')) {
        currentSection = 'returns';
        continue;
      }
      if (trimmed.toLowerCase().startsWith('example:') || 
          trimmed.toLowerCase().startsWith('examples:')) {
        currentSection = 'example';
        continue;
      }
      if (trimmed.toLowerCase().startsWith('raises:') || 
          trimmed.toLowerCase().startsWith('raise:')) {
        currentSection = 'raises';
        continue;
      }
      
      if (!trimmed) continue;
      
      switch (currentSection) {
        case 'description':
          result.description += (result.description ? '\n' : '') + trimmed;
          break;
        case 'params':
          const paramMatch = trimmed.match(/^(\w+)(?:\s*\(([^)]+)\))?\s*:\s*(.*)$/);
          if (paramMatch) {
            result.params.push({
              name: paramMatch[1],
              type: paramMatch[2] || 'any',
              description: paramMatch[3]
            });
          }
          break;
        case 'returns':
          if (!result.returns) {
            result.returns = {
              type: 'any',
              description: trimmed
            };
          } else {
            result.returns.description += ' ' + trimmed;
          }
          break;
        case 'example':
          if (!result.example) {
            result.example = trimmed;
          } else {
            result.example += '\n' + trimmed;
          }
          break;
        case 'raises':
          const raiseMatch = trimmed.match(/^(\w+)(?:\s*:\s*(.*))?$/);
          if (raiseMatch) {
            result.raises.push({
              type: raiseMatch[1],
              description: raiseMatch[2] || ''
            });
          }
          break;
      }
    }
    
    return result;
  }

  parseJavaComments(fileInfo) {
    const comments = [];
    const content = fileInfo.content;
    
    const javadocRegex = /\/\*\*[\s\S]*?\*\//g;
    let match;
    
    while ((match = javadocRegex.exec(content)) !== null) {
      const precedingContent = content.substring(0, match.index);
      const lineNumber = (precedingContent.match(/\n/g) || []).length + 1;
      
      const parsed = this.parseJavadocComment(match[0]);
      const methodInfo = this.getJavaMethodInfo(content, match.index);
      
      comments.push({
        type: 'javadoc',
        comment: match[0],
        parsed,
        lineNumber,
        methodInfo,
        raw: match[0]
      });
    }
    
    return comments;
  }

  parseJavadocComment(commentText) {
    const result = {
      description: '',
      params: [],
      returns: null,
      throws: [],
      example: null
    };
    
    const lines = commentText.split('\n');
    let inDescription = true;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      line = line.replace(/^\/\*\*/, '');
      line = line.replace(/^\*\//, '');
      line = line.replace(/^\*\s*/, '');
      
      if (!line) continue;
      
      if (line.startsWith('@')) {
        inDescription = false;
        const parts = line.match(/^@(\w+)(?:\s+(.*))?$/);
        if (parts) {
          const tagName = parts[1];
          const tagContent = parts[2] || '';
          
          switch (tagName) {
            case 'param':
              const paramParts = tagContent.split(/\s+/);
              result.params.push({
                name: paramParts[0] || 'unknown',
                description: paramParts.slice(1).join(' ')
              });
              break;
            case 'return':
              result.returns = {
                description: tagContent
              };
              break;
            case 'throws':
            case 'exception':
              const throwParts = tagContent.split(/\s+/);
              result.throws.push({
                type: throwParts[0] || 'Exception',
                description: throwParts.slice(1).join(' ')
              });
              break;
          }
        }
      } else if (inDescription) {
        result.description += (result.description ? ' ' : '') + line;
      }
    }
    
    return result;
  }

  parseGoComments(fileInfo) {
    const comments = [];
    const content = fileInfo.content;
    
    const lineCommentRegex = /\/\/.*$/gm;
    let match;
    
    while ((match = lineCommentRegex.exec(content)) !== null) {
      const precedingContent = content.substring(0, match.index);
      const lineNumber = (precedingContent.match(/\n/g) || []).length + 1;
      
      const nextCode = this.getGoNextDeclaration(content, match.index + match[0].length);
      
      comments.push({
        type: 'line',
        comment: match[0],
        parsed: {
          description: match[0].replace(/^\/\/\s*/, '').trim()
        },
        lineNumber,
        associatedCode: nextCode,
        raw: match[0]
      });
    }
    
    return comments;
  }

  getNextFunction(content, startIndex) {
    const functionRegex = /(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function\s*\(|(\(.*?\))\s*=>))/s;
    const classMethodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/;
    
    const remainingContent = content.substring(startIndex);
    const funcMatch = remainingContent.match(functionRegex);
    const methodMatch = remainingContent.match(classMethodRegex);
    
    if (funcMatch) {
      return {
        type: 'function',
        name: funcMatch[1] || funcMatch[2] || 'anonymous',
        isAsync: /async/.test(funcMatch[0]),
        isArrow: !!funcMatch[3]
      };
    } else if (methodMatch) {
      return {
        type: 'method',
        name: methodMatch[1]
      };
    }
    
    return null;
  }

  getPythonFunctionInfo(content, docstringIndex) {
    const beforeDocstring = content.substring(0, docstringIndex);
    const lastDefMatch = beforeDocstring.match(/def\s+(\w+)\s*\(([^)]*)\)/g);
    
    if (lastDefMatch && lastDefMatch.length > 0) {
      const lastDef = lastDefMatch[lastDefMatch.length - 1];
      const funcMatch = lastDef.match(/def\s+(\w+)\s*\(([^)]*)\)/);
      
      if (funcMatch) {
        return {
          name: funcMatch[1],
          params: funcMatch[2] ? funcMatch[2].split(',').map(p => p.trim()) : []
        };
      }
    }
    
    return null;
  }

  getJavaMethodInfo(content, javadocIndex) {
    const afterJavadoc = content.substring(javadocIndex);
    const methodMatch = afterJavadoc.match(/(?:public|private|protected|static|final|abstract|\s)+(\w+)\s+(\w+)\s*\(([^)]*)\)/);
    
    if (methodMatch) {
      return {
        returnType: methodMatch[1],
        name: methodMatch[2],
        params: methodMatch[3] ? methodMatch[3].split(',').map(p => p.trim()) : []
      };
    }
    
    return null;
  }

  getGoNextDeclaration(content, startIndex) {
    const remainingContent = content.substring(startIndex);
    const funcMatch = remainingContent.match(/func\s+(?:\(\s*\w+\s+\w+\s*\)\s+)?(\w+)\s*\(/);
    
    if (funcMatch) {
      return {
        type: 'function',
        name: funcMatch[1]
      };
    }
    
    const structMatch = remainingContent.match(/type\s+(\w+)\s+struct/);
    if (structMatch) {
      return {
        type: 'struct',
        name: structMatch[1]
      };
    }
    
    return null;
  }
}

export const commentExtractor = new CommentExtractor();
export default commentExtractor;
