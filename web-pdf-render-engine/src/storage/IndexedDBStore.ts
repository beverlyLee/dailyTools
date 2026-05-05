import { Annotation, DocumentInfo } from '../types';

const DB_NAME = 'WebPdfRenderEngine';
const DB_VERSION = 1;
const ANNOTATIONS_STORE = 'annotations';
const DOCUMENTS_STORE = 'documents';

interface DBDocument {
  id: string;
  name: string;
  fileSize: number;
  pageCount: number;
  createdAt: number;
  updatedAt: number;
  data?: ArrayBuffer;
}

interface DBAnnotation {
  id: string;
  documentId: string;
  page: number;
  annotation: Annotation;
}

export class IndexedDBStore {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  constructor() {}

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const docStore = db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' });
          docStore.createIndex('name', 'name', { unique: false });
          docStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(ANNOTATIONS_STORE)) {
          const annStore = db.createObjectStore(ANNOTATIONS_STORE, { keyPath: 'id' });
          annStore.createIndex('documentId', 'documentId', { unique: false });
          annStore.createIndex('documentPage', ['documentId', 'page'], { unique: false });
        }
      };
    });
  }

  private async getTransaction(
    storeNames: string | string[],
    mode: IDBTransactionMode = 'readonly'
  ): Promise<IDBTransaction> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.transaction(storeNames, mode);
  }

  async saveDocument(docInfo: DocumentInfo, pdfData?: ArrayBuffer): Promise<void> {
    await this.init();
    const transaction = await this.getTransaction(DOCUMENTS_STORE, 'readwrite');
    const store = transaction.objectStore(DOCUMENTS_STORE);

    const existingDoc = await this.getDocument(docInfo.id);
    const doc: DBDocument = {
      id: docInfo.id,
      name: docInfo.name,
      fileSize: docInfo.fileSize,
      pageCount: docInfo.pageCount,
      createdAt: existingDoc ? existingDoc.createdAt : Date.now(),
      updatedAt: Date.now(),
      data: pdfData,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(doc);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getDocument(id: string): Promise<DBDocument | null> {
    await this.init();
    const transaction = await this.getTransaction(DOCUMENTS_STORE, 'readonly');
    const store = transaction.objectStore(DOCUMENTS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDocuments(): Promise<DBDocument[]> {
    await this.init();
    const transaction = await this.getTransaction(DOCUMENTS_STORE, 'readonly');
    const store = transaction.objectStore(DOCUMENTS_STORE);
    const index = store.index('createdAt');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const results: DBDocument[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.init();
    
    const annotations = await this.getDocumentAnnotations(id);
    for (const ann of annotations) {
      await this.deleteAnnotation(ann.id);
    }

    const transaction = await this.getTransaction(DOCUMENTS_STORE, 'readwrite');
    const store = transaction.objectStore(DOCUMENTS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAnnotation(documentId: string, annotation: Annotation): Promise<void> {
    await this.init();
    const transaction = await this.getTransaction(ANNOTATIONS_STORE, 'readwrite');
    const store = transaction.objectStore(ANNOTATIONS_STORE);

    const dbAnnotation: DBAnnotation = {
      id: annotation.id,
      documentId,
      page: annotation.page,
      annotation: { ...annotation, updatedAt: Date.now() },
    };

    return new Promise((resolve, reject) => {
      const request = store.put(dbAnnotation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveAnnotations(documentId: string, annotations: Annotation[]): Promise<void> {
    for (const ann of annotations) {
      await this.saveAnnotation(documentId, ann);
    }
  }

  async getDocumentAnnotations(documentId: string): Promise<Annotation[]> {
    await this.init();
    const transaction = await this.getTransaction(ANNOTATIONS_STORE, 'readonly');
    const store = transaction.objectStore(ANNOTATIONS_STORE);
    const index = store.index('documentId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only(documentId));
      request.onsuccess = () => {
        const results = (request.result as DBAnnotation[]).map((dbAnn) => dbAnn.annotation);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPageAnnotations(documentId: string, page: number): Promise<Annotation[]> {
    await this.init();
    const transaction = await this.getTransaction(ANNOTATIONS_STORE, 'readonly');
    const store = transaction.objectStore(ANNOTATIONS_STORE);
    const index = store.index('documentPage');

    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.only([documentId, page]));
      request.onsuccess = () => {
        const results = (request.result as DBAnnotation[]).map((dbAnn) => dbAnn.annotation);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    await this.init();
    const transaction = await this.getTransaction(ANNOTATIONS_STORE, 'readwrite');
    const store = transaction.objectStore(ANNOTATIONS_STORE);

    return new Promise((resolve, reject) => {
      const request = store.delete(annotationId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearDocumentAnnotations(documentId: string): Promise<void> {
    const annotations = await this.getDocumentAnnotations(documentId);
    for (const ann of annotations) {
      await this.deleteAnnotation(ann.id);
    }
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  async clearAll(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      deleteRequest.onsuccess = () => {
        this.db = null;
        this.isInitialized = false;
        resolve();
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }
}

export const indexedDBStore = new IndexedDBStore();
