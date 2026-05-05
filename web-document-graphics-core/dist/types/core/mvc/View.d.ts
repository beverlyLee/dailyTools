import { EventEmitter, EventMap } from '../events/EventEmitter';
import { Model } from './Model';

export interface ViewEventMap extends EventMap {
    render: () => void;
    'render:complete': () => void;
}
export declare abstract class View<M extends Model = Model> extends EventEmitter<ViewEventMap> {
    protected _model: M;
    protected _container: HTMLElement | null;
    protected _canvas: HTMLCanvasElement | null;
    protected _context: CanvasRenderingContext2D | null;
    protected _isRendering: boolean;
    protected _renderPending: boolean;
    constructor(model: M, container?: HTMLElement, canvas?: HTMLCanvasElement);
    get model(): M;
    get container(): HTMLElement | null;
    get canvas(): HTMLCanvasElement | null;
    get context(): CanvasRenderingContext2D | null;
    setContainer(container: HTMLElement): this;
    setCanvas(canvas: HTMLCanvasElement): this;
    protected setupEventListeners(): void;
    scheduleRender(): void;
    render(): this;
    protected abstract onRender(): void;
    clearCanvas(): void;
    resizeCanvas(width: number, height: number, scale?: number): this;
    getCanvasSize(): {
        width: number;
        height: number;
    };
    destroy(): void;
}
