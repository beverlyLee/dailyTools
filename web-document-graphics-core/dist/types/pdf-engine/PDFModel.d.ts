import { Model } from '../core';
import { DocumentInfo, Annotation, TextSelection, PDFRenderOptions } from './types';

export interface PDFModelData {
    documentId: string | null;
    documentInfo: DocumentInfo | null;
    currentPage: number;
    pageCount: number;
    scale: number;
    rotation: number;
    annotations: Map<number, Annotation[]>;
    textSelection: TextSelection | null;
    isRendering: boolean;
    lastError: Error | null;
}
export declare class PDFModel extends Model<PDFModelData> {
    private _pdfDocument;
    constructor();
    get pdfDocument(): unknown;
    get documentId(): string | null;
    get documentInfo(): DocumentInfo | null;
    get currentPage(): number;
    get pageCount(): number;
    get scale(): number;
    get rotation(): number;
    get renderOptions(): PDFRenderOptions;
    get annotations(): ReadonlyMap<number, Annotation[]>;
    get textSelection(): TextSelection | null;
    get isRendering(): boolean;
    setPDFDocument(doc: unknown, info: DocumentInfo): void;
    clearDocument(): void;
    setCurrentPage(page: number): boolean;
    nextPage(): boolean;
    prevPage(): boolean;
    goToPage(page: number): boolean;
    setScale(scale: number): void;
    zoomIn(factor?: number): void;
    zoomOut(factor?: number): void;
    resetZoom(): void;
    setRotation(degrees: number): void;
    rotateClockwise(): void;
    rotateCounterClockwise(): void;
    addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Annotation;
    updateAnnotation(annotationId: string, updates: Partial<Annotation>): Annotation | null;
    removeAnnotation(annotationId: string): boolean;
    getAnnotationsForPage(page: number): Annotation[];
    setTextSelection(selection: TextSelection | null): void;
    clearTextSelection(): void;
    setRendering(rendering: boolean): void;
    setError(error: Error | null): void;
    getPageAnnotationsData(): Record<number, Annotation[]>;
    loadPageAnnotationsData(data: Record<number, Annotation[]>): void;
    clone(): Model<PDFModelData>;
}
