export interface SearchResult {
  doc_id: number;
  score: number;
  fields: Record<string, string>;
}

export interface Document {
  id: number;
  fields: Record<string, string>;
}

export interface BM25Params {
  k1: number;
  b: number;
}

declare class WasmFulltextSearch {
  constructor();
  addDocument(doc_id: number, fields_json: string): boolean;
  removeDocument(doc_id: number): boolean;
  updateDocument(doc_id: number, fields_json: string): boolean;
  getDocument(doc_id: number): string | null;
  search(query: string): string;
  tokenize(text: string): string;
  totalDocuments(): number;
  setBM25Params(k1: number, b: number): void;
  addCustomWord(word: string): void;
  addCustomWordWithFreq(word: string, freq: number): void;
  getAllTerms(): string;
}

declare function init(): void;

let wasmModule: any = null;

async function loadWasm(): Promise<void> {
  if (wasmModule) return;
  
  try {
    wasmModule = await import('fulltext_search_core');
    wasmModule.init();
  } catch (e) {
    console.warn('Failed to load WASM module from package, trying local path...');
    try {
      wasmModule = await import('../core/pkg/fulltext_search_core');
      wasmModule.init();
    } catch (e2) {
      throw new Error(`Failed to load WASM module: ${e2}`);
    }
  }
}

export class FulltextSearch {
  private wasmInstance: WasmFulltextSearch | null = null;
  private initialized: boolean = false;

  constructor() {}

  async init(): Promise<void> {
    if (this.initialized) return;
    
    await loadWasm();
    this.wasmInstance = new wasmModule.WasmFulltextSearch();
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.wasmInstance) {
      throw new Error('FulltextSearch not initialized. Call init() first.');
    }
  }

  addDocument(doc: Document): boolean {
    this.ensureInitialized();
    const fieldsJson = JSON.stringify(doc.fields);
    return this.wasmInstance!.addDocument(doc.id, fieldsJson);
  }

  removeDocument(docId: number): boolean {
    this.ensureInitialized();
    return this.wasmInstance!.removeDocument(docId);
  }

  updateDocument(doc: Document): boolean {
    this.ensureInitialized();
    const fieldsJson = JSON.stringify(doc.fields);
    return this.wasmInstance!.updateDocument(doc.id, fieldsJson);
  }

  getDocument(docId: number): Document | null {
    this.ensureInitialized();
    const result = this.wasmInstance!.getDocument(docId);
    if (!result) return null;
    
    return {
      id: docId,
      fields: JSON.parse(result),
    };
  }

  search(query: string): SearchResult[] {
    this.ensureInitialized();
    const result = this.wasmInstance!.search(query);
    return JSON.parse(result);
  }

  tokenize(text: string): string[] {
    this.ensureInitialized();
    const result = this.wasmInstance!.tokenize(text);
    return JSON.parse(result);
  }

  totalDocuments(): number {
    this.ensureInitialized();
    return this.wasmInstance!.totalDocuments();
  }

  setBM25Params(params: BM25Params): void {
    this.ensureInitialized();
    this.wasmInstance!.setBM25Params(params.k1, params.b);
  }

  addCustomWord(word: string): void {
    this.ensureInitialized();
    this.wasmInstance!.addCustomWord(word);
  }

  addCustomWordWithFreq(word: string, freq: number): void {
    this.ensureInitialized();
    this.wasmInstance!.addCustomWordWithFreq(word, freq);
  }

  getAllTerms(): string[] {
    this.ensureInitialized();
    const result = this.wasmInstance!.getAllTerms();
    return JSON.parse(result);
  }
}

export async function createFulltextSearch(): Promise<FulltextSearch> {
  const search = new FulltextSearch();
  await search.init();
  return search;
}

export { QueryParser } from './queryParser';
