import { Annotation, DocumentInfo } from '../pdf-engine';

interface DBDocument {
    id: string;
    name: string;
    fileSize: number;
    pageCount: number;
    createdAt: number;
    updatedAt: number;
    data?: ArrayBuffer;
}
interface DBGraphics {
    id: string;
    name: string;
    data: string;
    createdAt: number;
    updatedAt: number;
}
export declare class IndexedDBStore {
    private db;
    private isInitialized;
    constructor();
    init(): Promise<void>;
    private getTransaction;
    saveDocument(docInfo: DocumentInfo, pdfData?: ArrayBuffer): Promise<void>;
    getDocument(id: string): Promise<DBDocument | null>;
    getAllDocuments(): Promise<DBDocument[]>;
    deleteDocument(id: string): Promise<void>;
    saveAnnotation(documentId: string, annotation: Annotation): Promise<void>;
    saveAnnotations(documentId: string, annotations: Annotation[]): Promise<void>;
    getDocumentAnnotations(documentId: string): Promise<Annotation[]>;
    getPageAnnotations(documentId: string, page: number): Promise<Annotation[]>;
    deleteAnnotation(annotationId: string): Promise<void>;
    clearDocumentAnnotations(documentId: string): Promise<void>;
    saveGraphics(name: string, data: string): Promise<string>;
    updateGraphics(id: string, data: string): Promise<void>;
    getGraphics(id: string): Promise<DBGraphics | null>;
    getAllGraphics(): Promise<DBGraphics[]>;
    deleteGraphics(id: string): Promise<void>;
    close(): void;
    clearAll(): Promise<void>;
}
export declare const indexedDBStore: IndexedDBStore;
export {};
