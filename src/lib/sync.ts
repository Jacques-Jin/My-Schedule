import * as db from "./db";
import { api } from "./api";

export type SyncStatus = "synced" | "syncing" | "offline" | "error";

type Listener = (status: SyncStatus, pendingCount: number) => void;

const listeners = new Set<Listener>();
let status: SyncStatus = "synced";
let pendingCount = 0;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  for (const fn of listeners) fn(status, pendingCount);
}

export function getSyncStatus(): { status: SyncStatus; pending: number } {
  return { status, pending: pendingCount };
}

export function onSyncChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function refreshPending() {
  const q = await db.getPendingSync();
  pendingCount = q.length;
  notify();
}

export async function enqueue(action: string, payload: any) {
  await db.enqueueSync(action, payload);
  await refreshPending();
  scheduleSync();
}

function scheduleSync() {
  if (syncTimer) return;
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncNow();
  }, 2000);
}

export async function syncNow() {
  if (!navigator.onLine) {
    status = "offline";
    notify();
    return;
  }
  const queue = await db.getPendingSync();
  if (queue.length === 0) {
    status = "synced";
    notify();
    return;
  }
  status = "syncing";
  notify();

  for (const item of queue) {
    try {
      await callApi(item.action, item.payload);
      await db.removeFromSyncQueue(item.id);
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError || err?.message?.includes("fetch");
      if (isNetworkError) {
        status = "offline";
      } else {
        await db.removeFromSyncQueue(item.id);
      }
      await refreshPending();
      if (pendingCount === 0 && !isNetworkError) {
        status = "synced";
        notify();
      } else if (!isNetworkError) {
        status = "error";
        notify();
      }
      return;
    }
  }
  status = "synced";
  await refreshPending();
}

function callApi(action: string, payload: any): Promise<any> {
  switch (action) {
    case "semester.save": return api.semesterSave(payload);
    case "semester.setCurrent": return api.semesterSetCurrent(payload.id);
    case "semester.delete": return api.semesterDelete(payload.id);
    case "holiday.save": return api.holidaySave(payload);
    case "holiday.delete": return api.holidayDelete(payload.id);
    case "period.save": return api.periodSave(payload);
    case "course.save": return api.courseSave(payload);
    case "course.delete": return api.courseDelete(payload.id);
    case "task.save": return api.taskSave(payload);
    case "task.delete": return api.taskDelete(payload.id);
    case "task.complete": return api.taskComplete(payload);
    case "campaign.save": return api.campaignSave(payload);
    case "campaign.delete": return api.campaignDelete(payload.id);
    case "campaign.attach": return api.campaignAttach(payload);
    case "countdown.save": return api.countdownSave(payload);
    case "countdown.delete": return api.countdownDelete(payload.id);
    case "homework.save": return api.homeworkSave(payload);
    case "homework.delete": return api.homeworkDelete(payload.id);
    case "homework.complete": return api.homeworkComplete(payload);
    case "dayOverride.save": return api.dayOverrideSave(payload);
    case "dayOverride.delete": return api.dayOverrideDelete(payload);
    case "settings.save": return api.settingsSave(payload);
    default: throw new Error(`unknown sync action: ${action}`);
  }
}

export function initSync() {
  window.addEventListener("online", () => syncNow());
  window.addEventListener("offline", () => {
    status = "offline";
    notify();
  });
  refreshPending();
  syncNow();
}
