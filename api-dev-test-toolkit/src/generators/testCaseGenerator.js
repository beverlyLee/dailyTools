import { fileSystemUtils } from '../utils/fileSystem.js';
import { commentExtractor } from '../utils/commentExtractor.js';
import { llmService } from '../core/llmService.js';
import { configManager } from '../core/config.js';
import { writeFileSync, mkdirSync, existsSync, dirname } from 'fs';
import { join, basename, extname } from 'path';

class TestCaseGenerator {
  constructor() {
    this.testSuites = [];
    this.metadata = {
      generatedAt: null,
      projectName: null,
      totalFunctions: 0,
      totalTests: 0,
      llmGenerated: 0,
      languages: {}
    };
    
    this.languageTestFrameworks = {
      javascript: {
        framework: 'jest',
        extension: '.test.js',
        importStatement: "const { {{functionName}} } = require('./{{fileName}}');\n",
        testTemplate: `describe('{{functionName}}', () => {
  {{tests}}
});`
      },
      typescript: {
        framework: 'jest',
        extension: '.test.ts',
        importStatement: "import { {{functionName}} } from './{{fileName}}';\n",
        testTemplate: `describe('{{functionName}}', () => {
  {{tests}}
});`
      },
      python: {
        framework: 'pytest',
        extension: '_test.py',
        importStatement: "from {{fileName}} import {{functionName}}\n",
        testTemplate: `import pytest

class Test{{functionName}}:
    {{tests}}`
      },
      java: {
        framework: 'junit',
        extension: 'Test.java',
        importStatement: "import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;\n",
        testTemplate: `public class {{functionName}}Test {
    {{tests}}
}`
      },
      go: {
        framework: 'testing',
        extension: '_test.go',
        importStatement: "import \"testing\"\n",
        testTemplate: `package {{packageName}}

import "testing"

{{tests}}`
      }
    };
  }

  async generateFromDirectory(directory, options = {}) {
    const {
      includeLLM = true,
      languageFilter = null,
      coverageTarget = 80,
      outputDir = './tests'
    } = options;
    
    this.metadata.generatedAt = new Date().toISOString();
    this.metadata.projectName = this.getProjectName(directory);
    
    console.log(`开始分析目录: ${directory}`);
    
    const files = await fileSystemUtils.findFiles(directory, {
      includePatterns: ['**/*.{js,ts,jsx,tsx,py,java,go}'],
      excludePatterns: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js', '**/tests/**', '**/dist/**', '**/build/**', '**/*_test.go', '**/*Test.java', '**/*_test.py']
    });
    
    console.log(`找到 ${files.length} 个源文件`);
    
    for (const file of files) {
      if (languageFilter) {
        const fileInfo = fileSystemUtils.readFile(file);
        if (fileInfo.language !== languageFilter) {
          continue;
        }
      }
      
      await this.generateFromFile(file, includeLLM, outputDir);
    }
    
    console.log(`生成完成，共 ${this.metadata.totalTests} 个测试用例`);
    
    return {
      testSuites: this.testSuites,
      metadata: this.metadata
    };
  }

  async generateFromFile(filePath, includeLLM = true, outputDir = './tests') {
    try {
      const fileInfo = fileSystemUtils.readFile(filePath);
      
      if (fileInfo.language === 'unknown') {
        return [];
      }
      
      const comments = commentExtractor.extract(fileInfo);
      const functions = this.extractFunctions(fileInfo, comments);
      
      const testSuite = {
        file: filePath,
        language: fileInfo.language,
        functions: [],
        generatedTests: []
      };
      
      for (const func of functions) {
        this.metadata.totalFunctions++;
        
        let tests;
        if (includeLLM && llmService.isAvailable()) {
          console.log(`使用 LLM 生成测试用例: ${func.name}`);
          tests = await this.generateTestsWithLLM(func, fileInfo);
          if (tests) {
            this.metadata.llmGenerated++;
          }
        }
        
        if (!tests) {
          tests = this.generateTestsFromStructure(func);
        }
        
        this.metadata.totalTests += tests.length;
        
        testSuite.functions.push({
          ...func,
          tests: tests
        });
        
        testSuite.generatedTests.push(...tests);
      }
      
      if (testSuite.functions.length > 0) {
        const outputPath = this.createTestFile(fileInfo, testSuite, outputDir);
        testSuite.outputPath = outputPath;
        this.testSuites.push(testSuite);
        
        if (!this.metadata.languages[fileInfo.language]) {
          this.metadata.languages[fileInfo.language] = 0;
        }
        this.metadata.languages[fileInfo.language] += testSuite.functions.length;
      }
      
      return testSuite;
    } catch (error) {
      console.warn(`生成测试用例失败 ${filePath}: ${error.message}`);
      return null;
    }
  }

  extractFunctions(fileInfo, comments) {
    const functions = [];
    const content = fileInfo.content;
    const language = fileInfo.language;
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        this.extractJSFunctions(content, comments, functions, fileInfo);
        break;
      case 'python':
        this.extractPythonFunctions(content, comments, functions, fileInfo);
        break;
      case 'java':
        this.extractJavaFunctions(content, comments, functions, fileInfo);
        break;
      case 'go':
        this.extractGoFunctions(content, comments, functions, fileInfo);
        break;
    }
    
    return functions;
  }

  extractJSFunctions(content, comments, functions, fileInfo) {
    const functionPatterns = [
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{/g,
      /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function\s*\(([^)]*)\)|(\([^)]*\))\s*=>)/g,
      /(?:export\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{/g
    ];
    
    for (const pattern of functionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const funcName = match[1];
        const params = match[2] || match[3] || '';
        
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
        
        const relatedComment = this.findRelatedComment(comments, lineNumber);
        const functionBody = this.extractFunctionBody(content, match.index + match[0].length);
        
        functions.push({
          name: funcName,
          params: this.parseParams(params),
          lineNumber: lineNumber,
          isAsync: /async/.test(match[0]),
          isArrow: /=>/.test(match[0]),
          comment: relatedComment,
          body: functionBody,
          language: 'javascript',
          file: fileInfo.path
        });
      }
    }
  }

  extractPythonFunctions(content, comments, functions, fileInfo) {
    const functionPattern = /^(\s*)def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/gm;
    
    let match;
    while ((match = functionPattern.exec(content)) !== null) {
      const funcName = match[2];
      const params = match[3];
      const returnType = match[4];
      
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      
      const relatedComment = this.findRelatedComment(comments, lineNumber);
      const functionBody = this.extractPythonFunctionBody(content, match.index + match[0].length, match[1].length);
      
      functions.push({
        name: funcName,
        params: this.parsePythonParams(params),
        returnType: returnType,
        lineNumber: lineNumber,
        indentLevel: match[1].length,
        isMethod: match[1].length > 0,
        comment: relatedComment,
        body: functionBody,
        language: 'python',
        file: fileInfo.path
      });
    }
  }

  extractJavaFunctions(content, comments, functions, fileInfo) {
    const methodPattern = /(?:public|private|protected|static|final|abstract|\s)+(\w+)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[^\{]+)?\s*\{/g;
    
    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      const returnType = match[1];
      const methodName = match[2];
      const params = match[3];
      
      if (methodName === '<init>' || methodName.match(/^\d/)) continue;
      
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      
      const relatedComment = this.findRelatedComment(comments, lineNumber);
      const functionBody = this.extractFunctionBody(content, match.index + match[0].length);
      
      functions.push({
        name: methodName,
        returnType: returnType,
        params: this.parseJavaParams(params),
        lineNumber: lineNumber,
        isStatic: /static/.test(match[0]),
        isPublic: /public/.test(match[0]),
        comment: relatedComment,
        body: functionBody,
        language: 'java',
        file: fileInfo.path
      });
    }
  }

  extractGoFunctions(content, comments, functions, fileInfo) {
    const funcPattern = /func\s+(?:\(\s*\w+\s+\w+\s*\)\s+)?(\w+)\s*\(([^)]*)\)\s*(?:\(\s*([^)]*)\s*\))?\s*\{/g;
    
    let match;
    while ((match = funcPattern.exec(content)) !== null) {
      const funcName = match[1];
      const params = match[2];
      const returnType = match[3];
      
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;
      
      const relatedComment = this.findRelatedComment(comments, lineNumber);
      const functionBody = this.extractFunctionBody(content, match.index + match[0].length);
      
      functions.push({
        name: funcName,
        params: this.parseGoParams(params),
        returnType: returnType,
        lineNumber: lineNumber,
        isMethod: /func\s+\(/.test(match[0]),
        comment: relatedComment,
        body: functionBody,
        language: 'go',
        file: fileInfo.path
      });
    }
  }

  findRelatedComment(comments, functionLine) {
    for (const comment of comments.reverse()) {
      if (comment.lineNumber < functionLine && functionLine - comment.lineNumber <= 5) {
        return comment;
      }
    }
    return null;
  }

  extractFunctionBody(content, startIndex) {
    let braceCount = 1;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i + 1;
          break;
        }
      }
    }
    
    return content.substring(startIndex, endIndex);
  }

  extractPythonFunctionBody(content, startIndex, baseIndent) {
    const lines = content.substring(startIndex).split('\n');
    const bodyLines = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const indent = line.match(/^(\s*)/)[1].length;
      
      if (line.trim() === '' || indent > baseIndent) {
        bodyLines.push(line);
      } else if (line.trim() && indent <= baseIndent) {
        break;
      }
    }
    
    return bodyLines.join('\n');
  }

  parseParams(paramString) {
    if (!paramString || paramString.trim() === '') {
      return [];
    }
    
    const params = [];
    const paramList = paramString.split(',').map(p => p.trim()).filter(p => p);
    
    for (const param of paramList) {
      const parts = param.split(/[=:]/);
      const name = parts[0].trim();
      const defaultValue = param.includes('=') ? param.split('=')[1].trim() : undefined;
      
      params.push({
        name: name,
        type: 'any',
        defaultValue: defaultValue,
        required: defaultValue === undefined
      });
    }
    
    return params;
  }

  parsePythonParams(paramString) {
    if (!paramString || paramString.trim() === '') {
      return [];
    }
    
    const params = [];
    const paramList = paramString.split(',').map(p => p.trim()).filter(p => p);
    
    for (const param of paramList) {
      const typeMatch = param.match(/(\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/);
      if (typeMatch) {
        params.push({
          name: typeMatch[1],
          type: typeMatch[2]?.trim() || 'any',
          defaultValue: typeMatch[3],
          required: typeMatch[3] === undefined
        });
      }
    }
    
    return params;
  }

  parseJavaParams(paramString) {
    if (!paramString || paramString.trim() === '') {
      return [];
    }
    
    const params = [];
    const paramList = paramString.split(',').map(p => p.trim()).filter(p => p);
    
    for (const param of paramList) {
      const parts = param.split(/\s+/);
      if (parts.length >= 2) {
        params.push({
          name: parts[parts.length - 1],
          type: parts.slice(0, -1).join(' '),
          required: true
        });
      }
    }
    
    return params;
  }

  parseGoParams(paramString) {
    if (!paramString || paramString.trim() === '') {
      return [];
    }
    
    const params = [];
    const paramList = paramString.split(',').map(p => p.trim()).filter(p => p);
    
    for (const param of paramList) {
      const parts = param.split(/\s+/);
      if (parts.length >= 2) {
        params.push({
          name: parts[0],
          type: parts.slice(1).join(' '),
          required: true
        });
      }
    }
    
    return params;
  }

  generateTestsFromStructure(func) {
    const tests = [];
    
    tests.push({
      type: 'normal',
      name: `test_${func.name}_basic`,
      description: `测试 ${func.name} 基本功能`,
      inputs: this.generateDefaultInputs(func.params),
      expectedOutput: null,
      code: this.generateTestCode(func, 'basic')
    });
    
    for (const param of func.params) {
      if (param.required) {
        tests.push({
          type: 'exception',
          name: `test_${func.name}_missing_${param.name}`,
          description: `测试缺少必需参数 ${param.name} 时的行为`,
          inputs: this.generateInputsExcluding(func.params, param.name),
          expectedException: true,
          code: this.generateTestCode(func, 'missing_param', param.name)
        });
      }
    }
    
    for (const param of func.params) {
      const boundaryTests = this.generateBoundaryTests(param);
      for (const boundaryTest of boundaryTests) {
        tests.push({
          type: 'boundary',
          name: `test_${func.name}_${param.name}_${boundaryTest.name}`,
          description: `测试参数 ${param.name} 的边界值: ${boundaryTest.value}`,
          inputs: this.generateInputsWithValue(func.params, param.name, boundaryTest.value),
          code: this.generateTestCode(func, 'boundary', param.name, boundaryTest.value)
        });
      }
    }
    
    if (func.body) {
      const exceptionTests = this.analyzeExceptions(func);
      for (const exceptionTest of exceptionTests) {
        tests.push({
          type: 'exception',
          name: `test_${func.name}_${exceptionTest.name}`,
          description: exceptionTest.description,
          inputs: exceptionTest.inputs,
          expectedException: exceptionTest.exceptionType,
          code: this.generateTestCode(func, 'exception', exceptionTest)
        });
      }
    }
    
    return tests;
  }

  generateDefaultInputs(params) {
    const inputs = {};
    for (const param of params) {
      if (param.defaultValue !== undefined) {
        inputs[param.name] = param.defaultValue;
      } else {
        inputs[param.name] = this.getDefaultValue(param.type);
      }
    }
    return inputs;
  }

  getDefaultValue(type) {
    const typeMap = {
      'string': '""',
      'int': '0',
      'integer': '0',
      'number': '0',
      'float': '0.0',
      'boolean': 'false',
      'bool': 'false',
      'array': '[]',
      'list': '[]',
      'object': '{}',
      'dict': '{}',
      'any': 'null'
    };
    
    return typeMap[type?.toLowerCase()] || 'null';
  }

  generateInputsExcluding(params, excludeName) {
    const inputs = {};
    for (const param of params) {
      if (param.name !== excludeName) {
        inputs[param.name] = param.defaultValue || this.getDefaultValue(param.type);
      }
    }
    return inputs;
  }

  generateInputsWithValue(params, paramName, value) {
    const inputs = this.generateDefaultInputs(params);
    inputs[paramName] = value;
    return inputs;
  }

  generateBoundaryTests(param) {
    const tests = [];
    const type = param.type?.toLowerCase() || 'any';
    
    if (type.includes('string') || type.includes('str')) {
      tests.push(
        { name: 'empty', value: '""' },
        { name: 'single_char', value: '"a"' },
        { name: 'long_string', value: '"a".repeat(1000)' }
      );
    } else if (type.includes('int') || type.includes('integer') || type.includes('number') || type.includes('float')) {
      tests.push(
        { name: 'zero', value: '0' },
        { name: 'positive', value: '1' },
        { name: 'negative', value: '-1' },
        { name: 'max_int', value: 'Number.MAX_SAFE_INTEGER' },
        { name: 'min_int', value: 'Number.MIN_SAFE_INTEGER' }
      );
    } else if (type.includes('array') || type.includes('list')) {
      tests.push(
        { name: 'empty', value: '[]' },
        { name: 'single_item', value: '[1]' },
        { name: 'multiple_items', value: '[1, 2, 3]' }
      );
    } else if (type.includes('object') || type.includes('dict')) {
      tests.push(
        { name: 'empty', value: '{}' },
        { name: 'with_data', value: '{ key: "value" }' }
      );
    }
    
    return tests;
  }

  analyzeExceptions(func) {
    const exceptions = [];
    const body = func.body || '';
    
    const throwPatterns = [
      { pattern: /throw\s+new\s+(\w+)/g, name: 'throw', lang: 'js' },
      { pattern: /raise\s+(\w+)/g, name: 'raise', lang: 'python' },
      { pattern: /throw\s+new\s+(\w+)/g, name: 'throw', lang: 'java' }
    ];
    
    for (const { pattern } of throwPatterns) {
      let match;
      const localPattern = new RegExp(pattern.source, pattern.flags);
      while ((match = localPattern.exec(body)) !== null) {
        exceptions.push({
          name: `throws_${match[1].toLowerCase()}`,
          description: `测试抛出 ${match[1]} 异常的场景`,
          exceptionType: match[1],
          inputs: this.generateDefaultInputs(func.params)
        });
      }
    }
    
    return exceptions;
  }

  generateTestCode(func, testType, ...args) {
    const language = func.language;
    const framework = this.languageTestFrameworks[language];
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.generateJSTestCode(func, testType, framework, ...args);
      case 'python':
        return this.generatePythonTestCode(func, testType, framework, ...args);
      case 'java':
        return this.generateJavaTestCode(func, testType, framework, ...args);
      case 'go':
        return this.generateGoTestCode(func, testType, framework, ...args);
      default:
        return '';
    }
  }

  generateJSTestCode(func, testType, framework, ...args) {
    const paramNames = func.params.map(p => p.name).join(', ');
    
    switch (testType) {
      case 'basic':
        return `test('${func.name} should work with basic inputs', () => {
  const result = ${func.name}(${this.generateJSArgList(func.params)});
  expect(result).toBeDefined();
});`;
      
      case 'missing_param':
        const missingParam = args[0];
        const remainingParams = func.params.filter(p => p.name !== missingParam);
        return `test('${func.name} should handle missing ${missingParam}', () => {
  expect(() => {
    ${func.name}(${this.generateJSArgList(remainingParams)});
  }).toThrow();
});`;
      
      case 'boundary':
        const [paramName, boundaryValue] = args;
        return `test('${func.name} should handle ${paramName} = ${boundaryValue}', () => {
  const result = ${func.name}(${this.generateJSArgListWithValue(func.params, paramName, boundaryValue)});
  expect(result).toBeDefined();
});`;
      
      default:
        return `test('${func.name}', () => {
  const result = ${func.name}(${this.generateJSArgList(func.params)});
  expect(result).toBeDefined();
});`;
    }
  }

  generateJSArgList(params) {
    return params.map(p => {
      if (p.defaultValue !== undefined) {
        return p.defaultValue;
      }
      return this.getDefaultValue(p.type);
    }).join(', ');
  }

  generateJSArgListWithValue(params, paramName, value) {
    return params.map(p => {
      if (p.name === paramName) {
        return value;
      }
      if (p.defaultValue !== undefined) {
        return p.defaultValue;
      }
      return this.getDefaultValue(p.type);
    }).join(', ');
  }

  generatePythonTestCode(func, testType, framework, ...args) {
    switch (testType) {
      case 'basic':
        return `def test_${func.name}_basic():
    result = ${func.name}(${this.generatePythonArgList(func.params)})
    assert result is not None`;
      
      case 'missing_param':
        const missingParam = args[0];
        return `def test_${func.name}_missing_${missingParam}():
    with pytest.raises((TypeError, ValueError)):
        ${func.name}(${this.generatePythonArgList(func.params.filter(p => p.name !== missingParam))})`;
      
      default:
        return `def test_${func.name}():
    result = ${func.name}(${this.generatePythonArgList(func.params)})
    assert result is not None`;
    }
  }

  generatePythonArgList(params) {
    return params.map(p => {
      if (p.defaultValue !== undefined) {
        return `${p.name}=${p.defaultValue}`;
      }
      return this.getDefaultValue(p.type);
    }).join(', ');
  }

  generateJavaTestCode(func, testType, framework, ...args) {
    return `@Test
public void test${this.capitalizeFirst(func.name)}() {
    ${func.returnType !== 'void' ? func.returnType + ' result = ' : ''}${func.name}(${this.generateJavaArgList(func.params)});
    ${func.returnType !== 'void' ? 'assertNotNull(result);' : ''}
}`;
  }

  generateJavaArgList(params) {
    return params.map(p => {
      const type = p.type?.toLowerCase() || 'object';
      if (type.includes('string')) return '""';
      if (type.includes('int') || type.includes('integer')) return '0';
      if (type.includes('long')) return '0L';
      if (type.includes('float')) return '0.0f';
      if (type.includes('double')) return '0.0';
      if (type.includes('boolean')) return 'false';
      return 'null';
    }).join(', ');
  }

  generateGoTestCode(func, testType, framework, ...args) {
    return `func Test${this.capitalizeFirst(func.name)}(t *testing.T) {
    result := ${func.name}(${this.generateGoArgList(func.params)})
    ${func.returnType ? 'if result == nil { t.Error("Expected non-nil result") }' : ''}
}`;
  }

  generateGoArgList(params) {
    return params.map(p => {
      const type = p.type?.toLowerCase() || 'interface{}';
      if (type.includes('string')) return '""';
      if (type.includes('int')) return '0';
      if (type.includes('float')) return '0.0';
      if (type.includes('bool')) return 'false';
      return 'nil';
    }).join(', ');
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async generateTestsWithLLM(func, fileInfo) {
    const codeInfo = {
      name: func.name,
      language: func.language,
      description: func.comment?.parsed?.description || '',
      params: func.params,
      returns: {
        type: func.returnType || 'any',
        description: ''
      },
      throws: func.comment?.parsed?.throws || [],
      code: func.body,
      file: fileInfo.path
    };
    
    return await llmService.generateTestCases(codeInfo);
  }

  createTestFile(fileInfo, testSuite, outputDir) {
    const language = fileInfo.language;
    const framework = this.languageTestFrameworks[language];
    
    if (!framework) {
      throw new Error(`不支持的语言: ${language}`);
    }
    
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    const fileName = basename(fileInfo.path, extname(fileInfo.path));
    const testFileName = this.getTestFileName(fileName, language, framework);
    const outputPath = join(outputDir, testFileName);
    
    const testCode = this.generateTestFileContent(testSuite, language, framework, fileName);
    
    writeFileSync(outputPath, testCode, 'utf-8');
    
    console.log(`已生成测试文件: ${outputPath}`);
    
    return outputPath;
  }

  getTestFileName(fileName, language, framework) {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return `${fileName}${framework.extension}`;
      case 'python':
        return `test_${fileName}.py`;
      case 'java':
        return `${this.capitalizeFirst(fileName)}${framework.extension}`;
      case 'go':
        return `${fileName}${framework.extension}`;
      default:
        return `${fileName}.test${extname}`;
    }
  }

  generateTestFileContent(testSuite, language, framework, fileName) {
    let content = '';
    
    const uniqueFunctions = [...new Set(testSuite.functions.map(f => f.name))];
    const imports = uniqueFunctions.map(funcName => {
      return framework.importStatement
        .replace(/{{functionName}}/g, funcName)
        .replace(/{{fileName}}/g, fileName);
    }).join('');
    
    content += imports + '\n';
    
    for (const funcData of testSuite.functions) {
      const func = funcData;
      let functionTests = '';
      
      for (const test of func.tests) {
        if (test.code) {
          functionTests += test.code + '\n\n';
        } else {
          switch (language) {
            case 'javascript':
            case 'typescript':
              functionTests += this.generateJSTestCode(func, 'basic', framework) + '\n\n';
              break;
            case 'python':
              functionTests += this.generatePythonTestCode(func, 'basic', framework) + '\n\n';
              break;
            case 'java':
              functionTests += this.generateJavaTestCode(func, 'basic', framework) + '\n\n';
              break;
            case 'go':
              functionTests += this.generateGoTestCode(func, 'basic', framework) + '\n\n';
              break;
          }
        }
      }
      
      if (language === 'javascript' || language === 'typescript') {
        content += `describe('${func.name}', () => {\n`;
        content += functionTests.split('\n').map(line => line ? '  ' + line : '').join('\n');
        content += `});\n\n`;
      } else {
        content += functionTests;
      }
    }
    
    return content;
  }

  getProjectName(directory) {
    const path = require('path');
    return path.basename(directory) || 'Test Project';
  }

  getStatistics() {
    return {
      ...this.metadata,
      testSuites: this.testSuites.length,
      averageTestsPerFunction: this.metadata.totalFunctions > 0 
        ? (this.metadata.totalTests / this.metadata.totalFunctions).toFixed(2) 
        : 0
    };
  }
}

export const testCaseGenerator = new TestCaseGenerator();
export default testCaseGenerator;
