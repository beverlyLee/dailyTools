const ActionItemExtractor = require('./ActionItemExtractor');

const testText = `大家好，今天我们来开这个周会，嗯，首先，先回顾一下上周的工作进展吧。呃，那个张工，你那边的用户反馈处理得怎么样了？哦，对了，张工负责的那个性能优化问题，必须在本周五前完成修复，用户那边催得比较紧。

然后，还有那个新功能的开发进度，李工，你这边有什么问题吗？好的，李工来负责制定完整的测试计划，下周一之前提交给大家审核，测试团队需要在下周内完成所有的功能测试。

接下来我们讨论一下新产品的上线时间问题，那个，经过大家的讨论，决定在下周三进行灰度发布，然后下周五正式上线。运营团队需要准备好推广方案，明天下午之前完成初稿，市场部门也需要配合准备好相关的宣传材料。

还有，关于用户反馈的那个 bug，王工负责跟进这个问题，必须尽快修复，用户体验很重要。另外，我们还需要准备好上线后的监控方案，确保系统稳定运行。

对了，还有财务那边的预算审批，赵工需要跟进一下，下周二之前要有结果，这样我们才能采购需要的服务器。还有，产品经理需要整理用户需求文档，本周内完成，方便开发团队参考。

那个，大家还有什么其他问题吗？好的，没有的话我们今天的会议就到这里，散会。对了，下周同一时间继续开周会，大家记得准备好各自的工作汇报材料。`;

const extractor = new ActionItemExtractor();

console.log('=== 测试文本 ===');
console.log('文本长度:', testText.length, '字');
console.log('');

const results = extractor.extract(testText);

console.log('=== 提取的行动项 ===');
console.log('数量:', results.length);
console.log('');

results.forEach((item, index) => {
    console.log(`[${index + 1}] 任务: ${item.action}`);
    console.log(`     负责人: ${item.assignee}`);
    console.log(`     截止时间: ${item.deadline}`);
    console.log(`     优先级: ${item.priority}`);
    console.log(`     任务核心: ${item.taskCore}`);
    console.log('');
});

console.log('=== 验证结果 ===');
console.log('1. 负责人是否纯人名:');
results.forEach((item, index) => {
    const isValidName = item.assignee === '待定' || 
        /^[\u4e00-\u9fa5]{1,6}$/.test(item.assignee);
    console.log(`   [${index + 1}] ${item.assignee} - ${isValidName ? '✓ 通过' : '✗ 失败'}`);
});

console.log('');
console.log('2. 首字符是否净化:');
results.forEach((item, index) => {
    const firstChar = item.action.charAt(0);
    const isValid = /^[\u4e00-\u9fa5a-zA-Z0-9]$/.test(firstChar);
    console.log(`   [${index + 1}] "${firstChar}" - ${isValid ? '✓ 通过' : '✗ 失败'}`);
});

console.log('');
console.log('3. 是否有去重:');
const uniqueKeys = new Set();
let hasDuplicate = false;
results.forEach((item, index) => {
    const key = `${item.assignee}|${item.taskCore}`;
    if (uniqueKeys.has(key)) {
        console.log(`   [${index + 1}] 发现重复: ${key}`);
        hasDuplicate = true;
    }
    uniqueKeys.add(key);
});
if (!hasDuplicate) {
    console.log('   ✓ 无重复项');
}

console.log('');
console.log('4. 是否过滤寒暄句:');
const hasGreeting = results.some(item => 
    item.action.includes('散会') || 
    item.action.includes('大家好') ||
    item.action.includes('再见')
);
console.log(`   ${!hasGreeting ? '✓ 已过滤寒暄句' : '✗ 存在寒暄句'}`);

console.log('');
console.log('=== 完成 ===');
