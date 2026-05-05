import OpenAI from 'openai';
import { configManager } from '../core/config.js';

class LLMService {
  constructor() {
    this.client = null;
    this.model = configManager.get('openai.model');
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.available = false;
    
    this.initializeClient();
  }

  initializeClient() {
    const apiKey = configManager.get('openai.apiKey');
    
    if (!apiKey) {
      console.warn('OpenAI API Key 未配置，LLM 增强功能将不可用');
      this.available = false;
      return;
    }
    
    try {
      this.client = new OpenAI({
        apiKey: apiKey
      });
      this.available = true;
    } catch (error) {
      console.error(`初始化 OpenAI 客户端失败: ${error.message}`);
      this.available = false;
    }
  }

  isAvailable() {
    return this.available && this.client !== null;
  }

  async chat(messages, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('LLM 服务不可用，请检查 OpenAI API Key 配置');
    }
    
    const {
      maxTokens = 4096,
      temperature = 0.7,
      model = this.model
    } = options;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature
        });
        
        return {
          content: response.choices[0].message.content,
          usage: response.usage,
          model: response.model
        };
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw new Error(`LLM 调用失败（已重试 ${this.maxRetries} 次）: ${error.message}`);
        }
        
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }
  }

  async enhanceAPIDocumentation(apiInfo) {
    if (!this.isAvailable()) {
      return apiInfo;
    }
    
    const prompt = this.buildDocumentationPrompt(apiInfo);
    
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的技术文档编写专家。请根据提供的 API 信息，生成更清晰、更详细、更专业的 API 文档描述。'
      },
      {
        role: 'user',
        content: prompt
      }
    ];
    
    try {
      const response = await this.chat(messages, { temperature: 0.5 });
      return this.parseEnhancedDocumentation(response.content, apiInfo);
    } catch (error) {
      console.warn(`增强 API 文档失败: ${error.message}，将使用原始文档`);
      return apiInfo;
    }
  }

  buildDocumentationPrompt(apiInfo) {
    let prompt = `请为以下 API 生成更详细的文档描述：\n\n`;
    
    prompt += `API 名称: ${apiInfo.name}\n`;
    
    if (apiInfo.description) {
      prompt += `原始描述: ${apiInfo.description}\n`;
    }
    
    if (apiInfo.params && apiInfo.params.length > 0) {
      prompt += `\n参数:\n`;
      apiInfo.params.forEach((param, index) => {
        prompt += `${index + 1}. ${param.name} (${param.type || 'any'}) - ${param.description || '无描述'}\n`;
      });
    }
    
    if (apiInfo.returns) {
      prompt += `\n返回值: ${apiInfo.returns.type || 'any'} - ${apiInfo.returns.description || '无描述'}\n`;
    }
    
    if (apiInfo.example) {
      prompt += `\n示例代码:\n${apiInfo.example}\n`;
    }
    
    prompt += `\n请生成更专业、更详细的文档，包括：
1. 改进的 API 功能描述
2. 每个参数的详细说明（包括类型、默认值、可能的值范围）
3. 返回值的详细说明
4. 使用场景和最佳实践
5. 可能的边界情况

请以 JSON 格式返回，包含以下字段：
- enhancedDescription: 改进的描述
- params: 改进的参数列表，每个包含 name, type, description, possibleValues, defaultValue
- returns: 改进的返回值说明，包含 type, description, structure
- useCases: 使用场景列表
- edgeCases: 边界情况列表`;
    
    return prompt;
  }

  parseEnhancedDocumentation(content, originalInfo) {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
          ...originalInfo,
          enhancedDescription: parsed.enhancedDescription || originalInfo.description,
          enhancedParams: parsed.params || originalInfo.params,
          enhancedReturns: parsed.returns || originalInfo.returns,
          useCases: parsed.useCases || [],
          edgeCases: parsed.edgeCases || [],
          isEnhanced: true
        };
      }
    } catch (error) {
      console.warn(`解析增强文档失败: ${error.message}`);
    }
    
    return {
      ...originalInfo,
      isEnhanced: false
    };
  }

  async generateTestCases(codeInfo) {
    if (!this.isAvailable()) {
      return null;
    }
    
    const prompt = this.buildTestGenerationPrompt(codeInfo);
    
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的测试工程师。请根据提供的代码信息，生成高覆盖率的单元测试用例。'
      },
      {
        role: 'user',
        content: prompt
      }
    ];
    
    try {
      const response = await this.chat(messages, { temperature: 0.3, maxTokens: 8192 });
      return this.parseTestCases(response.content, codeInfo);
    } catch (error) {
      console.warn(`生成测试用例失败: ${error.message}`);
      return null;
    }
  }

  buildTestGenerationPrompt(codeInfo) {
    let prompt = `请为以下代码生成全面的单元测试用例：\n\n`;
    
    prompt += `函数/方法名称: ${codeInfo.name}\n`;
    
    if (codeInfo.description) {
      prompt += `功能描述: ${codeInfo.description}\n`;
    }
    
    if (codeInfo.params && codeInfo.params.length > 0) {
      prompt += `\n参数:\n`;
      codeInfo.params.forEach((param, index) => {
        prompt += `${index + 1}. ${param.name} (${param.type || 'any'}) - ${param.description || '无描述'}\n`;
      });
    }
    
    if (codeInfo.returns) {
      prompt += `\n返回值: ${codeInfo.returns.type || 'any'} - ${codeInfo.returns.description || '无描述'}\n`;
    }
    
    if (codeInfo.throws && codeInfo.throws.length > 0) {
      prompt += `\n可能抛出的异常:\n`;
      codeInfo.throws.forEach((throwItem, index) => {
        prompt += `${index + 1}. ${throwItem.type} - ${throwItem.description || ''}\n`;
      });
    }
    
    if (codeInfo.code) {
      prompt += `\n代码片段:\n\`\`\`${codeInfo.language || 'javascript'}\n${codeInfo.code}\n\`\`\`\n`;
    }
    
    prompt += `\n请生成以下类型的测试用例：
1. 正常流程测试 - 验证基本功能
2. 边界值测试 - 包括最小值、最大值、空值、零值等
3. 异常测试 - 验证错误处理和异常抛出
4. 性能测试（如适用）

请以 JSON 格式返回，包含以下字段：
- testCases: 测试用例数组，每个包含：
  - name: 测试名称
  - type: 测试类型 (normal, boundary, exception, performance)
  - description: 测试描述
  - inputs: 输入参数对象
  - expectedOutput: 期望输出
  - expectedException: 期望的异常类型（如适用）
  - code: 测试代码片段
- testSuite: 完整的测试套件代码（可直接运行）
- coverageAnalysis: 覆盖率分析说明`;
    
    return prompt;
  }

  parseTestCases(content, codeInfo) {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        
        const codeMatch = content.match(/```javascript\s*([\s\S]*?)\s*```/) ||
                         content.match(/```python\s*([\s\S]*?)\s*```/) ||
                         content.match(/```java\s*([\s\S]*?)\s*```/) ||
                         content.match(/```go\s*([\s\S]*?)\s*```/);
        
        return {
          testCases: parsed.testCases || [],
          testSuite: parsed.testSuite || (codeMatch ? codeMatch[1] : null),
          coverageAnalysis: parsed.coverageAnalysis || '',
          generatedBy: 'llm',
          language: codeInfo.language || 'javascript'
        };
      }
    } catch (error) {
      console.warn(`解析测试用例失败: ${error.message}`);
    }
    
    return null;
  }

  async detectAPIDifferences(apiDefinition, implementation) {
    if (!this.isAvailable()) {
      return {
        differences: [],
        confidence: 0,
        message: 'LLM 服务不可用，无法检测差异'
      };
    }
    
    const prompt = `请比较以下 API 定义和实际实现，找出它们之间的差异：

## API 定义（文档中的描述）
${JSON.stringify(apiDefinition, null, 2)}

## 实际实现（代码中的实现）
${JSON.stringify(implementation, null, 2)}

请分析并列出所有差异，包括：
1. 参数名称不一致
2. 参数类型不匹配
3. 参数数量不一致
4. 返回值类型不匹配
5. 缺少的参数
6. 额外的参数
7. 异常处理差异

请以 JSON 格式返回，包含：
- differences: 差异数组，每个包含 type, field, expected, actual, severity (error/warning/info)
- summary: 差异总结
- recommendations: 修复建议`;
    
    const messages = [
      {
        role: 'system',
        content: '你是一个 API 一致性分析专家。请比较 API 定义和实际实现，找出所有差异。'
      },
      {
        role: 'user',
        content: prompt
      }
    ];
    
    try {
      const response = await this.chat(messages, { temperature: 0.1 });
      
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        response.content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      
      return {
        differences: [],
        summary: '无法解析差异分析结果',
        recommendations: []
      };
    } catch (error) {
      console.warn(`检测 API 差异失败: ${error.message}`);
      return {
        differences: [],
        summary: `分析失败: ${error.message}`,
        recommendations: []
      };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const llmService = new LLMService();
export default llmService;
