import type { Spin } from "./types";

const DB_NAME = "langlive_roulette_db";
const DB_VERSION = 1;
const STORE_NAME = "spins";

let dbInstance: IDBDatabase | null = null;

// 初始化 IndexedDB
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("ts", "ts", { unique: false });
        store.createIndex("source", "source", { unique: false });
        store.createIndex("batchId", "batchId", { unique: false });
      }
    };
  });
}

// 添加 spin
export async function addSpin(spin: Spin): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(spin);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 獲取所有 spins（按 ts 降序）
export async function getAllSpins(): Promise<Spin[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("ts");
    const request = index.openCursor(null, "prev"); // 降序

    const spins: Spin[] = [];
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        spins.push(cursor.value);
        cursor.continue();
      } else {
        resolve(spins);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// 刪除 spin
export async function deleteSpin(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// 獲取最後一個補記的 spin
export async function getLastReplaySpin(): Promise<Spin | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const sourceIndex = store.index("source");
    const request = sourceIndex.openCursor("replay", "prev");

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        resolve(cursor.value);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// 根據 batchId 獲取補記數量（只計算 source === "replay"）
export async function getReplayCountByBatchId(batchId: string): Promise<number> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const sourceIndex = store.index("source");
    const request = sourceIndex.openCursor("replay");

    let count = 0;
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const spin = cursor.value as Spin;
        if (spin.batchId === batchId) {
          count++;
        }
        cursor.continue();
      } else {
        resolve(count);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
