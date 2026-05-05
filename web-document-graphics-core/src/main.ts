import {
  PDFModel,
  PDFView,
  PDFController,
  GraphicsModel,
  GraphicsView,
  GraphicsController,
  indexedDBStore,
} from './index';

let currentTab: 'pdf' | 'graphics' = 'pdf';

let pdfModel: PDFModel;
let pdfView: PDFView;
let pdfController: PDFController;

let graphicsModel: GraphicsModel;
let graphicsView: GraphicsView;
let graphicsController: GraphicsController;

function selectTab(tab: 'pdf' | 'graphics'): void {
  currentTab = tab;

  const pdfTab = document.querySelector('[data-tab="pdf"]') as HTMLElement;
  const graphicsTab = document.querySelector('[data-tab="graphics"]') as HTMLElement;
  const pdfSidebar = document.getElementById('pdf-sidebar');
  const graphicsSidebar = document.getElementById('graphics-sidebar');
  const pdfToolbar = document.getElementById('pdf-toolbar');
  const graphicsToolbar = document.getElementById('graphics-toolbar');
  const pdfCanvas = document.getElementById('pdf-canvas');
  const graphicsCanvas = document.getElementById('graphics-canvas');

  if (tab === 'pdf') {
    pdfTab?.classList.add('active');
    graphicsTab?.classList.remove('active');
    pdfSidebar!.style.display = 'block';
    graphicsSidebar!.style.display = 'none';
    pdfToolbar!.style.display = 'flex';
    graphicsToolbar!.style.display = 'none';
    pdfCanvas!.style.display = 'block';
    graphicsCanvas!.style.display = 'none';
  } else {
    pdfTab?.classList.remove('active');
    graphicsTab?.classList.add('active');
    pdfSidebar!.style.display = 'none';
    graphicsSidebar!.style.display = 'block';
    pdfToolbar!.style.display = 'none';
    graphicsToolbar!.style.display = 'flex';
    pdfCanvas!.style.display = 'none';
    graphicsCanvas!.style.display = 'block';
    renderGraphics();
  }
}

function updatePageInfo(): void {
  const pageInfo = document.getElementById('page-info');
  if (pageInfo && pdfModel) {
    pageInfo.textContent = `第 ${pdfModel.currentPage} / ${pdfModel.pageCount} 页`;
  }
}

function updateZoomLevel(): void {
  const zoomLevel = document.getElementById('zoom-level');
  if (zoomLevel && pdfModel) {
    zoomLevel.textContent = `${Math.round(pdfModel.scale * 100)}%`;
  }
}

function setStatus(message: string): void {
  const status = document.getElementById('status-message');
  if (status) {
    status.textContent = message;
  }
}

function renderGraphics(): void {
  if (graphicsView) {
    graphicsView.render();
  }
}

function setupPDFEngine(): void {
  const pdfCanvas = document.getElementById('pdf-canvas') as HTMLCanvasElement;
  
  pdfModel = new PDFModel();
  pdfView = new PDFView(pdfModel, pdfCanvas);
  pdfController = new PDFController(pdfModel, pdfView);

  pdfModel.on('change', () => {
    updatePageInfo();
    updateZoomLevel();
  });

  const openPdfBtn = document.getElementById('open-pdf-btn');
  const pdfFileInput = document.getElementById('pdf-file-input') as HTMLInputElement;

  openPdfBtn?.addEventListener('click', () => {
    pdfFileInput.click();
  });

  pdfFileInput?.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      setStatus('正在加载 PDF...');
      const arrayBuffer = await file.arrayBuffer();
      await pdfController.loadDocument(arrayBuffer, file.name);
      setStatus(`已加载: ${file.name}`);
    }
  });

  document.getElementById('prev-page')?.addEventListener('click', async () => {
    const result = await pdfController.prevPage();
    if (result) {
      setStatus('上一页');
    }
  });

  document.getElementById('next-page')?.addEventListener('click', async () => {
    const result = await pdfController.nextPage();
    if (result) {
      setStatus('下一页');
    }
  });

  document.getElementById('zoom-out')?.addEventListener('click', async () => {
    await pdfController.zoomOut(0.2);
  });

  document.getElementById('zoom-in')?.addEventListener('click', async () => {
    await pdfController.zoomIn(0.2);
  });

  document.querySelectorAll('[data-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const toolId = (btn as HTMLElement).dataset.tool;
      if (toolId) {
        document.querySelectorAll('[data-tool]').forEach((b) => {
          b.classList.remove('active');
        });
        (btn as HTMLElement).classList.add('active');
        pdfController.activateTool(toolId);
        setStatus(`工具: ${(btn as HTMLElement).textContent?.trim()}`);
      }
    });
  });

  document.querySelectorAll('#pdf-colors .color-option').forEach((option) => {
    option.addEventListener('click', () => {
      const color = (option as HTMLElement).dataset.color;
      if (color) {
        document.querySelectorAll('#pdf-colors .color-option').forEach((o) => {
          o.classList.remove('active');
        });
        (option as HTMLElement).classList.add('active');
        pdfController.toolColor = color;
      }
    });
  });

  const strokeSlider = document.getElementById('pdf-stroke-width') as HTMLInputElement;
  const strokeValue = document.getElementById('pdf-stroke-value');

  strokeSlider?.addEventListener('input', () => {
    const value = parseInt(strokeSlider.value, 10);
    if (strokeValue) strokeValue.textContent = String(value);
    pdfController.strokeWidth = value;
  });

  document.getElementById('copy-text')?.addEventListener('click', () => {
    const text = pdfController.copySelectedText();
    if (text) {
      setStatus('已复制选中文本');
    } else {
      setStatus('没有选中的文本');
    }
  });

  document.getElementById('save-annotations')?.addEventListener('click', async () => {
    const docId = pdfModel.documentId;
    if (docId) {
      const annotations = pdfController.getAllAnnotations();
      for (const page in annotations) {
        for (const ann of annotations[page]) {
          await indexedDBStore.saveAnnotation(docId, ann);
        }
      }
      setStatus('标注已保存到 IndexedDB');
    } else {
      setStatus('请先打开 PDF 文档');
    }
  });

  document.getElementById('load-annotations')?.addEventListener('click', async () => {
    const docId = pdfModel.documentId;
    if (docId) {
      const annotations = await indexedDBStore.getDocumentAnnotations(docId);
      const pageAnnotations: Record<number, any[]> = {};
      for (const ann of annotations) {
        if (!pageAnnotations[ann.page]) {
          pageAnnotations[ann.page] = [];
        }
        pageAnnotations[ann.page].push(ann);
      }
      pdfController.loadAnnotations(pageAnnotations);
      setStatus('标注已从 IndexedDB 加载');
    } else {
      setStatus('请先打开 PDF 文档');
    }
  });
}

function setupGraphicsEngine(): void {
  const graphicsCanvas = document.getElementById('graphics-canvas') as HTMLCanvasElement;

  graphicsModel = new GraphicsModel();
  graphicsView = new GraphicsView(graphicsModel, graphicsCanvas);
  graphicsController = new GraphicsController(graphicsModel, graphicsView);

  document.querySelectorAll('[data-graphic-tool]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const toolId = (btn as HTMLElement).dataset.graphicTool;
      if (toolId) {
        document.querySelectorAll('[data-graphic-tool]').forEach((b) => {
          b.classList.remove('active');
        });
        (btn as HTMLElement).classList.add('active');
        
        switch (toolId) {
          case 'rect':
            graphicsController.setDrawingMode('rect');
            break;
          case 'ellipse':
            graphicsController.setDrawingMode('ellipse');
            break;
          case 'path':
            graphicsController.setDrawingMode('path');
            break;
          case 'text':
            graphicsController.setDrawingMode('text');
            break;
          default:
            graphicsController.setDrawingMode('select');
        }
        setStatus(`绘图工具: ${(btn as HTMLElement).textContent?.trim()}`);
      }
    });
  });

  document.querySelectorAll('[data-graphic-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = (btn as HTMLElement).dataset.graphicAction;
      switch (action) {
        case 'move-up':
          graphicsController.bringForward();
          setStatus('上移一层');
          break;
        case 'move-down':
          graphicsController.sendBackward();
          setStatus('下移一层');
          break;
        case 'move-front':
          graphicsController.bringToFront();
          setStatus('置于顶层');
          break;
        case 'move-back':
          graphicsController.sendToBack();
          setStatus('置于底层');
          break;
        case 'delete':
          graphicsController.deleteSelected();
          setStatus('已删除选中图形');
          break;
      }
    });
  });

  document.querySelectorAll('#graphics-colors .color-option').forEach((option) => {
    option.addEventListener('click', () => {
      const color = (option as HTMLElement).dataset.color;
      if (color) {
        document.querySelectorAll('#graphics-colors .color-option').forEach((o) => {
          o.classList.remove('active');
        });
        (option as HTMLElement).classList.add('active');
        graphicsController.fillColor = color;
        graphicsController.strokeColor = color;
      }
    });
  });

  const scaleSlider = document.getElementById('graphics-scale') as HTMLInputElement;
  const scaleValue = document.getElementById('graphics-scale-value');

  scaleSlider?.addEventListener('input', () => {
    const value = parseInt(scaleSlider.value, 10);
    if (scaleValue) scaleValue.textContent = `${value}%`;
    graphicsController.scaleSelected(value / 100);
  });

  const rotateSlider = document.getElementById('graphics-rotate') as HTMLInputElement;
  const rotateValue = document.getElementById('graphics-rotate-value');

  rotateSlider?.addEventListener('input', () => {
    const value = parseInt(rotateSlider.value, 10);
    if (rotateValue) rotateValue.textContent = `${value}°`;
    graphicsController.rotateSelected(value);
  });

  document.getElementById('clear-canvas')?.addEventListener('click', () => {
    graphicsController.clearAll();
    setStatus('画布已清空');
  });

  document.getElementById('undo-btn')?.addEventListener('click', () => {
    if (graphicsController.undo()) {
      setStatus('已撤销');
    } else {
      setStatus('没有可撤销的操作');
    }
  });

  document.getElementById('redo-btn')?.addEventListener('click', () => {
    if (graphicsController.redo()) {
      setStatus('已重做');
    } else {
      setStatus('没有可重做的操作');
    }
  });

  document.getElementById('save-graphics')?.addEventListener('click', () => {
    graphicsController.saveToLocalStorage();
    setStatus('图形已保存到 LocalStorage');
  });

  document.getElementById('load-graphics')?.addEventListener('click', () => {
    if (graphicsController.loadFromLocalStorage()) {
      setStatus('图形已从 LocalStorage 加载');
    } else {
      setStatus('没有找到保存的图形');
    }
  });

  document.getElementById('export-json')?.addEventListener('click', () => {
    const json = graphicsController.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graphics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('已导出 JSON 文件');
  });

  graphicsCanvas.addEventListener('mousemove', (e) => {
    const rect = graphicsCanvas.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    const coords = document.getElementById('coordinates');
    if (coords) {
      coords.textContent = `X: ${x}, Y: ${y}`;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (currentTab === 'graphics') {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        graphicsController.deleteSelected();
        setStatus('已删除选中图形');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          graphicsController.redo();
        } else {
          graphicsController.undo();
        }
      }
    }
  });
}

function init(): void {
  console.log('Web 文档与图形处理内核初始化...');

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabId = (tab as HTMLElement).dataset.tab;
      if (tabId === 'pdf' || tabId === 'graphics') {
        selectTab(tabId);
      }
    });
  });

  setupPDFEngine();
  setupGraphicsEngine();

  setTimeout(() => {
    selectTab('pdf');
  }, 100);

  setStatus('就绪');
}

document.addEventListener('DOMContentLoaded', init);

if (document.readyState !== 'loading') {
  init();
}
