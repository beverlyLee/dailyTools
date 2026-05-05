import { Document, SearchResult, SortMethod } from './types';
export declare class SearchEngine {
    private wasmModule;
    private engine;
    private defaultSortMethod;
    constructor(wasmModule?: any, defaultSortMethod?: SortMethod);
    init(): Promise<void>;
    addDocument(doc: Omit<Document, 'id'> & {
        id?: number;
    }): number;
    getDocument(docId: number): Document | null;
    updateDocument(docId: number, doc: Partial<Document>): boolean;
    deleteDocument(docId: number): boolean;
    search(query: string, options?: {
        sortMethod?: SortMethod;
        limit?: number;
    }): SearchResult[];
    tokenize(text: string): string[];
    addDocuments(docs: Array<Omit<Document, 'id'>>): number[];
    searchWithPagination(query: string, page?: number, pageSize?: number, options?: {
        sortMethod?: SortMethod;
    }): {
        results: SearchResult[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}
