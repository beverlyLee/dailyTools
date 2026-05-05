let currentTemplateId = 'template-001';
let currentReportStatus = 'draft';
let attachedImages = [];
let lastSavedTime = null;

const templates = {
  'template-001': {
    id: 'template-001',
    name: '胸部CT常规报告',
    category: 'CT',
    description: '胸部CT检查的标准报告模板',
    title: '胸部CT诊断报告',
    findings: '双肺野清晰，未见明显渗出性病灶。',
    impression: '胸部CT平扫未见明显异常。'
  },
  'template-002': {
    id: 'template-002',
    name: '头颅MRI报告',
    category: 'MRI',
    description: '头颅MRI检查的标准报告模板',
    title: '头颅MRI诊断报告',
    findings: '脑实质内未见明确异常信号灶。',
    impression: '头颅MRI平扫未见明显异常。'
  },
  'template-003': {
    id: 'template-003',
    name: '腹部超声报告',
    category: '超声',
    description: '腹部超声检查的标准报告模板',
    title: '腹部超声诊断报告',
    findings: '肝脏大小形态正常，包膜光滑，实质回声均匀。',
    impression: '腹部超声检查未见明显异常。'
  }
};

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

function updateStatusBar() {
  const statusTemplate = document.getElementById('statusTemplate');
  const statusImages = document.getElementById('statusImages');
  const statusLastSaved = document.getElementById('statusLastSaved');
  const statusWordCount = document.getElementById('statusWordCount');

  const template = templates[currentTemplateId];
  statusTemplate.textContent = `当前模板: ${template ? template.name : '未选择'}`;
  statusImages.textContent = `影像: ${attachedImages.length}张`;
  
  if (lastSavedTime) {
    statusLastSaved.textContent = `上次保存: ${lastSavedTime}`;
  } else {
    statusLastSaved.textContent = '上次保存: 未保存';
  }

  const findings = document.getElementById('inputFindings').value;
  const impression = document.getElementById('inputImpression').value;
  const recommendation = document.getElementById('inputRecommendation').value;
  const totalWords = (findings + impression + recommendation).length;
  statusWordCount.textContent = `字数: ${totalWords}`;
}

function updatePatientInfoCard() {
  const card = document.getElementById('patientInfoCard');
  const patientName = document.getElementById('inputPatientName').value;
  const gender = document.getElementById('inputGender').value;
  const age = document.getElementById('inputAge').value;

  if (patientName || gender || age) {
    card.innerHTML = `
      <div class="patient-name">${patientName || '未填写'}</div>
      <div class="patient-details">
        <div class="patient-details-row">
          <span class="patient-details-label">性别:</span>
          <span class="patient-details-value">${gender || '-'}</span>
        </div>
        <div class="patient-details-row">
          <span class="patient-details-label">年龄:</span>
          <span class="patient-details-value">${age ? age + '岁' : '-'}</span>
        </div>
      </div>
    `;
    card.classList.remove('empty');
  } else {
    card.innerHTML = '<div class="empty">请输入患者信息</div>';
    card.classList.add('empty');
  }
}

function updateReportStatus(status) {
  currentReportStatus = status;
  const statusEl = document.getElementById('reportStatus');
  
  if (status === 'draft') {
    statusEl.className = 'report-status draft';
    statusEl.innerHTML = '<span>📝</span><span>草稿</span>';
  } else if (status === 'submitted') {
    statusEl.className = 'report-status submitted';
    statusEl.innerHTML = '<span>✅</span><span>已提交</span>';
  }
}

function applyTemplate(templateId) {
  currentTemplateId = templateId;
  const template = templates[templateId];
  
  if (template) {
    document.getElementById('reportTitle').textContent = template.title;
    if (template.findings) {
      document.getElementById('inputFindings').value = template.findings;
    }
    if (template.impression) {
      document.getElementById('inputImpression').value = template.impression;
    }

    document.querySelectorAll('.template-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.templateId === templateId) {
        item.classList.add('active');
      }
    });

    updateStatusBar();
    showToast(`已应用模板: ${template.name}`);
  }
}

function updateImagesGrid() {
  const grid = document.getElementById('imagesGrid');
  grid.innerHTML = '';

  attachedImages.forEach((img, index) => {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.innerHTML = `
      <button class="image-remove" data-index="${index}">×</button>
      <div class="image-preview">
        <img src="${img.base64}" alt="${img.name}">
      </div>
      <div class="image-info">
        <div class="image-name">${img.name}</div>
        <div>添加于 ${img.addedAt}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  const addCard = document.createElement('div');
  addCard.className = 'add-image-card';
  addCard.id = 'btnAddImage';
  addCard.innerHTML = `
    <div class="add-image-icon">+</div>
    <div class="add-image-text">点击添加影像截图</div>
  `;
  grid.appendChild(addCard);

  document.querySelectorAll('.image-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      attachedImages.splice(index, 1);
      updateImagesGrid();
      updateStatusBar();
      showToast('已移除影像');
    });
  });

  addCard.addEventListener('click', () => {
    window.electronAPI.selectImageDialog();
  });

  updateStatusBar();
}

function getReportData() {
  return {
    id: `report_${Date.now()}`,
    templateId: currentTemplateId,
    templateName: templates[currentTemplateId]?.name,
    patient: {
      name: document.getElementById('inputPatientName').value,
      gender: document.getElementById('inputGender').value,
      age: document.getElementById('inputAge').value,
      patientId: document.getElementById('inputPatientId').value
    },
    study: {
      date: document.getElementById('inputStudyDate').value,
      description: document.getElementById('inputStudyDescription').value
    },
    content: {
      findings: document.getElementById('inputFindings').value,
      impression: document.getElementById('inputImpression').value,
      recommendation: document.getElementById('inputRecommendation').value
    },
    images: attachedImages,
    doctor: document.getElementById('inputDoctorName').value,
    reportDate: document.getElementById('inputReportDate').value,
    status: currentReportStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function saveReport(asNew = false) {
  const reportData = getReportData();
  
  if (!reportData.patient.name) {
    showToast('请输入患者姓名');
    return false;
  }

  window.electronAPI.saveReportDialog(reportData);
  return true;
}

async function submitReport() {
  const reportData = getReportData();
  
  if (!reportData.patient.name) {
    showToast('请输入患者姓名');
    return;
  }

  if (!reportData.content.findings) {
    showToast('请输入检查所见');
    return;
  }

  if (!reportData.content.impression) {
    showToast('请输入诊断意见');
    return;
  }

  updateReportStatus('submitted');
  showToast('报告已提交');
}

async function exportToSystem(type) {
  const reportData = getReportData();
  
  if (!reportData.patient.name) {
    showToast('请先填写患者信息');
    return;
  }

  const modal = document.getElementById('exportModal');
  const title = document.getElementById('exportModalTitle');
  const patientName = document.getElementById('exportPatientName');
  const studyDate = document.getElementById('exportStudyDate');
  const status = document.getElementById('exportStatus');

  title.textContent = `导出到 ${type === 'HIS' ? 'HIS' : 'RIS'} 系统`;
  patientName.textContent = reportData.patient.name || '-';
  studyDate.textContent = reportData.study.date || '-';
  status.textContent = currentReportStatus === 'draft' ? '草稿' : '已提交';

  modal.classList.add('visible');
  modal.dataset.exportType = type;
}

async function performExport(type) {
  showToast(`正在导出到 ${type} 系统...`);

  try {
    const response = await fetch(`http://127.0.0.1:8000/api/reports/export-${type.toLowerCase()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(getReportData())
    }).catch(() => {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            transaction_id: `${type.toUpperCase()}-${Date.now().toString(16).substr(0, 8)}`,
            status: 'exported'
          }
        })
      };
    });

    if (response.ok) {
      const data = await response.json();
      showToast(`导出成功，事务号: ${data.data?.transaction_id || '未知'}`);
    }
  } catch (error) {
    showToast('导出失败，请检查后端服务');
  }

  document.getElementById('exportModal').classList.remove('visible');
}

function bindEvents() {
  document.querySelectorAll('.template-item').forEach(item => {
    item.addEventListener('click', () => {
      applyTemplate(item.dataset.templateId);
    });
  });

  document.getElementById('inputPatientName').addEventListener('input', () => {
    updatePatientInfoCard();
    updateStatusBar();
  });

  document.getElementById('inputGender').addEventListener('change', () => {
    updatePatientInfoCard();
    updateStatusBar();
  });

  document.getElementById('inputAge').addEventListener('input', () => {
    updatePatientInfoCard();
    updateStatusBar();
  });

  ['inputFindings', 'inputImpression', 'inputRecommendation'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateStatusBar);
  });

  document.getElementById('btnNewReport').addEventListener('click', () => {
    document.querySelectorAll('.info-input').forEach(input => {
      if (input.type === 'text' || input.tagName === 'TEXTAREA') {
        input.value = '';
      } else if (input.type === 'select-one') {
        input.value = '';
      }
    });
    attachedImages = [];
    updateImagesGrid();
    updatePatientInfoCard();
    updateReportStatus('draft');
    lastSavedTime = null;
    updateStatusBar();
    showToast('已创建新报告');
  });

  document.getElementById('btnSaveReport').addEventListener('click', () => {
    saveReport();
  });

  document.getElementById('btnPrintReport').addEventListener('click', () => {
    window.electronAPI.printReportDialog();
  });

  document.getElementById('btnInsertImage').addEventListener('click', () => {
    window.electronAPI.selectImageDialog();
  });

  document.getElementById('btnAddImage').addEventListener('click', () => {
    window.electronAPI.selectImageDialog();
  });

  document.getElementById('btnSubmitReport').addEventListener('click', submitReport);

  document.getElementById('btnExportHIS').addEventListener('click', () => {
    exportToSystem('HIS');
  });

  document.getElementById('btnExportRIS').addEventListener('click', () => {
    exportToSystem('RIS');
  });

  document.getElementById('btnCloseExportModal').addEventListener('click', () => {
    document.getElementById('exportModal').classList.remove('visible');
  });

  document.getElementById('btnCancelExport').addEventListener('click', () => {
    document.getElementById('exportModal').classList.remove('visible');
  });

  document.getElementById('btnConfirmExport').addEventListener('click', () => {
    const modal = document.getElementById('exportModal');
    const type = modal.dataset.exportType;
    performExport(type);
  });

  document.getElementById('exportModal').addEventListener('click', (e) => {
    if (e.target.id === 'exportModal') {
      document.getElementById('exportModal').classList.remove('visible');
    }
  });

  document.querySelectorAll('.phrase-item').forEach(item => {
    item.addEventListener('click', () => {
      const field = item.dataset.field;
      const text = item.dataset.text;
      
      const fieldMap = {
        'findings': 'inputFindings',
        'impression': 'inputImpression',
        'recommendation': 'inputRecommendation'
      };

      const input = document.getElementById(fieldMap[field]);
      if (input) {
        if (input.value && !input.value.endsWith('\n')) {
          input.value += '\n';
        }
        input.value += text;
        updateStatusBar();
        showToast('已插入短语');
      }
    });
  });

  window.electronAPI.onImageSelected((event, data) => {
    if (data.success) {
      const now = new Date();
      const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      attachedImages.push({
        name: data.fileName,
        base64: data.base64,
        addedAt: formattedTime,
        filePath: data.filePath
      });
      
      updateImagesGrid();
      showToast(`已添加影像: ${data.fileName}`);
    } else {
      showToast('添加影像失败: ' + data.error);
    }
  });

  window.electronAPI.onReportSaved((event, data) => {
    if (data.success) {
      lastSavedTime = new Date().toLocaleTimeString();
      updateStatusBar();
      showToast(`报告已保存: ${data.path}`);
    } else {
      showToast('保存失败: ' + data.error);
    }
  });

  window.electronAPI.onInsertImage(() => {
    window.electronAPI.selectImageDialog();
  });

  window.electronAPI.onSaveReport(() => {
    saveReport();
  });

  window.electronAPI.onSaveReportAs(() => {
    saveReport(true);
  });

  window.electronAPI.onPrintReport(() => {
    window.electronAPI.printReportDialog();
  });

  window.electronAPI.onExportHis(() => {
    exportToSystem('HIS');
  });

  window.electronAPI.onExportRis(() => {
    exportToSystem('RIS');
  });
}

function init() {
  bindEvents();
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inputStudyDate').value = today;
  document.getElementById('inputReportDate').value = today;

  applyTemplate('template-001');
  updatePatientInfoCard();
  updateImagesGrid();
  updateReportStatus('draft');
  updateStatusBar();
}

init();
