import { Shape } from './Shape';
import { TextData, BoundingBox, Point } from '../types';

export declare class Text extends Shape {
    x: number;
    y: number;
    content: string;
    fontSize: number;
    fontFamily: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    constructor(data?: Partial<TextData>);
    getBoundingBox(): BoundingBox;
    private measureText;
    containsPoint(point: Point): boolean;
    draw(ctx: CanvasRenderingContext2D): void;
    toJSON(): TextData;
    static fromJSON(data: TextData): Text;
}
