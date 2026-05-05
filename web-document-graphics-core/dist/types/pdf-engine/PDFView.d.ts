import { View } from '../core';
import { PDFModel } from './PDFModel';

export declare class PDFView extends View<PDFModel> {
    private _annotationCanvas;
    private _annotationContext;
    private _pageSize;
    constructor(model: PDFModel, canvas: HTMLCanvasElement, annotationCanvas?: HTMLCanvasElement);
    get annotationCanvas(): HTMLCanvasElement | null;
    get annotationContext(): CanvasRenderingContext2D | null;
    get pageSize(): {
        width: number;
        height: number;
    } | null;
    setAnnotationCanvas(canvas: HTMLCanvasElement): this;
    renderPage(): Promise<void>;
    renderAnnotations(): void;
    private renderAnnotation;
    private renderHighlight;
    private renderUnderline;
    private renderTextbox;
    private renderFreehand;
    private scaleBounds;
    private scalePoint;
    private wrapText;
    clearAnnotationLayer(): void;
    protected onRender(): void;
    destroy(): void;
}
