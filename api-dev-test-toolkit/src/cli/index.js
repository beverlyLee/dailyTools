#!/usr/bin/env node

import { program } from 'commander';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync } from 'fs';
import { apiDocumentationGenerator } from '../generators/apiDocumentationGenerator.js';
import { testCaseGenerator } from '../generators/testCaseGenerator.js';
import { documentationExporter } from '../exporters/documentationExporter.js';
import { configManager } from '../core/config.js';
import { llmService } from '../core/llmService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = join(__dirname, '../../package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

program
  .name('api-toolkit')
  .description(packageJson.description)
  .version(packageJson.version, '-v, --version', '显示版本号')
  .helpOption('-h, --help', '显示帮助信息');

program
  .command('docs')
  .description('生成 API 文档')
  .argument('[directory]', '要分析的目录路径', '.')
  .option('-f, --format <format>', '输出格式 (markdown|html|postman|openapi|all)', 'markdown')
  .option('-o, --output <path>', '输出文件或目录路径', './api-docs')
  .option('--no-llm', '禁用 LLM 增强', false)
  .option('--lang <language>', '指定语言过滤 (javascript|typescript|python|java|go)')
  .option('--title <title>', '文档标题')
  .action(async (directory, options) => {
    try {
      console.log('\n📚 API 文档生成器');
      console.log('==================\n');
      
      const configValidation = configManager.validate();
      if (!configValidation.valid) {
        configValidation.issues.forEach(issue => {
          console.warn(`⚠️  ${issue}`);
        });
        console.log('');
      }
      
      const targetDir = resolve(process.cwd(), directory);
      console.log(`📁 分析目录: ${targetDir}`);
      console.log(`📄 输出格式: ${options.format}`);
      console.log(`🤖 LLM 增强: ${options.llm && llmService.isAvailable() ? '已启用' : '未启用'}`);
      
      if (options.lang) {
        console.log(`🔍 语言过滤: ${options.lang}`);
      }
      
      console.log('\n🔍 开始分析代码...\n');
      
      const docData = await apiDocumentationGenerator.analyzeDirectory(targetDir, {
        includeLLMEnhancement: options.llm && llmService.isAvailable(),
        languageFilter: options.lang
      });
      
      const stats = apiDocumentationGenerator.getStatistics();
      
      console.log('\n✅ 分析完成!\n');
      console.log(`📊 统计信息:`);
      console.log(`   - 总 API 数: ${stats.totalAPIs}`);
      console.log(`   - LLM 增强: ${stats.enhancedAPIs}`);
      console.log(`   - 语言分布: ${Object.entries(stats.byLanguage).map(([lang, count]) => `${lang}: ${count}`).join(', ')}`);
      
      if (stats.totalAPIs === 0) {
        console.log('\n⚠️  未找到任何 API，请检查目录是否包含支持的源文件。');
        process.exit(0);
      }
      
      console.log('\n📝 生成文档...');
      
      const outputPath = resolve(process.cwd(), options.output);
      
      const exportOptions = {
        title: options.title || stats.projectName
      };
      
      let result;
      if (options.format === 'all') {
        const { mkdirSync, existsSync } = await import('fs');
        if (!existsSync(outputPath)) {
          mkdirSync(outputPath, { recursive: true });
        }
        result = await documentationExporter.exportAll(docData, outputPath, exportOptions);
      } else {
        const { dirname, extname } = await import('path');
        const { mkdirSync, existsSync } = await import('fs');
        const outputDir = dirname(outputPath);
        if (!existsSync(outputDir)) {
          mkdirSync(outputDir, { recursive: true });
        }
        
        let finalPath = outputPath;
        if (!extname(outputPath)) {
          const extMap = {
            markdown: '.md',
            html: '.html',
            postman: '-postman.json',
            openapi: '-openapi.json'
          };
          finalPath = outputPath + (extMap[options.format] || '.md');
        }
        
        result = documentationExporter.export(docData, finalPath, options.format, exportOptions);
      }
      
      console.log('\n✅ 文档生成完成!\n');
      
      if (result.format === 'all') {
        console.log(`📂 输出目录: ${result.directory}`);
        console.log(`📄 生成文件: ${result.totalFiles} 个`);
        result.files.forEach(file => {
          console.log(`   - ${file.path}`);
        });
      } else {
        console.log(`📄 输出文件: ${result.path}`);
        console.log(`📏 文件大小: ${result.size} 字节`);
      }
      
      console.log('\n🎉 任务完成!\n');
      
    } catch (error) {
      console.error('\n❌ 错误发生:');
      console.error(`   ${error.message}`);
      console.error('\n堆栈追踪:');
      console.error(error.stack);
      process.exit(1);
    }
  });

program
  .command('tests')
  .description('生成测试用例')
  .argument('[directory]', '要分析的目录路径', '.')
  .option('-o, --output <path>', '输出目录路径', './generated-tests')
  .option('--no-llm', '禁用 LLM 增强', false)
  .option('--lang <language>', '指定语言过滤 (javascript|typescript|python|java|go)')
  .option('--coverage <target>', '覆盖率目标 (百分比)', '80')
  .action(async (directory, options) => {
    try {
      console.log('\n🧪 测试用例生成器');
      console.log('====================\n');
      
      const configValidation = configManager.validate();
      if (!configValidation.valid) {
        configValidation.issues.forEach(issue => {
          console.warn(`⚠️  ${issue}`);
        });
        console.log('');
      }
      
      const targetDir = resolve(process.cwd(), directory);
      const outputDir = resolve(process.cwd(), options.output);
      
      console.log(`📁 分析目录: ${targetDir}`);
      console.log(`📂 输出目录: ${outputDir}`);
      console.log(`🤖 LLM 增强: ${options.llm && llmService.isAvailable() ? '已启用' : '未启用'}`);
      console.log(`📊 覆盖率目标: ${options.coverage}%`);
      
      if (options.lang) {
        console.log(`🔍 语言过滤: ${options.lang}`);
      }
      
      console.log('\n🔍 开始分析代码...\n');
      
      const testResult = await testCaseGenerator.generateFromDirectory(targetDir, {
        includeLLM: options.llm && llmService.isAvailable(),
        languageFilter: options.lang,
        coverageTarget: parseInt(options.coverage),
        outputDir: outputDir
      });
      
      const stats = testCaseGenerator.getStatistics();
      
      console.log('\n✅ 分析完成!\n');
      console.log(`📊 统计信息:`);
      console.log(`   - 总函数数: ${stats.totalFunctions}`);
      console.log(`   - 总测试数: ${stats.totalTests}`);
      console.log(`   - LLM 生成: ${stats.llmGenerated}`);
      console.log(`   - 平均每函数测试数: ${stats.averageTestsPerFunction}`);
      console.log(`   - 语言分布: ${Object.entries(stats.languages).map(([lang, count]) => `${lang}: ${count}`).join(', ')}`);
      
      if (stats.totalFunctions === 0) {
        console.log('\n⚠️  未找到任何函数，请检查目录是否包含支持的源文件。');
        process.exit(0);
      }
      
      console.log('\n✅ 测试用例生成完成!\n');
      console.log(`📂 输出目录: ${outputDir}`);
      console.log(`📦 测试套件数: ${testResult.testSuites.length}`);
      
      testResult.testSuites.forEach(suite => {
        console.log(`\n   📄 文件: ${suite.file}`);
        console.log(`      输出: ${suite.outputPath}`);
        console.log(`      函数: ${suite.functions.length} 个`);
        console.log(`      测试: ${suite.generatedTests.length} 个`);
      });
      
      console.log('\n🎉 任务完成!\n');
      
    } catch (error) {
      console.error('\n❌ 错误发生:');
      console.error(`   ${error.message}`);
      console.error('\n堆栈追踪:');
      console.error(error.stack);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('分析代码并生成报告')
  .argument('[directory]', '要分析的目录路径', '.')
  .option('--lang <language>', '指定语言过滤')
  .option('--json', '输出 JSON 格式报告')
  .action(async (directory, options) => {
    try {
      console.log('\n🔍 代码分析器');
      console.log('==============\n');
      
      const targetDir = resolve(process.cwd(), directory);
      console.log(`📁 分析目录: ${targetDir}`);
      
      console.log('\n📊 正在分析...\n');
      
      const { fileSystemUtils } = await import('../utils/fileSystem.js');
      
      const structure = fileSystemUtils.analyzeDirectoryStructure(targetDir);
      const files = await fileSystemUtils.findFiles(targetDir);
      const grouped = fileSystemUtils.groupFilesByLanguage(files);
      
      const report = {
        timestamp: new Date().toISOString(),
        directory: targetDir,
        structure: {
          totalFiles: structure.summary.totalFiles,
          sourceFiles: structure.summary.sourceFiles,
          languages: structure.summary.languages
        },
        languages: {},
        files: []
      };
      
      for (const [lang, langFiles] of Object.entries(grouped)) {
        if (langFiles.length > 0) {
          report.languages[lang] = {
            count: langFiles.length,
            files: langFiles.slice(0, 10)
          };
        }
      }
      
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log('📊 分析报告:');
        console.log('─────────────');
        console.log(`\n📁 目录结构:`);
        console.log(`   - 总文件数: ${report.structure.totalFiles}`);
        console.log(`   - 源文件数: ${report.structure.sourceFiles}`);
        
        console.log(`\n🌐 语言分布:`);
        for (const [lang, data] of Object.entries(report.languages)) {
          console.log(`   - ${lang}: ${data.count} 个文件`);
          if (data.files.length > 0) {
            data.files.slice(0, 3).forEach(file => {
              console.log(`     • ${file.split('/').pop()}`);
            });
            if (data.files.length > 3) {
              console.log(`     • ... 还有 ${data.files.length - 3} 个文件`);
            }
          }
        }
        
        console.log('\n📄 找到的源文件:');
        const sampleFiles = files.slice(0, 10);
        sampleFiles.forEach(file => {
          const ext = file.split('.').pop();
          const lang = fileSystemUtils.getLanguage(`.${ext}`);
          console.log(`   - [${lang}] ${file}`);
        });
        
        if (files.length > 10) {
          console.log(`   - ... 还有 ${files.length - 10} 个文件`);
        }
      }
      
      console.log('\n✅ 分析完成!\n');
      
    } catch (error) {
      console.error('\n❌ 错误发生:');
      console.error(`   ${error.message}`);
      console.error('\n堆栈追踪:');
      console.error(error.stack);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('管理配置')
  .option('--show', '显示当前配置')
  .option('--init', '初始化 .env.example 文件')
  .option('--set <key=value...>', '设置配置项 (如 --set openai.apiKey=xxx)')
  .action(async (options) => {
    try {
      console.log('\n⚙️  配置管理');
      console.log('=============\n');
      
      if (options.show) {
        console.log('📋 当前配置:');
        console.log('─────────────');
        
        const config = {
          openai: {
            apiKey: configManager.get('openai.apiKey') ? '***已配置***' : '未配置',
            model: configManager.get('openai.model')
          },
          output: {
            format: configManager.get('output.format'),
            dir: configManager.get('output.dir')
          },
          analysis: {
            supportedLanguages: configManager.get('analysis.supportedLanguages'),
            includePatterns: configManager.get('analysis.includePatterns'),
            excludePatterns: configManager.get('analysis.excludePatterns')
          },
          documentation: configManager.get('documentation'),
          testing: configManager.get('testing')
        };
        
        console.log(JSON.stringify(config, null, 2));
        
        const validation = configManager.validate();
        console.log('\n✅ 配置验证:');
        if (validation.valid) {
          console.log('   配置有效!');
        } else {
          validation.issues.forEach(issue => {
            console.log(`   ⚠️  ${issue}`);
          });
        }
      }
      
      if (options.init) {
        const { copyFileSync, existsSync } = await import('fs');
        const { join } = await import('path');
        
        const sourcePath = join(__dirname, '../../.env.example');
        const targetPath = join(process.cwd(), '.env');
        
        if (existsSync(targetPath)) {
          console.log(`⚠️  .env 文件已存在: ${targetPath}`);
          console.log('   请手动编辑该文件，或删除后重新运行 --init');
        } else {
          copyFileSync(sourcePath, targetPath);
          console.log(`✅ 已创建配置文件: ${targetPath}`);
          console.log('\n📝 请编辑该文件以配置您的 API Key 等参数。');
        }
      }
      
      if (options.set && options.set.length > 0) {
        console.log('⚠️  --set 选项需要修改配置文件，当前仅支持通过 .env 文件配置');
        console.log('   请编辑 .env 文件或使用 --init 创建配置文件模板。');
      }
      
      console.log('\n');
      
    } catch (error) {
      console.error('\n❌ 错误发生:');
      console.error(`   ${error.message}`);
      console.error('\n堆栈追踪:');
      console.error(error.stack);
      process.exit(1);
    }
  });

program
  .on('--help', () => {
    console.log('\n📖 使用示例:');
    console.log('─────────────');
    console.log('');
    console.log('  # 生成 API 文档 (默认 Markdown 格式)');
    console.log('  api-toolkit docs ./src');
    console.log('');
    console.log('  # 生成 HTML 格式文档');
    console.log('  api-toolkit docs ./src -f html -o ./docs/api.html');
    console.log('');
    console.log('  # 生成所有格式的文档');
    console.log('  api-toolkit docs ./src -f all -o ./docs');
    console.log('');
    console.log('  # 禁用 LLM 增强生成文档');
    console.log('  api-toolkit docs ./src --no-llm');
    console.log('');
    console.log('  # 生成测试用例');
    console.log('  api-toolkit tests ./src -o ./tests');
    console.log('');
    console.log('  # 分析代码结构');
    console.log('  api-toolkit analyze ./src');
    console.log('');
    console.log('  # 初始化配置文件');
    console.log('  api-toolkit config --init');
    console.log('');
    console.log('  # 查看当前配置');
    console.log('  api-toolkit config --show');
    console.log('');
    console.log('💡 提示:');
    console.log('  - 要启用 LLM 增强功能，请确保 OPENAI_API_KEY 已配置');
    console.log('  - 支持的语言: JavaScript, TypeScript, Python, Java, Go');
    console.log('  - 支持的输出格式: markdown, html, postman, openapi, all');
    console.log('');
  });

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
