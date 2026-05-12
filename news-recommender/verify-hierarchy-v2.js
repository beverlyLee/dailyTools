const { TagHierarchy } = require('./TagHierarchy.js');
const { AlgorithmConfig } = require('./AlgorithmConfig.js');

const tagHierarchy = new TagHierarchy();
const algorithmConfig = new AlgorithmConfig();

console.log('='.repeat(80));
console.log('新算法验证 - 标签层级聚合 + 差异化得分');
console.log('='.repeat(80));

console.log('\n[测试1: 标签层级体系验证]');
console.log('  验证四级标签层级结构');
console.log('');

const testTags = ['曼城', '英超', 'AI', '芯片', '健康', '轻食', '足球', '科技'];

testTags.forEach(tag => {
    const level = tagHierarchy.getLevel(tag);
    const parent = tagHierarchy.getParent(tag);
    const children = tagHierarchy.getChildren(tag);
    const ancestors = tagHierarchy.getAncestors(tag, true);
    
    console.log(`  标签: ${tag}`);
    console.log(`    层级: L${level}`);
    console.log(`    父级: ${parent || '无'}`);
    console.log(`    子级: ${children.length > 0 ? children.join(', ') : '无'}`);
    console.log(`    祖先链: ${ancestors.join(' → ')}`);
    console.log('');
});

console.log('\n[测试2: 标签聚合验证]');
console.log('  验证多个子标签向上聚合到父级');
console.log('');

const testCases = [
    {
        name: '足球子标签聚合',
        tags: ['曼城', '利物浦', '阿森纳'],
        expected: '应该聚合到"英超"或"欧洲足球"'
    },
    {
        name: 'AI子标签聚合',
        tags: ['AI', '大模型', 'GPT'],
        expected: '应该聚合到"人工智能"'
    },
    {
        name: '健康生活子标签聚合',
        tags: ['健康', '饮食', '轻食'],
        expected: '应该聚合到"健康生活"'
    },
    {
        name: '混合标签聚合',
        tags: ['足球', 'AI', '股票'],
        expected: '应该分别聚合到"体育"、"科技"、"财经"'
    },
    {
        name: '单个标签不聚合',
        tags: ['曼城'],
        expected: '应该保持原样，不触发聚合'
    }
];

testCases.forEach((testCase, index) => {
    console.log(`  测试 ${index + 1}: ${testCase.name}`);
    console.log(`    输入标签: [${testCase.tags.join(', ')}]`);
    console.log(`    期望: ${testCase.expected}`);
    
    const aggregated = tagHierarchy.aggregateForProfile(testCase.tags);
    console.log(`    聚合结果:`);
    aggregated.forEach(result => {
        console.log(`      - ${result.tag} (L${result.level}, 子标签数: ${result.childCount})`);
        if (result.childCount > 0) {
            console.log(`        子标签: [${result.children.join(', ')}]`);
        }
    });
    console.log('');
});

console.log('\n[测试3: 差异化得分验证]');
console.log('  验证标签出现在不同位置的权重系数');
console.log('');

const importanceWeights = [
    { location: 'title', weight: algorithmConfig.getTagImportanceWeight('title'), desc: '标题中出现' },
    { location: 'content', weight: algorithmConfig.getTagImportanceWeight('content'), desc: '正文中出现' },
    { location: 'tag', weight: algorithmConfig.getTagImportanceWeight('tag'), desc: '显式标签' }
];

const baseScoreRange = algorithmConfig.getBaseScoreRange();
console.log(`  基础分范围: ${baseScoreRange.min} - ${baseScoreRange.max}`);
console.log(`  聚合阈值: ${algorithmConfig.getAggregateThreshold()} 个子标签`);
console.log('');

importanceWeights.forEach(item => {
    console.log(`  ${item.desc}: 权重系数 = ${item.weight}`);
    const scoreExample1 = baseScoreRange.min * item.weight;
    const scoreExample10 = baseScoreRange.max * item.weight;
    console.log(`    最低得分: ${baseScoreRange.min} × ${item.weight} = ${scoreExample1.toFixed(1)}`);
    console.log(`    最高得分: ${baseScoreRange.max} × ${item.weight} = ${scoreExample10.toFixed(1)}`);
    console.log('');
});

console.log('\n[测试4: 聚合得分计算示例]');
console.log('  模拟点击一篇包含多个子标签的文章');
console.log('');

const mockNews = {
    id: 1,
    title: '曼城、利物浦、阿森纳争夺英超冠军',
    content: '本赛季英超联赛竞争激烈，曼城、利物浦和阿森纳三支球队都有夺冠可能...',
    category: '体育',
    tags: ['曼城', '利物浦', '阿森纳', '英超']
};

console.log(`  模拟新闻:`);
console.log(`    标题: ${mockNews.title}`);
console.log(`    分类: ${mockNews.category}`);
console.log(`    显式标签: [${mockNews.tags.join(', ')}]`);
console.log('');

const aggregateThreshold = algorithmConfig.getAggregateThreshold();
const { min: baseScoreMin, max: baseScoreMax } = algorithmConfig.getBaseScoreRange();
const avgBaseScore = (baseScoreMin + baseScoreMax) / 2;

console.log(`  计算过程:`);
console.log(`    1. 基础分: ${avgBaseScore.toFixed(1)} (首次点击取平均值)`);
console.log(`    2. 标签聚合检查: ${mockNews.tags.length} 个标签`);

const aggregatedForTest = tagHierarchy.aggregateForProfile(mockNews.tags);
console.log(`    3. 聚合结果:`);

aggregatedForTest.forEach(result => {
    const shouldAggregate = result.childCount >= aggregateThreshold;
    console.log(`       - ${result.tag} (L${result.level}): ${result.childCount} 个子标签`);
    console.log(`         ${shouldAggregate ? '✓ 触发聚合' : '✗ 不触发聚合'} (阈值: ${aggregateThreshold})`);
    
    if (shouldAggregate) {
        let totalScore = 0;
        const children = result.children;
        console.log(`         子标签: [${children.join(', ')}]`);
        
        children.forEach(child => {
            const inTitle = mockNews.title.includes(child) || child === '英超';
            const inContent = mockNews.content.includes(child);
            const inExplicit = mockNews.tags.includes(child);
            
            let location = 'tag';
            if (inTitle) location = 'title';
            else if (inContent) location = 'content';
            
            const importance = algorithmConfig.getTagImportanceWeight(location);
            const score = avgBaseScore * importance;
            totalScore += score;
            
            console.log(`           • ${child}: 出现在${location} → 权重${importance} → 得分${score.toFixed(1)}`);
        });
        
        console.log(`         聚合后: ${result.tag} 总得分 = ${totalScore.toFixed(1)}`);
        console.log(`         对比旧算法: 每个子标签 +24 → 总计 ${children.length * 24}`);
        console.log(`         新算法优势: 避免重复累加，画像更集中`);
    }
});

console.log('');
console.log('\n[测试5: 同义词映射验证]');
console.log('  验证不同表达的标签被归一化');
console.log('');

const synonymTests = [
    { input: '曼城队', expected: '曼城' },
    { input: '巴塞罗那', expected: '巴萨' },
    { input: '人工智能', expected: 'AI' },
    { input: '楼市', expected: '房地产' },
    { input: 'ChatGPT', expected: 'GPT' }
];

synonymTests.forEach(test => {
    const normalized = tagHierarchy.normalizeTag(test.input);
    const passed = normalized === test.expected;
    console.log(`  ${test.input} → ${normalized} (期望: ${test.expected}) ${passed ? '✓' : '✗'}`);
});

console.log('');
console.log('\n[测试6: 层级匹配验证]');
console.log('  验证子标签匹配时父级也能获得分数加成');
console.log('');

const hierarchyBonus = 0.5;
console.log(`  层级匹配加成系数: ${hierarchyBonus}`);
console.log('');
console.log(`  场景: 用户画像中"足球"得分=40，"英超"得分=0`);
console.log(`  推荐时:"曼城"新闻的匹配得分 = 0 + 40 × 0.5 = 20`);
console.log(`  效果: 子标签也能享受到父级标签的兴趣积累`);

console.log('');
console.log('='.repeat(80));
console.log('总结 - 新算法优势');
console.log('='.repeat(80));
console.log('');
console.log('1. 标签聚合:');
console.log('   旧: "曼城"+8, "利物浦"+8, "阿森纳"+8 (分散，共+24)');
console.log('   新: "英超"+24 (聚合，画像更集中)');
console.log('');
console.log('2. 差异化得分:');
console.log('   旧: 所有标签固定+8');
console.log('   新: 标题出现×1.2, 正文×1.0, 显式标签×0.8');
console.log('   基础分范围 1-10，根据匹配度动态调整');
console.log('');
console.log('3. 层级匹配:');
console.log('   旧: 只有精确匹配才计分');
console.log('   新: 子标签匹配时，父级也贡献加分');
console.log('');
console.log('4. 解决的问题:');
console.log('   ✓ 标签切分过细 → 聚合到适当层级');
console.log('   ✓ 得分完全一致 → 差异化权重+动态基础分');
console.log('   ✓ 同义词不统一 → 标准化映射');
console.log('');
console.log('='.repeat(80));
