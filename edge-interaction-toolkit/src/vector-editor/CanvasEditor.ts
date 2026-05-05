import type { Point, BoundingBox, CanvasState, ToolType } from './types';
import { Shape, Rect, Ellipse, Text } from './primitives';
import { SelectionManager } from './interaction/SelectionManager';
import { LayerManager } from './interaction/LayerManager';
import { Serializer } from './serialization/Serializer';
import { Matrix2D } from './transforms';

export interface CanvasEditorOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export class CanvasEditor {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _shapes: Map<string, Shape>;
  private _selectionManager: SelectionManager;
  private _layerManager: LayerManager;
  private _currentTool: ToolType;
  private _isDrawing: boolean;
  private _startPoint: Point;
  private _currentPoint: Point;
  private _backgroundColor: string;
  private _zoom: number;
  private _panX: number;
  private _panY: number;
  private _viewMatrix: Matrix2D;
  private _inverseViewMatrix: Matrix2D;
  private _listeners: Map<string, Set<(event: any) => void>>;
  private _selectionBox: BoundingBox | null;
  private _isMultiSelect: boolean;
  private _draggedShapes: Map<string, { offsetX: number; offsetY: number }>;
  private _isDragging: boolean;
  
  constructor(canvas: HTMLCanvasElement, options: CanvasEditorOptions = {}) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d')!;
    this._shapes = new Map();
    this._selectionManager = new SelectionManager();
    this._layerManager = new LayerManager();
    this._currentTool = 'select';
    this._isDrawing = false;
    this._startPoint = { x: 0, y: 0 };
    this._currentPoint = { x: 0, y: 0 };
    this._backgroundColor = options.backgroundColor || '#ffffff';
    this._zoom = 1;
    this._panX = 0;
    this._panY = 0;
    this._viewMatrix = new Matrix2D();
    this._inverseViewMatrix = new Matrix2D();
    this._listeners = new Map();
    this._selectionBox = null;
    this._isMultiSelect = false;
    this._draggedShapes = new Map();
    this._isDragging = false;
    
    if (options.width) canvas.width = options.width;
    if (options.height) canvas.height = options.height;
    
    this._updateViewMatrix();
    this._bindEvents();
    this._render();
  }
  
  get canvas(): HTMLCanvasElement { return this._canvas; }
  get ctx(): CanvasRenderingContext2D { return this._ctx; }
  get currentTool(): ToolType { return this._currentTool; }
  get zoom(): number { return this._zoom; }
  get panX(): number { return this._panX; }
  get panY(): number { return this._panY; }
  get selectedIds(): string[] { return this._selectionManager.selectedIds; }
  get selectedShapes(): Shape[] { return this._selectionManager.getSelectedShapes(); }
  get shapes(): Shape[] { return Array.from(this._shapes.values()); }
  
  setTool(tool: ToolType): void {
    this._currentTool = tool;
    this._emit('toolChange', { tool });
  }
  
  setZoom(zoom: number): void {
    this._zoom = Math.max(0.1, Math.min(10, zoom));
    this._updateViewMatrix();
    this._render();
    this._emit('zoomChange', { zoom: this._zoom });
  }
  
  setPan(x: number, y: number): void {
    this._panX = x;
    this._panY = y;
    this._updateViewMatrix();
    this._render();
  }
  
  zoomBy(factor: number, centerX?: number, centerY?: number): void {
    const cx = centerX ?? this._canvas.width / 2;
    const cy = centerY ?? this._canvas.height / 2;
    
    const worldPoint = this._screenToWorld({ x: cx, y: cy });
    this._zoom = Math.max(0.1, Math.min(10, this._zoom * factor));
    
    this._updateViewMatrix();
    const newScreenPoint = this._worldToScreen(worldPoint);
    
    this._panX += cx - newScreenPoint.x;
    this._panY += cy - newScreenPoint.y;
    this._updateViewMatrix();
    this._render();
  }
  
  private _updateViewMatrix(): void {
    this._viewMatrix.reset()
      .translate(this._panX, this._panY)
      .scale(this._zoom, this._zoom);
    
    this._inverseViewMatrix = this._viewMatrix.inverse();
  }
  
  private _screenToWorld(point: Point): Point {
    return this._inverseViewMatrix.transformPoint(point);
  }
  
  private _worldToScreen(point: Point): Point {
    return this._viewMatrix.transformPoint(point);
  }
  
  private _bindEvents(): void {
    this._canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
    this._canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
    this._canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
    this._canvas.addEventListener('mouseleave', this._onMouseLeave.bind(this));
    this._canvas.addEventListener('wheel', this._onWheel.bind(this));
    this._canvas.addEventListener('dblclick', this._onDoubleClick.bind(this));
  }
  
  private _onMouseDown(e: MouseEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const worldPoint = this._screenToWorld(screenPoint);
    
    this._startPoint = worldPoint;
    this._currentPoint = worldPoint;
    this._isMultiSelect = e.shiftKey;
    
    if (this._currentTool === 'select') {
      const hitShapeId = this._findShapeAtPoint(worldPoint);
      
      if (hitShapeId && this._selectionManager.has(hitShapeId)) {
        this._isDragging = true;
        this._startDrag(worldPoint);
      } else if (hitShapeId) {
        if (this._isMultiSelect) {
          this._selectionManager.toggle(hitShapeId);
        } else {
          this._selectionManager.replace([hitShapeId]);
        }
        this._isDragging = true;
        this._startDrag(worldPoint);
      } else {
        this._isDrawing = true;
        this._selectionBox = {
          x: worldPoint.x,
          y: worldPoint.y,
          width: 0,
          height: 0,
        };
      }
    } else {
      this._isDrawing = true;
    }
    
    this._emit('mouseDown', { screenPoint, worldPoint, button: e.button });
  }
  
  private _onMouseMove(e: MouseEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const worldPoint = this._screenToWorld(screenPoint);
    
    this._currentPoint = worldPoint;
    
    if (this._isDragging && this._currentTool === 'select') {
      this._drag(worldPoint);
    } else if (this._isDrawing) {
      if (this._currentTool === 'select' && this._selectionBox) {
        this._updateSelectionBox(worldPoint);
      }
    }
    
    this._render();
    this._emit('mouseMove', { screenPoint, worldPoint });
  }
  
  private _onMouseUp(e: MouseEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const worldPoint = this._screenToWorld(screenPoint);
    
    if (this._isDragging) {
      this._endDrag();
      this._isDragging = false;
    } else if (this._isDrawing) {
      if (this._currentTool === 'select' && this._selectionBox) {
        this._finishSelectionBox();
      } else {
        this._createShape();
      }
    }
    
    this._isDrawing = false;
    this._selectionBox = null;
    
    this._render();
    this._emit('mouseUp', { screenPoint, worldPoint, button: e.button });
  }
  
  private _onMouseLeave(_e: MouseEvent): void {
    if (this._isDragging) {
      this._endDrag();
      this._isDragging = false;
    }
    this._isDrawing = false;
    this._selectionBox = null;
    this._render();
  }
  
  private _onWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const rect = this._canvas.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoomBy(factor, screenPoint.x, screenPoint.y);
  }
  
  private _onDoubleClick(e: MouseEvent): void {
    const rect = this._canvas.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const worldPoint = this._screenToWorld(screenPoint);
    
    this._emit('doubleClick', { screenPoint, worldPoint });
  }
  
  private _findShapeAtPoint(point: Point): string | null {
    const shapes = Array.from(this._shapes.values())
      .filter(s => s.visible && !s.locked)
      .sort((a, b) => b.layerIndex - a.layerIndex);
    
    for (const shape of shapes) {
      if (shape.containsPoint(point)) {
        return shape.id;
      }
    }
    
    return null;
  }
  
  private _startDrag(point: Point): void {
    this._draggedShapes.clear();
    
    for (const shape of this._selectionManager.getSelectedShapes()) {
      const bbox = shape.getBoundingBox();
      this._draggedShapes.set(shape.id, {
        offsetX: point.x - bbox.x,
        offsetY: point.y - bbox.y,
      });
    }
  }
  
  private _drag(point: Point): void {
    const dx = point.x - this._startPoint.x;
    const dy = point.y - this._startPoint.y;
    
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    
    for (const shape of this._selectionManager.getSelectedShapes()) {
      shape.translate(dx, dy);
    }
    
    this._startPoint = point;
  }
  
  private _endDrag(): void {
    this._draggedShapes.clear();
    this._emit('shapesMoved', { shapeIds: this._selectionManager.selectedIds });
  }
  
  private _updateSelectionBox(point: Point): void {
    if (!this._selectionBox) return;
    
    const x = Math.min(this._startPoint.x, point.x);
    const y = Math.min(this._startPoint.y, point.y);
    const width = Math.abs(point.x - this._startPoint.x);
    const height = Math.abs(point.y - this._startPoint.y);
    
    this._selectionBox = { x, y, width, height };
  }
  
  private _finishSelectionBox(): void {
    if (!this._selectionBox) return;
    
    const hitIds: string[] = [];
    
    for (const [id, shape] of this._shapes) {
      if (!shape.visible || shape.locked) continue;
      
      const bbox = shape.getBoundingBox();
      
      if (
        bbox.x >= this._selectionBox.x &&
        bbox.y >= this._selectionBox.y &&
        bbox.x + bbox.width <= this._selectionBox.x + this._selectionBox.width &&
        bbox.y + bbox.height <= this._selectionBox.y + this._selectionBox.height
      ) {
        hitIds.push(id);
      }
    }
    
    if (this._isMultiSelect) {
      for (const id of hitIds) {
        this._selectionManager.toggle(id);
      }
    } else {
      this._selectionManager.replace(hitIds);
    }
  }
  
  private _createShape(): void {
    const dx = this._currentPoint.x - this._startPoint.x;
    const dy = this._currentPoint.y - this._startPoint.y;
    
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    
    let shape: Shape | null = null;
    
    switch (this._currentTool) {
      case 'rect':
        shape = new Rect({
          x: Math.min(this._startPoint.x, this._currentPoint.x),
          y: Math.min(this._startPoint.y, this._currentPoint.y),
          width: Math.abs(dx),
          height: Math.abs(dy),
          fill: { r: 100, g: 149, b: 237, a: 0.5 },
          stroke: { r: 102, g: 126, b: 234, a: 1 },
          strokeWidth: 2,
        });
        break;
        
      case 'ellipse':
        shape = new Ellipse({
          cx: (this._startPoint.x + this._currentPoint.x) / 2,
          cy: (this._startPoint.y + this._currentPoint.y) / 2,
          rx: Math.abs(dx) / 2,
          ry: Math.abs(dy) / 2,
          fill: { r: 236, g: 72, b: 153, a: 0.5 },
          stroke: { r: 219, g: 39, b: 119, a: 1 },
          strokeWidth: 2,
        });
        break;
        
      case 'text':
        shape = new Text({
          x: this._startPoint.x,
          y: this._startPoint.y,
          content: '双击编辑',
          fontSize: 24,
          fill: { r: 31, g: 41, b: 55, a: 1 },
        });
        break;
    }
    
    if (shape) {
      this.addShape(shape);
    }
  }
  
  addShape(shape: Shape): void {
    this._shapes.set(shape.id, shape);
    this._selectionManager.registerShape(shape);
    this._layerManager.addShapeToLayer(shape.id, this._layerManager.activeLayer.id);
    this._selectionManager.clear();
    this._selectionManager.add(shape.id);
    this._render();
    this._emit('shapeAdded', { shape });
  }
  
  removeShape(shapeId: string): boolean {
    const shape = this._shapes.get(shapeId);
    if (!shape) return false;
    
    this._shapes.delete(shapeId);
    this._selectionManager.unregisterShape(shapeId);
    this._layerManager.removeShapeFromLayer(shapeId);
    this._render();
    this._emit('shapeRemoved', { shapeId, shape });
    return true;
  }
  
  getShape(shapeId: string): Shape | undefined {
    return this._shapes.get(shapeId);
  }
  
  clear(): void {
    this._shapes.clear();
    this._selectionManager.clearShapes();
    this._layerManager = new LayerManager();
    this._render();
    this._emit('canvasCleared', {});
  }
  
  private _render(): void {
    const ctx = this._ctx;
    const canvas = this._canvas;
    
    ctx.save();
    
    ctx.fillStyle = this._backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.setTransform(
      this._viewMatrix.a, this._viewMatrix.b,
      this._viewMatrix.c, this._viewMatrix.d,
      this._viewMatrix.e, this._viewMatrix.f
    );
    
    const renderOrder = this._layerManager.getRenderOrder();
    
    for (const shapeId of renderOrder) {
      const shape = this._shapes.get(shapeId);
      if (shape) {
        shape.draw(ctx);
      }
    }
    
    for (const shape of this._selectionManager.getSelectedShapes()) {
      const bbox = shape.getBoundingBox();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      const screenBBox = {
        x: this._worldToScreen({ x: bbox.x, y: bbox.y }),
        width: bbox.width * this._zoom,
        height: bbox.height * this._zoom,
      };
      
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        screenBBox.x.x,
        screenBBox.x.y,
        screenBBox.width,
        screenBBox.height
      );
      
      ctx.setLineDash([]);
      const handleSize = 6;
      const corners = [
        { x: screenBBox.x.x, y: screenBBox.x.y },
        { x: screenBBox.x.x + screenBBox.width, y: screenBBox.x.y },
        { x: screenBBox.x.x + screenBBox.width, y: screenBBox.x.y + screenBBox.height },
        { x: screenBBox.x.x, y: screenBBox.x.y + screenBBox.height },
      ];
      
      for (const corner of corners) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.fillRect(
          corner.x - handleSize / 2,
          corner.y - handleSize / 2,
          handleSize,
          handleSize
        );
        ctx.strokeRect(
          corner.x - handleSize / 2,
          corner.y - handleSize / 2,
          handleSize,
          handleSize
        );
      }
      
      ctx.restore();
    }
    
    if (this._selectionBox) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      const screenStart = this._worldToScreen({ x: this._selectionBox.x, y: this._selectionBox.y });
      const screenEnd = this._worldToScreen({
        x: this._selectionBox.x + this._selectionBox.width,
        y: this._selectionBox.y + this._selectionBox.height,
      });
      
      ctx.fillStyle = 'rgba(102, 126, 234, 0.1)';
      ctx.strokeStyle = '#667eea';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      ctx.fillRect(
        screenStart.x,
        screenStart.y,
        screenEnd.x - screenStart.x,
        screenEnd.y - screenStart.y
      );
      ctx.strokeRect(
        screenStart.x,
        screenStart.y,
        screenEnd.x - screenStart.x,
        screenEnd.y - screenStart.y
      );
      
      ctx.restore();
    }
    
    ctx.restore();
  }
  
  saveToStorage(key?: string): boolean {
    const canvasState: CanvasState = {
      shapes: Array.from(this._shapes.values()).map(s => s.toJSON()),
      selectedIds: this._selectionManager.selectedIds,
      activeLayer: this._layerManager.activeLayer.index,
      zoom: this._zoom,
      panX: this._panX,
      panY: this._panY,
    };
    
    return Serializer.saveToLocalStorage(canvasState, this._layerManager.toJSON(), key);
  }
  
  loadFromStorage(key?: string): boolean {
    const data = Serializer.loadFromLocalStorage(key);
    
    if (!data) return false;
    
    this._shapes.clear();
    for (const shape of data.shapes) {
      this._shapes.set(shape.id, shape);
      this._selectionManager.registerShape(shape);
    }
    
    this._layerManager.fromJSON(data.layerData);
    this._selectionManager.replace(data.canvasState.selectedIds);
    this._zoom = data.canvasState.zoom;
    this._panX = data.canvasState.panX;
    this._panY = data.canvasState.panY;
    
    this._updateViewMatrix();
    this._render();
    this._emit('canvasLoaded', {});
    
    return true;
  }
  
  exportToFile(filename: string = 'canvas-project.json'): void {
    const canvasState: CanvasState = {
      shapes: Array.from(this._shapes.values()).map(s => s.toJSON()),
      selectedIds: this._selectionManager.selectedIds,
      activeLayer: this._layerManager.activeLayer.index,
      zoom: this._zoom,
      panX: this._panX,
      panY: this._panY,
    };
    
    Serializer.exportToFile(canvasState, this._layerManager.toJSON(), filename);
  }
  
  async importFromFile(file: File): Promise<boolean> {
    try {
      const data = await Serializer.importFromFile(file);
      
      this._shapes.clear();
      for (const shape of data.shapes) {
        this._shapes.set(shape.id, shape);
        this._selectionManager.registerShape(shape);
      }
      
      this._layerManager.fromJSON(data.layerData);
      this._selectionManager.replace(data.canvasState.selectedIds);
      this._zoom = data.canvasState.zoom;
      this._panX = data.canvasState.panX;
      this._panY = data.canvasState.panY;
      
      this._updateViewMatrix();
      this._render();
      this._emit('canvasLoaded', {});
      
      return true;
    } catch (error) {
      console.error('Failed to import file:', error);
      return false;
    }
  }
  
  on(event: string, callback: (event: any) => void): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
    
    return () => {
      this._listeners.get(event)?.delete(callback);
    };
  }
  
  off(event: string, callback: (event: any) => void): void {
    this._listeners.get(event)?.delete(callback);
  }
  
  private _emit(event: string, data: any): void {
    this._listeners.get(event)?.forEach(callback => callback(data));
  }
  
  destroy(): void {
    this._listeners.clear();
    this._shapes.clear();
    this._selectionManager.clearShapes();
  }
}
