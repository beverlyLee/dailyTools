import { SearchEngine, Document, SearchResult } from '../host/src/index';

async function searchEngineExample() {
  console.log('=== 本地全文搜索引擎示例 ===\n');

  const searchEngine = new SearchEngine();
  await searchEngine.init();

  console.log('1. 添加文档...');
  const docs: Array<Omit<Document, 'id'>> = [
    {
      title: 'Rust 编程语言简介',
      content: 'Rust 是一种系统编程语言，专注于安全、并发和性能。它采用所有权系统来保证内存安全，无需垃圾回收。Rust 适合编写高性能的系统软件和 WebAssembly 模块。',
      fields: { category: '编程', language: 'Rust' }
    },
    {
      title: 'TypeScript 入门指南',
      content: 'TypeScript 是 JavaScript 的超集，添加了静态类型系统。它可以编译成纯 JavaScript，运行在任何浏览器、Node.js 环境或支持 ECMAScript 的 JavaScript 引擎中。TypeScript 提高了代码的可维护性和可扩展性。',
      fields: { category: '编程', language: 'TypeScript' }
    },
    {
      title: 'WebAssembly 技术详解',
      content: 'WebAssembly (WASM) 是一种低级虚拟机指令集，设计为可移植的编译目标，支持 C、C++、Rust 等语言。它在 Web 浏览器中以接近原生的速度运行，是构建高性能 Web 应用的关键技术。',
      fields: { category: 'Web', language: 'WASM' }
    },
    {
      title: '搜索引擎算法原理',
      content: '全文搜索引擎的核心包括倒排索引、分词器、查询解析和排序算法。常用的排序算法有 TF-IDF 和 BM25。倒排索引将术语映射到包含该术语的文档列表，实现快速检索。',
      fields: { category: '算法', language: '通用' }
    },
    {
      title: '机器学习基础',
      content: '机器学习是人工智能的一个分支，让计算机从数据中学习。常见的算法包括线性回归、决策树、随机森林、神经网络等。机器学习广泛应用于推荐系统、图像识别、自然语言处理等领域。',
      fields: { category: 'AI', language: 'Python' }
    }
  ];

  const docIds = searchEngine.addDocuments(docs);
  console.log(`已添加 ${docIds.length} 个文档，ID: ${docIds.join(', ')}\n`);

  console.log('2. 中文分词测试...');
  const text = '我喜欢学习 Rust 编程语言';
  const tokens = searchEngine.tokenize(text);
  console.log(`原文: "${text}"`);
  console.log(`分词结果: [${tokens.join(', ')}]\n`);

  console.log('3. 搜索测试 - 关键词: "Rust"');
  const results1 = searchEngine.search('Rust');
  printSearchResults(results1, searchEngine);

  console.log('\n4. 搜索测试 - 关键词: "WebAssembly 编程语言"');
  const results2 = searchEngine.search('WebAssembly 编程语言', { sortMethod: 'tfidf' });
  printSearchResults(results2, searchEngine);

  console.log('\n5. 分页搜索测试 - 关键词: "语言"');
  const paginatedResults = searchEngine.searchWithPagination('语言', 1, 3);
  console.log(`总结果数: ${paginatedResults.total}`);
  console.log(`当前页: ${paginatedResults.page}, 每页: ${paginatedResults.pageSize}, 总页数: ${paginatedResults.totalPages}`);
  printSearchResults(paginatedResults.results, searchEngine);

  console.log('\n6. 更新文档...');
  const updateSuccess = searchEngine.updateDocument(docIds[0], {
    title: 'Rust 编程语言深入解析',
    content: 'Rust 是一种系统编程语言，由 Mozilla 开发。它专注于安全、并发和性能，采用所有权系统来保证内存安全。'
  });
  console.log(`更新文档 ${docIds[0]}: ${updateSuccess ? '成功' : '失败'}`);

  console.log('\n7. 删除文档...');
  const deleteSuccess = searchEngine.deleteDocument(docIds[4]);
  console.log(`删除文档 ${docIds[4]}: ${deleteSuccess ? '成功' : '失败'}`);

  console.log('\n8. 再次搜索确认变更...');
  const results3 = searchEngine.search('机器学习');
  console.log(`搜索 "机器学习" 结果数: ${results3.length} (应为 0)`);

  console.log('\n=== 搜索引擎示例完成 ===');
}

function printSearchResults(results: SearchResult[], engine: SearchEngine) {
  if (results.length === 0) {
    console.log('  未找到结果');
    return;
  }

  results.forEach((result, index) => {
    const doc = engine.getDocument(result.doc_id);
    console.log(`  ${index + 1}. [ID: ${result.doc_id}] ${doc?.title || 'Unknown'} (评分: ${result.score.toFixed(4)})`);
    console.log(`     摘要: ${result.snippet}`);
  });
}

searchEngineExample().catch(console.error);
