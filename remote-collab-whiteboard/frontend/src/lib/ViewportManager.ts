import type { Viewport, Point } from '../types';

export class ViewportManager {
  private canvas: HTMLCanvasElement;
  private viewport: Viewport;
  private isDragging: boolean = false;
  private lastMousePos: Point = { x: 0, y: 0 };
  private viewportChangeCallback: ((viewport: Viewport) => void) | null = null;

  private minZoom: number = 0.1;
  private maxZoom: number = 5.0;
  private zoomSensitivity: number = 0.001;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.viewport = {
      offsetX: 0,
      offsetY: 0,
      zoom: 1.0
    };
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isDragging = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      
      this.viewport.offsetX += dx;
      this.viewport.offsetY += dy;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.notifyViewportChange();
    }
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.canvas.style.cursor = 'default';
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldXBefore = this.screenToWorldX(mouseX);
    const worldYBefore = this.screenToWorldY(mouseY);
    
    const zoomFactor = Math.exp(-e.deltaY * this.zoomSensitivity);
    this.viewport.zoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.viewport.zoom * zoomFactor)
    );
    
    const worldXAfter = this.screenToWorldX(mouseX);
    const worldYAfter = this.screenToWorldY(mouseY);
    
    this.viewport.offsetX += (worldXAfter - worldXBefore) * this.viewport.zoom;
    this.viewport.offsetY += (worldYAfter - worldYBefore) * this.viewport.zoom;
    
    this.notifyViewportChange();
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      this.lastMousePos = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      this.isDragging = true;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (e.touches.length === 2 && this.isDragging) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      const dx = centerX - this.lastMousePos.x;
      const dy = centerY - this.lastMousePos.y;
      
      this.viewport.offsetX += dx;
      this.viewport.offsetY += dy;
      
      this.lastMousePos = { x: centerX, y: centerY };
      this.notifyViewportChange();
    }
  }

  private handleTouchEnd(): void {
    this.isDragging = false;
  }

  screenToWorldX(screenX: number): number {
    return (screenX - this.canvas.width / 2 - this.viewport.offsetX) / this.viewport.zoom;
  }

  screenToWorldY(screenY: number): number {
    return (screenY - this.canvas.height / 2 - this.viewport.offsetY) / this.viewport.zoom;
  }

  screenToWorld(screenPoint: Point): Point {
    return {
      x: this.screenToWorldX(screenPoint.x),
      y: this.screenToWorldY(screenPoint.y)
    };
  }

  worldToScreenX(worldX: number): number {
    return worldX * this.viewport.zoom + this.canvas.width / 2 + this.viewport.offsetX;
  }

  worldToScreenY(worldY: number): number {
    return worldY * this.viewport.zoom + this.canvas.height / 2 + this.viewport.offsetY;
  }

  worldToScreen(worldPoint: Point): Point {
    return {
      x: this.worldToScreenX(worldPoint.x),
      y: this.worldToScreenY(worldPoint.y)
    };
  }

  getViewport(): Viewport {
    return { ...this.viewport };
  }

  setViewport(viewport: Partial<Viewport>): void {
    this.viewport = { ...this.viewport, ...viewport };
    this.viewport.zoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.viewport.zoom)
    );
    this.notifyViewportChange();
  }

  reset(): void {
    this.viewport = {
      offsetX: 0,
      offsetY: 0,
      zoom: 1.0
    };
    this.notifyViewportChange();
  }

  onViewportChange(callback: (viewport: Viewport) => void): void {
    this.viewportChangeCallback = callback;
  }

  private notifyViewportChange(): void {
    if (this.viewportChangeCallback) {
      this.viewportChangeCallback({ ...this.viewport });
    }
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    this.notifyViewportChange();
  }
}
