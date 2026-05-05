import { readFileSync, statSync, existsSync } from 'fs';
import { glob } from 'glob';
import { join, extname, basename, dirname } from 'path';
import { configManager } from './config.js';

class FileSystemUtils {
  constructor() {
    this.languageExtensions = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go'
    };
  }

  readFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const stats = statSync(filePath);
      return {
        path: filePath,
        name: basename(filePath),
        directory: dirname(filePath),
        extension: extname(filePath),
        language: this.getLanguage(extname(filePath)),
        content: content,
        size: stats.size,
        modified: stats.mtime
      };
    } catch (error) {
      throw new Error(`无法读取文件 ${filePath}: ${error.message}`);
    }
  }

  getLanguage(extension) {
    return this.languageExtensions[extension.toLowerCase()] || 'unknown';
  }

  isSupportedLanguage(extension) {
    return extension.toLowerCase() in this.languageExtensions;
  }

  async findFiles(directory, options = {}) {
    const includePatterns = options.includePatterns || configManager.get('analysis.includePatterns');
    const excludePatterns = options.excludePatterns || configManager.get('analysis.excludePatterns');
    
    const files = [];
    
    for (const pattern of includePatterns) {
      const matchedFiles = await glob(join(directory, pattern), {
        ignore: excludePatterns.map(p => join(directory, p)),
        nodir: true,
        absolute: true
      });
      files.push(...matchedFiles);
    }
    
    return [...new Set(files)];
  }

  groupFilesByLanguage(files) {
    const groups = {
      javascript: [],
      typescript: [],
      python: [],
      java: [],
      go: [],
      other: []
    };
    
    for (const file of files) {
      const ext = extname(file).toLowerCase();
      const language = this.getLanguage(ext);
      if (groups[language]) {
        groups[language].push(file);
      } else {
        groups.other.push(file);
      }
    }
    
    return groups;
  }

  analyzeDirectoryStructure(directory) {
    const structure = {
      root: directory,
      directories: [],
      files: [],
      summary: {
        totalFiles: 0,
        sourceFiles: 0,
        languages: {}
      }
    };
    
    const visitDir = (currentDir, depth = 0) => {
      const entries = this.listDirectory(currentDir);
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        
        if (entry.isDirectory) {
          structure.directories.push({
            path: fullPath,
            name: entry.name,
            depth
          });
          visitDir(fullPath, depth + 1);
        } else {
          const ext = extname(entry.name);
          const language = this.getLanguage(ext);
          
          structure.files.push({
            path: fullPath,
            name: entry.name,
            extension: ext,
            language,
            depth
          });
          
          structure.summary.totalFiles++;
          
          if (language !== 'unknown') {
            structure.summary.sourceFiles++;
            structure.summary.languages[language] = (structure.summary.languages[language] || 0) + 1;
          }
        }
      }
    };
    
    try {
      visitDir(directory);
    } catch (error) {
      throw new Error(`分析目录结构失败: ${error.message}`);
    }
    
    return structure;
  }

  listDirectory(directory) {
    const { readdirSync } = require('fs');
    const entries = readdirSync(directory, { withFileTypes: true });
    
    return entries
      .filter(entry => {
        const name = entry.name;
        return !name.startsWith('.') && 
               name !== 'node_modules' && 
               name !== 'dist' && 
               name !== 'build';
      })
      .map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      }));
  }
}

export const fileSystemUtils = new FileSystemUtils();
export default fileSystemUtils;
