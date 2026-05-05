import { View, Matrix2D, Point, Bounds } from '../core';
import { GraphicsModel } from './GraphicsModel';
import { Graphics } from './types';

export declare class GraphicsView extends View<GraphicsModel> {
    private _transform;
    constructor(model: GraphicsModel, canvas: HTMLCanvasElement);
    private setupCanvas;
    resizeCanvas(width: number, height: number): this;
    get transform(): Matrix2D;
    set transform(matrix: Matrix2D);
    screenToWorld(point: Point): Point;
    worldToScreen(point: Point): Point;
    protected onRender(): void;
    private renderGraphics;
    private applyTransform;
    private renderRect;
    private drawRoundedRect;
    private renderEllipse;
    private renderPath;
    private renderText;
    private renderSelectionBounds;
    private renderResizeHandles;
    getGraphicsBounds(graphics: Graphics): Bounds | null;
    hitTest(graphics: Graphics, point: Point): boolean;
    private transformPointToLocal;
    private hitTestPath;
    private distanceToLineSegment;
    redraw(): Promise<void>;
}
