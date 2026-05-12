const elements = {
    projectName: document.getElementById('projectName'),
    requirement: document.getElementById('requirement'),
    roundNum: document.getElementById('roundNum'),
    stage: document.getElementById('stage'),
    uploadArea: document.getElementById('uploadArea'),
    uploadPlaceholder: document.getElementById('uploadPlaceholder'),
    previewGrid: document.getElementById('previewGrid'),
    fileInput: document.getElementById('fileInput'),
    submitBtn: document.getElementById('submitBtn'),
    btnText: document.querySelector('.btn-text'),
    btnLoading: document.querySelector('.btn-loading'),
    resultCard: document.getElementById('resultCard'),
    resultMeta: document.getElementById('resultMeta'),
    resultBody: document.getElementById('resultBody'),
    historyCard: document.getElementById('historyCard'),
    historyList: document.getElementById('historyList'),
    toast: document.getElementById('toast'),
    copyPromptBtn: document.getElementById('copyPromptBtn'),
    newRoundBtn: document.getElementById('newRoundBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
};

const state = {
    files: [],
    currentResult: null,
};

const HISTORY_KEY = 'workflow_reviewer_history';
const MAX_HISTORY = 20;

elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', handleFiles);
elements.uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
});
elements.uploadArea.addEventListener('dragleave', () => {
    elements.uploadArea.classList.remove('dragover');
});
elements.uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        handleFiles({ target: { files: e.dataTransfer.files } });
    }
});

document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
                imageFiles.push(file);
            }
        }
    }
    if (imageFiles.length) {
        e.preventDefault();
        handleFiles({ target: { files: imageFiles } });
    }
});

[elements.projectName, elements.requirement, elements.roundNum].forEach((el) => {
    el.addEventListener('input', updateSubmitState);
});

elements.submitBtn.addEventListener('click', submitVerify);
elements.copyPromptBtn.addEventListener('click', copyPrompt);
elements.newRoundBtn.addEventListener('click', newRound);
elements.clearHistoryBtn.addEventListener('click', clearHistory);

function handleFiles(e) {
    const newFiles = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
    if (!newFiles.length) {
        showToast('请选择图片文件');
        return;
    }
    state.files = [...state.files, ...newFiles];
    renderPreviews();
    updateSubmitState();
    elements.fileInput.value = '';
}

function renderPreviews() {
    elements.previewGrid.innerHTML = '';
    state.files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const item = document.createElement('div');
            item.className = 'preview-item';
            item.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button class="remove-btn" data-index="${index}">&times;</button>
            `;
            item.querySelector('.remove-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.currentTarget.dataset.index);
                state.files.splice(idx, 1);
                renderPreviews();
                updateSubmitState();
            });
            elements.previewGrid.appendChild(item);
        };
        reader.readAsDataURL(file);
    });
    elements.uploadPlaceholder.classList.toggle('hidden', state.files.length > 0);
}

function updateSubmitState() {
    const hasRequirement = elements.requirement.value.trim().length > 0;
    const hasFiles = state.files.length > 0;
    elements.submitBtn.disabled = !(hasRequirement && hasFiles);
}

async function submitVerify() {
    const formData = new FormData();
    formData.append('project_name', elements.projectName.value.trim());
    formData.append('requirement', elements.requirement.value.trim());
    formData.append('round_num', parseInt(elements.roundNum.value) || 1);
    formData.append('stage', elements.stage.value.trim());
    state.files.forEach((f) => formData.append('screenshots', f));

    setLoading(true);
    try {
        const res = await fetch('/api/verify', { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `请求失败 (${res.status})`);
        }
        const data = await res.json();
        state.currentResult = data;
        renderResult(data);
        saveToHistory(data);
        elements.resultCard.hidden = false;
        showToast('验收完成');
    } catch (e) {
        console.error(e);
        showToast(e.message || '提交失败，请重试');
    } finally {
        setLoading(false);
    }
}

function renderResult(data) {
    const metaParts = [`第 ${data.round} 轮`];
    if (data.project_name) metaParts.push(`工程：${data.project_name}`);
    if (data.stage) metaParts.push(`阶段：${data.stage}`);
    elements.resultMeta.textContent = metaParts.join(' · ');

    elements.resultBody.innerHTML = renderMarkdown(data.result);
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

function setLoading(loading) {
    elements.submitBtn.disabled = loading;
    elements.btnText.hidden = loading;
    elements.btnLoading.hidden = !loading;
}

function showToast(msg) {
    elements.toast.textContent = msg;
    elements.toast.hidden = false;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
        setTimeout(() => {
            elements.toast.hidden = true;
        }, 300);
    }, 2000);
}

function copyPrompt() {
    if (!state.currentResult) return;
    const result = state.currentResult.result;
    const promptStart = result.indexOf('【下一轮 Prompt】') !== -1
        ? result.indexOf('【下一轮 Prompt】')
        : result.indexOf('下一轮 Prompt');

    let prompt = '';
    if (promptStart !== -1) {
        prompt = result.slice(promptStart).replace(/^【下一轮 Prompt】\n?/, '').replace(/^下一轮 Prompt\n?/, '').trim();
    } else {
        prompt = result;
    }

    navigator.clipboard
        .writeText(prompt)
        .then(() => showToast('Prompt 已复制'))
        .catch(() => showToast('复制失败'));
}

function newRound() {
    state.files = [];
    state.currentResult = null;
    elements.previewGrid.innerHTML = '';
    elements.uploadPlaceholder.classList.remove('hidden');
    elements.roundNum.value = Math.min(99, (parseInt(elements.roundNum.value) || 1) + 1);
    elements.requirement.value = elements.requirement.value.includes('需求同前')
        ? elements.requirement.value
        : elements.requirement.value ? '需求同前' : '';
    elements.resultCard.hidden = true;
    updateSubmitState();
}

function saveToHistory(data) {
    const history = getHistory();
    const item = {
        id: Date.now(),
        time: new Date().toLocaleString(),
        ...data,
    };
    history.unshift(item);
    if (history.length > MAX_HISTORY) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
}

function renderHistory() {
    const history = getHistory();
    if (!history.length) {
        elements.historyCard.hidden = true;
        return;
    }
    elements.historyCard.hidden = false;
    elements.historyList.innerHTML = history
        .map((item) => {
            const snippet = (item.result || '').slice(0, 80).replace(/\n/g, ' ');
            return `
                <div class="history-item" data-id="${item.id}">
                    <div class="history-round">第 ${item.round} 轮 · ${item.time}</div>
                    <div class="history-snippet">${escapeHtml(snippet)}...</div>
                </div>
            `;
        })
        .join('');

    elements.historyList.querySelectorAll('.history-item').forEach((el) => {
        el.addEventListener('click', () => {
            const id = parseInt(el.dataset.id);
            const history = getHistory();
            const item = history.find((h) => h.id === id);
            if (item) {
                state.currentResult = item;
                renderResult(item);
                elements.resultCard.hidden = false;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    });
}

function clearHistory() {
    if (confirm('确定清空历史记录？')) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
        showToast('历史已清空');
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

renderHistory();
updateSubmitState();
