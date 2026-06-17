const DB_NAME = 'livestock_growth_tracker'
const DB_VERSION = 2

const STORES = {
  LIVESTOCK: 'livestock',
  WEIGHT_RECORDS: 'weight_records',
  FEED_RECORDS: 'feed_records',
  VACCINE_RECORDS: 'vaccine_records',
  VACCINE_SCHEDULES: 'vaccine_schedules',
  DISEASE_RECORDS: 'disease_records',
  TREATMENT_RECORDS: 'treatment_records'
}

let dbInstance = null

function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance && dbInstance.version === DB_VERSION) {
      resolve(dbInstance)
      return
    }

    if (dbInstance) {
      dbInstance.close()
      dbInstance = null
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(STORES.LIVESTOCK)) {
        const store = db.createObjectStore(STORES.LIVESTOCK, { keyPath: 'id', autoIncrement: true })
        store.createIndex('earTag', 'earTag', { unique: true })
        store.createIndex('breed', 'breed', { unique: false })
        store.createIndex('birthDate', 'birthDate', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.WEIGHT_RECORDS)) {
        const store = db.createObjectStore(STORES.WEIGHT_RECORDS, { keyPath: 'id', autoIncrement: true })
        store.createIndex('livestockId', 'livestockId', { unique: false })
        store.createIndex('recordDate', 'recordDate', { unique: false })
        store.createIndex('livestockId_date', ['livestockId', 'recordDate'], { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.FEED_RECORDS)) {
        const store = db.createObjectStore(STORES.FEED_RECORDS, { keyPath: 'id', autoIncrement: true })
        store.createIndex('livestockId', 'livestockId', { unique: false })
        store.createIndex('recordDate', 'recordDate', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.VACCINE_RECORDS)) {
        const store = db.createObjectStore(STORES.VACCINE_RECORDS, { keyPath: 'id', autoIncrement: true })
        store.createIndex('livestockId', 'livestockId', { unique: false })
        store.createIndex('vaccineDate', 'vaccineDate', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.VACCINE_SCHEDULES)) {
        const store = db.createObjectStore(STORES.VACCINE_SCHEDULES, { keyPath: 'id', autoIncrement: true })
        store.createIndex('breed', 'breed', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.DISEASE_RECORDS)) {
        const store = db.createObjectStore(STORES.DISEASE_RECORDS, { keyPath: 'id', autoIncrement: true })
        store.createIndex('livestockId', 'livestockId', { unique: false })
        store.createIndex('diseaseDate', 'diseaseDate', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.TREATMENT_RECORDS)) {
        const store = db.createObjectStore(STORES.TREATMENT_RECORDS, { keyPath: 'id', autoIncrement: true })
        store.createIndex('diseaseId', 'diseaseId', { unique: false })
        store.createIndex('livestockId', 'livestockId', { unique: false })
        store.createIndex('treatmentDate', 'treatmentDate', { unique: false })
      }
    }
  })
}

function createTransaction(storeName, mode = 'readonly') {
  return new Promise(async (resolve, reject) => {
    const db = await openDB()
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    resolve({ tx, store })
  })
}

export async function add(storeName, data) {
  const { tx, store } = await createTransaction(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.add(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function update(storeName, data) {
  const { tx, store } = await createTransaction(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.put(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function remove(storeName, id) {
  const { tx, store } = await createTransaction(storeName, 'readwrite')
  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function get(storeName, id) {
  const { tx, store } = await createTransaction(storeName, 'readonly')
  return new Promise((resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAll(storeName) {
  const { tx, store } = await createTransaction(storeName, 'readonly')
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getByIndex(storeName, indexName, value) {
  const { tx, store } = await createTransaction(storeName, 'readonly')
  const index = store.index(indexName)
  return new Promise((resolve, reject) => {
    const request = index.getAll(value)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getByIndexRange(storeName, indexName, lower, upper) {
  const { tx, store } = await createTransaction(storeName, 'readonly')
  const index = store.index(indexName)
  const range = IDBKeyRange.bound(lower, upper)
  return new Promise((resolve, reject) => {
    const request = index.getAll(range)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export { STORES, openDB }
