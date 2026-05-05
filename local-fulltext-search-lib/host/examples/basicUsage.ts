import { FulltextSearch, createFulltextSearch, QueryParser } from '../src/index';

async function main() {
  console.log('=== 本地全文搜索引擎库示例 ===\n');

  const search = await createFulltextSearch();
  console.log('✓ 搜索引擎初始化完成\n');

  console.log('=== 1. 添加文档 ===');
  
  const documents = [
    {
      id: 1,
      fields: {
        title: '机器学习入门',
        content: '机器学习是人工智能的一个重要分支，让计算机从数据中学习规律。',
        author: '张三',
      },
    },
    {
      id: 2,
      fields: {
        title: '深度学习实战',
        content: '深度学习是机器学习的一种方法，使用神经网络进行特征学习。',
        author: '李四',
      },
    },
    {
      id: 3,
      fields: {
        title: '计算机视觉应用',
        content: '计算机视觉是人工智能的应用领域，让计算机理解图像和视频。',
        author: '王五',
      },
    },
    {
      id: 4,
      fields: {
        title: '自然语言处理技术',
        content: '自然语言处理让计算机理解和生成人类语言，是人工智能的重要组成部分。',
        author: '赵六',
      },
    },
  ];

  for (const doc of documents) {
    const success = search.addDocument(doc);
    console.log(`添加文档 ${doc.id}: ${doc.fields.title} - ${success ? '成功' : '失败'}`);
  }

  console.log(`\n当前文档总数: ${search.totalDocuments()}\n`);

  console.log('=== 2. 测试分词功能 ===');
  const testText = '我喜欢学习机器学习和自然语言处理技术';
  const tokens = search.tokenize(testText);
  console.log(`原文: ${testText}`);
  console.log(`分词结果: [${tokens.join(', ')}]\n`);

  console.log('=== 3. 基础搜索测试 ===');
  
  console.log('\n--- 搜索 "机器学习" ---');
  let results = search.search('机器学习');
  printResults(results);

  console.log('\n--- 搜索 "人工智能" ---');
  results = search.search('人工智能');
  printResults(results);

  console.log('=== 4. 布尔查询测试 ===');

  console.log('\n--- AND 查询: "机器学习 AND 深度学习" ---');
  const andQuery = QueryParser.and(['机器学习', '深度学习']);
  console.log(`查询字符串: ${andQuery}`);
  results = search.search(andQuery);
  printResults(results);

  console.log('\n--- OR 查询: "计算机视觉 OR 自然语言处理" ---');
  const orQuery = QueryParser.or(['计算机视觉', '自然语言处理']);
  console.log(`查询字符串: ${orQuery}`);
  results = search.search(orQuery);
  printResults(results);

  console.log('\n--- NOT 查询: "人工智能 NOT 计算机视觉" ---');
  const notQuery = QueryParser.and(['人工智能', QueryParser.not('计算机视觉')]);
  console.log(`查询字符串: ${notQuery}`);
  results = search.search(notQuery);
  printResults(results);

  console.log('=== 5. 短语查询测试 ===');

  console.log('\n--- 短语查询: "\"机器学习 人工智能\"" ---');
  const phraseQuery = QueryParser.phrase(['机器学习', '人工智能']);
  console.log(`查询字符串: ${phraseQuery}`);
  results = search.search(phraseQuery);
  printResults(results);

  console.log('=== 6. 复合查询测试 ===');

  console.log('\n--- 复合查询: "(机器学习 OR 深度学习) AND 神经网络" ---');
  const complexQuery = QueryParser.and([
    QueryParser.or(['机器学习', '深度学习']),
    '神经网络',
  ]);
  console.log(`查询字符串: ${complexQuery}`);
  results = search.search(complexQuery);
  printResults(results);

  console.log('=== 7. 文档操作测试 ===');

  console.log('\n--- 更新文档 3 ---');
  const newDoc3 = {
    id: 3,
    fields: {
      title: '计算机视觉与图像处理',
      content: '计算机视觉是人工智能的应用领域，让计算机理解图像和视频，包括图像处理和模式识别。',
      author: '王五',
    },
  };
  const updateSuccess = search.updateDocument(newDoc3);
  console.log(`更新文档 3: ${updateSuccess ? '成功' : '失败'}`);

  console.log('\n--- 搜索 "图像处理" (应该找到更新后的文档) ---');
  results = search.search('图像处理');
  printResults(results);

  console.log('\n--- 获取文档 3 ---');
  const doc3 = search.getDocument(3);
  if (doc3) {
    console.log(`文档 3 标题: ${doc3.fields.title}`);
    console.log(`文档 3 内容: ${doc3.fields.content}`);
  }

  console.log('\n--- 删除文档 4 ---');
  const removeSuccess = search.removeDocument(4);
  console.log(`删除文档 4: ${removeSuccess ? '成功' : '失败'}`);
  console.log(`当前文档总数: ${search.totalDocuments()}`);

  console.log('\n--- 搜索 "自然语言处理" (应该返回空) ---');
  results = search.search('自然语言处理');
  printResults(results);

  console.log('=== 8. 自定义词测试 ===');

  console.log('\n--- 添加自定义词 "图神经网络" ---');
  search.addCustomWord('图神经网络');

  const customText = '图神经网络是一种用于图数据的深度学习方法';
  const customTokens = search.tokenize(customText);
  console.log(`原文: ${customText}`);
  console.log(`分词结果: [${customTokens.join(', ')}]`);
  console.log(`是否包含 "图神经网络": ${customTokens.includes('图神经网络')}`);

  console.log('\n=== 示例运行完成 ===');
}

function printResults(results: any[]) {
  if (results.length === 0) {
    console.log('未找到匹配的文档');
    return;
  }

  console.log(`找到 ${results.length} 个匹配文档:`);
  for (const result of results) {
    console.log(
      `  文档 ${result.doc_id}: ${result.fields.title} (分数: ${result.score.toFixed(4)})`
    );
    console.log(`    作者: ${result.fields.author}`);
    console.log(`    摘要: ${result.fields.content.substring(0, 50)}...`);
  }
}

main().catch(console.error);
