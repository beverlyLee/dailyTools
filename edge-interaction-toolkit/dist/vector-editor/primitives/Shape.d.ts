import { ShapeData, Color, TransformData, BoundingBox, Point } from '../types';
import { Matrix2D } from '../transforms';

export declare abstract class Shape {
    id: string;
    transform: TransformData;
    fill?: Color;
    stroke?: Color;
    strokeWidth: number;
    visible: boolean;
    locked: boolean;
    layerIndex: number;
    name: string;
    protected matrix: Matrix2D;
    protected inverseMatrix: Matrix2D;
    constructor(data?: Partial<ShapeData>);
    protected generateId(): string;
    protected updateMatrices(): void;
    translate(tx: number, ty: number): void;
    rotate(angle: number): void;
    scale(sx: number, sy: number): void;
    setTransform(transform: Partial<TransformData>): void;
    localToGlobal(point: Point): Point;
    globalToLocal(point: Point): Point;
    applyTransform(ctx: CanvasRenderingContext2D): void;
    abstract getBoundingBox(): BoundingBox;
    abstract containsPoint(point: Point): boolean;
    abstract draw(ctx: CanvasRenderingContext2D): void;
    abstract toJSON(): ShapeData;
    protected drawStyle(ctx: CanvasRenderingContext2D): void;
    protected colorToString(color: Color): string;
    clone(): Shape;
}
