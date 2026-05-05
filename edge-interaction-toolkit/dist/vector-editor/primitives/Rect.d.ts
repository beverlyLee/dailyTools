import { Shape } from './Shape';
import { RectData, BoundingBox, Point } from '../types';

export declare class Rect extends Shape {
    x: number;
    y: number;
    width: number;
    height: number;
    cornerRadius: number;
    constructor(data?: Partial<RectData>);
    getBoundingBox(): BoundingBox;
    containsPoint(point: Point): boolean;
    draw(ctx: CanvasRenderingContext2D): void;
    toJSON(): RectData;
    static fromJSON(data: RectData): Rect;
}
