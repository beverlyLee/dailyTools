import { Point, Bounds } from '../core';

export type AnnotationType = 'highlight' | 'underline' | 'textbox' | 'freehand';

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  page: number;
  color: string;
  opacity: number;
  createdAt: number;
  updatedAt: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
  bounds: Bounds;
}

export interface UnderlineAnnotation extends BaseAnnotation {
  type: 'underline';
  bounds: Bounds;
}

export interface TextboxAnnotation extends BaseAnnotation {
  type: 'textbox';
  bounds: Bounds;
  text: string;
  fontSize: number;
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand';
  points: Point[];
  strokeWidth: number;
}

export type Annotation = HighlightAnnotation | UnderlineAnnotation | TextboxAnnotation | FreehandAnnotation;

export interface DocumentInfo {
  id: string;
  name: string;
  fileSize: number;
  pageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface TextRange {
  start: number;
  end: number;
  text: string;
}

export interface TextSelection {
  page: number;
  text: string;
  ranges: TextRange[];
  bounds: Bounds;
}

export interface PDFRenderOptions {
  scale: number;
  rotation: number;
}

export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  annotations: Annotation[];
}

export interface PDFEngineEventMap {
  'document:loaded': (info: DocumentInfo) => void;
  'document:unload': () => void;
  'page:change': (page: number) => void;
  'zoom:change': (scale: number) => void;
  'annotation:added': (annotation: Annotation) => void;
  'annotation:removed': (annotationId: string) => void;
  'annotation:updated': (annotation: Annotation) => void;
  'text:selected': (selection: TextSelection | null) => void;
  'render:start': (page: number) => void;
  'render:complete': (page: number) => void;
  'error': (error: Error) => void;
}
