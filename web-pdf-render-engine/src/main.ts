import { 
  PDFModel, 
  PDFView, 
  PDFController, 
  indexedDBStore,
  Annotation,
  DocumentInfo
} from './index';

document.addEventListener('DOMContentLoaded', () => {
  const pdfCanvas = document.getElementById('pdfCanvas') as HTMLCanvasElement;
  const annotationCanvas = document.getElementById('annotationCanvas') as HTMLCanvasElement;
  const fileUpload = document.getElementById('fileUpload') as HTMLInputElement;
  const loading = document.getElementById('loading') as HTMLDivElement;
  const statusText = document.getElementById('statusText') as HTMLSpanElement;
  const fileInfo = document.getElementById('fileInfo') as HTMLSpanElement;
  const currentPageInput = document.getElementById('currentPage') as HTMLInputElement;
  const totalPagesSpan = document.getElementById('totalPages') as HTMLSpanElement;
  const zoomLevelSpan = document.getElementById('zoomLevel') as HTMLSpanElement;
  const colorPicker = document.getElementById('colorPicker') as HTMLInputElement;
  const strokeWidth = document.getElementById('strokeWidth') as HTMLInputElement;
  const strokeWidthValue = document.getElementById('strokeWidthValue') as HTMLSpanElement;
  const annotationsList = document.getElementById('annotationsList') as HTMLDivElement;
  const annotationsContent = document.getElementById('annotationsContent') as HTMLDivElement;
  const toggleAnnotationsListBtn = document.getElementById('toggleAnnotationsList') as HTMLButtonElement;

  const model = new PDFModel();
  const view = new PDFView(model, pdfCanvas, annotationCanvas);
  const controller = new PDFController(model, view);

  let currentDocumentId: string | null = null;

  setupEventListeners();

  function setupEventListeners(): void {
    fileUpload.addEventListener('change', handleFileUpload);

    const toolButtons = document.querySelectorAll('.tool-btn');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const toolId = (btn as HTMLElement).dataset.tool;
        if (toolId) {
          toolButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          controller.activateTool(toolId);
        }
      });
    });

    document.getElementById('prevPage')?.addEventListener('click', () => {
      controller.prevPage();
    });

    document.getElementById('nextPage')?.addEventListener('click', () => {
      controller.nextPage();
    });

    currentPageInput.addEventListener('change', () => {
      const page = parseInt(currentPageInput.value, 10);
      if (!isNaN(page)) {
        controller.goToPage(page);
      }
    });

    document.getElementById('zoomIn')?.addEventListener('click', () => {
      controller.zoomIn(0.1);
    });

    document.getElementById('zoomOut')?.addEventListener('click', () => {
      controller.zoomOut(0.1);
    });

    document.getElementById('resetZoom')?.addEventListener('click', () => {
      controller.setZoom(1.0);
    });

    colorPicker.addEventListener('input', () => {
      controller.toolColor = colorPicker.value;
    });

    strokeWidth.addEventListener('input', () => {
      const value = parseInt(strokeWidth.value, 10);
      controller.strokeWidth = value;
      strokeWidthValue.textContent = `${value}px`;
    });

    document.getElementById('saveAnnotations')?.addEventListener('click', saveAnnotationsToDB);
    document.getElementById('loadAnnotations')?.addEventListener('click', loadAnnotationsFromDB);
    toggleAnnotationsListBtn.addEventListener('click', toggleAnnotationsList);

    annotationCanvas.addEventListener('mousedown', (e) => controller.handleMouseDown(e));
    annotationCanvas.addEventListener('mousemove', (e) => controller.handleMouseMove(e));
    annotationCanvas.addEventListener('mouseup', (e) => controller.handleMouseUp(e));
    annotationCanvas.addEventListener('mouseleave', (e) => controller.handleMouseUp(e));

    model.on('document:loaded', (docInfo: DocumentInfo) => {
      currentDocumentId = docInfo.id;
      loading.style.display = 'none';
      fileInfo.textContent = `文件: ${docInfo.name} (${docInfo.pageCount} 页)`;
      totalPagesSpan.textContent = docInfo.pageCount.toString();
      currentPageInput.value = '1';
      currentPageInput.max = docInfo.pageCount.toString();
      statusText.textContent = '文档加载完成';
      updateZoomLevel();
      updateAnnotationsList();
    });

    model.on('page:change', (page: number) => {
      currentPageInput.value = page.toString();
      statusText.textContent = `当前页: ${page}`;
      updateAnnotationsList();
    });

    model.on('zoom:change', (_scale: number) => {
      updateZoomLevel();
    });

    model.on('annotation:added', (annotation: Annotation) => {
      statusText.textContent = `添加了 ${getAnnotationTypeName(annotation.type)} 标注`;
      updateAnnotationsList();
    });

    model.on('annotation:removed', (_annotationId: string) => {
      statusText.textContent = '移除了标注';
      updateAnnotationsList();
    });

    model.on('error', (error: Error) => {
      statusText.textContent = `错误: ${error.message}`;
    });
  }

  function handleFileUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('请选择 PDF 文件');
      return;
    }

    loading.style.display = 'block';
    statusText.textContent = '正在加载文档...';

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      await controller.loadDocument(arrayBuffer, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  async function saveAnnotationsToDB(): Promise<void> {
    if (!currentDocumentId) {
      alert('请先加载 PDF 文档');
      return;
    }

    const docInfo = model.documentInfo;
    if (!docInfo) return;

    try {
      await indexedDBStore.saveDocument(docInfo);
      
      const allAnnotations = controller.getAllAnnotations();
      for (const page in allAnnotations) {
        for (const annotation of allAnnotations[page]) {
          await indexedDBStore.saveAnnotation(currentDocumentId, annotation);
        }
      }

      statusText.textContent = '标注已保存到 IndexedDB';
      alert('标注已保存成功！');
    } catch (error) {
      console.error('保存标注失败:', error);
      statusText.textContent = '保存标注失败';
      alert('保存标注失败，请重试');
    }
  }

  async function loadAnnotationsFromDB(): Promise<void> {
    if (!currentDocumentId) {
      alert('请先加载 PDF 文档');
      return;
    }

    try {
      const annotations = await indexedDBStore.getDocumentAnnotations(currentDocumentId);
      
      const annotationsByPage: Record<number, Annotation[]> = {};
      for (const annotation of annotations) {
        if (!annotationsByPage[annotation.page]) {
          annotationsByPage[annotation.page] = [];
        }
        annotationsByPage[annotation.page].push(annotation);
      }

      controller.loadAnnotations(annotationsByPage);
      statusText.textContent = `已加载 ${annotations.length} 个标注`;
      updateAnnotationsList();
      alert('标注已加载成功！');
    } catch (error) {
      console.error('加载标注失败:', error);
      statusText.textContent = '加载标注失败';
      alert('加载标注失败，请重试');
    }
  }

  function toggleAnnotationsList(): void {
    annotationsList.classList.toggle('visible');
    toggleAnnotationsListBtn.textContent = annotationsList.classList.contains('visible') 
      ? '隐藏标注列表' 
      : '显示标注列表';
  }

  function updateZoomLevel(): void {
    const scale = model.scale;
    zoomLevelSpan.textContent = `${Math.round(scale * 100)}%`;
  }

  function getAnnotationTypeName(type: string): string {
    const names: Record<string, string> = {
      highlight: '高亮',
      underline: '下划线',
      textbox: '文本框',
      freehand: '手绘涂鸦'
    };
    return names[type] || type;
  }

  function updateAnnotationsList(): void {
    const annotations = controller.getCurrentPageAnnotations();
    
    if (annotations.length === 0) {
      annotationsContent.innerHTML = '<p>暂无标注</p>';
      return;
    }

    let html = '';
    for (const annotation of annotations) {
      html += `
        <div class="annotation-item">
          <div class="annotation-item-header">
            <span class="annotation-type" style="color: ${annotation.color}">
              ${getAnnotationTypeName(annotation.type)}
            </span>
            <span class="annotation-remove" data-id="${annotation.id}">删除</span>
          </div>
          <div class="annotation-page">第 ${annotation.page} 页</div>
        </div>
      `;
    }
    annotationsContent.innerHTML = html;

    const removeButtons = annotationsContent.querySelectorAll('.annotation-remove');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          controller.removeAnnotation(id);
        }
      });
    });
  }
});
