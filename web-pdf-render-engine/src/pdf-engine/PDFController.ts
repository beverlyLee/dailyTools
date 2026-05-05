import { 
  Annotation, 
  DocumentInfo, 
  Tool, 
  Point, 
  Bounds,
  AnnotationType
} from '../types';
import { PDFModel } from './PDFModel';
import { PDFView } from './PDFView';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class PDFController {
  private _model: PDFModel;
  private _view: PDFView;
  private _tools: Map<string, Tool>;
  private _activeToolId: string;
  private _toolColor: string = '#fdd835';
  private _strokeWidth: number = 3;
  private _isDrawing: boolean = false;
  private _drawStartPos: Point | null = null;
  private _drawCurrentPos: Point | null = null;
  private _freehandPoints: Point[] = [];

  constructor(model: PDFModel, view: PDFView) {
    this._model = model;
    this._view = view;
    this._tools = new Map();
    this._activeToolId = 'select';
    this.setupDefaultTools();
  }

  get model(): PDFModel {
    return this._model;
  }

  get view(): PDFView {
    return this._view;
  }

  get activeToolId(): string {
    return this._activeToolId;
  }

  get toolColor(): string {
    return this._toolColor;
  }

  set toolColor(color: string) {
    this._toolColor = color;
  }

  get strokeWidth(): number {
    return this._strokeWidth;
  }

  set strokeWidth(width: number) {
    this._strokeWidth = width;
  }

  registerTool(tool: Tool): this {
    this._tools.set(tool.id, tool);
    return this;
  }

  activateTool(toolId: string): boolean {
    if (this._tools.has(toolId)) {
      this._activeToolId = toolId;
      return true;
    }
    return false;
  }

  private setupDefaultTools(): void {
    this.registerTool({
      id: 'select',
      name: '选择工具',
      cursor: 'default',
      onMouseDown: (point) => this.handleSelectMouseDown(point),
      onMouseMove: (point) => this.handleSelectMouseMove(point),
      onMouseUp: (point) => this.handleSelectMouseUp(point),
    });

    this.registerTool({
      id: 'highlight',
      name: '高亮',
      cursor: 'crosshair',
      onMouseDown: (point) => this.startDrawing('highlight', point),
      onMouseMove: (point) => this.updateDrawing(point),
      onMouseUp: (point) => this.finishDrawing(point),
    });

    this.registerTool({
      id: 'underline',
      name: '下划线',
      cursor: 'crosshair',
      onMouseDown: (point) => this.startDrawing('underline', point),
      onMouseMove: (point) => this.updateDrawing(point),
      onMouseUp: (point) => this.finishDrawing(point),
    });

    this.registerTool({
      id: 'textbox',
      name: '文本框',
      cursor: 'text',
      onMouseDown: (point) => this.handleTextboxClick(point),
    });

    this.registerTool({
      id: 'freehand',
      name: '手绘涂鸦',
      cursor: 'crosshair',
      onMouseDown: (point) => this.startFreehand(point),
      onMouseMove: (point) => this.updateFreehand(point),
      onMouseUp: (point) => this.finishFreehand(point),
    });

    this.activateTool('select');
  }

  async loadDocument(data: ArrayBuffer | string, fileName: string = 'document.pdf'): Promise<void> {
    try {
      const pdfDoc = await pdfjsLib.getDocument({
        data: typeof data === 'string' ? undefined : data,
        url: typeof data === 'string' ? data : undefined,
        disableFontFace: false,
        verbosity: 0,
      }).promise;

      const documentId = generateId();
      const fileSize = typeof data === 'string' ? 0 : data.byteLength;

      const docInfo: DocumentInfo = {
        id: documentId,
        name: fileName,
        fileSize,
        pageCount: pdfDoc.numPages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this._model.setPDFDocument(pdfDoc, docInfo);
      await this._view.renderPage();

      this._model.emit('document:loaded', docInfo);
    } catch (error) {
      console.error('Error loading PDF:', error);
      this._model.setError(error instanceof Error ? error : new Error(String(error)));
      this._model.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  unloadDocument(): void {
    this._model.clearDocument();
    this._view.clearCanvas();
    this._view.clearAnnotationLayer();
    this._model.emit('document:unload');
  }

  async goToPage(page: number): Promise<boolean> {
    if (this._model.goToPage(page)) {
      await this._view.renderPage();
      this._model.emit('page:change', page);
      return true;
    }
    return false;
  }

  async nextPage(): Promise<boolean> {
    if (this._model.nextPage()) {
      await this._view.renderPage();
      this._model.emit('page:change', this._model.currentPage);
      return true;
    }
    return false;
  }

  async prevPage(): Promise<boolean> {
    if (this._model.prevPage()) {
      await this._view.renderPage();
      this._model.emit('page:change', this._model.currentPage);
      return true;
    }
    return false;
  }

  async zoomIn(factor: number = 0.1): Promise<void> {
    this._model.zoomIn(factor);
    await this._view.renderPage();
    this._model.emit('zoom:change', this._model.scale);
  }

  async zoomOut(factor: number = 0.1): Promise<void> {
    this._model.zoomOut(factor);
    await this._view.renderPage();
    this._model.emit('zoom:change', this._model.scale);
  }

  async setZoom(scale: number): Promise<void> {
    this._model.setScale(scale);
    await this._view.renderPage();
    this._model.emit('zoom:change', this._model.scale);
  }

  private handleSelectMouseDown(_point: Point): void {
    this._model.clearTextSelection();
  }

  private handleSelectMouseMove(_point: Point): void {}

  private handleSelectMouseUp(_point: Point): void {}

  private startDrawing(_type: AnnotationType, point: Point): void {
    const scale = this._model.scale;
    const normalizedPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };
    
    this._isDrawing = true;
    this._drawStartPos = normalizedPoint;
    this._drawCurrentPos = normalizedPoint;
  }

  private updateDrawing(point: Point): void {
    if (!this._isDrawing || !this._drawStartPos) return;
    
    const scale = this._model.scale;
    const normalizedPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };
    
    this._drawCurrentPos = normalizedPoint;
    this.renderPreview();
  }

  private finishDrawing(point: Point): void {
    if (!this._isDrawing || !this._drawStartPos || !this._drawCurrentPos) {
      this._isDrawing = false;
      return;
    }

    const scale = this._model.scale;
    const normalizedPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };

    const bounds: Bounds = {
      minX: Math.min(this._drawStartPos.x, normalizedPoint.x),
      minY: Math.min(this._drawStartPos.y, normalizedPoint.y),
      maxX: Math.max(this._drawStartPos.x, normalizedPoint.x),
      maxY: Math.max(this._drawStartPos.y, normalizedPoint.y),
    };

    const activeTool = this._activeToolId;
    if (activeTool === 'highlight' || activeTool === 'underline') {
      const annotation = this._model.addAnnotation({
        type: activeTool,
        page: this._model.currentPage,
        color: this._toolColor,
        opacity: 0.8,
        bounds,
      } as any);

      this._model.emit('annotation:added', annotation);
    }

    this._isDrawing = false;
    this._drawStartPos = null;
    this._drawCurrentPos = null;
    this._view.renderAnnotations();
  }

  private renderPreview(): void {
    if (!this._view.annotationContext || !this._drawStartPos || !this._drawCurrentPos) return;

    this._view.renderAnnotations();
    
    const ctx = this._view.annotationContext;
    const scale = this._model.scale;
    const activeTool = this._activeToolId;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = this._toolColor;
    ctx.strokeStyle = this._toolColor;

    const x1 = this._drawStartPos.x * scale;
    const y1 = this._drawStartPos.y * scale;
    const x2 = this._drawCurrentPos.x * scale;
    const y2 = this._drawCurrentPos.y * scale;

    if (activeTool === 'highlight') {
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    } else if (activeTool === 'underline') {
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      const maxY = Math.max(y1, y2);
      ctx.moveTo(Math.min(x1, x2), maxY - 2 * scale);
      ctx.lineTo(Math.max(x1, x2), maxY - 2 * scale);
      ctx.stroke();
    }

    ctx.restore();
  }

  private handleTextboxClick(point: Point): void {
    const text = prompt('请输入文本框内容:');
    if (!text) return;

    const scale = this._model.scale;
    const normalizedPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };

    const bounds: Bounds = {
      minX: normalizedPoint.x,
      minY: normalizedPoint.y,
      maxX: normalizedPoint.x + 200,
      maxY: normalizedPoint.y + 80,
    };

    const annotation = this._model.addAnnotation({
      type: 'textbox',
      page: this._model.currentPage,
      color: this._toolColor,
      opacity: 0.8,
      bounds,
      text,
      fontSize: 14,
    } as any);

    this._model.emit('annotation:added', annotation);
    this._view.renderAnnotations();
  }

  private startFreehand(point: Point): void {
    const scale = this._model.scale;
    const normalizedPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };

    this._isDrawing = true;
    this._freehandPoints = [normalizedPoint];
  }

  private updateFreehand(point: Point): void {
    if (!this._isDrawing) return;

    const scale = this._model.scale;
    const normalizedPoint = {
      x: point.x / scale,
      y: point.y / scale,
    };

    this._freehandPoints.push(normalizedPoint);
    this.renderFreehandPreview();
  }

  private finishFreehand(_point: Point): void {
    if (!this._isDrawing || this._freehandPoints.length < 2) {
      this._isDrawing = false;
      this._freehandPoints = [];
      return;
    }

    const annotation = this._model.addAnnotation({
      type: 'freehand',
      page: this._model.currentPage,
      color: this._toolColor,
      opacity: 1,
      points: [...this._freehandPoints],
      strokeWidth: this._strokeWidth,
    } as any);

    this._model.emit('annotation:added', annotation);
    this._isDrawing = false;
    this._freehandPoints = [];
    this._view.renderAnnotations();
  }

  private renderFreehandPreview(): void {
    if (!this._view.annotationContext || this._freehandPoints.length < 2) return;

    this._view.renderAnnotations();
    
    const ctx = this._view.annotationContext;
    const scale = this._model.scale;

    ctx.save();
    ctx.strokeStyle = this._toolColor;
    ctx.lineWidth = this._strokeWidth * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const first = this._freehandPoints[0];
    ctx.moveTo(first.x * scale, first.y * scale);

    for (let i = 1; i < this._freehandPoints.length; i++) {
      const p = this._freehandPoints[i];
      ctx.lineTo(p.x * scale, p.y * scale);
    }

    ctx.stroke();
    ctx.restore();
  }

  removeAnnotation(annotationId: string): boolean {
    const success = this._model.removeAnnotation(annotationId);
    if (success) {
      this._model.emit('annotation:removed', annotationId);
      this._view.renderAnnotations();
    }
    return success;
  }

  getCurrentPageAnnotations(): Annotation[] {
    return this._model.getAnnotationsForPage(this._model.currentPage);
  }

  getAllAnnotations(): Record<number, Annotation[]> {
    return this._model.getPageAnnotationsData();
  }

  loadAnnotations(data: Record<number, Annotation[]>): void {
    this._model.loadPageAnnotationsData(data);
    this._view.renderAnnotations();
  }

  copySelectedText(): string {
    const selection = this._model.textSelection;
    if (selection && selection.text) {
      navigator.clipboard?.writeText(selection.text);
      return selection.text;
    }
    return '';
  }

  async renderCurrentPage(): Promise<void> {
    await this._view.renderPage();
  }

  handleMouseDown(e: MouseEvent): void {
    const point = this.getEventPoint(e);
    const activeTool = this._tools.get(this._activeToolId);
    if (activeTool && activeTool.onMouseDown) {
      activeTool.onMouseDown(point);
    }
  }

  handleMouseMove(e: MouseEvent): void {
    const point = this.getEventPoint(e);
    const activeTool = this._tools.get(this._activeToolId);
    if (activeTool && activeTool.onMouseMove) {
      activeTool.onMouseMove(point);
    }
  }

  handleMouseUp(e: MouseEvent): void {
    const point = this.getEventPoint(e);
    const activeTool = this._tools.get(this._activeToolId);
    if (activeTool && activeTool.onMouseUp) {
      activeTool.onMouseUp(point);
    }
  }

  private getEventPoint(e: MouseEvent): Point {
    const canvas = this._view.canvas;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }
}
