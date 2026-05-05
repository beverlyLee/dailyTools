import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DocumentationExporter {
  constructor() {
    this.exporters = {
      markdown: this.exportMarkdown.bind(this),
      html: this.exportHTML.bind(this),
      postman: this.exportPostman.bind(this),
      openapi: this.exportOpenAPI.bind(this),
      all: this.exportAll.bind(this)
    };
  }

  export(docData, outputPath, format = 'markdown', options = {}) {
    const exporter = this.exporters[format];
    
    if (!exporter) {
      throw new Error(`不支持的输出格式: ${format}，支持的格式: ${Object.keys(this.exporters).join(', ')}`);
    }
    
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    return exporter(docData, outputPath, options);
  }

  exportMarkdown(docData, outputPath, options = {}) {
    const { apiEndpoints, metadata } = docData;
    
    let md = `# ${metadata.projectName || 'API Documentation'}\n\n`;
    
    md += `> 生成时间: ${new Date(metadata.generatedAt).toLocaleString()}\n\n`;
    
    md += `## 目录\n\n`;
    md += `- [概览](#概览)\n`;
    md += `- [API 列表](#api-列表)\n`;
    md += `- [详细文档](#详细文档)\n\n`;
    
    md += `## 概览\n\n`;
    md += `| 项目 | 值 |\n`;
    md += `|------|-----|\n`;
    md += `| API 总数 | ${metadata.totalAPIs} |\n`;
    md += `| LLM 增强 | ${metadata.enhancedAPIs} |\n`;
    md += `| 支持语言 | ${Object.keys(metadata.languages).join(', ')} |\n\n`;
    
    md += `## API 列表\n\n`;
    md += `| 名称 | 方法 | 路径 | 描述 |\n`;
    md += `|------|------|------|------|\n`;
    
    for (const api of apiEndpoints) {
      const method = api.httpMethod || 'N/A';
      const path = api.path || 'N/A';
      const desc = this.truncateText(api.description || api.enhancedDescription || '', 50);
      md += `| [${api.name}](#${api.name.toLowerCase()}) | ${method} | ${path} | ${desc} |\n`;
    }
    md += '\n';
    
    md += `## 详细文档\n\n`;
    
    for (const api of apiEndpoints) {
      md += `---\n\n`;
      md += `### ${api.name}\n\n`;
      
      if (api.isDeprecated) {
        md += `⚠️ **已废弃**\n\n`;
      }
      
      if (!api.isPublic) {
        md += `🔒 **私有 API**\n\n`;
      }
      
      const description = api.enhancedDescription || api.description;
      if (description) {
        md += `${description}\n\n`;
      }
      
      if (api.httpMethod || api.path) {
        md += `**HTTP 信息:**\n\n`;
        if (api.httpMethod) {
          md += `- 方法: \`${api.httpMethod}\`\n`;
        }
        if (api.path) {
          md += `- 路径: \`${api.path}\`\n`;
        }
        md += '\n';
      }
      
      if (api.params && api.params.length > 0) {
        md += `**参数:**\n\n`;
        md += `| 名称 | 类型 | 必填 | 描述 |\n`;
        md += `|------|------|------|------|\n`;
        
        for (const param of api.params) {
          const enhancedParam = api.enhancedParams?.find(p => p.name === param.name) || param;
          const required = param.defaultValue ? '否' : '是';
          const desc = enhancedParam.description || param.description || '-';
          md += `| \`${param.name}\` | \`${param.type || 'any'}\` | ${required} | ${desc} |\n`;
        }
        md += '\n';
      }
      
      if (api.returns) {
        md += `**返回值:**\n\n`;
        const enhancedReturn = api.enhancedReturns || api.returns;
        md += `- 类型: \`${enhancedReturn.type || 'any'}\`\n`;
        if (enhancedReturn.description) {
          md += `- 描述: ${enhancedReturn.description}\n`;
        }
        md += '\n';
      }
      
      if (api.throws && api.throws.length > 0) {
        md += `**可能抛出的异常:**\n\n`;
        for (const throwItem of api.throws) {
          md += `- \`${throwItem.type}\` - ${throwItem.description || ''}\n`;
        }
        md += '\n';
      }
      
      if (api.example) {
        md += `**示例:**\n\n`;
        md += `\`\`\`javascript\n${api.example}\n\`\`\`\n\n`;
      }
      
      if (api.useCases && api.useCases.length > 0) {
        md += `**使用场景:**\n\n`;
        for (const useCase of api.useCases) {
          md += `- ${useCase}\n`;
        }
        md += '\n';
      }
      
      if (api.edgeCases && api.edgeCases.length > 0) {
        md += `**边界情况:**\n\n`;
        for (const edgeCase of api.edgeCases) {
          md += `- ${edgeCase}\n`;
        }
        md += '\n';
      }
      
      md += `**元数据:**\n\n`;
      md += `- 文件: \`${api.file}\`\n`;
      md += `- 行号: ${api.lineNumber}\n`;
      md += `- 语言: ${api.language}\n`;
      if (api.isEnhanced) {
        md += `- LLM 增强: ✅\n`;
      }
      md += '\n';
    }
    
    writeFileSync(outputPath, md, 'utf-8');
    
    return {
      format: 'markdown',
      path: outputPath,
      size: md.length
    };
  }

  exportHTML(docData, outputPath, options = {}) {
    const { apiEndpoints, metadata } = docData;
    const { template = 'default', title = 'API Documentation' } = options;
    
    const html = this.generateHTMLTemplate(docData, title);
    
    writeFileSync(outputPath, html, 'utf-8');
    
    return {
      format: 'html',
      path: outputPath,
      size: html.length
    };
  }

  generateHTMLTemplate(docData, title) {
    const { apiEndpoints, metadata } = docData;
    
    let apiCards = '';
    for (const api of apiEndpoints) {
      const methodColor = this.getMethodColor(api.httpMethod);
      const description = api.enhancedDescription || api.description || '暂无描述';
      
      let paramsHTML = '';
      if (api.params && api.params.length > 0) {
        paramsHTML = `
          <div class="section">
            <h4>参数</h4>
            <table class="params-table">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>类型</th>
                  <th>必填</th>
                  <th>描述</th>
                </tr>
              </thead>
              <tbody>
                ${api.params.map(param => `
                  <tr>
                    <td><code>${param.name}</code></td>
                    <td><code>${param.type || 'any'}</code></td>
                    <td>${param.defaultValue ? '否' : '是'}</td>
                    <td>${param.description || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
      
      let returnsHTML = '';
      if (api.returns) {
        const enhancedReturn = api.enhancedReturns || api.returns;
        returnsHTML = `
          <div class="section">
            <h4>返回值</h4>
            <p><strong>类型:</strong> <code>${enhancedReturn.type || 'any'}</code></p>
            ${enhancedReturn.description ? `<p><strong>描述:</strong> ${enhancedReturn.description}</p>` : ''}
          </div>
        `;
      }
      
      apiCards += `
        <div class="api-card" id="api-${api.id}">
          <div class="api-header">
            <h3>${api.name}</h3>
            <span class="method-badge ${methodColor}">${api.httpMethod || 'N/A'}</span>
          </div>
          ${api.isDeprecated ? '<div class="deprecated-badge">⚠️ 已废弃</div>' : ''}
          ${!api.isPublic ? '<div class="private-badge">🔒 私有 API</div>' : ''}
          <div class="api-description">${description}</div>
          ${api.path ? `<div class="api-path"><code>${api.path}</code></div>` : ''}
          ${paramsHTML}
          ${returnsHTML}
          ${api.example ? `
            <div class="section">
              <h4>示例</h4>
              <pre><code>${this.escapeHTML(api.example)}</code></pre>
            </div>
          ` : ''}
          <div class="api-meta">
            <small>文件: ${api.file} (第 ${api.lineNumber} 行) | 语言: ${api.language}</small>
          </div>
        </div>
      `;
    }
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: #333;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .header {
      background: white;
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    
    .header h1 {
      font-size: 2.5rem;
      color: #1a1a2e;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 1.1rem;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    
    .stat-card .value {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
    }
    
    .stat-card .label {
      color: #666;
      margin-top: 5px;
    }
    
    .api-list {
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    
    .api-list h2 {
      color: #1a1a2e;
      margin-bottom: 30px;
      font-size: 1.8rem;
    }
    
    .api-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    
    .api-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 30px rgba(0,0,0,0.1);
    }
    
    .api-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .api-header h3 {
      font-size: 1.5rem;
      color: #1a1a2e;
    }
    
    .method-badge {
      padding: 6px 16px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 0.9rem;
      text-transform: uppercase;
    }
    
    .method-get { background: #4ade80; color: white; }
    .method-post { background: #60a5fa; color: white; }
    .method-put { background: #fbbf24; color: white; }
    .method-delete { background: #f87171; color: white; }
    .method-patch { background: #c084fc; color: white; }
    .method-options { background: #94a3b8; color: white; }
    .method-n-a { background: #e2e8f0; color: #64748b; }
    
    .deprecated-badge, .private-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.8rem;
      margin-bottom: 15px;
    }
    
    .deprecated-badge {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    
    .private-badge {
      background: #fef3c7;
      color: #d97706;
      border: 1px solid #fde68a;
    }
    
    .api-description {
      color: #4b5563;
      line-height: 1.8;
      margin-bottom: 20px;
    }
    
    .api-path {
      background: #1e293b;
      color: #e2e8f0;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: 'Fira Code', monospace;
      margin-bottom: 20px;
    }
    
    .section {
      margin-top: 25px;
      padding-top: 25px;
      border-top: 1px solid #e2e8f0;
    }
    
    .section h4 {
      color: #1a1a2e;
      margin-bottom: 15px;
      font-size: 1.1rem;
    }
    
    .params-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .params-table th, .params-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .params-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }
    
    .params-table td {
      color: #334155;
    }
    
    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
    }
    
    code {
      font-family: 'Fira Code', 'Consolas', monospace;
    }
    
    .api-meta {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
    }
    
    .footer {
      text-align: center;
      padding: 30px;
      color: rgba(255,255,255,0.7);
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${metadata.projectName || 'API Documentation'}</h1>
      <p class="subtitle">生成时间: ${new Date(metadata.generatedAt).toLocaleString()}</p>
      
      <div class="stats">
        <div class="stat-card">
          <div class="value">${metadata.totalAPIs}</div>
          <div class="label">API 总数</div>
        </div>
        <div class="stat-card">
          <div class="value">${metadata.enhancedAPIs}</div>
          <div class="label">LLM 增强</div>
        </div>
        <div class="stat-card">
          <div class="value">${Object.keys(metadata.languages).length}</div>
          <div class="label">支持语言</div>
        </div>
      </div>
    </div>
    
    <div class="api-list">
      <h2>API 详细文档</h2>
      ${apiCards}
    </div>
    
    <div class="footer">
      <p>由 API Development & Testing Toolkit 生成</p>
    </div>
  </div>
</body>
</html>`;
  }

  getMethodColor(method) {
    const colors = {
      'GET': 'method-get',
      'POST': 'method-post',
      'PUT': 'method-put',
      'DELETE': 'method-delete',
      'PATCH': 'method-patch',
      'OPTIONS': 'method-options'
    };
    return colors[method] || 'method-n-a';
  }

  escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  exportPostman(docData, outputPath, options = {}) {
    const { apiEndpoints, metadata } = docData;
    const { collectionName = metadata.projectName || 'API Collection' } = options;
    
    const collection = {
      info: {
        name: collectionName,
        description: `由 API Development & Testing Toolkit 生成于 ${new Date(metadata.generatedAt).toLocaleString()}`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        version: '1.0.0'
      },
      item: [],
      variable: []
    };
    
    const groupedByFile = {};
    for (const api of apiEndpoints) {
      if (!groupedByFile[api.file]) {
        groupedByFile[api.file] = [];
      }
      groupedByFile[api.file].push(api);
    }
    
    for (const [file, apis] of Object.entries(groupedByFile)) {
      const folder = {
        name: file.split('/').pop(),
        description: `文件: ${file}`,
        item: []
      };
      
      for (const api of apis) {
        const item = {
          name: api.name,
          request: {
            method: api.httpMethod || 'GET',
            header: [],
            url: {
              raw: `{{baseUrl}}${api.path || '/api/' + api.name.toLowerCase()}`,
              host: ['{{baseUrl}}'],
              path: (api.path || '/api/' + api.name.toLowerCase()).split('/').filter(p => p)
            },
            description: api.enhancedDescription || api.description || ''
          },
          response: []
        };
        
        if (api.params && api.params.length > 0) {
          const queryParams = api.params.map(param => ({
            key: param.name,
            value: '',
            description: param.description || '',
            disabled: !param.defaultValue
          }));
          item.request.url.query = queryParams;
          
          if (api.httpMethod === 'POST' || api.httpMethod === 'PUT') {
            const bodyParams = {};
            api.params.forEach(param => {
              bodyParams[param.name] = param.defaultValue || `<${param.type || 'string'}>`;
            });
            item.request.body = {
              mode: 'raw',
              raw: JSON.stringify(bodyParams, null, 2),
              options: {
                raw: {
                  language: 'json'
                }
              }
            };
          }
        }
        
        folder.item.push(item);
      }
      
      collection.item.push(folder);
    }
    
    const postmanJSON = JSON.stringify(collection, null, 2);
    writeFileSync(outputPath, postmanJSON, 'utf-8');
    
    return {
      format: 'postman',
      path: outputPath,
      size: postmanJSON.length
    };
  }

  exportOpenAPI(docData, outputPath, options = {}) {
    const { apiEndpoints, metadata } = docData;
    const { title = metadata.projectName || 'API', version = '1.0.0' } = options;
    
    const openapi = {
      openapi: '3.0.0',
      info: {
        title: title,
        version: version,
        description: `生成时间: ${new Date(metadata.generatedAt).toLocaleString()}`
      },
      paths: {},
      components: {
        schemas: {}
      }
    };
    
    for (const api of apiEndpoints) {
      const path = api.path || `/api/${api.name.toLowerCase()}`;
      const method = (api.httpMethod || 'get').toLowerCase();
      
      if (!openapi.paths[path]) {
        openapi.paths[path] = {};
      }
      
      const operation = {
        summary: api.name,
        description: api.enhancedDescription || api.description || '',
        parameters: [],
        responses: {
          '200': {
            description: '成功响应',
            content: {
              'application/json': {
                schema: {
                  type: 'object'
                }
              }
            }
          }
        }
      };
      
      if (api.params && api.params.length > 0) {
        for (const param of api.params) {
          operation.parameters.push({
            name: param.name,
            in: method === 'get' ? 'query' : 'formData',
            description: param.description || '',
            required: !param.defaultValue,
            schema: {
              type: this.convertTypeToOpenAPI(param.type || 'any')
            }
          });
        }
      }
      
      if (api.returns) {
        const enhancedReturn = api.enhancedReturns || api.returns;
        operation.responses['200'].description = enhancedReturn.description || '成功响应';
        operation.responses['200'].content['application/json'].schema.type = 
          this.convertTypeToOpenAPI(enhancedReturn.type || 'any');
      }
      
      if (api.throws && api.throws.length > 0) {
        operation.responses['400'] = {
          description: '错误请求',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        };
      }
      
      openapi.paths[path][method] = operation;
    }
    
    let outputContent;
    if (options.yaml) {
      outputContent = YAML.stringify(openapi);
    } else {
      outputContent = JSON.stringify(openapi, null, 2);
    }
    
    writeFileSync(outputPath, outputContent, 'utf-8');
    
    return {
      format: options.yaml ? 'openapi-yaml' : 'openapi-json',
      path: outputPath,
      size: outputContent.length
    };
  }

  convertTypeToOpenAPI(type) {
    const typeMap = {
      'string': 'string',
      'number': 'number',
      'int': 'integer',
      'integer': 'integer',
      'float': 'number',
      'double': 'number',
      'boolean': 'boolean',
      'bool': 'boolean',
      'object': 'object',
      'array': 'array',
      'any': 'object',
      'void': 'object'
    };
    
    return typeMap[type.toLowerCase()] || 'object';
  }

  async exportAll(docData, outputDir, options = {}) {
    const results = [];
    
    const baseName = docData.metadata.projectName || 'api-docs';
    
    results.push(
      this.exportMarkdown(docData, join(outputDir, `${baseName}.md`), options)
    );
    
    results.push(
      this.exportHTML(docData, join(outputDir, `${baseName}.html`), options)
    );
    
    results.push(
      this.exportPostman(docData, join(outputDir, `${baseName}-postman.json`), options)
    );
    
    results.push(
      this.exportOpenAPI(docData, join(outputDir, `${baseName}-openapi.json`), options)
    );
    
    results.push(
      this.exportOpenAPI(docData, join(outputDir, `${baseName}-openapi.yaml`), { ...options, yaml: true })
    );
    
    return {
      format: 'all',
      directory: outputDir,
      files: results,
      totalFiles: results.length
    };
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text || '';
    }
    return text.substring(0, maxLength) + '...';
  }
}

export const documentationExporter = new DocumentationExporter();
export default documentationExporter;
