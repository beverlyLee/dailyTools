import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ConfigManager {
  constructor() {
    this.config = this.loadDefaultConfig();
    this.loadEnvFile();
  }

  loadDefaultConfig() {
    return {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
      },
      output: {
        format: process.env.OUTPUT_FORMAT || 'markdown',
        dir: process.env.OUTPUT_DIR || './output'
      },
      analysis: {
        supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'go'],
        includePatterns: ['**/*.js', '**/*.ts', '**/*.py', '**/*.java', '**/*.go'],
        excludePatterns: ['**/node_modules/**', '**/*.test.js', '**/*.spec.js', '**/tests/**']
      },
      documentation: {
        includeExamples: true,
        includeParams: true,
        includeReturns: true
      },
      testing: {
        coverage: 80,
        generateBoundaryTests: true,
        generateExceptionTests: true
      }
    };
  }

  loadEnvFile() {
    const envPath = join(process.cwd(), '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
      
      if (process.env.OPENAI_API_KEY) {
        this.config.openai.apiKey = process.env.OPENAI_API_KEY;
      }
      if (process.env.OPENAI_MODEL) {
        this.config.openai.model = process.env.OPENAI_MODEL;
      }
      if (process.env.OUTPUT_FORMAT) {
        this.config.output.format = process.env.OUTPUT_FORMAT;
      }
      if (process.env.OUTPUT_DIR) {
        this.config.output.dir = process.env.OUTPUT_DIR;
      }
    }
  }

  get(path) {
    const keys = path.split('.');
    let value = this.config;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let obj = this.config;
    for (const key of keys) {
      if (!(key in obj)) {
        obj[key] = {};
      }
      obj = obj[key];
    }
    obj[lastKey] = value;
  }

  merge(customConfig) {
    const deepMerge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) {
            target[key] = {};
          }
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };
    deepMerge(this.config, customConfig);
  }

  validate() {
    const issues = [];
    
    if (!this.config.openai.apiKey) {
      issues.push('OPENAI_API_KEY 未配置，LLM 增强功能将不可用');
    }
    
    if (!['markdown', 'html', 'postman'].includes(this.config.output.format)) {
      issues.push(`不支持的输出格式: ${this.config.output.format}，将使用默认的 markdown`);
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

export const configManager = new ConfigManager();
export default configManager;
