import type { Point, Color, Stroke, BrushType, StrokeStyle } from '../types';
import { ViewportManager } from './ViewportManager';
import { v4 as uuidv4 } from 'uuid';

export interface DrawToolConfig {
  brushType: BrushType;
  color: Color;
  lineWidth: number;
  strokeStyle: StrokeStyle;
}

export interface DrawCallbacks {
  onStrokeStart: (stroke: Stroke) => void;
  onStrokeUpdate: (stroke: Stroke) => void;
  onStrokeComplete: (stroke: Stroke) => void;
}

export class DrawTool {
  private canvas: HTMLCanvasElement;
  private viewportManager: ViewportManager;
  private userId: string;
  private config: DrawToolConfig;
  private callbacks: DrawCallbacks;

  private isDrawing: boolean = false;
  private currentStrokeId: string | null = null;
  private currentPoints: Point[] = [];

  constructor(
    canvas: HTMLCanvasElement,
    viewportManager: ViewportManager,
    userId: string,
    config: DrawToolConfig,
    callbacks: DrawCallbacks
  ) {
    this.canvas = canvas;
    this.viewportManager = viewportManager;
    this.userId = userId;
    this.config = config;
    this.callbacks = callbacks;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      return;
    }

    if (e.button === 0) {
      this.startDrawing(e.clientX, e.clientY);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDrawing) {
      this.continueDrawing(e.clientX, e.clientY);
    }
  }

  private handleMouseUp(): void {
    if (this.isDrawing) {
      this.endDrawing();
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.startDrawing(touch.clientX, touch.clientY);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isDrawing) {
      e.preventDefault();
      const touch = e.touches[0];
      this.continueDrawing(touch.clientX, touch.clientY);
    }
  }

  private handleTouchEnd(): void {
    if (this.isDrawing) {
      this.endDrawing();
    }
  }

  private createStroke(points: Point[]): Stroke {
    return {
      id: this.currentStrokeId!,
      type: 'stroke',
      points: [...points],
      color: { ...this.config.color },
      lineWidth: this.config.lineWidth,
      brushType: this.config.brushType,
      strokeStyle: this.config.strokeStyle,
      createdAt: Date.now(),
      userId: this.userId
    };
  }

  private startDrawing(screenX: number, screenY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const worldPoint = this.viewportManager.screenToWorld({ x: canvasX, y: canvasY });

    this.currentStrokeId = uuidv4();
    this.currentPoints = [worldPoint];
    this.isDrawing = true;

    const stroke = this.createStroke(this.currentPoints);
    this.callbacks.onStrokeStart(stroke);
  }

  private continueDrawing(screenX: number, screenY: number): void {
    if (!this.isDrawing || !this.currentStrokeId) return;

    const rect = this.canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const worldPoint = this.viewportManager.screenToWorld({ x: canvasX, y: canvasY });

    const lastPoint = this.currentPoints[this.currentPoints.length - 1];
    const distance = Math.sqrt(
      Math.pow(worldPoint.x - lastPoint.x, 2) +
      Math.pow(worldPoint.y - lastPoint.y, 2)
    );

    const minDistance = 2 / this.viewportManager.getViewport().zoom;

    if (distance > minDistance) {
      this.currentPoints.push(worldPoint);

      const stroke = this.createStroke(this.currentPoints);
      this.callbacks.onStrokeUpdate(stroke);
    }
  }

  private endDrawing(): void {
    if (!this.isDrawing || !this.currentStrokeId) return;

    this.isDrawing = false;

    const stroke = this.createStroke(this.currentPoints);
    this.callbacks.onStrokeComplete(stroke);

    this.currentStrokeId = null;
    this.currentPoints = [];
  }

  setColor(color: Color): void {
    this.config.color = color;
  }

  setLineWidth(width: number): void {
    this.config.lineWidth = width;
  }

  setBrushType(type: BrushType): void {
    this.config.brushType = type;
  }

  setStrokeStyle(style: StrokeStyle): void {
    this.config.strokeStyle = style;
  }

  getConfig(): DrawToolConfig {
    return { ...this.config };
  }
}
