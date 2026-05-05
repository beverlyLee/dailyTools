import { EventEmitter, EventMap } from '../events/EventEmitter';
import { Model } from './Model';
import { View } from './View';
import { Point, GeometryUtils } from '../utils/GeometryUtils';

export interface ControllerEventMap extends EventMap {
  'tool:change': (toolId: string) => void;
  'canvas:click': (point: Point, event: MouseEvent) => void;
  'canvas:mousedown': (point: Point, event: MouseEvent) => void;
  'canvas:mousemove': (point: Point, event: MouseEvent) => void;
  'canvas:mouseup': (point: Point, event: MouseEvent) => void;
  'canvas:mouseleave': (event: MouseEvent) => void;
  'canvas:wheel': (delta: Point, event: WheelEvent) => void;
  'key:down': (key: string, event: KeyboardEvent) => void;
  'key:up': (key: string, event: KeyboardEvent) => void;
}

export interface ITool {
  id: string;
  name: string;
  cursor: string;
  onMouseDown?(point: Point, event: MouseEvent): void;
  onMouseMove?(point: Point, event: MouseEvent): void;
  onMouseUp?(point: Point, event: MouseEvent): void;
  onMouseLeave?(event: MouseEvent): void;
  onWheel?(delta: Point, event: WheelEvent): void;
  onKeyDown?(key: string, event: KeyboardEvent): void;
  onKeyUp?(key: string, event: KeyboardEvent): void;
  activate?(): void;
  deactivate?(): void;
}

export abstract class Controller<M extends Model = Model, V extends View<M> = View<M>> extends EventEmitter<ControllerEventMap> {
  protected _model: M;
  protected _view: V;
  protected _canvas: HTMLCanvasElement | null;
  protected _tools: Map<string, ITool>;
  protected _activeToolId: string | null;
  protected _isMouseDown: boolean;
  protected _lastMousePosition: Point;
  protected _keysPressed: Set<string>;

  constructor(model: M, view: V) {
    super();
    this._model = model;
    this._view = view;
    this._canvas = view.canvas;
    this._tools = new Map();
    this._activeToolId = null;
    this._isMouseDown = false;
    this._lastMousePosition = { x: 0, y: 0 };
    this._keysPressed = new Set();
    this.setupEventListeners();
  }

  get model(): M {
    return this._model;
  }

  get view(): V {
    return this._view;
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  get activeToolId(): string | null {
    return this._activeToolId;
  }

  get activeTool(): ITool | null {
    return this._activeToolId ? this._tools.get(this._activeToolId) || null : null;
  }

  registerTool(tool: ITool): this {
    this._tools.set(tool.id, tool);
    return this;
  }

  unregisterTool(toolId: string): this {
    if (this._activeToolId === toolId) {
      this.deactivateTool();
    }
    this._tools.delete(toolId);
    return this;
  }

  activateTool(toolId: string): this {
    const tool = this._tools.get(toolId);
    if (!tool) {
      return this;
    }
    if (this._activeToolId) {
      const currentTool = this._tools.get(this._activeToolId);
      currentTool?.deactivate?.();
    }
    this._activeToolId = toolId;
    tool.activate?.();
    if (this._canvas) {
      this._canvas.style.cursor = tool.cursor;
    }
    this.emit('tool:change', toolId);
    return this;
  }

  deactivateTool(): this {
    if (this._activeToolId) {
      const tool = this._tools.get(this._activeToolId);
      tool?.deactivate?.();
      this._activeToolId = null;
      if (this._canvas) {
        this._canvas.style.cursor = 'default';
      }
      this.emit('tool:change', '');
    }
    return this;
  }

  protected setupEventListeners(): void {
    if (!this._canvas) {
      return;
    }
    this._canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this._canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this._canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this._canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this._canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  protected getMousePosition(event: MouseEvent): Point {
    if (!this._canvas) {
      return { x: 0, y: 0 };
    }
    return GeometryUtils.getMousePosition(this._canvas, event);
  }

  protected handleMouseDown(event: MouseEvent): void {
    if (!this._canvas) return;
    this._isMouseDown = true;
    const point = this.getMousePosition(event);
    this._lastMousePosition = point;
    this.emit('canvas:mousedown', point, event);
    const activeTool = this.activeTool;
    activeTool?.onMouseDown?.(point, event);
  }

  protected handleMouseMove(event: MouseEvent): void {
    if (!this._canvas) return;
    const point = this.getMousePosition(event);
    this._lastMousePosition = point;
    this.emit('canvas:mousemove', point, event);
    const activeTool = this.activeTool;
    activeTool?.onMouseMove?.(point, event);
  }

  protected handleMouseUp(event: MouseEvent): void {
    if (!this._canvas) return;
    const point = this.getMousePosition(event);
    this._isMouseDown = false;
    this.emit('canvas:mouseup', point, event);
    const activeTool = this.activeTool;
    activeTool?.onMouseUp?.(point, event);
  }

  protected handleMouseLeave(event: MouseEvent): void {
    this._isMouseDown = false;
    this.emit('canvas:mouseleave', event);
    const activeTool = this.activeTool;
    activeTool?.onMouseLeave?.(event);
  }

  protected handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta: Point = {
      x: event.deltaX,
      y: event.deltaY,
    };
    this.emit('canvas:wheel', delta, event);
    const activeTool = this.activeTool;
    activeTool?.onWheel?.(delta, event);
  }

  protected handleKeyDown(event: KeyboardEvent): void {
    this._keysPressed.add(event.key);
    this.emit('key:down', event.key, event);
    const activeTool = this.activeTool;
    activeTool?.onKeyDown?.(event.key, event);
  }

  protected handleKeyUp(event: KeyboardEvent): void {
    this._keysPressed.delete(event.key);
    this.emit('key:up', event.key, event);
    const activeTool = this.activeTool;
    activeTool?.onKeyUp?.(event.key, event);
  }

  isKeyPressed(key: string): boolean {
    return this._keysPressed.has(key);
  }

  isCtrlPressed(): boolean {
    return this.isKeyPressed('Control') || this.isKeyPressed('Meta');
  }

  isShiftPressed(): boolean {
    return this.isKeyPressed('Shift');
  }

  isAltPressed(): boolean {
    return this.isKeyPressed('Alt');
  }

  destroy(): void {
    if (this._canvas) {
      this._canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
      this._canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
      this._canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
      this._canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
      this._canvas.removeEventListener('wheel', this.handleWheel.bind(this));
    }
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    this._tools.clear();
    this._activeToolId = null;
    this.removeAllListeners();
  }
}
