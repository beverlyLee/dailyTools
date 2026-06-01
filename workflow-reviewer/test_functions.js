// 功能点验测试脚本
console.log('🧪 开始功能点验...\n');

// 测试1: 检查基本UI元素
function testBasicUI() {
    console.log('📋 测试1: 基本UI元素检查');
    
    const elements = [
        { id: 'saveDataBtn', name: '保存按钮' },
        { id: 'clearDataBtn', name: '清除按钮' },
        { id: 'testModeBtn', name: '点验模式按钮' },
        { id: 'configBtn', name: '配置按钮' },
        { id: 'newTabBtn', name: '新建项目按钮' }
    ];
    
    let allPassed = true;
    elements.forEach(el => {
        const exists = !!document.getElementById(el.id);
        console.log(`  ${exists ? '✅' : '❌'} ${el.name}: ${exists ? '存在' : '缺失'}`);
        if (!exists) allPassed = false;
    });
    
    const formFields = document.querySelectorAll('.field-projectName, .field-requirement, .field-stage');
    console.log(`  ${formFields.length >= 3 ? '✅' : '❌'} 表单字段: 找到 ${formFields.length} 个`);
    
    console.log(`  结果: ${allPassed && formFields.length >= 3 ? '✅ 通过' : '❌ 失败'}\n`);
    return allPassed && formFields.length >= 3;
}

// 测试2: 表单填写与保存
function testFormSave() {
    console.log('📋 测试2: 表单填写与保存');
    
    const projectNameEl = document.querySelector('.field-projectName');
    const requirementEl = document.querySelector('.field-requirement');
    const stageEl = document.querySelector('.field-stage');
    
    if (!projectNameEl || !requirementEl || !stageEl) {
        console.log('  ❌ 表单字段不完整\n');
        return false;
    }
    
    // 填写测试数据
    const testData = {
        projectName: '点验测试项目-' + Date.now(),
        requirement: '核心需求：\n1. 验证数据保存功能\n2. 验证多项目切换\n3. 验证点验模式',
        stage: '第一轮测试：基础功能验证'
    };
    
    projectNameEl.value = testData.projectName;
    requirementEl.value = testData.requirement;
    stageEl.value = testData.stage;
    
    // 触发input事件
    projectNameEl.dispatchEvent(new Event('input'));
    requirementEl.dispatchEvent(new Event('input'));
    stageEl.dispatchEvent(new Event('input'));
    
    console.log('  ✅ 已填写测试数据');
    
    // 点击保存按钮
    document.getElementById('saveDataBtn').click();
    console.log('  ✅ 已点击保存按钮');
    
    // 检查localStorage
    const savedData = localStorage.getItem('workflow_reviewer_projects');
    if (savedData) {
        const projects = JSON.parse(savedData);
        console.log(`  ✅ localStorage中有 ${projects.length} 个项目`);
        console.log(`  ✅ 当前项目名称: ${projects[0]?.name || '未设置'}`);
        console.log(`  结果: ✅ 通过\n`);
        return true;
    } else {
        console.log('  ❌ localStorage中没有数据\n');
        return false;
    }
}

// 测试3: 刷新后数据持久化
async function testDataPersistence() {
    console.log('📋 测试3: 数据持久化验证');
    return new Promise((resolve) => {
        // 保存当前数据
        const beforeData = localStorage.getItem('workflow_reviewer_projects');
        const beforeProjects = JSON.parse(beforeData);
        const projectNameBefore = beforeProjects[0]?.data?.projectName;
        
        console.log(`  ✅ 刷新前项目名称: ${projectNameBefore}`);
        
        // 模拟刷新后重新读取
        setTimeout(() => {
            const afterData = localStorage.getItem('workflow_reviewer_projects');
            const afterProjects = JSON.parse(afterData);
            const projectNameAfter = afterProjects[0]?.data?.projectName;
            
            console.log(`  ✅ 刷新后项目名称: ${projectNameAfter}`);
            
            const persistenceOk = projectNameBefore === projectNameAfter && projectNameAfter;
            console.log(`  结果: ${persistenceOk ? '✅ 通过' : '❌ 失败'}\n`);
            resolve(persistenceOk);
        }, 500);
    });
}

// 测试4: 新建项目功能
function testNewProject() {
    console.log('📋 测试4: 新建项目功能');
    
    const beforeCount = JSON.parse(localStorage.getItem('workflow_reviewer_projects') || '[]').length;
    console.log(`  ✅ 新建前项目数: ${beforeCount}`);
    
    // 点击新建项目按钮
    document.getElementById('newTabBtn').click();
    
    const afterCount = JSON.parse(localStorage.getItem('workflow_reviewer_projects') || '[]').length;
    console.log(`  ✅ 新建后项目数: ${afterCount}`);
    
    const newProjectOk = afterCount === beforeCount + 1;
    console.log(`  结果: ${newProjectOk ? '✅ 通过' : '❌ 失败'}\n`);
    return newProjectOk;
}

// 测试5: 浏览器点验模式
function testTestMode() {
    console.log('📋 测试5: 浏览器点验模式');
    
    // 确保项目有数据
    const testProjectName = document.querySelector('.field-projectName');
    const testRequirement = document.querySelector('.field-requirement');
    const testStage = document.querySelector('.field-stage');
    
    if (testProjectName && testRequirement && testStage) {
        testProjectName.value = '点验脚本测试';
        testRequirement.value = '测试脚本生成功能';
        testStage.value = '点验模式阶段';
        
        testProjectName.dispatchEvent(new Event('input'));
        testRequirement.dispatchEvent(new Event('input'));
        testStage.dispatchEvent(new Event('input'));
    }
    
    // 打开点验模式
    document.getElementById('testModeBtn').click();
    console.log('  ✅ 已打开点验模式面板');
    
    const panel = document.getElementById('testModePanel');
    const panelVisible = panel && panel.style.display !== 'none';
    console.log(`  ✅ 面板可见: ${panelVisible}`);
    
    // 检查脚本输出
    const scriptOutput = document.getElementById('testScriptOutput');
    console.log(`  ✅ 脚本输出框存在: ${!!scriptOutput}`);
    
    if (scriptOutput && scriptOutput.value) {
        console.log(`  ✅ 脚本内容非空: ${scriptOutput.value.substring(0, 50)}...`);
    }
    
    // 检查按钮
    const copyBtn = document.getElementById('copyTestScriptBtn');
    const regenerateBtn = document.getElementById('regenerateTestScriptBtn');
    const executeBtn = document.getElementById('executeTestScriptBtn');
    
    console.log(`  ✅ 复制脚本按钮: ${!!copyBtn}`);
    console.log(`  ✅ 重新生成按钮: ${!!regenerateBtn}`);
    console.log(`  ✅ 执行脚本按钮: ${!!executeBtn}`);
    
    const allButtonsExist = !!copyBtn && !!regenerateBtn && !!executeBtn;
    console.log(`  结果: ${panelVisible && allButtonsExist ? '✅ 通过' : '❌ 失败'}\n`);
    return panelVisible && allButtonsExist;
}

// 执行所有测试
async function runAllTests() {
    console.log('='.repeat(50));
    console.log('  WORKFLOW-REVIEWER 功能点验');
    console.log('='.repeat(50) + '\n');
    
    const results = [];
    
    results.push({ test: '基本UI元素', result: testBasicUI() });
    results.push({ test: '表单填写与保存', result: testFormSave() });
    results.push({ test: '数据持久化验证', result: await testDataPersistence() });
    results.push({ test: '新建项目功能', result: testNewProject() });
    results.push({ test: '浏览器点验模式', result: testTestMode() });
    
    // 汇总报告
    console.log('\n' + '='.repeat(50));
    console.log('  📊 点验报告汇总');
    console.log('='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    results.forEach(r => {
        if (r.result) {
            console.log(`  ✅ ${r.test}`);
            passed++;
        } else {
            console.log(`  ❌ ${r.test}`);
            failed++;
        }
    });
    
    console.log('\n' + '-'.repeat(50));
    console.log(`  总计: ${results.length} 项测试`);
    console.log(`  ✅ 通过: ${passed}`);
    console.log(`  ❌ 失败: ${failed}`);
    console.log(`  📈 通过率: ${((passed/results.length)*100).toFixed(1)}%`);
    console.log('-'.repeat(50));
    
    if (failed === 0) {
        console.log('\n  🎉 所有功能点验通过！');
    } else {
        console.log('\n  ⚠️  部分功能需要修复！');
    }
    console.log('='.repeat(50));
}

// 延迟执行确保页面完全加载
setTimeout(runAllTests, 1000);
