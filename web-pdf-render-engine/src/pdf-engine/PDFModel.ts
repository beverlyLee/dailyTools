import { EventEmitter } from '../core';
import { 
  Annotation, 
  DocumentInfo, 
  TextSelection, 
  PDFRenderOptions,
  PDFEngineEventMap 
} from '../types';

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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class PDFModel extends EventEmitter<PDFEngineEventMap> {
  private _pdfDocument: unknown;
  private _data: PDFModelData;

  constructor() {
    super();
    this._pdfDocument = null;
    this._data = {
      documentId: null,
      documentInfo: null,
      currentPage: 1,
      pageCount: 0,
      scale: 1.0,
      rotation: 0,
      annotations: new Map(),
      textSelection: null,
      isRendering: false,
      lastError: null,
    };
  }

  get pdfDocument(): unknown {
    return this._pdfDocument;
  }

  get documentId(): string | null {
    return this._data.documentId;
  }

  get documentInfo(): DocumentInfo | null {
    return this._data.documentInfo;
  }

  get currentPage(): number {
    return this._data.currentPage;
  }

  get pageCount(): number {
    return this._data.pageCount;
  }

  get scale(): number {
    return this._data.scale;
  }

  get rotation(): number {
    return this._data.rotation;
  }

  get renderOptions(): PDFRenderOptions {
    return {
      scale: this._data.scale,
      rotation: this._data.rotation,
    };
  }

  get annotations(): ReadonlyMap<number, Annotation[]> {
    return this._data.annotations;
  }

  get textSelection(): TextSelection | null {
    return this._data.textSelection;
  }

  get isRendering(): boolean {
    return this._data.isRendering;
  }

  setPDFDocument(doc: unknown, info: DocumentInfo): void {
    this._pdfDocument = doc;
    this._data.documentId = info.id;
    this._data.documentInfo = info;
    this._data.pageCount = info.pageCount;
    this._data.currentPage = 1;
    this._data.annotations.clear();
  }

  clearDocument(): void {
    this._pdfDocument = null;
    this._data.documentId = null;
    this._data.documentInfo = null;
    this._data.pageCount = 0;
    this._data.currentPage = 1;
    this._data.scale = 1.0;
    this._data.rotation = 0;
    this._data.annotations.clear();
    this._data.textSelection = null;
  }

  setCurrentPage(page: number): boolean {
    if (page < 1 || page > this._data.pageCount) {
      return false;
    }
    this._data.currentPage = page;
    this._data.textSelection = null;
    return true;
  }

  nextPage(): boolean {
    return this.setCurrentPage(this._data.currentPage + 1);
  }

  prevPage(): boolean {
    return this.setCurrentPage(this._data.currentPage - 1);
  }

  goToPage(page: number): boolean {
    return this.setCurrentPage(page);
  }

  setScale(scale: number): void {
    const clampedScale = Math.max(0.1, Math.min(5.0, scale));
    this._data.scale = clampedScale;
  }

  zoomIn(factor: number = 0.1): void {
    this.setScale(this._data.scale + factor);
  }

  zoomOut(factor: number = 0.1): void {
    this.setScale(this._data.scale - factor);
  }

  resetZoom(): void {
    this.setScale(1.0);
  }

  setRotation(degrees: number): void {
    const normalized = ((degrees % 360) + 360) % 360;
    this._data.rotation = normalized;
  }

  rotateClockwise(): void {
    this.setRotation(this._data.rotation + 90);
  }

  rotateCounterClockwise(): void {
    this.setRotation(this._data.rotation - 90);
  }

  addAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Annotation {
    const newAnnotation: Annotation = {
      ...annotation,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as Annotation;

    const pageAnnotations = this._data.annotations.get(newAnnotation.page) || [];
    pageAnnotations.push(newAnnotation);
    this._data.annotations.set(newAnnotation.page, pageAnnotations);

    return newAnnotation;
  }

  updateAnnotation(annotationId: string, updates: Partial<Annotation>): Annotation | null {
    for (const [page, annotations] of this._data.annotations) {
      const index = annotations.findIndex((a) => a.id === annotationId);
      if (index !== -1) {
        const updated: Annotation = {
          ...annotations[index],
          ...updates,
          id: annotationId,
          updatedAt: Date.now(),
        } as Annotation;
        annotations[index] = updated;
        this._data.annotations.set(page, annotations);
        return updated;
      }
    }
    return null;
  }

  removeAnnotation(annotationId: string): boolean {
    for (const [page, annotations] of this._data.annotations) {
      const index = annotations.findIndex((a) => a.id === annotationId);
      if (index !== -1) {
        annotations.splice(index, 1);
        this._data.annotations.set(page, annotations);
        return true;
      }
    }
    return false;
  }

  getAnnotationsForPage(page: number): Annotation[] {
    return [...(this._data.annotations.get(page) || [])];
  }

  setTextSelection(selection: TextSelection | null): void {
    this._data.textSelection = selection;
  }

  clearTextSelection(): void {
    this._data.textSelection = null;
  }

  setRendering(rendering: boolean): void {
    this._data.isRendering = rendering;
  }

  setError(error: Error | null): void {
    this._data.lastError = error;
  }

  getPageAnnotationsData(): Record<number, Annotation[]> {
    const result: Record<number, Annotation[]> = {};
    for (const [page, annotations] of this._data.annotations) {
      result[page] = [...annotations];
    }
    return result;
  }

  loadPageAnnotationsData(data: Record<number, Annotation[]>): void {
    this._data.annotations.clear();
    for (const [page, annotations] of Object.entries(data)) {
      this._data.annotations.set(parseInt(page, 10), [...annotations]);
    }
  }
}
