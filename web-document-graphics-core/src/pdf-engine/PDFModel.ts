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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class PDFModel extends Model<PDFModelData> {
  private _pdfDocument: unknown;

  constructor() {
    super({
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
    });
    this._pdfDocument = null;
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
    this.set('documentId', info.id);
    this.set('documentInfo', info);
    this.set('pageCount', info.pageCount);
    this.set('currentPage', 1);
    this._data.annotations.clear();
  }

  clearDocument(): void {
    this._pdfDocument = null;
    this.set('documentId', null);
    this.set('documentInfo', null);
    this.set('pageCount', 0);
    this.set('currentPage', 1);
    this.set('scale', 1.0);
    this.set('rotation', 0);
    this._data.annotations.clear();
    this.set('textSelection', null);
  }

  setCurrentPage(page: number): boolean {
    if (page < 1 || page > this._data.pageCount) {
      return false;
    }
    this.set('currentPage', page);
    this.set('textSelection', null);
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
    this.set('scale', clampedScale);
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
    this.set('rotation', normalized);
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

    this.emit('change', 'annotations', this._data.annotations, this._data.annotations);
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
        this.emit('change', 'annotations', this._data.annotations, this._data.annotations);
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
        this.emit('change', 'annotations', this._data.annotations, this._data.annotations);
        return true;
      }
    }
    return false;
  }

  getAnnotationsForPage(page: number): Annotation[] {
    return [...(this._data.annotations.get(page) || [])];
  }

  setTextSelection(selection: TextSelection | null): void {
    this.set('textSelection', selection);
  }

  clearTextSelection(): void {
    this.set('textSelection', null);
  }

  setRendering(rendering: boolean): void {
    this.set('isRendering', rendering);
  }

  setError(error: Error | null): void {
    this.set('lastError', error);
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
    this.emit('change', 'annotations', this._data.annotations, this._data.annotations);
  }

  clone(): Model<PDFModelData> {
    const clone = new PDFModel();
    clone._data = { ...this._data };
    clone._data.annotations = new Map(this._data.annotations);
    clone._pdfDocument = this._pdfDocument;
    return clone;
  }
}
