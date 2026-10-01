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

const REVERSE_KEY_MAP: Record<string, string> = {
  periodSlots: "period_slots",
  completions: "task_completions",
  dayOverrides: "day_overrides",
};

export async function cacheBootstrap(data: any): Promise<void> {
  if (!data) return;
  const db = await getDB();
  const tx = db.transaction([...STORE_NAMES], "readwrite");
  for (const name of STORE_NAMES) {
    await tx.objectStore(name).clear();
    const camelKey = Object.keys(REVERSE_KEY_MAP).find(k => REVERSE_KEY_MAP[k] === name);
    const items = data[camelKey || name];
    if (Array.isArray(items)) {
      for (const item of items) await tx.objectStore(name).put(item);
    }
  }
  await tx.done;
}

const STORE_KEY_MAP: Record<string, string> = {
  period_slots: "periodSlots",
  task_completions: "completions",
  day_overrides: "dayOverrides",
};

export async function loadFromCache(): Promise<any | null> {
  const db = await getDB();
  const tx = db.transaction([...STORE_NAMES], "readonly");
  const result: any = {};
  for (const name of STORE_NAMES) {
    const items = await tx.objectStore(name).getAll();
    const key = STORE_KEY_MAP[name] || name;
    result[key] = items;
  }
  await tx.done;
  const hasData = STORE_NAMES.some(n => result[STORE_KEY_MAP[n] || n]?.length > 0);
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

export async function updateSyncItem(item: any): Promise<void> {
  const db = await getDB();
  await db.put("_sync_queue", item);
}

export async function getMeta(key: string): Promise<any> {
  const db = await getDB();
  const row = await db.get("_sync_meta", key);
  return row ? row.value : undefined;
}

export async function setMeta(key: string, value: any): Promise<void> {
  const db = await getDB();
  await db.put("_sync_meta", { key, value });
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
    const camelKey = Object.keys(REVERSE_KEY_MAP).find(k => REVERSE_KEY_MAP[k] === name);
    const items = data[camelKey || name];
    if (Array.isArray(items)) {
      for (const item of items) await tx.objectStore(name).put(item);
    }
  }
  await tx.done;
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const allStores = [...STORE_NAMES, "_sync_queue", "_sync_meta"] as string[];
  const tx = db.transaction(allStores, "readwrite");
  for (const name of allStores) await tx.objectStore(name).clear();
  await tx.done;
}
