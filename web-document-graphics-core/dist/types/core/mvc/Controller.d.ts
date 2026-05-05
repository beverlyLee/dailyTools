import { EventEmitter, EventMap } from '../events/EventEmitter';
import { Model } from './Model';
import { View } from './View';
import { Point } from '../utils/GeometryUtils';

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
export declare abstract class Controller<M extends Model = Model, V extends View<M> = View<M>> extends EventEmitter<ControllerEventMap> {
    protected _model: M;
    protected _view: V;
    protected _canvas: HTMLCanvasElement | null;
    protected _tools: Map<string, ITool>;
    protected _activeToolId: string | null;
    protected _isMouseDown: boolean;
    protected _lastMousePosition: Point;
    protected _keysPressed: Set<string>;
    constructor(model: M, view: V);
    get model(): M;
    get view(): V;
    get canvas(): HTMLCanvasElement | null;
    get activeToolId(): string | null;
    get activeTool(): ITool | null;
    registerTool(tool: ITool): this;
    unregisterTool(toolId: string): this;
    activateTool(toolId: string): this;
    deactivateTool(): this;
    protected setupEventListeners(): void;
    protected getMousePosition(event: MouseEvent): Point;
    protected handleMouseDown(event: MouseEvent): void;
    protected handleMouseMove(event: MouseEvent): void;
    protected handleMouseUp(event: MouseEvent): void;
    protected handleMouseLeave(event: MouseEvent): void;
    protected handleWheel(event: WheelEvent): void;
    protected handleKeyDown(event: KeyboardEvent): void;
    protected handleKeyUp(event: KeyboardEvent): void;
    isKeyPressed(key: string): boolean;
    isCtrlPressed(): boolean;
    isShiftPressed(): boolean;
    isAltPressed(): boolean;
    destroy(): void;
}
