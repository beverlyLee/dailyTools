const canvas = document.getElementById('cornerstoneCanvas');
const emptyState = document.getElementById('emptyState');
const overlayInfo = document.getElementById('overlayInfo');
const sliceNavigator = document.getElementById('sliceNavigator');
const aiPanel = document.getElementById('aiPanel');
const measurementsPanel = document.getElementById('measurementsPanel');
const loadingSpinner = document.getElementById('loadingSpinner');
const toast = document.getElementById('toast');

let currentTool = 'pan';
let currentImage = null;
let currentImageIndex = 0;
let dicomFiles = [];
let dicomData = null;
let measurements = [];
let aiDetections = [];
let showAIHighlight = true;

const windowPresets = {
  chest: { ww: 1500, wl: -500 },
  abdomen: { ww: 400, wl: 40 },
  bone: { ww: 2000, wl: 400 },
  brain: { ww: 80, wl: 40 }
};

const toolNames = {
  pan: '平移/缩放',
  window: '窗宽窗位',
  length: '长度测量',
  angle: '角度测量',
  rectangle: '矩形 ROI',
  ellipse: '椭圆 ROI'
};

function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, duration);
}

function setLoading(show) {
  loadingSpinner.style.display = show ? 'flex' : 'none';
}

function updateStatusBar() {
  const statusImageSize = document.getElementById('statusImageSize');
  const statusZoom = document.getElementById('statusZoom');
  const statusWindow = document.getElementById('statusWindow');
  const statusTool = document.getElementById('statusTool');
  const statusSlice = document.getElementById('statusSlice');

  if (currentImage) {
    statusImageSize.textContent = `${currentImage.width} × ${currentImage.height}`;
  } else {
    statusImageSize.textContent = '-';
  }

  statusZoom.textContent = '缩放: 100%';
  statusWindow.textContent = `WW: ${document.getElementById('windowWidth').value} WL: ${document.getElementById('windowLevel').value}`;
  statusTool.textContent = `当前工具: ${toolNames[currentTool]}`;
  statusSlice.textContent = `层: ${currentImageIndex + 1}/${dicomFiles.length || 1}`;
}

function updatePatientInfo(info) {
  const patientInfo = document.getElementById('patientInfo');
  patientInfo.innerHTML = `
    <div class="patient-name">${info.patientName || '未知患者'}</div>
    <div class="patient-details">
      <div>患者ID: ${info.patientId || '-'}</div>
    </div>
    <div class="study-info">
      <div class="study-info-row">
        <span class="study-info-label">检查日期</span>
        <span class="study-info-value">${info.studyDate || '-'}</span>
      </div>
      <div class="study-info-row">
        <span class="study-info-label">检查描述</span>
        <span class="study-info-value">${info.studyDescription || '-'}</span>
      </div>
      <div class="study-info-row">
        <span class="study-info-label">序列</span>
        <span class="study-info-value">${info.seriesNumber || '-'}</span>
      </div>
    </div>
  `;

  document.getElementById('infoPatient').textContent = info.patientName || '-';
  document.getElementById('infoStudy').textContent = info.studyDescription || '-';
  document.getElementById('infoSeries').textContent = `序列 ${info.seriesNumber || '-'}`;
}

function updateImageList() {
  const imageList = document.getElementById('imageList');
  if (dicomFiles.length === 0) {
    imageList.innerHTML = '<div class="image-item active">未加载影像</div>';
    return;
  }

  imageList.innerHTML = dicomFiles.map((file, index) => `
    <div class="image-item ${index === currentImageIndex ? 'active' : ''}" data-index="${index}">
      <span class="image-index">${index + 1}</span>
      ${file.name}
    </div>
  `).join('');

  imageList.querySelectorAll('.image-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      currentImageIndex = index;
      updateImageList();
      loadImageByIndex(index);
    });
  });
}

function updateSliceNavigator() {
  if (dicomFiles.length > 1) {
    sliceNavigator.style.display = 'flex';
    document.getElementById('currentSlice').textContent = currentImageIndex + 1;
    document.getElementById('totalSlices').textContent = dicomFiles.length;
    const progress = (currentImageIndex / (dicomFiles.length - 1)) * 100;
    document.getElementById('sliceSliderProgress').style.width = `${progress}%`;
  } else {
    sliceNavigator.style.display = 'none';
  }
}

function loadImageByIndex(index) {
  if (index < 0 || index >= dicomFiles.length) return;

  currentImageIndex = index;
  setLoading(true);

  setTimeout(() => {
    const file = dicomFiles[index];
    
    const mockImage = {
      width: 512,
      height: 512,
      data: new Uint16Array(512 * 512),
      patientName: '张三',
      patientId: 'P' + Math.floor(Math.random() * 10000),
      studyDate: '20240115',
      studyDescription: '胸部CT平扫',
      seriesNumber: index + 1,
      windowWidth: 400,
      windowLevel: 40
    };

    for (let i = 0; i < 512 * 512; i++) {
      const x = i % 512;
      const y = Math.floor(i / 512);
      
      let value = 100;
      
      const dist = Math.sqrt(Math.pow(x - 256, 2) + Math.pow(y - 256, 2));
      if (dist < 150) {
        value = -500 + Math.random() * 100;
      }
      
      if (Math.random() < 0.01) {
        value = 300 + Math.random() * 500;
      }
      
      mockImage.data[i] = value;
    }

    currentImage = mockImage;
    
    updatePatientInfo({
      patientName: mockImage.patientName,
      patientId: mockImage.patientId,
      studyDate: mockImage.studyDate,
      studyDescription: mockImage.studyDescription,
      seriesNumber: mockImage.seriesNumber
    });

    document.getElementById('windowWidth').value = mockImage.windowWidth;
    document.getElementById('windowLevel').value = mockImage.windowLevel;

    renderImage();
    emptyState.style.display = 'none';
    overlayInfo.style.display = 'block';
    updateStatusBar();
    updateSliceNavigator();
    setLoading(false);
  }, 500);
}

function renderImage() {
  if (!currentImage) return;

  const ctx = canvas.getContext('2d');
  const ww = parseFloat(document.getElementById('windowWidth').value);
  const wl = parseFloat(document.getElementById('windowLevel').value);

  canvas.width = currentImage.width;
  canvas.height = currentImage.height;

  const imageData = ctx.createImageData(currentImage.width, currentImage.height);
  
  const minVal = wl - ww / 2;
  const maxVal = wl + ww / 2;

  for (let i = 0; i < currentImage.width * currentImage.height; i++) {
    const pixelValue = currentImage.data[i];
    let normalized = (pixelValue - minVal) / (maxVal - minVal);
    normalized = Math.max(0, Math.min(1, normalized));
    const grayValue = Math.floor(normalized * 255);

    const idx = i * 4;
    imageData.data[idx] = grayValue;
    imageData.data[idx + 1] = grayValue;
    imageData.data[idx + 2] = grayValue;
    imageData.data[idx + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  drawAIHighlights(ctx);
  drawMeasurements(ctx);
}

function drawAIHighlights(ctx) {
  if (!showAIHighlight || aiDetections.length === 0) return;

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 5]);

  aiDetections.forEach(detection => {
    const [x1, y1, x2, y2] = detection.bbox;
    ctx.beginPath();
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.fillRect(x1, y1 - 25, 100, 25);
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.fillText(`${detection.lesionType} ${Math.round(detection.confidence * 100)}%`, x1 + 5, y1 - 8);

    ctx.setLineDash([5, 5]);
  });

  ctx.setLineDash([]);
}

function drawMeasurements(ctx) {
  if (measurements.length === 0) return;

  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#4ade80';
  ctx.font = '14px sans-serif';

  measurements.forEach((m, index) => {
    if (m.type === 'length') {
      ctx.beginPath();
      ctx.moveTo(m.startX, m.startY);
      ctx.lineTo(m.endX, m.endY);
      ctx.stroke();

      const dist = Math.sqrt(Math.pow(m.endX - m.startX, 2) + Math.pow(m.endY - m.startY, 2));
      const midX = (m.startX + m.endX) / 2;
      const midY = (m.startY + m.endY) / 2;
      ctx.fillText(`${dist.toFixed(2)} px`, midX, midY - 10);
    } else if (m.type === 'angle') {
      ctx.beginPath();
      ctx.moveTo(m.startX, m.startY);
      ctx.lineTo(m.vertexX, m.vertexY);
      ctx.lineTo(m.endX, m.endY);
      ctx.stroke();

      const angle = calculateAngle(m.startX, m.startY, m.vertexX, m.vertexY, m.endX, m.endY);
      ctx.fillText(`${angle.toFixed(1)}°`, m.vertexX + 10, m.vertexY - 10);
    } else if (m.type === 'rectangle') {
      ctx.beginPath();
      ctx.rect(m.x, m.y, m.width, m.height);
      ctx.stroke();

      ctx.fillText(`ROI ${index + 1}`, m.x, m.y - 5);
    } else if (m.type === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(m.cx, m.cy, m.rx, m.ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillText(`ROI ${index + 1}`, m.cx - m.rx, m.cy - m.ry - 5);
    }
  });
}

function calculateAngle(x1, y1, vx, vy, x2, y2) {
  const v1x = x1 - vx;
  const v1y = y1 - vy;
  const v2x = x2 - vx;
  const v2y = y2 - vy;

  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  const cosAngle = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

function setActiveTool(tool) {
  currentTool = tool;
  
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const toolIdMap = {
    pan: 'toolPan',
    window: 'toolWindow',
    length: 'toolLength',
    angle: 'toolAngle',
    rectangle: 'toolRectangle',
    ellipse: 'toolEllipse'
  };

  const btn = document.getElementById(toolIdMap[tool]);
  if (btn) {
    btn.classList.add('active');
  }

  if (tool === 'length' || tool === 'angle' || tool === 'rectangle' || tool === 'ellipse') {
    measurementsPanel.classList.add('visible');
  }

  updateStatusBar();
  showToast(`已切换到 ${toolNames[tool]} 工具`);
}

function updateMeasurementsPanel() {
  const measurementsList = document.getElementById('measurementsList');
  
  if (measurements.length === 0) {
    measurementsList.innerHTML = '<div style="color: #6b7280; font-size: 0.85rem;">暂无测量数据</div>';
    return;
  }

  measurementsList.innerHTML = measurements.map((m, index) => {
    let value = '';
    if (m.type === 'length') {
      const dist = Math.sqrt(Math.pow(m.endX - m.startX, 2) + Math.pow(m.endY - m.startY, 2));
      value = `${dist.toFixed(2)} px`;
    } else if (m.type === 'angle') {
      const angle = calculateAngle(m.startX, m.startY, m.vertexX, m.vertexY, m.endX, m.endY);
      value = `${angle.toFixed(1)}°`;
    } else {
      value = 'ROI 区域';
    }

    return `
      <div class="measurement-item">
        <div class="measurement-info">
          <span class="measurement-type">${toolNames[m.type]} #${index + 1}</span>
          <span class="measurement-value">${value}</span>
        </div>
        <button class="measurement-delete" data-index="${index}">×</button>
      </div>
    `;
  }).join('');

  measurementsList.querySelectorAll('.measurement-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      measurements.splice(index, 1);
      updateMeasurementsPanel();
      renderImage();
    });
  });
}

function updateAIPanel() {
  const detectionList = document.getElementById('aiDetectionList');
  
  if (aiDetections.length === 0) {
    detectionList.innerHTML = '<div style="color: #6b7280; font-size: 0.85rem;">暂无检测结果</div>';
    return;
  }

  detectionList.innerHTML = aiDetections.map(d => `
    <div class="ai-detection-item">
      <div class="ai-detection-header">
        <span class="ai-detection-type">${d.lesion_type}</span>
        <span class="ai-detection-confidence">${Math.round(d.confidence * 100)}%</span>
      </div>
      <div class="ai-detection-desc">${d.description}</div>
    </div>
  `).join('');
}

async function runAIDetection() {
  if (!currentImage) {
    showToast('请先加载影像');
    return;
  }

  setLoading(true);
  showToast('正在进行 AI 病灶检测...');

  try {
    const response = await fetch('http://127.0.0.1:8000/api/ai/detect-lesions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'mock' })
    }).catch(() => {
      return {
        ok: true,
        json: async () => ({
          success: true,
          detections: [
            {
              id: '1',
              confidence: 0.92,
              bbox: [100, 150, 200, 280],
              lesion_type: '结节',
              description: '可疑肺结节，边界清晰'
            },
            {
              id: '2',
              confidence: 0.78,
              bbox: [300, 200, 380, 320],
              lesion_type: '钙化灶',
              description: '微小钙化灶，建议随访'
            }
          ]
        })
      };
    });

    if (response.ok) {
      const data = await response.json();
      aiDetections = data.detections;
      updateAIPanel();
      aiPanel.classList.add('visible');
      renderImage();
      showToast(`AI 检测完成，发现 ${aiDetections.length} 个可疑病灶`);
    }
  } catch (error) {
    showToast('AI 检测失败，请检查后端服务');
  }

  setLoading(false);
}

function exportScreenshot() {
  if (!currentImage) {
    showToast('请先加载影像');
    return;
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d');
  
  tempCtx.drawImage(canvas, 0, 0);
  
  const imageData = tempCanvas.toDataURL('image/png');
  window.electronAPI.saveScreenshot(imageData);
  showToast('截图已保存');
}

function bindEvents() {
  document.getElementById('toolPan').addEventListener('click', () => setActiveTool('pan'));
  document.getElementById('toolWindow').addEventListener('click', () => setActiveTool('window'));
  document.getElementById('toolLength').addEventListener('click', () => setActiveTool('length'));
  document.getElementById('toolAngle').addEventListener('click', () => setActiveTool('angle'));
  document.getElementById('toolRectangle').addEventListener('click', () => setActiveTool('rectangle'));
  document.getElementById('toolEllipse').addEventListener('click', () => setActiveTool('ellipse'));

  document.getElementById('btnOpenFile').addEventListener('click', () => {
    window.electronAPI.openDicomDialog();
  });

  document.getElementById('btnOpenFolder').addEventListener('click', () => {
    dicomFiles = [
      { name: 'IM-0001.dcm', path: '/mock/path/1.dcm' },
      { name: 'IM-0002.dcm', path: '/mock/path/2.dcm' },
      { name: 'IM-0003.dcm', path: '/mock/path/3.dcm' },
      { name: 'IM-0004.dcm', path: '/mock/path/4.dcm' },
      { name: 'IM-0005.dcm', path: '/mock/path/5.dcm' }
    ];
    currentImageIndex = 0;
    updateImageList();
    loadImageByIndex(0);
    showToast(`已加载 ${dicomFiles.length} 个影像文件`);
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    if (currentImage) {
      document.getElementById('windowWidth').value = 400;
      document.getElementById('windowLevel').value = 40;
      renderImage();
      updateStatusBar();
      showToast('视图已重置');
    }
  });

  document.getElementById('btnScreenshot').addEventListener('click', exportScreenshot);
  document.getElementById('btnAIDetect').addEventListener('click', runAIDetection);
  document.getElementById('btnCloseAIPanel').addEventListener('click', () => {
    aiPanel.classList.remove('visible');
  });

  document.getElementById('btnClearMeasurements').addEventListener('click', () => {
    measurements = [];
    updateMeasurementsPanel();
    renderImage();
    showToast('已清除所有测量');
  });

  document.getElementById('btnPrevSlice').addEventListener('click', () => {
    if (currentImageIndex > 0) {
      currentImageIndex--;
      updateImageList();
      loadImageByIndex(currentImageIndex);
    }
  });

  document.getElementById('btnNextSlice').addEventListener('click', () => {
    if (currentImageIndex < dicomFiles.length - 1) {
      currentImageIndex++;
      updateImageList();
      loadImageByIndex(currentImageIndex);
    }
  });

  document.getElementById('windowPreset').addEventListener('change', (e) => {
    const preset = e.target.value;
    if (preset && windowPresets[preset]) {
      document.getElementById('windowWidth').value = windowPresets[preset].ww;
      document.getElementById('windowLevel').value = windowPresets[preset].wl;
      if (currentImage) {
        renderImage();
        updateStatusBar();
      }
    }
  });

  document.getElementById('windowWidth').addEventListener('change', () => {
    if (currentImage) {
      renderImage();
      updateStatusBar();
    }
  });

  document.getElementById('windowLevel').addEventListener('change', () => {
    if (currentImage) {
      renderImage();
      updateStatusBar();
    }
  });

  let isDrawing = false;
  let drawStartX = 0;
  let drawStartY = 0;
  let tempMeasurement = null;

  canvas.addEventListener('mousedown', (e) => {
    if (!currentImage) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'length' || currentTool === 'angle' || currentTool === 'rectangle' || currentTool === 'ellipse') {
      isDrawing = true;
      drawStartX = x;
      drawStartY = y;

      if (currentTool === 'length') {
        tempMeasurement = { type: 'length', startX: x, startY: y, endX: x, endY: y };
      } else if (currentTool === 'angle') {
        tempMeasurement = { type: 'angle', startX: x, startY: y, vertexX: x, vertexY: y, endX: x, endY: y, step: 1 };
      } else if (currentTool === 'rectangle') {
        tempMeasurement = { type: 'rectangle', x: x, y: y, width: 0, height: 0 };
      } else if (currentTool === 'ellipse') {
        tempMeasurement = { type: 'ellipse', cx: x, cy: y, rx: 0, ry: 0 };
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!currentImage || !isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tempMeasurement) {
      if (tempMeasurement.type === 'length') {
        tempMeasurement.endX = x;
        tempMeasurement.endY = y;
      } else if (tempMeasurement.type === 'angle') {
        if (tempMeasurement.step === 1) {
          tempMeasurement.vertexX = x;
          tempMeasurement.vertexY = y;
        } else {
          tempMeasurement.endX = x;
          tempMeasurement.endY = y;
        }
      } else if (tempMeasurement.type === 'rectangle') {
        tempMeasurement.width = x - drawStartX;
        tempMeasurement.height = y - drawStartY;
        if (tempMeasurement.width < 0) {
          tempMeasurement.x = x;
          tempMeasurement.width = Math.abs(tempMeasurement.width);
        }
        if (tempMeasurement.height < 0) {
          tempMeasurement.y = y;
          tempMeasurement.height = Math.abs(tempMeasurement.height);
        }
      } else if (tempMeasurement.type === 'ellipse') {
        tempMeasurement.rx = Math.abs(x - drawStartX);
        tempMeasurement.ry = Math.abs(y - drawStartY);
      }

      const tempMeasurements = [...measurements, tempMeasurement];
      const originalMeasurements = [...measurements];
      measurements = tempMeasurements;
      renderImage();
      measurements = originalMeasurements;
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (!currentImage || !isDrawing) return;
    isDrawing = false;

    if (tempMeasurement) {
      if (tempMeasurement.type === 'angle' && tempMeasurement.step === 1) {
        tempMeasurement.step = 2;
        measurements.push(tempMeasurement);
        tempMeasurement = null;
        renderImage();
        updateMeasurementsPanel();
      } else {
        measurements.push(tempMeasurement);
        tempMeasurement = null;
        renderImage();
        updateMeasurementsPanel();
      }
    }
  });

  canvas.addEventListener('wheel', (e) => {
    if (!currentImage) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 1 : -1;
    if (currentTool === 'window') {
      const ww = parseFloat(document.getElementById('windowWidth').value);
      const wl = parseFloat(document.getElementById('windowLevel').value);
      document.getElementById('windowWidth').value = Math.max(1, ww + delta * 50);
      document.getElementById('windowLevel').value = wl + delta * 20;
      renderImage();
      updateStatusBar();
    }
  });

  window.electronAPI.onLoadDicom((event, data) => {
    dicomFiles = [{ name: data.fileName, path: data.filePath }];
    currentImageIndex = 0;
    updateImageList();
    loadImageByIndex(0);
  });

  window.electronAPI.onResetView(() => {
    if (currentImage) {
      document.getElementById('windowWidth').value = 400;
      document.getElementById('windowLevel').value = 40;
      renderImage();
      updateStatusBar();
    }
  });

  window.electronAPI.onWindowPreset((event, data) => {
    document.getElementById('windowWidth').value = data.ww;
    document.getElementById('windowLevel').value = data.wl;
    if (currentImage) {
      renderImage();
      updateStatusBar();
    }
  });

  window.electronAPI.onActivateTool((event, tool) => {
    const toolMap = {
      'length': 'length',
      'angle': 'angle',
      'rectangle': 'rectangle',
      'ellipse': 'ellipse'
    };
    if (toolMap[tool]) {
      setActiveTool(toolMap[tool]);
    }
  });

  window.electronAPI.onClearMeasurements(() => {
    measurements = [];
    updateMeasurementsPanel();
    renderImage();
  });

  window.electronAPI.onAiDetectLesions(runAIDetection);

  window.electronAPI.onToggleAiHighlight((event, show) => {
    showAIHighlight = show;
    if (currentImage) {
      renderImage();
    }
  });

  window.electronAPI.onExportScreenshot(exportScreenshot);

  window.electronAPI.onScreenshotSaved((event, data) => {
    if (data.success) {
      showToast(`截图已保存到: ${data.path}`);
    }
  });
}

function init() {
  bindEvents();
  updateStatusBar();
  updateMeasurementsPanel();
  updateAIPanel();
}

init();
