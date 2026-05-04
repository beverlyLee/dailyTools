import { Chart, ChartMetadata, Note, NoteType, Difficulty, validateChart } from './types';

const STORAGE_KEY = 'rhythm_game_charts';
const DB_NAME = 'RhythmGameDB';
const DB_VERSION = 1;
const STORE_NAME = 'charts';

export class ChartManager {
  private db: IDBDatabase | null = null;
  private useIndexDB: boolean = true;

  async initialize(): Promise<void> {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not available, using localStorage fallback');
      this.useIndexDB = false;
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.warn('Failed to open IndexedDB, using localStorage fallback');
        this.useIndexDB = false;
        resolve();
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name');
          store.createIndex('difficulty', 'difficulty');
          store.createIndex('createdAt', 'createdAt');
        }
      };
    });
  }

  async saveChart(chart: Chart): Promise<boolean> {
    chart.updatedAt = Date.now();
    
    const validation = validateChart(chart);
    if (!validation.valid) {
      console.error('Chart validation failed:', validation.errors);
      return false;
    }

    chart.notes = this.sortNotes(chart.notes);

    if (this.useIndexDB && this.db) {
      return this.saveToIndexDB(chart);
    } else {
      return this.saveToLocalStorage(chart);
    }
  }

  private async saveToIndexDB(chart: Chart): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(chart);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  private saveToLocalStorage(chart: Chart): boolean {
    try {
      const charts = this.loadAllFromLocalStorage();
      const existingIndex = charts.findIndex(c => c.id === chart.id);
      
      if (existingIndex >= 0) {
        charts[existingIndex] = chart;
      } else {
        charts.push(chart);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  }

  async loadChart(id: string): Promise<Chart | null> {
    if (this.useIndexDB && this.db) {
      return this.loadFromIndexDB(id);
    } else {
      return this.loadFromLocalStorage(id);
    }
  }

  private async loadFromIndexDB(id: string): Promise<Chart | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const chart = request.result;
        resolve(chart || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private loadFromLocalStorage(id: string): Chart | null {
    const charts = this.loadAllFromLocalStorage();
    return charts.find(c => c.id === id) || null;
  }

  async loadAllCharts(): Promise<Chart[]> {
    if (this.useIndexDB && this.db) {
      return this.loadAllFromIndexDB();
    } else {
      return this.loadAllFromLocalStorage();
    }
  }

  private async loadAllFromIndexDB(): Promise<Chart[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private loadAllFromLocalStorage(): Chart[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as Chart[];
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
    return [];
  }

  async getChartMetadata(): Promise<ChartMetadata[]> {
    const charts = await this.loadAllCharts();
    return charts.map(chart => ({
      id: chart.id,
      name: chart.name,
      difficulty: chart.difficulty,
      bpm: chart.bpm,
      noteCount: chart.notes.length,
      createdAt: chart.createdAt
    }));
  }

  async deleteChart(id: string): Promise<boolean> {
    if (this.useIndexDB && this.db) {
      return this.deleteFromIndexDB(id);
    } else {
      return this.deleteFromLocalStorage(id);
    }
  }

  private async deleteFromIndexDB(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  private deleteFromLocalStorage(id: string): boolean {
    try {
      const charts = this.loadAllFromLocalStorage();
      const filtered = charts.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (e) {
      console.error('Failed to delete from localStorage:', e);
      return false;
    }
  }

  createChart(name: string, bpm: number, difficulty: Difficulty = Difficulty.NORMAL): Chart {
    return {
      id: this.generateUUID(),
      name,
      difficulty,
      bpm,
      offset: 0,
      notes: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  addNote(chart: Chart, time: number, lane: number, type: NoteType = NoteType.TAP, duration?: number): Note {
    const note: Note = {
      id: this.generateUUID(),
      time: Math.round(time * 10) / 10,
      lane,
      type,
      duration: duration ? Math.round(duration * 10) / 10 : undefined
    };

    chart.notes.push(note);
    chart.notes = this.sortNotes(chart.notes);
    chart.updatedAt = Date.now();

    return note;
  }

  removeNote(chart: Chart, noteId: string): boolean {
    const index = chart.notes.findIndex(n => n.id === noteId);
    if (index >= 0) {
      chart.notes.splice(index, 1);
      chart.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  updateNote(chart: Chart, noteId: string, updates: Partial<Note>): Note | null {
    const note = chart.notes.find(n => n.id === noteId);
    if (note) {
      Object.assign(note, updates);
      chart.notes = this.sortNotes(chart.notes);
      chart.updatedAt = Date.now();
      return note;
    }
    return null;
  }

  getNotesInRange(chart: Chart, startTime: number, endTime: number): Note[] {
    return chart.notes.filter(note => 
      note.time >= startTime && note.time <= endTime
    );
  }

  private sortNotes(notes: Note[]): Note[] {
    return [...notes].sort((a, b) => {
      if (a.time !== b.time) {
        return a.time - b.time;
      }
      return a.lane - b.lane;
    });
  }

  exportChart(chart: Chart): string {
    return JSON.stringify(chart, null, 2);
  }

  importChart(jsonString: string): Chart | null {
    try {
      const chart = JSON.parse(jsonString) as Chart;
      const validation = validateChart(chart);
      
      if (!validation.valid) {
        console.error('Imported chart validation failed:', validation.errors);
        return null;
      }

      chart.notes = this.sortNotes(chart.notes);
      return chart;
    } catch (e) {
      console.error('Failed to parse chart JSON:', e);
      return null;
    }
  }

  generateDemoChart(): Chart {
    const chart = this.createChart('Demo Song', 120, Difficulty.NORMAL);
    const beatInterval = 60000 / chart.bpm;

    for (let i = 0; i < 32; i++) {
      const time = i * beatInterval;
      const lane = i % 4;
      this.addNote(chart, time, lane);
    }

    return chart;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
