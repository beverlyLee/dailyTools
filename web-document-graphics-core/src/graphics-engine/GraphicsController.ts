import { Controller, Point, GeometryUtils } from '../core';
import { GraphicsModel } from './GraphicsModel';
import { GraphicsView } from './GraphicsView';
import { Transform, FillStyle, StrokeStyle, TextStyle } from './types';

type DrawingMode = 'select' | 'rect' | 'ellipse' | 'path' | 'text';

export class GraphicsController extends Controller<GraphicsModel, GraphicsView> {
  private _drawingMode: DrawingMode = 'select';
  private _isDrawing: boolean = false;
  private _drawStart: Point | null = null;
  private _drawEnd: Point | null = null;
  private _pathPoints: Point[] = [];
  private _isDragging: boolean = false;
  private _dragStart: Point | null = null;
  private _originalTransforms: Map<string, Transform> = new Map();
  private _fillColor: string = '#2196f3';
  private _strokeColor: string = '#1976d2';
  private _strokeWidth: number = 2;

  constructor(model: GraphicsModel, view: GraphicsView) {
    super(model, view);
    this.setupTools();
  }

  get drawingMode(): DrawingMode {
    return this._drawingMode;
  }

  get fillColor(): string {
    return this._fillColor;
  }

  set fillColor(color: string) {
    this._fillColor = color;
  }

  get strokeColor(): string {
    return this._strokeColor;
  }

  set strokeColor(color: string) {
    this._strokeColor = color;
  }

  get strokeWidth(): number {
    return this._strokeWidth;
  }

  set strokeWidth(width: number) {
    this._strokeWidth = Math.max(1, width);
  }

  private setupTools(): void {
    this.registerTool({
      id: 'select',
      name: '选择工具',
      cursor: 'default',
      onMouseDown: (point) => this.handleSelectMouseDown(point),
      onMouseMove: (point) => this.handleSelectMouseMove(point),
      onMouseUp: (point) => this.handleSelectMouseUp(point),
    });

    this.registerTool({
      id: 'rect',
      name: '矩形工具',
      cursor: 'crosshair',
      onMouseDown: (point) => this.startDraw('rect', point),
      onMouseMove: (point) => this.updateDraw(point),
      onMouseUp: (point) => this.finishDraw(point),
    });

    this.registerTool({
      id: 'ellipse',
      name: '椭圆工具',
      cursor: 'crosshair',
      onMouseDown: (point) => this.startDraw('ellipse', point),
      onMouseMove: (point) => this.updateDraw(point),
      onMouseUp: (point) => this.finishDraw(point),
    });

    this.registerTool({
      id: 'path',
      name: '路径工具',
      cursor: 'crosshair',
      onMouseDown: (point) => this.startPath(point),
      onMouseMove: (point) => this.updatePath(point),
      onMouseUp: (point) => this.finishPath(point),
    });

    this.registerTool({
      id: 'text',
      name: '文本工具',
      cursor: 'text',
      onMouseDown: (point) => this.createText(point),
    });

    this.activateTool('select');
  }

  setDrawingMode(mode: DrawingMode): void {
    this._drawingMode = mode;
    this.activateTool(mode);
  }

  private handleSelectMouseDown(point: Point): void {
    const worldPoint = this._view.screenToWorld(point);
    
    const graphics = this._model.getSortedGraphics().reverse();
    let clickedId: string | null = null;

    for (const g of graphics) {
      if (g.visible && !g.locked && this._view.hitTest(g, worldPoint)) {
        clickedId = g.id;
        break;
      }
    }

    const isShiftPressed = this.isShiftPressed();

    if (clickedId) {
      if (isShiftPressed) {
        const currentSelected = this._model.selectedIds;
        if (currentSelected.includes(clickedId)) {
          this._model.deselect(clickedId);
        } else {
          this._model.select(clickedId, true);
        }
      } else {
        if (!this._model.selectedIds.includes(clickedId)) {
          this._model.select(clickedId);
        }
        this._isDragging = true;
        this._dragStart = { ...worldPoint };
        
        this._originalTransforms.clear();
        for (const id of this._model.selectedIds) {
          const g = this._model.getGraphics(id);
          if (g) {
            this._originalTransforms.set(id, { ...g.transform });
          }
        }
      }
    } else {
      if (!isShiftPressed) {
        this._model.deselectAll();
      }
    }

    this._view.render();
  }

  private handleSelectMouseMove(point: Point): void {
    if (!this._isDragging || !this._dragStart) return;

    const worldPoint = this._view.screenToWorld(point);
    const dx = worldPoint.x - this._dragStart.x;
    const dy = worldPoint.y - this._dragStart.y;

    for (const id of this._model.selectedIds) {
      const original = this._originalTransforms.get(id);
      if (original) {
        this._model.updateGraphics(id, {
          transform: {
            ...original,
            x: original.x + dx,
            y: original.y + dy,
          },
        });
      }
    }

    this._view.render();
  }

  private handleSelectMouseUp(_point: Point): void {
    this._isDragging = false;
    this._dragStart = null;
    this._originalTransforms.clear();
  }

  private startDraw(_type: 'rect' | 'ellipse', point: Point): void {
    this._isDrawing = true;
    this._drawStart = this._view.screenToWorld(point);
    this._drawEnd = { ...this._drawStart };
  }

  private updateDraw(point: Point): void {
    if (!this._isDrawing || !this._drawStart) return;

    this._drawEnd = this._view.screenToWorld(point);
    this._view.render();
    this.renderPreview();
  }

  private finishDraw(point: Point): void {
    if (!this._isDrawing || !this._drawStart) {
      this._isDrawing = false;
      return;
    }

    this._drawEnd = this._view.screenToWorld(point);

    const x1 = this._drawStart.x;
    const y1 = this._drawStart.y;
    const x2 = this._drawEnd.x;
    const y2 = this._drawEnd.y;

    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2);
    const maxY = Math.max(y1, y2);

    const width = maxX - minX;
    const height = maxY - minY;

    if (width < 5 && height < 5) {
      this._isDrawing = false;
      this._drawStart = null;
      this._drawEnd = null;
      return;
    }

    const fill: FillStyle = {
      color: this._fillColor,
      opacity: 0.8,
    };

    const stroke: StrokeStyle = {
      color: this._strokeColor,
      width: this._strokeWidth,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    };

    if (this._drawingMode === 'rect') {
      this._model.addGraphics({
        type: 'rect',
        width,
        height,
        cornerRadius: 0,
        transform: { x: minX, y: minY },
        fill,
        stroke,
      });
    } else if (this._drawingMode === 'ellipse') {
      this._model.addGraphics({
        type: 'ellipse',
        radiusX: width / 2,
        radiusY: height / 2,
        transform: { x: minX + width / 2, y: minY + height / 2 },
        fill,
        stroke,
      });
    }

    this._isDrawing = false;
    this._drawStart = null;
    this._drawEnd = null;
    this._view.render();
  }

  private renderPreview(): void {
    if (!this._isDrawing || !this._drawStart || !this._drawEnd) return;

    const ctx = this._view.context;
    if (!ctx) return;

    const x1 = this._drawStart.x;
    const y1 = this._drawStart.y;
    const x2 = this._drawEnd.x;
    const y2 = this._drawEnd.y;

    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    ctx.save();
    ctx.strokeStyle = this._strokeColor;
    ctx.fillStyle = this._fillColor;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = this._strokeWidth;
    ctx.setLineDash([5, 5]);

    if (this._drawingMode === 'rect') {
      ctx.beginPath();
      ctx.rect(minX, minY, width, height);
      ctx.fill();
      ctx.stroke();
    } else if (this._drawingMode === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(
        minX + width / 2,
        minY + height / 2,
        width / 2,
        height / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  private startPath(point: Point): void {
    this._isDrawing = true;
    this._pathPoints = [this._view.screenToWorld(point)];
  }

  private updatePath(point: Point): void {
    if (!this._isDrawing) return;

    const worldPoint = this._view.screenToWorld(point);
    this._pathPoints.push(worldPoint);
    this._view.render();
    this.renderPathPreview();
  }

  private finishPath(point: Point): void {
    if (!this._isDrawing || this._pathPoints.length < 2) {
      this._isDrawing = false;
      this._pathPoints = [];
      return;
    }

    this._pathPoints.push(this._view.screenToWorld(point));

    const stroke: StrokeStyle = {
      color: this._strokeColor,
      width: this._strokeWidth,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    };

    this._model.addGraphics({
      type: 'path',
      points: [...this._pathPoints],
      closed: false,
      transform: { x: 0, y: 0 },
      stroke,
    });

    this._isDrawing = false;
    this._pathPoints = [];
    this._view.render();
  }

  private renderPathPreview(): void {
    if (!this._isDrawing || this._pathPoints.length < 2) return;

    const ctx = this._view.context;
    if (!ctx) return;

    ctx.save();
    ctx.strokeStyle = this._strokeColor;
    ctx.lineWidth = this._strokeWidth;
    ctx.globalAlpha = 0.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(this._pathPoints[0].x, this._pathPoints[0].y);
    for (let i = 1; i < this._pathPoints.length; i++) {
      ctx.lineTo(this._pathPoints[i].x, this._pathPoints[i].y);
    }
    ctx.stroke();

    ctx.restore();
  }

  private createText(point: Point): void {
    const text = prompt('请输入文本内容:');
    if (!text) return;

    const worldPoint = this._view.screenToWorld(point);

    const fill: FillStyle = {
      color: this._fillColor,
      opacity: 1,
    };

    const textStyle: TextStyle = {
      fontFamily: 'sans-serif',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      textBaseline: 'top',
    };

    this._model.addGraphics({
      type: 'text',
      content: text,
      textStyle,
      transform: { x: worldPoint.x, y: worldPoint.y },
      fill,
    });

    this._view.render();
  }

  deleteSelected(): void {
    const selectedIds = [...this._model.selectedIds];
    for (const id of selectedIds) {
      this._model.removeGraphics(id);
    }
    this._model.deselectAll();
    this._view.render();
  }

  bringToFront(): void {
    const selectedIds = [...this._model.selectedIds];
    for (const id of selectedIds) {
      this._model.bringToFront(id);
    }
    this._view.render();
  }

  sendToBack(): void {
    const selectedIds = [...this._model.selectedIds];
    for (const id of selectedIds.reverse()) {
      this._model.sendToBack(id);
    }
    this._view.render();
  }

  bringForward(): void {
    const selectedIds = [...this._model.selectedIds];
    for (const id of selectedIds.reverse()) {
      this._model.bringForward(id);
    }
    this._view.render();
  }

  sendBackward(): void {
    const selectedIds = [...this._model.selectedIds];
    for (const id of selectedIds) {
      this._model.sendBackward(id);
    }
    this._view.render();
  }

  setSelectedTransform(updates: Partial<Transform>): void {
    for (const id of this._model.selectedIds) {
      const g = this._model.getGraphics(id);
      if (g) {
        this._model.updateGraphics(id, {
          transform: { ...g.transform, ...updates },
        });
      }
    }
    this._view.render();
  }

  scaleSelected(scaleX: number, scaleY: number = scaleX): void {
    for (const id of this._model.selectedIds) {
      const g = this._model.getGraphics(id);
      if (g) {
        this._model.updateGraphics(id, {
          transform: {
            ...g.transform,
            scaleX: Math.max(0.1, scaleX),
            scaleY: Math.max(0.1, scaleY),
          },
        });
      }
    }
    this._view.render();
  }

  rotateSelected(degrees: number): void {
    for (const id of this._model.selectedIds) {
      const g = this._model.getGraphics(id);
      if (g) {
        const radians = GeometryUtils.degToRad(degrees);
        this._model.updateGraphics(id, {
          transform: {
            ...g.transform,
            rotation: radians,
          },
        });
      }
    }
    this._view.render();
  }

  clearAll(): void {
    this._model.clearAll();
    this._view.render();
  }

  undo(): boolean {
    const result = this._model.undo();
    if (result) this._view.render();
    return result;
  }

  redo(): boolean {
    const result = this._model.redo();
    if (result) this._view.render();
    return result;
  }

  toJSON(): string {
    return JSON.stringify(this._model.serialize());
  }

  fromJSON(json: string): void {
    try {
      const data = JSON.parse(json);
      this._model.deserialize(data);
      this._view.render();
    } catch (e) {
      console.error('Failed to parse graphics JSON:', e);
    }
  }

  saveToLocalStorage(key: string = 'graphics-canvas'): void {
    try {
      localStorage.setItem(key, this.toJSON());
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  loadFromLocalStorage(key: string = 'graphics-canvas'): boolean {
    try {
      const json = localStorage.getItem(key);
      if (json) {
        this.fromJSON(json);
        return true;
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
    return false;
  }
}
