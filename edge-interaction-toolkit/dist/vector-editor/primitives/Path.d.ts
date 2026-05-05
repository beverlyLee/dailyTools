import { Shape } from './Shape';
import { PathData, PathCommand, BoundingBox, Point } from '../types';

export declare class Path extends Shape {
    commands: PathCommand[];
    closed: boolean;
    constructor(data?: Partial<PathData>);
    getBoundingBox(): BoundingBox;
    private getPathPoints;
    containsPoint(point: Point): boolean;
    private createPath2D;
    draw(ctx: CanvasRenderingContext2D): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    cubicCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    closePath(): void;
    toJSON(): PathData;
    static fromJSON(data: PathData): Path;
}
