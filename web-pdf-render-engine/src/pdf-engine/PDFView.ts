import { 
  Annotation, 
  HighlightAnnotation, 
  UnderlineAnnotation, 
  TextboxAnnotation, 
  FreehandAnnotation,
  Point,
  Bounds
} from '../types';
import { PDFModel } from './PDFModel';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export class PDFView {
  private _model: PDFModel;
  private _canvas: HTMLCanvasElement | null;
  private _context: CanvasRenderingContext2D | null;
  private _annotationCanvas: HTMLCanvasElement | null;
  private _annotationContext: CanvasRenderingContext2D | null;
  private _pageSize: { width: number; height: number } | null;

  constructor(model: PDFModel, canvas: HTMLCanvasElement, annotationCanvas?: HTMLCanvasElement) {
    this._model = model;
    this._canvas = canvas;
    this._context = canvas.getContext('2d');
    this._annotationCanvas = annotationCanvas || null;
    this._annotationContext = annotationCanvas ? annotationCanvas.getContext('2d') : null;
    this._pageSize = null;
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  get context(): CanvasRenderingContext2D | null {
    return this._context;
  }

  get annotationCanvas(): HTMLCanvasElement | null {
    return this._annotationCanvas;
  }

  get annotationContext(): CanvasRenderingContext2D | null {
    return this._annotationContext;
  }

  get pageSize(): { width: number; height: number } | null {
    return this._pageSize;
  }

  setAnnotationCanvas(canvas: HTMLCanvasElement): this {
    this._annotationCanvas = canvas;
    this._annotationContext = canvas.getContext('2d');
    return this;
  }

  async renderPage(): Promise<void> {
    const model = this._model;
    const pdfDoc = model.pdfDocument as pdfjsLib.PDFDocumentProxy | null;
    
    if (!pdfDoc || !this._canvas || !this._context) {
      return;
    }

    const pageNum = model.currentPage;
    const scale = model.scale;
    const rotation = model.rotation;

    try {
      model.setRendering(true);
      const page = await pdfDoc.getPage(pageNum);
      
      const originalViewport = page.getViewport({ scale: 1, rotation: 0 });
      
      const actualViewport = page.getViewport({ scale: scale, rotation: rotation });
      
      this._pageSize = {
        width: originalViewport.width,
        height: originalViewport.height,
      };

      const dpr = window.devicePixelRatio || 1;
      const outputScale = scale * dpr;
      
      this._canvas.width = Math.floor(actualViewport.width * dpr);
      this._canvas.height = Math.floor(actualViewport.height * dpr);
      this._canvas.style.width = `${Math.floor(actualViewport.width)}px`;
      this._canvas.style.height = `${Math.floor(actualViewport.height)}px`;

      if (this._annotationCanvas) {
        this._annotationCanvas.width = Math.floor(actualViewport.width * dpr);
        this._annotationCanvas.height = Math.floor(actualViewport.height * dpr);
        this._annotationCanvas.style.width = `${Math.floor(actualViewport.width)}px`;
        this._annotationCanvas.style.height = `${Math.floor(actualViewport.height)}px`;
      }

      this._context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      if (this._annotationContext) {
        this._annotationContext.setTransform(outputScale, 0, 0, outputScale, 0, 0);
      }

      const renderContext = {
        canvasContext: this._context,
        viewport: actualViewport,
        transform: [outputScale / scale, 0, 0, outputScale / scale, 0, 0],
      };

      await page.render(renderContext).promise;
      
      this.renderAnnotations();
      model.setRendering(false);
    } catch (error) {
      console.error('Error rendering page:', error);
      model.setError(error instanceof Error ? error : new Error(String(error)));
      model.setRendering(false);
    }
  }

  renderAnnotations(): void {
    if (!this._annotationContext) {
      return;
    }

    const ctx = this._annotationContext;
    const model = this._model;
    const currentPage = model.currentPage;
    const scale = model.scale;

    ctx.clearRect(0, 0, this._annotationCanvas!.width / scale, this._annotationCanvas!.height / scale);

    const annotations = model.getAnnotationsForPage(currentPage);
    
    for (const annotation of annotations) {
      this.renderAnnotation(ctx, annotation, scale);
    }
  }

  private renderAnnotation(ctx: CanvasRenderingContext2D, annotation: Annotation, scale: number): void {
    ctx.save();
    ctx.globalAlpha = annotation.opacity;

    switch (annotation.type) {
      case 'highlight':
        this.renderHighlight(ctx, annotation as HighlightAnnotation, scale);
        break;
      case 'underline':
        this.renderUnderline(ctx, annotation as UnderlineAnnotation, scale);
        break;
      case 'textbox':
        this.renderTextbox(ctx, annotation as TextboxAnnotation, scale);
        break;
      case 'freehand':
        this.renderFreehand(ctx, annotation as FreehandAnnotation, scale);
        break;
    }

    ctx.restore();
  }

  private renderHighlight(ctx: CanvasRenderingContext2D, annotation: HighlightAnnotation, scale: number): void {
    const bounds = this.scaleBounds(annotation.bounds, scale);
    ctx.fillStyle = annotation.color;
    ctx.globalAlpha = Math.min(annotation.opacity, 0.4);
    ctx.fillRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  }

  private renderUnderline(ctx: CanvasRenderingContext2D, annotation: UnderlineAnnotation, scale: number): void {
    const bounds = this.scaleBounds(annotation.bounds, scale);
    ctx.strokeStyle = annotation.color;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(bounds.minX, bounds.maxY - 2 * scale);
    ctx.lineTo(bounds.maxX, bounds.maxY - 2 * scale);
    ctx.stroke();
  }

  private renderTextbox(ctx: CanvasRenderingContext2D, annotation: TextboxAnnotation, scale: number): void {
    const bounds = this.scaleBounds(annotation.bounds, scale);
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;

    ctx.fillStyle = annotation.color + '33';
    ctx.fillRect(bounds.minX, bounds.minY, width, height);

    ctx.strokeStyle = annotation.color;
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(bounds.minX, bounds.minY, width, height);

    ctx.fillStyle = '#000000';
    ctx.font = `${annotation.fontSize * scale}px sans-serif`;
    ctx.textBaseline = 'top';
    
    const lines = this.wrapText(ctx, annotation.text, width - 10 * scale);
    let y = bounds.minY + 5 * scale;
    for (const line of lines) {
      ctx.fillText(line, bounds.minX + 5 * scale, y);
      y += (annotation.fontSize + 2) * scale;
    }
  }

  private renderFreehand(ctx: CanvasRenderingContext2D, annotation: FreehandAnnotation, scale: number): void {
    if (annotation.points.length < 2) return;

    ctx.strokeStyle = annotation.color;
    ctx.lineWidth = annotation.strokeWidth * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const firstPoint = this.scalePoint(annotation.points[0], scale);
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < annotation.points.length; i++) {
      const point = this.scalePoint(annotation.points[i], scale);
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  }

  private scaleBounds(bounds: Bounds, scale: number): Bounds {
    return {
      minX: bounds.minX * scale,
      minY: bounds.minY * scale,
      maxX: bounds.maxX * scale,
      maxY: bounds.maxY * scale,
    };
  }

  private scalePoint(point: Point, scale: number): Point {
    return {
      x: point.x * scale,
      y: point.y * scale,
    };
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine + ' ' + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  clearAnnotationLayer(): void {
    if (this._annotationContext && this._annotationCanvas) {
      const scale = this._model.scale;
      this._annotationContext.clearRect(
        0, 0,
        this._annotationCanvas.width / scale,
        this._annotationCanvas.height / scale
      );
    }
  }

  clearCanvas(): void {
    if (this._context && this._canvas) {
      this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }
}
