import { fileSystemUtils } from '../utils/fileSystem.js';
import { commentExtractor } from '../utils/commentExtractor.js';
import { llmService } from '../core/llmService.js';
import { configManager } from '../core/config.js';

class APIDocumentationGenerator {
  constructor() {
    this.apiEndpoints = [];
    this.metadata = {
      generatedAt: null,
      projectName: null,
      totalAPIs: 0,
      enhancedAPIs: 0,
      languages: {}
    };
  }

  async analyzeDirectory(directory, options = {}) {
    const {
      includeLLMEnhancement = true,
      languageFilter = null,
      recursive = true
    } = options;
    
    this.metadata.generatedAt = new Date().toISOString();
    this.metadata.projectName = this.getProjectName(directory);
    
    console.log(`开始分析目录: ${directory}`);
    
    const files = await fileSystemUtils.findFiles(directory, {
      includePatterns: recursive ? ['**/*.{js,ts,jsx,tsx,py,java,go}'] : ['*.{js,ts,jsx,tsx,py,java,go}'],
      excludePatterns: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js', '**/tests/**', '**/dist/**', '**/build/**']
    });
    
    console.log(`找到 ${files.length} 个源文件`);
    
    const groupedFiles = fileSystemUtils.groupFilesByLanguage(files);
    
    for (const [language, langFiles] of Object.entries(groupedFiles)) {
      if (langFiles.length > 0) {
        this.metadata.languages[language] = langFiles.length;
      }
    }
    
    for (const file of files) {
      if (languageFilter) {
        const fileInfo = fileSystemUtils.readFile(file);
        if (fileInfo.language !== languageFilter) {
          continue;
        }
      }
      
      await this.analyzeFile(file, includeLLMEnhancement);
    }
    
    this.metadata.totalAPIs = this.apiEndpoints.length;
    
    console.log(`分析完成，共找到 ${this.apiEndpoints.length} 个 API 端点`);
    
    return {
      apiEndpoints: this.apiEndpoints,
      metadata: this.metadata
    };
  }

  async analyzeFile(filePath, includeLLMEnhancement = true) {
    try {
      const fileInfo = fileSystemUtils.readFile(filePath);
      
      if (fileInfo.language === 'unknown') {
        return [];
      }
      
      const comments = commentExtractor.extract(fileInfo);
      const apis = this.extractAPIsFromComments(comments, fileInfo);
      
      for (const api of apis) {
        if (includeLLMEnhancement && llmService.isAvailable()) {
          console.log(`使用 LLM 增强 API 文档: ${api.name}`);
          const enhancedAPI = await llmService.enhanceAPIDocumentation(api);
          if (enhancedAPI.isEnhanced) {
            this.metadata.enhancedAPIs++;
          }
          this.apiEndpoints.push(enhancedAPI);
        } else {
          this.apiEndpoints.push(api);
        }
      }
      
      return apis;
    } catch (error) {
      console.warn(`分析文件失败 ${filePath}: ${error.message}`);
      return [];
    }
  }

  extractAPIsFromComments(comments, fileInfo) {
    const apis = [];
    
    for (const comment of comments) {
      if (this.isAPIFunctionComment(comment)) {
        const api = this.convertCommentToAPI(comment, fileInfo);
        if (api) {
          apis.push(api);
        }
      }
    }
    
    return apis;
  }

  isAPIFunctionComment(comment) {
    if (!comment || !comment.parsed) {
      return false;
    }
    
    const parsed = comment.parsed;
    
    if (parsed.description && 
        (parsed.description.toLowerCase().includes('api') ||
         parsed.description.toLowerCase().includes('endpoint') ||
         parsed.description.toLowerCase().includes('route'))) {
      return true;
    }
    
    if (parsed.params && parsed.params.length > 0) {
      return true;
    }
    
    if (parsed.returns) {
      return true;
    }
    
    if (comment.associatedCode || comment.functionInfo || comment.methodInfo) {
      return true;
    }
    
    return false;
  }

  convertCommentToAPI(comment, fileInfo) {
    const parsed = comment.parsed;
    const associatedCode = comment.associatedCode || 
                          comment.functionInfo || 
                          comment.methodInfo;
    
    let apiName = 'UnknownAPI';
    
    if (associatedCode) {
      if (associatedCode.name) {
        apiName = associatedCode.name;
      }
    } else if (comment.raw) {
      const nameMatch = comment.raw.match(/(?:function|const|let|var|export\s+(?:default\s+)?)?(\w+)\s*[=(]/);
      if (nameMatch) {
        apiName = nameMatch[1];
      }
    }
    
    const api = {
      id: this.generateAPIID(apiName, fileInfo),
      name: apiName,
      description: parsed.description || '',
      file: fileInfo.path,
      language: fileInfo.language,
      lineNumber: comment.lineNumber,
      params: parsed.params || [],
      returns: parsed.returns || null,
      throws: parsed.throws || [],
      example: parsed.example || null,
      tags: parsed.tags || [],
      isPublic: this.determineVisibility(comment),
      isDeprecated: this.checkDeprecated(comment),
      associatedCode: associatedCode,
      rawComment: comment.raw,
      createdAt: new Date().toISOString()
    };
    
    this.detectHTTPMethod(api, comment);
    this.detectPath(api, comment);
    
    return api;
  }

  generateAPIID(name, fileInfo) {
    const filename = fileInfo.name.replace(/\.[^.]+$/, '');
    return `${filename}.${name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  determineVisibility(comment) {
    if (!comment.parsed || !comment.parsed.tags) {
      return true;
    }
    
    for (const tag of comment.parsed.tags) {
      if (tag.name === 'private' || tag.name === 'internal') {
        return false;
      }
      if (tag.name === 'public' || tag.name === 'api') {
        return true;
      }
    }
    
    return true;
  }

  checkDeprecated(comment) {
    if (!comment.parsed || !comment.parsed.tags) {
      return false;
    }
    
    return comment.parsed.tags.some(tag => tag.name === 'deprecated');
  }

  detectHTTPMethod(api, comment) {
    const methodPatterns = [
      { pattern: /@(?:get|GET)\b/, method: 'GET' },
      { pattern: /@(?:post|POST)\b/, method: 'POST' },
      { pattern: /@(?:put|PUT)\b/, method: 'PUT' },
      { pattern: /@(?:delete|DELETE)\b/, method: 'DELETE' },
      { pattern: /@(?:patch|PATCH)\b/, method: 'PATCH' },
      { pattern: /@(?:options|OPTIONS)\b/, method: 'OPTIONS' }
    ];
    
    for (const { pattern, method } of methodPatterns) {
      if (pattern.test(api.rawComment || '') || pattern.test(api.description || '')) {
        api.httpMethod = method;
        return;
      }
    }
    
    if (api.description) {
      const descLower = api.description.toLowerCase();
      if (descLower.includes('get') || descLower.includes('retrieve') || descLower.includes('fetch')) {
        api.httpMethod = 'GET';
      } else if (descLower.includes('create') || descLower.includes('add') || descLower.includes('insert')) {
        api.httpMethod = 'POST';
      } else if (descLower.includes('update') || descLower.includes('modify')) {
        api.httpMethod = 'PUT';
      } else if (descLower.includes('delete') || descLower.includes('remove')) {
        api.httpMethod = 'DELETE';
      }
    }
  }

  detectPath(api, comment) {
    const pathPatterns = [
      /@(?:path|Path|route|Route|endpoint|Endpoint)\s+(?:["']?)([^"'\s]+)/,
      /(?:\/api\/[^"'<>\s]+)/,
      /(?:\/v\d+\/[^"'<>\s]+)/
    ];
    
    const textToSearch = (api.rawComment || '') + ' ' + (api.description || '');
    
    for (const pattern of pathPatterns) {
      const match = textToSearch.match(pattern);
      if (match) {
        api.path = match[1] || match[0];
        return;
      }
    }
  }

  async detectDifferences(apiEndpoint) {
    if (!llmService.isAvailable()) {
      return {
        differences: [],
        message: 'LLM 服务不可用，无法检测差异'
      };
    }
    
    const implementation = this.extractImplementationDetails(apiEndpoint);
    
    return await llmService.detectAPIDifferences(apiEndpoint, implementation);
  }

  extractImplementationDetails(apiEndpoint) {
    const details = {
      name: apiEndpoint.name,
      params: apiEndpoint.params.map(p => ({
        name: p.name,
        type: p.type || 'any',
        required: !p.defaultValue
      })),
      returns: apiEndpoint.returns ? {
        type: apiEndpoint.returns.type || 'any'
      } : null
    };
    
    return details;
  }

  getProjectName(directory) {
    const path = require('path');
    return path.basename(directory) || 'API Project';
  }

  getStatistics() {
    const stats = {
      ...this.metadata,
      byLanguage: {},
      byHTTPMethod: {},
      deprecated: 0,
      private: 0
    };
    
    for (const api of this.apiEndpoints) {
      if (api.language) {
        stats.byLanguage[api.language] = (stats.byLanguage[api.language] || 0) + 1;
      }
      
      if (api.httpMethod) {
        stats.byHTTPMethod[api.httpMethod] = (stats.byHTTPMethod[api.httpMethod] || 0) + 1;
      }
      
      if (api.isDeprecated) {
        stats.deprecated++;
      }
      
      if (!api.isPublic) {
        stats.private++;
      }
    }
    
    return stats;
  }
}

export const apiDocumentationGenerator = new APIDocumentationGenerator();
export default apiDocumentationGenerator;
