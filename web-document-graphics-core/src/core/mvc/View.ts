import { EventEmitter, EventMap } from '../events/EventEmitter';
import { Model } from './Model';

export interface ViewEventMap extends EventMap {
  render: () => void;
  'render:complete': () => void;
}

export abstract class View<M extends Model = Model> extends EventEmitter<ViewEventMap> {
  protected _model: M;
  protected _container: HTMLElement | null;
  protected _canvas: HTMLCanvasElement | null;
  protected _context: CanvasRenderingContext2D | null;
  protected _isRendering: boolean;
  protected _renderPending: boolean;

  constructor(model: M, container?: HTMLElement, canvas?: HTMLCanvasElement) {
    super();
    this._model = model;
    this._container = container || null;
    this._canvas = canvas || null;
    this._context = canvas ? canvas.getContext('2d') : null;
    this._isRendering = false;
    this._renderPending = false;
    this.setupEventListeners();
  }

  get model(): M {
    return this._model;
  }

  get container(): HTMLElement | null {
    return this._container;
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  get context(): CanvasRenderingContext2D | null {
    return this._context;
  }

  setContainer(container: HTMLElement): this {
    this._container = container;
    return this;
  }

  setCanvas(canvas: HTMLCanvasElement): this {
    this._canvas = canvas;
    this._context = canvas.getContext('2d');
    return this;
  }

  protected setupEventListeners(): void {
    this._model.on('change', () => this.scheduleRender());
  }

  scheduleRender(): void {
    if (this._isRendering) {
      this._renderPending = true;
    } else {
      this.render();
    }
  }

  render(): this {
    if (!this._canvas || !this._context) {
      return this;
    }
    this._isRendering = true;
    this.emit('render');
    try {
      this.onRender();
      this.emit('render:complete');
    } finally {
      this._isRendering = false;
      if (this._renderPending) {
        this._renderPending = false;
        this.render();
      }
    }
    return this;
  }

  protected abstract onRender(): void;

  clearCanvas(): void {
    if (!this._canvas || !this._context) {
      return;
    }
    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
  }

  resizeCanvas(width: number, height: number, scale: number = 1): this {
    if (!this._canvas) {
      return this;
    }
    const dpr = window.devicePixelRatio || 1;
    const actualScale = scale * dpr;
    this._canvas.width = width * actualScale;
    this._canvas.height = height * actualScale;
    this._canvas.style.width = `${width}px`;
    this._canvas.style.height = `${height}px`;
    if (this._context) {
      this._context.setTransform(actualScale, 0, 0, actualScale, 0, 0);
    }
    return this;
  }

  getCanvasSize(): { width: number; height: number } {
    if (!this._canvas) {
      return { width: 0, height: 0 };
    }
    const scale = this._context?.getTransform().a || 1;
    return {
      width: this._canvas.width / scale,
      height: this._canvas.height / scale,
    };
  }

  destroy(): void {
    this._model.removeAllListeners();
    this.removeAllListeners();
    this._container = null;
    this._canvas = null;
    this._context = null;
  }
}
