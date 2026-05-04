const DB_NAME = 'WeeklyReportDB';
const DB_VERSION = 1;
const STORES = {
  CHAT_RECORDS: 'chatRecords',
  DOCUMENT_FRAGMENTS: 'documentFragments',
  REPORTS: 'reports',
  FEEDBACKS: 'feedbacks',
  CONFIG: 'config'
};

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORES.CHAT_RECORDS)) {
          const chatStore = db.createObjectStore(STORES.CHAT_RECORDS, { keyPath: 'id', autoIncrement: true });
          chatStore.createIndex('source', 'source', { unique: false });
          chatStore.createIndex('timestamp', 'timestamp', { unique: false });
          chatStore.createIndex('sender', 'sender', { unique: false });
          chatStore.createIndex('conversationId', 'conversationId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.DOCUMENT_FRAGMENTS)) {
          const docStore = db.createObjectStore(STORES.DOCUMENT_FRAGMENTS, { keyPath: 'id', autoIncrement: true });
          docStore.createIndex('sourceType', 'sourceType', { unique: false });
          docStore.createIndex('timestamp', 'timestamp', { unique: false });
          docStore.createIndex('embeddingId', 'embeddingId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.REPORTS)) {
          const reportStore = db.createObjectStore(STORES.REPORTS, { keyPath: 'id', autoIncrement: true });
          reportStore.createIndex('createdAt', 'createdAt', { unique: false });
          reportStore.createIndex('weekStart', 'weekStart', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.FEEDBACKS)) {
          const feedbackStore = db.createObjectStore(STORES.FEEDBACKS, { keyPath: 'id', autoIncrement: true });
          feedbackStore.createIndex('reportId', 'reportId', { unique: false });
          feedbackStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          db.createObjectStore(STORES.CONFIG, { keyPath: 'key' });
        }
      };
    });
  }

  async getDB() {
    if (!this.db) {
      await this.initPromise;
    }
    return this.db;
  }

  async addChatRecord(record) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CHAT_RECORDS], 'readwrite');
      const store = transaction.objectStore(STORES.CHAT_RECORDS);
      const request = store.add({
        ...record,
        timestamp: record.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async addChatRecords(records) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CHAT_RECORDS], 'readwrite');
      const store = transaction.objectStore(STORES.CHAT_RECORDS);
      
      records.forEach(record => {
        store.add({
          ...record,
          timestamp: record.timestamp || new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      });

      transaction.oncomplete = () => resolve({ success: true, count: records.length });
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getChatRecords(filters = {}) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.CHAT_RECORDS], 'readonly');
      const store = transaction.objectStore(STORES.CHAT_RECORDS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let results = request.result;
        
        if (filters.source) {
          results = results.filter(r => r.source === filters.source);
        }
        if (filters.since) {
          results = results.filter(r => new Date(r.timestamp) >= new Date(filters.since));
        }
        if (filters.until) {
          results = results.filter(r => new Date(r.timestamp) <= new Date(filters.until));
        }
        if (filters.conversationId) {
          results = results.filter(r => r.conversationId === filters.conversationId);
        }
        
        resolve(results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addDocumentFragment(fragment) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DOCUMENT_FRAGMENTS], 'readwrite');
      const store = transaction.objectStore(STORES.DOCUMENT_FRAGMENTS);
      const request = store.add({
        ...fragment,
        timestamp: fragment.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getDocumentFragments(filters = {}) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.DOCUMENT_FRAGMENTS], 'readonly');
      const store = transaction.objectStore(STORES.DOCUMENT_FRAGMENTS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let results = request.result;
        
        if (filters.sourceType) {
          results = results.filter(r => r.sourceType === filters.sourceType);
        }
        if (filters.since) {
          results = results.filter(r => new Date(r.timestamp) >= new Date(filters.since));
        }
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveReport(report) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.REPORTS], 'readwrite');
      const store = transaction.objectStore(STORES.REPORTS);
      const request = store.put({
        ...report,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      request.onsuccess = () => resolve({ id: request.result, ...report });
      request.onerror = () => reject(request.error);
    });
  }

  async getReports(filters = {}) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.REPORTS], 'readonly');
      const store = transaction.objectStore(STORES.REPORTS);
      const request = store.getAll();
      
      request.onsuccess = () => {
        let results = request.result;
        
        if (filters.weekStart) {
          results = results.filter(r => r.weekStart === filters.weekStart);
        }
        
        resolve(results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addFeedback(feedback) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.FEEDBACKS], 'readwrite');
      const store = transaction.objectStore(STORES.FEEDBACKS);
      const request = store.add({
        ...feedback,
        timestamp: new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => reject(request.error);
    });
  }

  async exportAllData() {
    const [chatRecords, documentFragments, reports, feedbacks] = await Promise.all([
      this.getChatRecords(),
      this.getDocumentFragments(),
      this.getReports(),
      new Promise(async (resolve) => {
        const db = await this.getDB();
        const transaction = db.transaction([STORES.FEEDBACKS], 'readonly');
        const store = transaction.objectStore(STORES.FEEDBACKS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
      })
    ]);

    return {
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      data: {
        chatRecords,
        documentFragments,
        reports,
        feedbacks
      }
    };
  }
}

const dbManager = new IndexedDBManager();
window.dbManager = dbManager;
