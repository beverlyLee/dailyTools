import type { Color, Stroke, ImageElement, TextElement, CanvasElement, BrushType, StrokeStyle } from '../types';
import { ViewportManager } from './ViewportManager';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewportManager: ViewportManager;
  private animationFrameId: number | null = null;
  private needsRedraw: boolean = true;
  private elements: Map<string, CanvasElement> = new Map();
  private tempStrokes: Map<string, Stroke> = new Map();
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(canvas: HTMLCanvasElement, viewportManager: ViewportManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
    this.viewportManager = viewportManager;
    this.viewportManager.onViewportChange(() => this.requestRedraw());
  }

  requestRedraw(): void {
    this.needsRedraw = true;
    this.startAnimationLoop();
  }

  private startAnimationLoop(): void {
    if (this.animationFrameId !== null) return;

    const loop = () => {
      if (this.needsRedraw) {
        this.render();
        this.needsRedraw = false;
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private render(): void {
    const dpr = window.devicePixelRatio || 1;
    this.ctx.save();
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.clearCanvas();
    this.drawGrid();
    this.drawAllElements();

    this.ctx.restore();
  }

  private clearCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }

  private drawGrid(): void {
    const viewport = this.viewportManager.getViewport();
    const rect = this.canvas.getBoundingClientRect();

    const gridSpacing = this.calculateGridSpacing(viewport.zoom);
    const minorAlpha = 0.1;
    const majorAlpha = 0.2;

    const startWorldX = this.viewportManager.screenToWorldX(0);
    const startWorldY = this.viewportManager.screenToWorldY(0);
    const endWorldX = this.viewportManager.screenToWorldX(rect.width);
    const endWorldY = this.viewportManager.screenToWorldY(rect.height);

    const minX = Math.floor(startWorldX / gridSpacing) * gridSpacing;
    const maxX = Math.ceil(endWorldX / gridSpacing) * gridSpacing;
    const minY = Math.floor(startWorldY / gridSpacing) * gridSpacing;
    const maxY = Math.ceil(endWorldY / gridSpacing) * gridSpacing;

    this.ctx.strokeStyle = `rgba(200, 200, 200, ${minorAlpha})`;
    this.ctx.lineWidth = 1 / viewport.zoom;

    for (let x = minX; x <= maxX; x += gridSpacing) {
      const screenX = this.viewportManager.worldToScreenX(x);
      const isMajor = Math.abs(x % (gridSpacing * 5)) < 0.001;

      this.ctx.strokeStyle = isMajor
        ? `rgba(150, 150, 150, ${majorAlpha})`
        : `rgba(200, 200, 200, ${minorAlpha})`;

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, rect.height);
      this.ctx.stroke();
    }

    for (let y = minY; y <= maxY; y += gridSpacing) {
      const screenY = this.viewportManager.worldToScreenY(y);
      const isMajor = Math.abs(y % (gridSpacing * 5)) < 0.001;

      this.ctx.strokeStyle = isMajor
        ? `rgba(150, 150, 150, ${majorAlpha})`
        : `rgba(200, 200, 200, ${minorAlpha})`;

      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(rect.width, screenY);
      this.ctx.stroke();
    }
  }

  private calculateGridSpacing(zoom: number): number {
    const baseSpacing = 50;
    const targetPixels = 100;

    let spacing = baseSpacing;
    const pixelsPerUnit = zoom;

    if (pixelsPerUnit < targetPixels / 10) {
      spacing = baseSpacing * 10;
    } else if (pixelsPerUnit < targetPixels / 5) {
      spacing = baseSpacing * 5;
    } else if (pixelsPerUnit < targetPixels / 2) {
      spacing = baseSpacing * 2;
    } else if (pixelsPerUnit > targetPixels * 10) {
      spacing = baseSpacing / 10;
    } else if (pixelsPerUnit > targetPixels * 5) {
      spacing = baseSpacing / 5;
    } else if (pixelsPerUnit > targetPixels * 2) {
      spacing = baseSpacing / 2;
    }

    return spacing;
  }

  private drawAllElements(): void {
    const sortedElements = Array.from(this.elements.values()).sort((a, b) => a.createdAt - b.createdAt);
    sortedElements.forEach(element => this.drawElement(element));
    this.tempStrokes.forEach(stroke => this.drawStroke(stroke));
  }

  private drawElement(element: CanvasElement): void {
    if (element.type === 'stroke') {
      this.drawStroke(element);
    } else if (element.type === 'image') {
      this.drawImageElement(element);
    } else if (element.type === 'text') {
      this.drawTextElement(element);
    }
  }

  private drawStroke(stroke: Stroke): void {
    if (stroke.points.length < 2) return;

    this.ctx.save();

    this.applyStrokeStyle(stroke.brushType, stroke.strokeStyle, stroke.lineWidth);
    
    if (stroke.brushType === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.strokeStyle = this.colorToString(stroke.color);
    }

    this.ctx.beginPath();

    const firstPoint = this.viewportManager.worldToScreen(stroke.points[0]);
    this.ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < stroke.points.length; i++) {
      const point = this.viewportManager.worldToScreen(stroke.points[i]);

      if (i === 1 && stroke.points.length === 2) {
        this.ctx.lineTo(point.x, point.y);
      } else {
        const prevPoint = this.viewportManager.worldToScreen(stroke.points[i - 1]);
        const midX = (prevPoint.x + point.x) / 2;
        const midY = (prevPoint.y + point.y) / 2;

        if (i === 1) {
          this.ctx.lineTo(midX, midY);
        } else if (i === stroke.points.length - 1) {
          this.ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, point.x, point.y);
        } else {
          this.ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY);
        }
      }
    }

    this.ctx.stroke();
    this.ctx.restore();
  }

  private applyStrokeStyle(brushType: BrushType, strokeStyle: StrokeStyle, lineWidth: number): void {
    const zoom = this.viewportManager.getViewport().zoom;
    let actualWidth = lineWidth;

    switch (brushType) {
      case 'pencil':
        actualWidth = lineWidth;
        break;
      case 'pen':
        actualWidth = lineWidth * 1.5;
        break;
      case 'marker':
        actualWidth = lineWidth * 3;
        this.ctx.globalAlpha = 0.6;
        break;
      case 'eraser':
        actualWidth = lineWidth * 2;
        break;
    }

    this.ctx.lineWidth = actualWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    switch (strokeStyle) {
      case 'solid':
        this.ctx.setLineDash([]);
        break;
      case 'dashed':
        const dashLength = Math.max(10, 15 * zoom);
        const gapLength = Math.max(5, 8 * zoom);
        this.ctx.setLineDash([dashLength, gapLength]);
        break;
      case 'dotted':
        const dotSize = Math.max(1, 2 * zoom);
        this.ctx.setLineDash([dotSize, Math.max(2, 4 * zoom)]);
        this.ctx.lineCap = 'round';
        break;
    }
  }

  private drawImageElement(image: ImageElement): void {
    this.ctx.save();

    const screenX = this.viewportManager.worldToScreenX(image.x);
    const screenY = this.viewportManager.worldToScreenY(image.y);
    const zoom = this.viewportManager.getViewport().zoom;
    const screenWidth = image.width * zoom;
    const screenHeight = image.height * zoom;

    let img = this.imageCache.get(image.id);
    
    if (!img) {
      img = new Image();
      img.src = image.imageData;
      this.imageCache.set(image.id, img);
      
      img.onload = () => {
        this.requestRedraw();
      };
      
      this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
      this.ctx.restore();
      return;
    }

    if (img.complete) {
      this.ctx.drawImage(img, screenX, screenY, screenWidth, screenHeight);
    }

    this.ctx.restore();
  }

  private drawTextElement(text: TextElement): void {
    this.ctx.save();

    const screenX = this.viewportManager.worldToScreenX(text.x);
    const screenY = this.viewportManager.worldToScreenY(text.y);
    const zoom = this.viewportManager.getViewport().zoom;

    this.ctx.font = `${text.fontSize * zoom}px system-ui, -apple-system, sans-serif`;
    this.ctx.fillStyle = this.colorToString(text.color);
    this.ctx.textBaseline = 'top';

    this.ctx.fillText(text.text, screenX, screenY);

    this.ctx.restore();
  }

  private colorToString(color: Color): string {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  }

  addElement(element: CanvasElement): void {
    this.elements.set(element.id, element);
    this.requestRedraw();
  }

  updateElement(element: CanvasElement): void {
    this.elements.set(element.id, element);
    this.requestRedraw();
  }

  removeElement(elementId: string): void {
    this.elements.delete(elementId);
    this.imageCache.delete(elementId);
    this.requestRedraw();
  }

  addStroke(stroke: Stroke): void {
    this.elements.set(stroke.id, stroke);
    this.requestRedraw();
  }

  updateStroke(stroke: Stroke): void {
    this.elements.set(stroke.id, stroke);
    this.requestRedraw();
  }

  removeStroke(strokeId: string): void {
    this.elements.delete(strokeId);
    this.requestRedraw();
  }

  setTempStroke(stroke: Stroke): void {
    this.tempStrokes.set(stroke.id, stroke);
    this.requestRedraw();
  }

  removeTempStroke(strokeId: string): void {
    this.tempStrokes.delete(strokeId);
    this.requestRedraw();
  }

  clearAll(): void {
    this.elements.clear();
    this.tempStrokes.clear();
    this.imageCache.clear();
    this.requestRedraw();
  }

  getStrokes(): Stroke[] {
    return Array.from(this.elements.values())
      .filter((e): e is Stroke => e.type === 'stroke');
  }

  getElements(): CanvasElement[] {
    return Array.from(this.elements.values());
  }

  setStrokes(strokes: Stroke[]): void {
    this.elements.clear();
    strokes.forEach(stroke => this.elements.set(stroke.id, stroke));
    this.requestRedraw();
  }

  setElements(elements: CanvasElement[]): void {
    this.elements.clear();
    elements.forEach(element => this.elements.set(element.id, element));
    this.requestRedraw();
  }

  resize(): void {
    this.requestRedraw();
  }
}
