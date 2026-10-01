import { openDB as idbOpen, type IDBPDatabase } from "idb";

const DB_NAME = "my-schedule-db";
const DB_VERSION = 1;

export const STORE_NAMES = [
  "semesters", "period_slots", "holidays", "courses",
  "tasks", "task_completions", "campaigns", "countdowns",
  "homework", "day_overrides", "settings",
] as const;

export type StoreName = typeof STORE_NAMES[number];

let _db: IDBPDatabase | null = null;

export async function getDB() {
  if (_db) return _db;
  _db = await idbOpen(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
      if (!db.objectStoreNames.contains("_sync_queue")) {
        const sq = db.createObjectStore("_sync_queue", { keyPath: "id", autoIncrement: true });
        sq.createIndex("timestamp", "timestamp");
      }
      if (!db.objectStoreNames.contains("_sync_meta")) {
        db.createObjectStore("_sync_meta", { keyPath: "key" });
      }
    },
  });
  return _db;
}

export async function getAll<T = any>(store: StoreName): Promise<T[]> {
  const db = await getDB();
  return db.getAll(store);
}

export async function put(store: StoreName, value: any): Promise<void> {
  const db = await getDB();
  await db.put(store, value);
}

export async function putMany(store: StoreName, values: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, "readwrite");
  for (const v of values) await tx.store.put(v);
  await tx.done;
}

export async function remove(store: StoreName, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await getDB();
  await db.clear(store);
}

export async function clearAllCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([...STORE_NAMES], "readwrite");
  for (const name of STORE_NAMES) await tx.objectStore(name).clear();
  await tx.done;
}

export async function cacheBootstrap(data: any): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([...STORE_NAMES], "readwrite");
  for (const name of STORE_NAMES) {
    await tx.objectStore(name).clear();
    const items = data[name];
    if (Array.isArray(items)) {
      for (const item of items) await tx.objectStore(name).put(item);
    }
  }
  await tx.done;
}

export async function loadFromCache(): Promise<any | null> {
  const db = await getDB();
  const tx = db.transaction([...STORE_NAMES], "readonly");
  const result: any = {};
  for (const name of STORE_NAMES) {
    result[name] = await tx.objectStore(name).getAll();
  }
  await tx.done;
  const hasData = STORE_NAMES.some(n => result[n]?.length > 0);
  return hasData ? result : null;
}

export async function enqueueSync(action: string, payload: any): Promise<void> {
  const db = await getDB();
  await db.add("_sync_queue", { action, payload, timestamp: Date.now() });
}

export async function getPendingSync(): Promise<any[]> {
  const db = await getDB();
  return db.getAll("_sync_queue");
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear("_sync_queue");
}

export async function removeFromSyncQueue(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("_sync_queue", id);
}

export async function exportAllData(): Promise<any> {
  return loadFromCache();
}

export async function importAllData(data: any): Promise<void> {
  await clearAllCache();
  if (!data) return;
  const db = await getDB();
  const tx = db.transaction([...STORE_NAMES], "readwrite");
  for (const name of STORE_NAMES) {
    const items = data[name];
    if (Array.isArray(items)) {
      for (const item of items) await tx.objectStore(name).put(item);
    }
  }
  await tx.done;
}
