const CONFIG_KEY = 'workflow_reviewer_volc_config';
const PROJECTS_KEY = 'workflow_reviewer_projects';
const ACTIVE_PROJECT_KEY = 'workflow_reviewer_active_project';

const IMAGE_STORE_DB = 'WorkflowReviewerImages';
const IMAGE_STORE_NAME = 'project_images';

async function openImageDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IMAGE_STORE_DB, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
                db.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

async function saveImagesForProject(projectId, files) {
    if (!files || files.length === 0) return;
    try {
        const db = await openImageDB();
        const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IMAGE_STORE_NAME);
        for (let i = 0; i < files.length; i++) {
            const id = `${projectId}_${i}`;
            store.put({ id, data: files[i] });
        }
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = reject;
        });
        db.close();
    } catch (e) {
        console.warn('保存图片失败:', e);
    }
}

async function loadImagesForProject(projectId) {
    try {
        const db = await openImageDB();
        const tx = db.transaction(IMAGE_STORE_NAME, 'readonly');
        const store = tx.objectStore(IMAGE_STORE_NAME);
        const files = [];
        return new Promise((resolve) => {
            store.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.key.startsWith(`${projectId}_`)) {
                        files.push(cursor.value.data);
                    }
                    cursor.continue();
                } else {
                    db.close();
                    resolve(files);
                }
            };
        });
    } catch (e) {
        console.warn('加载图片失败:', e);
        return [];
    }
}

async function clearImagesForProject(projectId) {
    try {
        const db = await openImageDB();
        const tx = db.transaction(IMAGE_STORE_NAME, 'readwrite');
        const store = tx.objectStore(IMAGE_STORE_NAME);
        return new Promise((resolve) => {
            store.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (cursor.key.startsWith(`${projectId}_`)) {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    db.close();
                    resolve();
                }
            };
        });
    } catch (e) {
        console.warn('清除图片失败:', e);
    }
}

const DEFAULT_SYSTEM_PROMPT = `你是一位严格的人工测试员，负责验收 AI 编程助手的产出物。你必须仅通过视觉和逻辑判断结果是否符合需求，输出以下三个标准产物：

### 【验收结论】
- 形式：状态标签 + 一句话总结
- 状态集：
  - ✅ 达标：符合需求，可交付或进入下一阶段
  - ⚠️ 部分达标：大方向对，但有瑕疵（性能不足、边缘锯齿、偶发Bug等）
  - ❌ 严重偏离：核心逻辑错误，产出物不可用（白屏、数据全错、穿模等）
- 必须严格对照需求，拒绝"差不多"

### 【归因诊断】
- 形式：分点列举当前存在的逻辑/视觉问题
- 规则：
  - 由果溯因：基于截图现象反推可能的逻辑漏洞
  - 层层递进：比上一轮挖掘得更深
  - 去代码化：不讲具体API，讲逻辑（如：空间计算错误、状态同步延迟、抗锯齿失效）

### 【下一轮 Prompt (~220字)】
- 形式：给 AI 编程助手的整改指令
- Vibe Coding 风格：强调 Why（目的）和 What（效果），弱化 How（具体代码）
- 结构清晰：
  1. 否定：明确指出要废弃或规避的错误路径
  2. 修正：给出具体的逻辑调整方向或算法建议
  3. 锚定：描述期望达到的视觉效果或性能指标`;

const DEFAULT_USER_PROMPT_TEMPLATE = `工程：{project_name}
{requirement_text}
这是第 {round_num} 轮结果{stage_info}（见截图），请验收。`;

let globalConfig = {
    apiKey: '',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: '',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    userPromptTemplate: DEFAULT_USER_PROMPT_TEMPLATE
};

const appState = {
    projects: [],
    activeProjectId: null
};

async function loadBackendConfig() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            globalConfig.baseUrl = data.base_url || globalConfig.baseUrl;
            globalConfig.model = data.model || globalConfig.model;
            globalConfig.systemPrompt = data.system_prompt || DEFAULT_SYSTEM_PROMPT;
            globalConfig.userPromptTemplate = data.user_prompt_template || DEFAULT_USER_PROMPT_TEMPLATE;
            if (data.has_key) {
                globalConfig.apiKey = globalConfig.apiKey || '********';
            }
            return true;
        }
    } catch (e) {
        console.warn('从后端加载配置失败:', e);
    }
    return false;
}

function loadGlobalConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            globalConfig = { ...globalConfig, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('加载本地配置失败:', e);
    }
}

function saveGlobalConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(globalConfig));
}

async function loadProjects() {
    try {
        const saved = localStorage.getItem(PROJECTS_KEY);
        console.log('加载的项目数据:', saved ? JSON.parse(saved) : '无数据');
        
        if (saved) {
            appState.projects = JSON.parse(saved);
            
            appState.projects.forEach(p => {
                if (p.data && p.data.files && p.data.files.length > 0) {
                    p.data.files = [];
                }
                if (!p.data) {
                    p.data = { files: [] };
                }
                if (!p.data.files) {
                    p.data.files = [];
                }
                if (p.data.currentProcess === undefined) {
                    p.data.currentProcess = '';
                }
            });
            
            saveProjects();
            
            for (const p of appState.projects) {
                p.data.files = await loadImagesForProject(p.id);
            }
        }
        const activeId = localStorage.getItem(ACTIVE_PROJECT_KEY);
        console.log('活动项目ID:', activeId);
        if (activeId && appState.projects.find(p => p.id === activeId)) {
            appState.activeProjectId = activeId;
        }
    } catch (e) {
        console.error('加载项目失败:', e);
        alert('项目数据加载失败，请检查浏览器控制台。数据不会被自动清除。');
    }
    
    console.log('最终加载的项目:', appState.projects);
    if (appState.projects.length === 0) {
        createNewProject();
    }
}

function saveProjects() {
    try {
        const projectsToSave = appState.projects.map(p => {
            return {
                id: p.id,
                name: p.name,
                data: {
                    projectName: p.data.projectName || '',
                    requirement: p.data.requirement || '',
                    roundNum: p.data.roundNum || 1,
                    stage: p.data.stage || '',
                    userAdvice: p.data.userAdvice || '',
                    currentProcess: p.data.currentProcess || '',
                    projectPath: p.data.projectPath || '',
                    port: p.data.port || 8980,
                    startupScript: p.data.startupScript || '',
                    backendScript: p.data.backendScript || '',
                    frontendScript: p.data.frontendScript || '',
                    files: [],
                    history: p.data.history || [],
                    currentResult: p.data.currentResult || null,
                    lastUpdated: p.data.lastUpdated || Date.now()
                }
            };
        });
        const json = JSON.stringify(projectsToSave);
        localStorage.setItem(PROJECTS_KEY, json);
        if (appState.activeProjectId) {
            localStorage.setItem(ACTIVE_PROJECT_KEY, appState.activeProjectId);
        }
    } catch (e) {
        console.error('❌ 保存失败:', e);
        showToast('保存失败: ' + e.message);
    }
}

function generateId() {
    return 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function createNewProject() {
    const projectId = generateId();
    const project = {
        id: projectId,
        name: '新项目',
        data: {
            projectName: '',
            requirement: '',
            roundNum: 1,
            stage: '',
            userAdvice: '',
            currentProcess: '',
            projectPath: '',
            port: 8980,
            startupScript: '',
            backendScript: '',
            frontendScript: '',
            files: [],
            history: [],
            currentResult: null,
            lastUpdated: Date.now()
        }
    };
    
    appState.projects.push(project);
    appState.activeProjectId = projectId;
    saveProjects();
    
    return project;
}

function getActiveProject() {
    return appState.projects.find(p => p.id === appState.activeProjectId);
}

function deleteProject(projectId) {
    const index = appState.projects.findIndex(p => p.id === projectId);
    if (index === -1) return;
    
    if (appState.projects.length === 1) {
        showToast('至少保留一个项目');
        return;
    }
    
    appState.projects.splice(index, 1);
    
    if (appState.activeProjectId === projectId) {
        appState.activeProjectId = appState.projects[0].id;
    }
    
    clearImagesForProject(projectId);
    saveProjects();
    renderTabs();
    renderWorkspace();
}

function switchProject(projectId) {
    const project = appState.projects.find(p => p.id === projectId);
    if (!project) return;
    
    const activeProject = getActiveProject();
    if (activeProject && activeProject.id !== projectId) {
        const contentEl = document.querySelector(`[data-project-id="${activeProject.id}"]`);
        if (contentEl) {
            const projectNameEl = contentEl.querySelector('.field-projectName');
            const requirementEl = contentEl.querySelector('.field-requirement');
            const roundNumEl = contentEl.querySelector('.field-roundNum');
            const stageEl = contentEl.querySelector('.field-stage');
            const userAdviceEl = contentEl.querySelector('.field-userAdvice');
            const currentProcessEl = contentEl.querySelector('.field-currentProcess');
            const projectPathEl = contentEl.querySelector('.field-projectPath');
            const portEl = contentEl.querySelector('.field-port');
            const startupScriptEl = contentEl.querySelector('.field-startupScript');
            const backendScriptEl = contentEl.querySelector('.field-backendScript');
            const frontendScriptEl = contentEl.querySelector('.field-frontendScript');

            if (projectNameEl) {
                activeProject.name = projectNameEl.value.trim() || '新项目';
                activeProject.data.projectName = projectNameEl.value;
            }
            if (requirementEl) activeProject.data.requirement = requirementEl.value;
            if (roundNumEl) activeProject.data.roundNum = parseInt(roundNumEl.value) || 1;
            if (stageEl) activeProject.data.stage = stageEl.value;
            if (userAdviceEl) activeProject.data.userAdvice = userAdviceEl.value;
            if (currentProcessEl) activeProject.data.currentProcess = currentProcessEl.value;
            if (projectPathEl) activeProject.data.projectPath = projectPathEl.value;
            if (portEl) activeProject.data.port = parseInt(portEl.value) || 8980;
            if (startupScriptEl) activeProject.data.startupScript = startupScriptEl.value;
            if (backendScriptEl) activeProject.data.backendScript = backendScriptEl.value;
            if (frontendScriptEl) activeProject.data.frontendScript = frontendScriptEl.value;
            activeProject.data.lastUpdated = Date.now();
        }
    }
    
    appState.activeProjectId = projectId;
    saveProjects();
    renderTabs();
    renderWorkspace();
}

function saveProjectState(project) {
    if (!project) {
        return;
    }

    const contentEl = document.querySelector(`[data-project-id="${project.id}"]`);
    if (!contentEl) {
        return;
    }

    const projectNameEl = contentEl.querySelector('.field-projectName');
    const requirementEl = contentEl.querySelector('.field-requirement');
    const roundNumEl = contentEl.querySelector('.field-roundNum');
    const stageEl = contentEl.querySelector('.field-stage');
    const userAdviceEl = contentEl.querySelector('.field-userAdvice');
    const currentProcessEl = contentEl.querySelector('.field-currentProcess');
    const projectPathEl = contentEl.querySelector('.field-projectPath');
    const portEl = contentEl.querySelector('.field-port');
    const startupScriptEl = contentEl.querySelector('.field-startupScript');
    const backendScriptEl = contentEl.querySelector('.field-backendScript');
    const frontendScriptEl = contentEl.querySelector('.field-frontendScript');


    if (projectNameEl) {
        project.name = projectNameEl.value.trim() || '新项目';
        project.data.projectName = projectNameEl.value;
    }
    if (requirementEl) {
        project.data.requirement = requirementEl.value;
    }
    if (roundNumEl) project.data.roundNum = parseInt(roundNumEl.value) || 1;
    if (stageEl) project.data.stage = stageEl.value;
    if (userAdviceEl) project.data.userAdvice = userAdviceEl.value;
    if (currentProcessEl) project.data.currentProcess = currentProcessEl.value;
    if (projectPathEl) project.data.projectPath = projectPathEl.value;
    if (portEl) project.data.port = parseInt(portEl.value) || 8980;
    if (startupScriptEl) project.data.startupScript = startupScriptEl.value;
    if (backendScriptEl) project.data.backendScript = backendScriptEl.value;
    if (frontendScriptEl) project.data.frontendScript = frontendScriptEl.value;
    project.data.lastUpdated = Date.now();

    saveProjects();
}

function updateProjectName(project, name) {
    project.name = name || '新项目';
    saveProjects();
    renderTabs();
}

function renderTabs() {
    const tabsList = document.getElementById('tabsList');
    tabsList.innerHTML = '';
    
    appState.projects.forEach(project => {
        const tab = document.createElement('div');
        tab.className = `tab ${project.id === appState.activeProjectId ? 'active' : ''}`;
        tab.dataset.projectId = project.id;
        tab.innerHTML = `
            <span class="tab-name">${escapeHtml(project.name)}</span>
            <button class="tab-close" title="关闭项目">&times;</button>
        `;
        
        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                switchProject(project.id);
            }
        });
        
        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`确定关闭项目「${project.name}」？`)) {
                deleteProject(project.id);
            }
        });
        
        tabsList.appendChild(tab);
    });
}

function renderWorkspace() {
    const workspace = document.getElementById('workspace');
    workspace.innerHTML = '';
    
    const template = document.getElementById('projectTemplate');
    
    appState.projects.forEach(project => {
        const content = template.content.firstElementChild.cloneNode(true);
        content.dataset.projectId = project.id;
        content.style.display = project.id === appState.activeProjectId ? 'block' : 'none';
        
        const data = project.data;
        
        const fields = {
            projectName: content.querySelector('.field-projectName'),
            requirement: content.querySelector('.field-requirement'),
            roundNum: content.querySelector('.field-roundNum'),
            stage: content.querySelector('.field-stage'),
            userAdvice: content.querySelector('.field-userAdvice'),
            currentProcess: content.querySelector('.field-currentProcess'),
            projectPath: content.querySelector('.field-projectPath'),
            port: content.querySelector('.field-port'),
            startupScript: content.querySelector('.field-startupScript'),
            backendScript: content.querySelector('.field-backendScript'),
            frontendScript: content.querySelector('.field-frontendScript'),
            uploadArea: content.querySelector('.field-uploadArea'),
            uploadPlaceholder: content.querySelector('.field-uploadPlaceholder'),
            previewGrid: content.querySelector('.field-previewGrid'),
            fileInput: content.querySelector('.field-fileInput'),
            submitBtn: content.querySelector('.field-submitBtn'),
            runProjectBtn: content.querySelector('.field-runProjectBtn'),
            stopProjectBtn: content.querySelector('.field-stopProjectBtn'),
            resultCard: content.querySelector('.field-resultCard'),
            resultMeta: content.querySelector('.field-resultMeta'),
            resultBody: content.querySelector('.field-resultBody'),
            copyPromptBtn: content.querySelector('.field-copyPromptBtn'),
            syncFeishuBtn: content.querySelector('.field-syncFeishuBtn'),
            newRoundBtn: content.querySelector('.field-newRoundBtn'),
            historyCard: content.querySelector('.field-historyCard'),
            historyList: content.querySelector('.field-historyList'),
            clearHistoryBtn: content.querySelector('.field-clearHistoryBtn')
        };
        
        fields.projectName.value = data.projectName || '';
        fields.requirement.value = data.requirement || '';
        fields.roundNum.value = data.roundNum || 1;
        fields.stage.value = data.stage || '';
        fields.userAdvice.value = data.userAdvice || '';
        fields.currentProcess.value = data.currentProcess || '';
        if (fields.projectPath) fields.projectPath.value = data.projectPath || '';
        if (fields.port) fields.port.value = data.port || 8980;
        if (fields.startupScript) fields.startupScript.value = data.startupScript || '';
        if (fields.backendScript) fields.backendScript.value = data.backendScript || '';
        if (fields.frontendScript) fields.frontendScript.value = data.frontendScript || '';
        
        fields.projectName.addEventListener('input', () => {
            project.data.projectName = fields.projectName.value;
            project.name = fields.projectName.value.trim() || '新项目';
            project.data.lastUpdated = Date.now();
            updateProjectName(project, fields.projectName.value);
            updateProjectSubmitState(project, fields);
            saveProjects();
            if (document.getElementById('testModePanel').style.display !== 'none') {
                generateTestScript();
            }
        });
        
        fields.requirement.addEventListener('input', () => {
            project.data.requirement = fields.requirement.value;
            project.data.lastUpdated = Date.now();
            updateProjectSubmitState(project, fields);
            saveProjects();
            if (document.getElementById('testModePanel').style.display !== 'none') {
                generateTestScript();
            }
        });
        
        fields.roundNum.addEventListener('input', () => {
            project.data.roundNum = parseInt(fields.roundNum.value) || 1;
            project.data.lastUpdated = Date.now();
            saveProjects();
        });
        
        fields.stage.addEventListener('input', () => {
            project.data.stage = fields.stage.value;
            project.data.lastUpdated = Date.now();
            updateProjectSubmitState(project, fields);
            saveProjects();
            if (document.getElementById('testModePanel').style.display !== 'none') {
                generateTestScript();
            }
        });
        
        fields.userAdvice.addEventListener('input', () => {
            project.data.userAdvice = fields.userAdvice.value;
            project.data.lastUpdated = Date.now();
            saveProjects();
        });
        
        fields.currentProcess.addEventListener('input', () => {
            project.data.currentProcess = fields.currentProcess.value;
            project.data.lastUpdated = Date.now();
            saveProjects();
            if (document.getElementById('testModePanel').style.display !== 'none') {
                generateTestScript();
            }
        });
        
        [fields.projectPath, fields.port, fields.startupScript, fields.backendScript, fields.frontendScript].forEach(el => {
            if (el) {
                el.addEventListener('input', () => {
                    if (el === fields.projectPath) project.data.projectPath = el.value;
                    if (el === fields.port) project.data.port = parseInt(el.value) || 8980;
                    if (el === fields.startupScript) project.data.startupScript = el.value;
                    if (el === fields.backendScript) project.data.backendScript = el.value;
                    if (el === fields.frontendScript) project.data.frontendScript = el.value;
                    project.data.lastUpdated = Date.now();
                    saveProjects();
                });
            }
        });
        
        fields.uploadArea.addEventListener('click', (e) => {
            e.stopPropagation();
            if (screenshotAreaActive && activeScreenshotFields === fields) {
                fields.fileInput.click();
            } else {
                activateScreenshotArea(fields);
                showToast('已激活粘贴，按 Cmd+V 粘贴截图，或再次点击选择文件');
            }
        });
        fields.uploadArea.addEventListener('focusin', (e) => {
            e.stopPropagation();
            activateScreenshotArea(fields);
        });
        fields.fileInput.addEventListener('change', (e) => handleFiles(project, fields, e));
        fields.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fields.uploadArea.classList.add('dragover');
        });
        fields.uploadArea.addEventListener('dragleave', () => {
            fields.uploadArea.classList.remove('dragover');
        });
        fields.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fields.uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                handleFiles(project, fields, { target: { files: e.dataTransfer.files } });
            }
        });
        
        fields.submitBtn.addEventListener('click', () => submitVerify(project, fields));
        fields.runProjectBtn.addEventListener('click', () => runProject(project, fields));
        fields.stopProjectBtn.addEventListener('click', () => stopProject(project, fields));
        fields.copyPromptBtn.addEventListener('click', () => copyPrompt(project, fields));
        fields.syncFeishuBtn.addEventListener('click', () => syncToFeishu(project, fields));
        fields.newRoundBtn.addEventListener('click', () => newRound(project, fields));
        fields.clearHistoryBtn.addEventListener('click', () => clearHistory(project, fields));
        
        renderProjectPreviews(project, fields);
        renderProjectHistory(project, fields);
        
        if (data.currentResult) {
            renderProjectResult(project, fields, data.currentResult);
        }
        
        updateProjectSubmitState(project, fields);
        
        workspace.appendChild(content);
    });
}

function handleFiles(project, fields, e) {
    const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (!newFiles.length) {
        showToast('请选择图片文件');
        return;
    }
    
    const data = project.data;
    
    newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            data.files.push({
                dataUrl: event.target.result,
                name: file.name,
                type: file.type,
                size: file.size
            });
            saveProjects();
            saveImagesForProject(project.id, data.files);
            renderProjectPreviews(project, fields);
            updateProjectSubmitState(project, fields);
        };
        reader.readAsDataURL(file);
    });
    
    e.target.value = '';
}

function renderProjectPreviews(project, fields) {
    const data = project.data;
    fields.previewGrid.innerHTML = '';
    
    data.files.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        
        if (file instanceof Blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
                item.innerHTML = `
                    <img src="${e.target.result}" alt="preview">
                    <button class="remove-btn">&times;</button>
                `;
                item.querySelector('.remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    data.files.splice(index, 1);
                    saveProjects();
                    renderProjectPreviews(project, fields);
                    updateProjectSubmitState(project, fields);
                });
                fields.previewGrid.appendChild(item);
            };
            reader.readAsDataURL(file);
        } else if (file.dataUrl) {
            item.innerHTML = `
                <img src="${file.dataUrl}" alt="preview">
                <button class="remove-btn">&times;</button>
            `;
            item.querySelector('.remove-btn').addEventListener('click', () => {
                data.files.splice(index, 1);
                saveProjects();
                clearImagesForProject(project.id).then(() => {
                    saveImagesForProject(project.id, data.files);
                });
                renderProjectPreviews(project, fields);
                updateProjectSubmitState(project, fields);
            });
            fields.previewGrid.appendChild(item);
        }
    });
    
    fields.uploadPlaceholder.classList.toggle('hidden', data.files.length > 0);
}

function updateProjectSubmitState(project, fields) {
    if (!fields || !fields.submitBtn) return;

    const data = project.data;
    
    const requirementValue = fields.requirement?.value || data.requirement || '';
    const hasRequirement = requirementValue.trim().length > 0;
    const hasFiles = data.files.length > 0;
    
    const apiKeyInput = document.getElementById('volcApiKey')?.value || '';
    const baseUrlInput = document.getElementById('volcBaseUrl')?.value || '';
    const modelInput = document.getElementById('volcModel')?.value || '';
    
    const hasApiKey = apiKeyInput.trim() || (globalConfig.apiKey && globalConfig.apiKey !== '');
    const hasBaseUrl = baseUrlInput.trim() || (globalConfig.baseUrl && globalConfig.baseUrl !== '');
    const hasModel = modelInput.trim() || (globalConfig.model && globalConfig.model !== '');
    
    const hasConfig = hasApiKey && hasBaseUrl && hasModel;

    const btnText = fields.submitBtn.querySelector('.btn-text');
    const btnLoading = fields.submitBtn.querySelector('.btn-loading');
    if (btnText) btnText.hidden = false;
    if (btnLoading) btnLoading.hidden = true;

    const canSubmit = hasRequirement && hasFiles && hasConfig;
    fields.submitBtn.disabled = !canSubmit;
    
    const disabledReasons = [];
    if (!hasRequirement) disabledReasons.push('缺少核心需求');
    if (!hasFiles) disabledReasons.push('缺少截图');
    if (!hasApiKey) disabledReasons.push('缺少 API Key');
    if (!hasBaseUrl) disabledReasons.push('缺少 Base URL');
    if (!hasModel) disabledReasons.push('缺少模型名称');
    
    if (disabledReasons.length > 0) {
        fields.submitBtn.title = '无法提交：' + disabledReasons.join('、');
    } else {
        fields.submitBtn.title = '';
    }
}

async function submitVerify(project, fields) {
    saveProjectState(project);
    
    const formData = new FormData();
    formData.append('project_name', fields.projectName.value || '');
    formData.append('requirement', fields.requirement.value || '');
    formData.append('round_num', fields.roundNum.value || 1);
    formData.append('stage', fields.stage.value || '');
    formData.append('user_advice', fields.userAdvice.value || '');
    formData.append('current_process', fields.currentProcess.value || '');

    if (globalConfig.apiKey && globalConfig.apiKey !== '********') {
        formData.append('api_key', globalConfig.apiKey);
    }
    formData.append('base_url', globalConfig.baseUrl);
    formData.append('model', globalConfig.model);
    formData.append('system_prompt', globalConfig.systemPrompt);
    formData.append('user_prompt_template', globalConfig.userPromptTemplate);
    
    project.data.files.forEach((f, idx) => {
        if (f.dataUrl) {
            const byteString = atob(f.dataUrl.split(',')[1]);
            const mimeString = f.dataUrl.split(',')[0].split(':')[1].split(';')[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            formData.append('screenshots', blob, `screenshot_${idx}.jpg`);
        } else if (f instanceof Blob) {
            formData.append('screenshots', f, `screenshot_${idx}.jpg`);
        }
    });
    
    const btnText = fields.submitBtn.querySelector('.btn-text');
    const btnLoading = fields.submitBtn.querySelector('.btn-loading');
    
    if (fields.submitBtn) fields.submitBtn.disabled = true;
    if (btnText) btnText.hidden = true;
    if (btnLoading) btnLoading.hidden = false;
    
    console.log('=== 🚀 模型调用开始 ===');
    console.log('工程名称:', fields.projectName.value || '');
    console.log('核心需求:', fields.requirement.value || '');
    console.log('当前轮次:', fields.roundNum.value || 1);
    console.log('阶段描述:', fields.stage.value || '');
    console.log('截图数量:', project.data.files.length);
    console.log('模型配置:', {
        baseUrl: globalConfig.baseUrl,
        model: globalConfig.model,
        apiKeyExists: !!globalConfig.apiKey && globalConfig.apiKey !== '********'
    });
    console.log('=== 正在调用模型... ===');
    
    try {
        const startTime = Date.now();
        const res = await fetch('/api/verify', { method: 'POST', body: formData });
        const duration = Date.now() - startTime;
        
        console.log(`=== ✅ 模型调用完成 (耗时: ${duration}ms) ===`);
        console.log('HTTP状态:', res.status);
        
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await res.text();
            console.error('服务器返回了非 JSON 响应:', text.substring(0, 200));
            throw new Error('后端服务异常。请确保通过 python server.py 启动 workflow-reviewer 服务（默认端口 8980）。');
        }
        
        if (!res.ok) {
            let err = {};
            try {
                err = await res.json();
            } catch (e) {}
            console.log('❌ 模型调用失败:', err.error || `HTTP ${res.status}`);
            throw new Error(err.error || `请求失败 (${res.status})`);
        }
        
        const resultData = await res.json();
        console.log('📋 验收结果:', {
            projectName: resultData.project_name,
            round: resultData.round,
            stage: resultData.stage,
            resultLength: resultData.result?.length || 0
        });
        
        project.data.currentResult = resultData;
        saveToProjectHistory(project, resultData, fields);
        renderProjectResult(project, fields, resultData);
        
        try {
            const saveResultRes = await fetch('/api/save-result', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    project_name: fields.projectName.value || project.id,
                    project_path: fields.projectPath.value || '/Users/liboyang/trae/dailyTools',
                    requirement: fields.requirement.value || '',
                    round_num: fields.roundNum.value || 1,
                    stage: fields.stage.value || '',
                    user_advice: fields.userAdvice.value || '',
                    model: globalConfig.model || '',
                    base_url: globalConfig.baseUrl || '',
                    result_text: resultData.result || ''
                })
            });
            const saveResultData = await saveResultRes.json();
            if (saveResultData.success) {
                console.log('📄 验收结果已保存到文件');
                showToast('验收完成，已保存到 ' + saveResultData.file_path);
            } else {
                console.log('📄 保存失败:', saveResultData.error);
                showToast('验收完成，但保存失败: ' + saveResultData.error);
            }
        } catch (e) {
            console.log('📄 保存异常:', e.message);
            showToast('验收完成，但保存失败: ' + e.message);
        }
    } catch (e) {
        console.log('❌ 模型调用异常:', e.message);
        showToast(e.message || '提交失败，请重试');
    } finally {
        if (fields.submitBtn) fields.submitBtn.disabled = false;
        if (btnText) btnText.hidden = false;
        if (btnLoading) btnLoading.hidden = true;
    }
}

function renderProjectResult(project, fields, resultData) {
    if (!fields) {
        console.warn('renderProjectResult: fields is null');
        return;
    }
    
    const metaParts = [`第 ${resultData.round} 轮`];
    if (resultData.project_name) metaParts.push(`工程：${resultData.project_name}`);
    if (resultData.stage) metaParts.push(`阶段：${resultData.stage}`);
    
    if (fields.resultMeta) {
        fields.resultMeta.textContent = metaParts.join(' · ');
    } else {
        console.warn('renderProjectResult: resultMeta is null');
    }
    
    if (fields.resultBody) {
        fields.resultBody.innerHTML = renderMarkdown(resultData.result);
    } else {
        console.warn('renderProjectResult: resultBody is null');
    }
    
    if (fields.resultCard) {
        fields.resultCard.hidden = false;
    } else {
        console.warn('renderProjectResult: resultCard is null');
    }
}

function saveToProjectHistory(project, data, fields) {
    const item = {
        id: Date.now(),
        time: new Date().toLocaleString(),
        ...data
    };
    project.data.history.unshift(item);
    if (project.data.history.length > 20) project.data.history.pop();
    saveProjects();
    renderProjectHistory(project, fields);
}

function renderProjectHistory(project, fields) {
    const f = fields || getProjectFields(project);
    if (!f) {
        console.warn('renderProjectHistory: fields is null');
        return;
    }
    
    const history = project.data.history;
    
    if (!f.historyCard) {
        console.warn('renderProjectHistory: historyCard is null');
        return;
    }
    
    if (!history.length) {
        f.historyCard.hidden = true;
        return;
    }
    
    f.historyCard.hidden = false;
    
    if (f.historyList) {
        f.historyList.innerHTML = history.map((item) => {
            const snippet = (item.result || '').slice(0, 80).replace(/\n/g, ' ');
            return `
                <div class="history-item" data-id="${item.id}">
                    <div class="history-round">第 ${item.round} 轮 · ${item.time}</div>
                    <div class="history-snippet">${escapeHtml(snippet)}...</div>
                </div>
            `;
        }).join('');
        
        f.historyList.querySelectorAll('.history-item').forEach((el) => {
            el.addEventListener('click', () => {
                const id = parseInt(el.dataset.id);
                const item = history.find((h) => h.id === id);
                if (item) {
                    project.data.currentResult = item;
                    renderProjectResult(project, f, item);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
    } else {
        console.warn('renderProjectHistory: historyList is null');
    }
}

function getProjectFields(project) {
    const contentEl = document.querySelector(`[data-project-id="${project.id}"]`);
    if (!contentEl) return null;
    
    return {
        projectName: contentEl.querySelector('.field-projectName'),
        requirement: contentEl.querySelector('.field-requirement'),
        roundNum: contentEl.querySelector('.field-roundNum'),
        stage: contentEl.querySelector('.field-stage'),
        userAdvice: contentEl.querySelector('.field-userAdvice'),
        currentProcess: contentEl.querySelector('.field-currentProcess'),
        projectPath: contentEl.querySelector('.field-projectPath'),
        port: contentEl.querySelector('.field-port'),
        startupScript: contentEl.querySelector('.field-startupScript'),
        backendScript: contentEl.querySelector('.field-backendScript'),
        frontendScript: contentEl.querySelector('.field-frontendScript'),
        uploadArea: contentEl.querySelector('.field-uploadArea'),
        uploadPlaceholder: contentEl.querySelector('.field-uploadPlaceholder'),
        previewGrid: contentEl.querySelector('.field-previewGrid'),
        fileInput: contentEl.querySelector('.field-fileInput'),
        submitBtn: contentEl.querySelector('.field-submitBtn'),
        runProjectBtn: contentEl.querySelector('.field-runProjectBtn'),
        stopProjectBtn: contentEl.querySelector('.field-stopProjectBtn'),
        resultCard: contentEl.querySelector('.field-resultCard'),
        resultMeta: contentEl.querySelector('.field-resultMeta'),
        resultBody: contentEl.querySelector('.field-resultBody'),
        copyPromptBtn: contentEl.querySelector('.field-copyPromptBtn'),
        newRoundBtn: contentEl.querySelector('.field-newRoundBtn'),
        historyCard: contentEl.querySelector('.field-historyCard'),
        historyList: contentEl.querySelector('.field-historyList'),
        clearHistoryBtn: contentEl.querySelector('.field-clearHistoryBtn')
    };
}

function copyPrompt(project, fields) {
    if (!project.data.currentResult) return;
    const result = project.data.currentResult.result;
    const promptStart = result.indexOf('【下一轮 Prompt】') !== -1
        ? result.indexOf('【下一轮 Prompt】')
        : result.indexOf('下一轮 Prompt');
    
    let prompt = '';
    if (promptStart !== -1) {
        prompt = result.slice(promptStart).replace(/^【下一轮 Prompt】\n?/, '').replace(/^下一轮 Prompt\n?/, '').trim();
    } else {
        prompt = result;
    }
    
    navigator.clipboard.writeText(prompt)
        .then(() => showToast('Prompt 已复制'))
        .catch(() => showToast('复制失败'));
}

async function syncToFeishu(project, fields) {
    if (!project.data.currentResult) {
        showToast('请先提交验收');
        return;
    }

    const originalText = fields.syncFeishuBtn.textContent;
    fields.syncFeishuBtn.textContent = '同步中...';
    fields.syncFeishuBtn.disabled = true;

    try {
        const res = await fetch('/api/sync-feishu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_name: project.data.projectName,
                project_path: project.data.projectPath || '',
                requirement: project.data.requirement,
                round_num: project.data.roundNum,
                stage: project.data.stage,
                result: project.data.currentResult.result,
                files: project.data.files || []
            })
        });

        const data = await res.json();
        
        if (res.ok && data.success) {
            showToast('✅ 已同步到飞书文档');
        } else {
            showToast('❌ 同步失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        showToast('❌ 同步失败: ' + e.message);
    } finally {
        fields.syncFeishuBtn.textContent = originalText;
        fields.syncFeishuBtn.disabled = false;
    }
}

function newRound(project, fields) {
    const data = project.data;
    data.files = [];
    data.currentResult = null;
    data.roundNum = Math.min(99, (data.roundNum || 1) + 1);
    clearImagesForProject(project.id);
    saveProjects();
    
    if (fields) {
        if (fields.previewGrid) fields.previewGrid.innerHTML = '';
        if (fields.uploadPlaceholder) fields.uploadPlaceholder.classList.remove('hidden');
        if (fields.roundNum) fields.roundNum.value = data.roundNum;
        if (fields.resultCard) fields.resultCard.hidden = true;
        updateProjectSubmitState(project, fields);
    } else {
        renderWorkspace();
    }
}

function clearHistory(project, fields) {
    if (confirm('确定清空历史记录？')) {
        project.data.history = [];
        saveProjects();
        renderProjectHistory(project, fields);
        showToast('历史已清空');
    }
}

function renderMarkdown(text) {
    let html = text
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    const lines = html.split('\n');
    const result = [];
    let inList = false;
    
    lines.forEach((line) => {
        if (line.startsWith('<li>')) {
            if (!inList) {
                result.push('<ul>');
                inList = true;
            }
            result.push(line);
        } else {
            if (inList) {
                result.push('</ul>');
                inList = false;
            }
            if (line.trim()) {
                result.push(line);
            }
        }
    });
    if (inList) result.push('</ul>');
    
    return result.join('\n');
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.hidden = false;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.hidden = true;
        }, 300);
    }, 2500);
}

function toggleTestModePanel(show) {
    const panel = document.getElementById('testModePanel');
    if (show) {
        panel.style.display = 'block';
        setTimeout(() => panel.classList.add('show'), 10);
        generateTestScript();
    } else {
        panel.classList.remove('show');
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);
    }
}

function generateTestScript() {
    console.log('=== generateTestScript 开始执行 ===');
    
    const activeProject = getActiveProject();
    console.log('activeProject:', activeProject);
    console.log('activeProject.id:', activeProject?.id);
    console.log('activeProject.data.currentProcess:', activeProject?.data?.currentProcess);
    console.log('activeProject.data.currentProcess 是否为空:', !activeProject?.data?.currentProcess);
    
    if (!activeProject) {
        document.getElementById('testScriptOutput').value = '请先创建项目';
        return;
    }

    // 先从 data 中获取
    let projectName = (activeProject.data?.projectName || '').trim();
    let requirement = (activeProject.data?.requirement || '').trim();
    let stage = (activeProject.data?.stage || '').trim();
    let currentProcess = (activeProject.data?.currentProcess || '').trim();
    
    console.log('从 data 读取:', { projectName, requirement, stage, currentProcess });
    console.log('currentProcess 长度:', currentProcess.length);

    // 尝试从 DOM 中读取
    const contentEl = document.querySelector(`[data-project-id="${activeProject.id}"]`);
    console.log('contentEl:', contentEl);
    
    if (contentEl) {
        const currentProcessEl = contentEl.querySelector('.field-currentProcess');
        console.log('currentProcessEl:', currentProcessEl);
        if (currentProcessEl) {
            const domValue = currentProcessEl.value.trim();
            console.log('从 DOM 读取 currentProcess:', domValue);
            console.log('DOM 值长度:', domValue.length);
            // 如果 DOM 中有值但 data 中没有，用 DOM 的值
            if (domValue && !currentProcess) {
                currentProcess = domValue;
                console.log('使用 DOM 中的 currentProcess 值');
            }
        }
    }

    console.log('最终值:', { projectName, requirement, stage, currentProcess });
    console.log('最终 currentProcess 是否为空:', !currentProcess);

    projectName = projectName || '工程名';
    requirement = requirement || '需求';
    stage = stage || '阶段描述';
    currentProcess = currentProcess || '';

    const escapedProcess = currentProcess.replace(/"/g, '\\"').replace(/\n/g, ' ');
    
    let script = `python3 generate_test_prompt.py \\
    -n "${projectName}" \\
    -f "${requirement}" \\
    -c "${stage}" \\
    -pr "${escapedProcess}"`;

    console.log('✅ 添加了 -pr 参数:', escapedProcess);
    console.log('生成的脚本:', script);
    document.getElementById('testScriptOutput').value = script;
    console.log('=== generateTestScript 结束 ===');
}

function copyTestScript() {
    const script = document.getElementById('testScriptOutput').value;
    if (!script || script.includes('请先创建项目') || script.includes('无法获取项目信息')) {
        showToast('没有可复制的脚本');
        return;
    }

    navigator.clipboard.writeText(script)
        .then(() => showToast('✅ 脚本已复制'))
        .catch(() => showToast('❌ 复制失败'));
}

async function executeTestScript() {
    const activeProject = getActiveProject();
    if (!activeProject) {
        showToast('请先创建项目');
        return;
    }

    const contentEl = document.querySelector(`[data-project-id="${activeProject.id}"]`);
    let projectName = '';
    let requirement = '';
    let stage = '';
    let currentProcess = '';

    if (contentEl) {
        const projectNameEl = contentEl.querySelector('.field-projectName');
        const requirementEl = contentEl.querySelector('.field-requirement');
        const stageEl = contentEl.querySelector('.field-stage');
        const currentProcessEl = contentEl.querySelector('.field-currentProcess');
        
        projectName = (projectNameEl?.value || '').trim();
        requirement = (requirementEl?.value || '').trim();
        stage = (stageEl?.value || '').trim();
        currentProcess = (currentProcessEl?.value || '').trim();
    }

    if (!projectName) projectName = (activeProject.data?.projectName || '').trim();
    if (!requirement) requirement = (activeProject.data?.requirement || '').trim();
    if (!stage) stage = (activeProject.data?.stage || '').trim();
    if (!currentProcess) currentProcess = (activeProject.data?.currentProcess || '').trim();

    if (!projectName || !requirement || !stage) {
        showToast('请填写完整：工程名称、核心需求、阶段描述');
        return;
    }

    const btn = document.getElementById('executeTestScriptBtn');
    if (!btn) {
        console.error('找不到执行脚本按钮');
        showToast('页面元素加载异常，请刷新');
        return;
    }

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '执行中...';

    try {
        console.log('发送请求:', { projectName, requirement, stage, currentProcess });
        
        const res = await fetch('/api/execute-test-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_name: projectName,
                first_round: requirement,
                current_round: stage,
                current_process: currentProcess
            })
        });

        const data = await res.json();
        console.log('响应数据:', data);
        
        if (data.success) {
            try {
                await navigator.clipboard.writeText(data.output);
                showToast('✅ 脚本执行成功，结果已自动复制');
            } catch (clipboardError) {
                console.warn('自动复制失败:', clipboardError);
                showToast('✅ 脚本执行成功（自动复制失败，请检查浏览器权限）');
            }
        } else {
            showToast('❌ 脚本执行失败: ' + (data.error || '未知错误'));
        }
    } catch (e) {
        console.error('请求异常:', e);
        showToast('❌ 请求失败: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

function toggleConfigPanel(show) {
    const panel = document.getElementById('configPanel');
    if (show) {
        panel.style.display = 'block';
        setTimeout(() => panel.classList.add('show'), 10);
    } else {
        panel.classList.remove('show');
        setTimeout(() => {
            panel.style.display = 'none';
            const activeProject = getActiveProject();
            if (activeProject) {
                const fields = getProjectFields(activeProject);
                if (fields && fields.submitBtn) {
                    updateProjectSubmitState(activeProject, fields);
                }
            }
        }, 300);
    }
}

function showTestResult(success, message) {
    const el = document.getElementById('testResult');
    el.style.display = 'block';
    el.className = 'test-result';
    
    if (success === null) {
        el.classList.add('test-loading');
    } else if (success) {
        el.classList.add('test-success');
    } else {
        el.classList.add('test-error');
    }
    
    el.innerHTML = message;
}

async function testConnection() {
    const apiKey = document.getElementById('volcApiKey').value.trim();
    const baseUrl = document.getElementById('volcBaseUrl').value.trim() || 'https://ark.cn-beijing.volces.com/api/v3';
    const model = document.getElementById('volcModel').value.trim();

    if (!apiKey || !baseUrl || !model) {
        showTestResult(false, '请填写 API Key、Base URL 和 模型名称');
        return;
    }

    const btn = document.getElementById('testConfigBtn');
    btn.disabled = true;
    showTestResult(null, '🔄 正在测试连接...');

    try {
        const formData = new FormData();
        formData.append('api_key', apiKey);
        formData.append('base_url', baseUrl);
        formData.append('model', model);

        const res = await fetch('/api/test-model', { method: 'POST', body: formData });
        
        const contentType = res.headers.get('content-type') || '';
        let data = {};
        
        if (contentType.includes('application/json')) {
            data = await res.json().catch(() => ({}));
        } else {
            await res.text();
            throw new Error('后端服务未响应。请确保通过 python server.py 启动 workflow-reviewer 服务（默认端口 8980）。');
        }

        if (!res.ok) {
            let errorMessage = data.error || `HTTP ${res.status}`;
            if (res.status === 401) {
                showTestResult(false, `认证失败: ${errorMessage}<br>💡 请检查 API Key 是否正确`);
            } else if (res.status === 404) {
                showTestResult(false, `未找到: ${errorMessage}<br>💡 请检查模型名称和 Base URL 是否正确<br>💡 确保模型端点已在火山引擎控制台创建`);
            } else {
                showTestResult(false, `错误: ${errorMessage}`);
            }
            return;
        }

        showTestResult(true, `✅ 连接成功！<br>
            <small>响应: ${escapeHtml(data.message || 'OK')}</small>`);
    } catch (error) {
        let errorMsg = error.message;
        if (errorMsg.includes('Unexpected token') || errorMsg.includes('JSON')) {
            errorMsg = '后端服务未响应。请确保通过 python server.py 启动 workflow-reviewer 服务（默认端口 8980）。';
        }
        showTestResult(false, `测试失败: ${errorMsg}`);
    } finally {
        btn.disabled = false;
    }
}

async function saveConfig() {
    const apiKey = document.getElementById('volcApiKey').value.trim();
    const baseUrl = document.getElementById('volcBaseUrl').value.trim() || 'https://ark.cn-beijing.volces.com/api/v3';
    const model = document.getElementById('volcModel').value.trim();
    const systemPrompt = document.getElementById('systemPrompt').value;
    const userPromptTemplate = document.getElementById('userPromptTemplate').value;

    if (!apiKey || !baseUrl || !model) {
        showToast('请填写完整的模型配置信息');
        return false;
    }

    const formData = new FormData();
    formData.append('api_key', apiKey);
    formData.append('base_url', baseUrl);
    formData.append('model', model);
    formData.append('system_prompt', systemPrompt);
    formData.append('user_prompt_template', userPromptTemplate);

    try {
        const res = await fetch('/api/config', { method: 'POST', body: formData });
        
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            await res.text();
            throw new Error('后端服务未响应。请确保通过 python server.py 启动 workflow-reviewer 服务（默认端口 8980）。');
        }
        
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || '保存失败');
        }

        globalConfig = { apiKey, baseUrl, model, systemPrompt, userPromptTemplate };
        saveGlobalConfig();
        showToast('配置已保存');
        toggleConfigPanel(false);

        const activeProject = getActiveProject();
        if (activeProject) {
            const fields = getProjectFields(activeProject);
            if (fields && fields.submitBtn) {
                updateProjectSubmitState(activeProject, fields);
            } else {
                renderWorkspace();
            }
        }

        return true;
    } catch (e) {
        let errorMsg = e.message || '保存失败';
        if (errorMsg.includes('Unexpected token') || errorMsg.includes('JSON')) {
            errorMsg = '后端服务未响应。请确保通过 python server.py 启动 workflow-reviewer 服务（默认端口 8980）。';
        }
        showToast(errorMsg);
        return false;
    }
}

function resetPrompts() {
    document.getElementById('systemPrompt').value = DEFAULT_SYSTEM_PROMPT;
    document.getElementById('userPromptTemplate').value = DEFAULT_USER_PROMPT_TEMPLATE;
    showToast('已重置为默认提示词');
}

function forceClearAllData() {
    if (!confirm('确定清除所有数据？这将删除所有项目和截图，无法恢复！')) return;
    try {
        localStorage.removeItem(PROJECTS_KEY);
        localStorage.removeItem(ACTIVE_PROJECT_KEY);
        indexedDB.deleteDatabase(IMAGE_STORE_DB);
        showToast('已清除所有数据，页面即将刷新...');
        setTimeout(() => location.reload(), 1000);
    } catch (e) {
        console.error('清除失败:', e);
        showToast('清除失败: ' + e.message);
    }
}

function saveCurrentProject() {
    const project = getActiveProject();
    if (!project) {
        showToast('没有活动项目');
        return;
    }
    
    const contentEl = document.querySelector(`[data-project-id="${project.id}"]`);
    if (contentEl) {
        const projectNameEl = contentEl.querySelector('.field-projectName');
        const requirementEl = contentEl.querySelector('.field-requirement');
        const roundNumEl = contentEl.querySelector('.field-roundNum');
        const stageEl = contentEl.querySelector('.field-stage');
        const userAdviceEl = contentEl.querySelector('.field-userAdvice');
        const projectPathEl = contentEl.querySelector('.field-projectPath');
        const portEl = contentEl.querySelector('.field-port');
        const startupScriptEl = contentEl.querySelector('.field-startupScript');
        const backendScriptEl = contentEl.querySelector('.field-backendScript');
        const frontendScriptEl = contentEl.querySelector('.field-frontendScript');

        if (projectNameEl) {
            project.name = projectNameEl.value.trim() || '新项目';
            project.data.projectName = projectNameEl.value;
        }
        if (requirementEl) project.data.requirement = requirementEl.value;
        if (roundNumEl) project.data.roundNum = parseInt(roundNumEl.value) || 1;
        if (stageEl) project.data.stage = stageEl.value;
        if (userAdviceEl) project.data.userAdvice = userAdviceEl.value;
        if (projectPathEl) project.data.projectPath = projectPathEl.value;
        if (portEl) project.data.port = parseInt(portEl.value) || 8980;
        if (startupScriptEl) project.data.startupScript = startupScriptEl.value;
        if (backendScriptEl) project.data.backendScript = backendScriptEl.value;
        if (frontendScriptEl) project.data.frontendScript = frontendScriptEl.value;
        project.data.lastUpdated = Date.now();
    }
    
    saveProjects();
    saveImagesForProject(project.id, project.data.files);
    renderTabs();
    showToast('已保存当前项目');
}

async function initGlobalUI() {
    await loadBackendConfig();

    const savedApiKey = globalConfig.apiKey;
    document.getElementById('volcApiKey').value = (savedApiKey && savedApiKey !== '********') ? savedApiKey : '';
    document.getElementById('volcBaseUrl').value = globalConfig.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
    document.getElementById('volcModel').value = globalConfig.model || '';
    document.getElementById('systemPrompt').value = globalConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    document.getElementById('userPromptTemplate').value = globalConfig.userPromptTemplate || DEFAULT_USER_PROMPT_TEMPLATE;

    document.getElementById('configBtn').addEventListener('click', () => toggleConfigPanel(true));
    document.getElementById('closeConfigBtn').addEventListener('click', () => toggleConfigPanel(false));
    document.getElementById('testConfigBtn').addEventListener('click', testConnection);
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);
    document.getElementById('resetPromptsBtn').addEventListener('click', resetPrompts);
    document.getElementById('saveDataBtn').addEventListener('click', saveCurrentProject);
    document.getElementById('clearDataBtn').addEventListener('click', forceClearAllData);
    
    document.getElementById('testModeBtn').addEventListener('click', () => toggleTestModePanel(true));
    document.getElementById('closeTestModeBtn').addEventListener('click', () => toggleTestModePanel(false));
    document.getElementById('copyTestScriptBtn').addEventListener('click', copyTestScript);
    document.getElementById('regenerateTestScriptBtn').addEventListener('click', generateTestScript);
    document.getElementById('executeTestScriptBtn').addEventListener('click', executeTestScript);
    
    ['volcApiKey', 'volcBaseUrl', 'volcModel'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            const activeProject = getActiveProject();
            if (activeProject) {
                const fields = getProjectFields(activeProject);
                if (fields && fields.submitBtn) {
                    updateProjectSubmitState(activeProject, fields);
                }
            }
        });
    });

    document.getElementById('newTabBtn').addEventListener('click', () => {
        const activeProject = getActiveProject();
        if (activeProject) {
            saveProjectState(activeProject);
        }
        createNewProject();
        renderTabs();
        renderWorkspace();
    });

    document.addEventListener('paste', handlePaste);
    document.addEventListener('click', (e) => {
        const isUploadArea = e.target.closest('.field-uploadArea');
        if (!isUploadArea) {
            deactivateScreenshotArea();
        }
    });
}

let screenshotAreaActive = false;
let activeScreenshotFields = null;

function handlePaste(e) {
    if (!screenshotAreaActive || !activeScreenshotFields) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    let imageFile = null;
    for (const item of items) {
        if (item.type.startsWith('image/')) {
            imageFile = item.getAsFile();
            break;
        }
    }

    if (!imageFile) return;

    e.preventDefault();

    const activeProject = getActiveProject();
    if (!activeProject) {
        showToast('请先选择项目');
        return;
    }

    handleFiles(activeProject, activeScreenshotFields, { target: { files: [imageFile] } });
    showToast('已粘贴截图');
    deactivateScreenshotArea();
}

function activateScreenshotArea(fields) {
    deactivateScreenshotArea();
    screenshotAreaActive = true;
    activeScreenshotFields = fields;
    if (fields.uploadArea) {
        fields.uploadArea.classList.add('paste-active');
    }
}

function deactivateScreenshotArea() {
    if (activeScreenshotFields && activeScreenshotFields.uploadArea) {
        activeScreenshotFields.uploadArea.classList.remove('paste-active');
    }
    screenshotAreaActive = false;
    activeScreenshotFields = null;
}

let runningProcess = null;

async function runProject(project, fields) {
    const projectName = fields.projectName.value.trim();
    const projectPath = fields.projectPath.value.trim() || '/Users/liboyang/trae/dailyTools';
    const port = parseInt(fields.port.value) || 8980;
    const startupScript = fields.startupScript?.value.trim() || '';
    const backendScript = fields.backendScript?.value.trim() || '';
    const frontendScript = fields.frontendScript?.value.trim() || '';
    
    if (!projectName) {
        showToast('请先输入工程名称');
        return;
    }

    const runStatus = document.getElementById('runStatus');
    const runOutput = document.getElementById('runOutput');
    
    runStatus.hidden = false;
    runStatus.className = 'run-status run-running';
    runStatus.innerHTML = '🔄 正在启动项目...';
    runOutput.hidden = false;
    runOutput.innerHTML = '';

    fields.runProjectBtn.disabled = true;
    fields.stopProjectBtn.disabled = false;

    try {
        const res = await fetch('/api/run-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                project_name: projectName, 
                project_path: projectPath,
                port: port,
                startup_script: startupScript,
                backend_script: backendScript,
                frontend_script: frontendScript
            })
        });

        const contentType = res.headers.get('content-type') || '';
        let data = {};
        
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const text = await res.text();
            console.error('服务器返回了非 JSON 响应:', text.substring(0, 200));
            throw new Error(`后端服务异常 (HTTP ${res.status})。请确保通过 python server.py 启动 workflow-reviewer 服务。`);
        }
        
        if (res.ok) {
            runStatus.className = 'run-status run-success';
            runStatus.innerHTML = `✅ 项目启动成功！<br>端口: ${data.port}`;
            runOutput.innerHTML = `<pre>${data.output}</pre>`;
            runningProcess = { projectId: project.id, port: data.port };
        } else {
            runStatus.className = 'run-status run-error';
            runStatus.innerHTML = `❌ 启动失败: ${data.error}`;
            runOutput.innerHTML = `<pre>${data.output || ''}</pre>`;
            fields.runProjectBtn.disabled = false;
            fields.stopProjectBtn.disabled = true;
        }
    } catch (error) {
        runStatus.className = 'run-status run-error';
        let errorMsg = error.message;
        if (errorMsg.includes('Unexpected token') || errorMsg.includes('JSON')) {
            errorMsg = '后端服务未响应。请确保通过 python server.py 启动 workflow-reviewer 服务（默认端口 8980）。';
        }
        runStatus.innerHTML = `❌ 请求失败: ${errorMsg}`;
        fields.runProjectBtn.disabled = false;
        fields.stopProjectBtn.disabled = true;
    }
}

async function stopProject(project, fields) {
    const runStatus = document.getElementById('runStatus');
    const runOutput = document.getElementById('runOutput');
    
    runStatus.className = 'run-status run-running';
    runStatus.innerHTML = '⏹️ 正在停止项目...';

    try {
        const res = await fetch('/api/stop-project', { method: 'POST' });
        const contentType = res.headers.get('content-type') || '';
        let data = {};
        
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            await res.text();
            throw new Error('后端服务未响应。请确保通过 python server.py 启动 workflow-reviewer 服务。');
        }

        if (res.ok) {
            runStatus.className = 'run-status run-success';
            runStatus.innerHTML = '✅ 项目已停止';
        } else {
            runStatus.className = 'run-status run-error';
            runStatus.innerHTML = `❌ 停止失败: ${data.error}`;
        }
    } catch (error) {
        runStatus.className = 'run-status run-error';
        let errorMsg = error.message;
        if (errorMsg.includes('Unexpected token') || errorMsg.includes('JSON')) {
            errorMsg = '后端服务未响应。请确保通过 python server.py 启动 workflow-reviewer 服务（默认端口 8980）。';
        }
        runStatus.innerHTML = `❌ 请求失败: ${errorMsg}`;
    }

    runningProcess = null;
    fields.runProjectBtn.disabled = false;
    fields.stopProjectBtn.disabled = true;
}

document.addEventListener('DOMContentLoaded', async () => {
    loadGlobalConfig();
    await loadProjects();
    await loadBackendConfig();
    await initGlobalUI();
    renderTabs();
    renderWorkspace();
});
