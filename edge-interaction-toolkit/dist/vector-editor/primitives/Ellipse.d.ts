import { Shape } from './Shape';
import { EllipseData, BoundingBox, Point } from '../types';

export declare class Ellipse extends Shape {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rotation: number;
    constructor(data?: Partial<EllipseData>);
    getBoundingBox(): BoundingBox;
    containsPoint(point: Point): boolean;
    draw(ctx: CanvasRenderingContext2D): void;
    toJSON(): EllipseData;
    static fromJSON(data: EllipseData): Ellipse;
}
