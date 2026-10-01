import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from "react";
import { api } from "./lib/api";
import * as db from "./lib/db";
import * as sync from "./lib/sync";

export interface Semester { id: string; name: string; start_monday: string; total_weeks: number; is_current: boolean }
export interface Holiday { id: string; name: string; start_date: string; end_date: string }
export interface PeriodSlot { id: string; slot_no: number; start_time: string; end_time: string }
export interface Course {
  id: string; semester_id: string; name: string; teacher: string;
  weekday: number; start_period: number; end_period: number;
  week_rule: string; location: string; color: string; note: string;
}
export interface Task {
  id: string; title: string; date: string;
  start_time: string | null; end_time: string | null;
  category: string; priority: string;
  repeat_rule: string; reminder: string;
  done: boolean; campaign_id: string | null; note: string;
}
export interface TaskCompletion { id: string; task_id: string; date: string }
export interface Campaign { id: string; name: string; goal: string; deadline: string | null; color: string }
export interface Countdown { id: string; name: string; target_date: string }
export interface Homework { id: string; title: string; course_id: string; due_date: string | null; description: string; completed: boolean }
export interface DayOverride { id: string; date: string; kind: "holiday" | "classday"; follow_weekday: number | null; name: string | null }
export interface Settings { id: number; remind_minutes: number; overlay_repeat: boolean; theme: string }

interface State {
  semesters: Semester[];
  periodSlots: PeriodSlot[];
  holidays: Holiday[];
  courses: Course[];
  campaigns: Campaign[];
  tasks: Task[];
  completions: TaskCompletion[];
  countdowns: Countdown[];
  homework: Homework[];
  dayOverrides: DayOverride[];
  settings: Settings;
  status: "loading" | "ready" | "error";
}

type Action =
  | { type: "bootstrap"; data: Omit<State, "status"> }
  | { type: "error" }
  | { type: "upsert_semester"; data: Semester }
  | { type: "remove_semester"; id: string }
  | { type: "set_current_semester"; id: string }
  | { type: "upsert_holiday"; data: Holiday }
  | { type: "remove_holiday"; id: string }
  | { type: "set_period_slots"; data: PeriodSlot[] }
  | { type: "upsert_course"; data: Course }
  | { type: "remove_course"; id: string }
  | { type: "upsert_task"; data: Task }
  | { type: "remove_task"; id: string }
  | { type: "upsert_completion"; data: TaskCompletion }
  | { type: "remove_completion"; task_id: string; date: string }
  | { type: "upsert_campaign"; data: Campaign }
  | { type: "remove_campaign"; id: string }
  | { type: "attach_tasks"; campaignId: string | null; taskIds: string[] }
  | { type: "upsert_countdown"; data: Countdown }
  | { type: "remove_countdown"; id: string }
  | { type: "upsert_homework"; data: Homework }
  | { type: "remove_homework"; id: string }
  | { type: "upsert_day_override"; data: DayOverride }
  | { type: "remove_day_override"; id: string }
  | { type: "update_settings"; data: Settings };

const defaultSettings: Settings = { id: 1, remind_minutes: 10, overlay_repeat: true, theme: "default" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "bootstrap":
      return { ...action.data, status: "ready" };
    case "error":
      return { ...state, status: "error" };
    case "upsert_semester": {
      const exists = state.semesters.some(s => s.id === action.data.id);
      return { ...state, semesters: exists ? state.semesters.map(s => s.id === action.data.id ? action.data : s) : [...state.semesters, action.data] };
    }
    case "remove_semester":
      return { ...state, semesters: state.semesters.filter(s => s.id !== action.id) };
    case "set_current_semester":
      return { ...state, semesters: state.semesters.map(s => ({ ...s, is_current: s.id === action.id })) };
    case "upsert_holiday": {
      const exists = state.holidays.some(h => h.id === action.data.id);
      return { ...state, holidays: exists ? state.holidays.map(h => h.id === action.data.id ? action.data : h) : [...state.holidays, action.data] };
    }
    case "remove_holiday":
      return { ...state, holidays: state.holidays.filter(h => h.id !== action.id) };
    case "set_period_slots":
      return { ...state, periodSlots: action.data };
    case "upsert_course": {
      const exists = state.courses.some(c => c.id === action.data.id);
      return { ...state, courses: exists ? state.courses.map(c => c.id === action.data.id ? action.data : c) : [...state.courses, action.data] };
    }
    case "remove_course":
      return { ...state, courses: state.courses.filter(c => c.id !== action.id) };
    case "upsert_task": {
      const exists = state.tasks.some(t => t.id === action.data.id);
      return { ...state, tasks: exists ? state.tasks.map(t => t.id === action.data.id ? action.data : t) : [...state.tasks, action.data] };
    }
    case "remove_task":
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id), completions: state.completions.filter(c => c.task_id !== action.id) };
    case "upsert_completion": {
      const exists = state.completions.some(c => c.task_id === action.data.task_id && c.date === action.data.date);
      if (exists) return state;
      return { ...state, completions: [...state.completions, action.data] };
    }
    case "remove_completion":
      return { ...state, completions: state.completions.filter(c => !(c.task_id === action.task_id && c.date === action.date)) };
    case "upsert_campaign": {
      const exists = state.campaigns.some(c => c.id === action.data.id);
      return { ...state, campaigns: exists ? state.campaigns.map(c => c.id === action.data.id ? action.data : c) : [...state.campaigns, action.data] };
    }
    case "remove_campaign":
      return { ...state, campaigns: state.campaigns.filter(c => c.id !== action.id), tasks: state.tasks.map(t => t.campaign_id === action.id ? { ...t, campaign_id: null } : t) };
    case "attach_tasks":
      return { ...state, tasks: state.tasks.map(t => action.taskIds.includes(t.id) ? { ...t, campaign_id: action.campaignId } : t) };
    case "upsert_countdown": {
      const exists = state.countdowns.some(c => c.id === action.data.id);
      return { ...state, countdowns: exists ? state.countdowns.map(c => c.id === action.data.id ? action.data : c) : [...state.countdowns, action.data] };
    }
    case "remove_countdown":
      return { ...state, countdowns: state.countdowns.filter(c => c.id !== action.id) };
    case "upsert_homework": {
      const exists = state.homework.some(h => h.id === action.data.id);
      return { ...state, homework: exists ? state.homework.map(h => h.id === action.data.id ? action.data : h) : [...state.homework, action.data] };
    }
    case "remove_homework":
      return { ...state, homework: state.homework.filter(h => h.id !== action.id) };
    case "upsert_day_override": {
      const others = state.dayOverrides.filter(o => o.date !== action.data.date);
      return { ...state, dayOverrides: [...others, action.data] };
    }
    case "remove_day_override":
      return { ...state, dayOverrides: state.dayOverrides.filter(o => o.id !== action.id) };
    case "update_settings":
      return { ...state, settings: action.data };
    default:
      return state;
  }
}

const initialState: State = {
  semesters: [], periodSlots: [], holidays: [], courses: [],
  campaigns: [], tasks: [], completions: [], countdowns: [], homework: [],
  dayOverrides: [], settings: defaultSettings, status: "loading",
};

interface StoreCtx {
  state: State;
  dispatch: React.Dispatch<Action>;
  seedIfEmpty: () => Promise<void>;
  saveSemester: (data: any) => Promise<Semester>;
  setCurrentSemester: (id: string) => Promise<void>;
  deleteSemester: (id: string) => Promise<void>;
  saveHoliday: (data: any) => Promise<Holiday>;
  deleteHoliday: (id: string) => Promise<void>;
  savePeriods: (slots: any[]) => Promise<PeriodSlot[]>;
  saveCourse: (data: any) => Promise<Course>;
  deleteCourse: (id: string) => Promise<void>;
  saveTask: (data: any) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  batchTasks: (params: any) => Promise<void>;
  completeTask: (params: { id: string; date: string; done: boolean }) => Promise<void>;
  saveCampaign: (data: any) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;
  attachTasks: (campaignId: string | null, taskIds: string[]) => Promise<void>;
  saveCountdown: (data: any) => Promise<Countdown>;
  deleteCountdown: (id: string) => Promise<void>;
  saveHomework: (data: any) => Promise<Homework>;
  deleteHomework: (id: string) => Promise<void>;
  completeHomework: (params: { id: string; completed: boolean }) => Promise<void>;
  saveDayOverride: (data: any) => Promise<DayOverride>;
  deleteDayOverride: (params: { id?: string; date?: string }) => Promise<void>;
  saveSettings: (data: any) => Promise<Settings>;
  exportData: () => Promise<any>;
  importData: (data: any) => Promise<void>;
  clearLocalData: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

const RECONCILE: { key: string; store: db.StoreName; action: string }[] = [
  { key: "semesters", store: "semesters", action: "semester.save" },
  { key: "tasks", store: "tasks", action: "task.save" },
  { key: "campaigns", store: "campaigns", action: "campaign.save" },
  { key: "homework", store: "homework", action: "homework.save" },
];

function localOnlyRows(cached: any, server: any, lastSync: number) {
  const out: { key: string; store: db.StoreName; action: string; row: any }[] = [];
  for (const entry of RECONCILE) {
    const serverIds = new Set((server[entry.key] || []).map((r: any) => r.id));
    for (const row of cached[entry.key] || []) {
      const created = row.created_at ? Date.parse(row.created_at) : 0;
      if (!serverIds.has(row.id) && created > lastSync) out.push({ ...entry, row });
    }
  }
  return out;
}

function mergeServerWithLocal(cached: any, server: any, lastSync: number): any {
  const merged: any = { ...server };
  const extra: Record<string, any[]> = {};
  for (const item of localOnlyRows(cached, server, lastSync)) {
    (extra[item.key] ||= []).push(item.row);
  }
  for (const key of Object.keys(extra)) merged[key] = [...(merged[key] || []), ...extra[key]];
  return merged;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refresh = useCallback(async () => {
    let hasCache = false;
    try {
      const cached = await db.loadFromCache();
      if (cached) {
        hasCache = true;
        dispatch({ type: "bootstrap", data: cached });
      }
      const data = await api.bootstrap();
      if (cached) {
        const lastSync = (await db.getMeta("lastBootstrap")) || 0;
        for (const item of localOnlyRows(cached, data, lastSync)) {
          sync.enqueue(item.action, item.row).catch(() => {});
        }
        const merged = mergeServerWithLocal(cached, data, lastSync);
        await db.cacheBootstrap(merged);
        dispatch({ type: "bootstrap", data: merged });
      } else {
        await db.cacheBootstrap(data);
        dispatch({ type: "bootstrap", data });
      }
      await db.setMeta("lastBootstrap", Date.now());
    } catch {
      if (!hasCache) {
        dispatch({ type: "error" });
      }
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const seedIfEmpty = useCallback(async () => {
    await api.seedIfEmpty();
    await refresh();
  }, [refresh]);

  const adoptSaved = useCallback(async (kind: string, store: db.StoreName, local: any, saved: any) => {
    if (!saved || !saved.id || saved.id === local.id) return;
    dispatch({ type: `remove_${kind}`, id: local.id } as any);
    dispatch({ type: `upsert_${kind}`, data: saved } as any);
    await db.remove(store, local.id);
    await db.put(store, saved);
  }, []);

  const saveSemester = useCallback(async (data: any) => {
    const row = { ...data, id: data.id || crypto.randomUUID() };
    dispatch({ type: "upsert_semester", data: row });
    await db.put("semesters", row);
    try { const saved = await api.semesterSave(data); await adoptSaved("semester", "semesters", row, saved); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("semester.save", data); return row; }
  }, [adoptSaved]);

  const setCurrentSemester = useCallback(async (id: string) => {
    const prev = state.semesters;
    dispatch({ type: "set_current_semester", id });
    const updated = prev.map(s => ({ ...s, is_current: s.id === id }));
    await db.putMany("semesters", updated);
    try { await api.semesterSetCurrent(id); sync.notifyDirectSync(); }
    catch { await sync.enqueue("semester.setCurrent", { id }); }
  }, [state]);

  const deleteSemester = useCallback(async (id: string) => {
    dispatch({ type: "remove_semester", id });
    await db.remove("semesters", id);
    try { await api.semesterDelete(id); sync.notifyDirectSync(); }
    catch { await sync.enqueue("semester.delete", { id }); }
  }, []);

  const saveHoliday = useCallback(async (data: any) => {
    const row = { ...data, id: data.id || crypto.randomUUID() };
    dispatch({ type: "upsert_holiday", data: row });
    await db.put("holidays", row);
    try { const saved = await api.holidaySave(data); await adoptSaved("holiday", "holidays", row, saved); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("holiday.save", data); return row; }
  }, [adoptSaved]);

  const deleteHoliday = useCallback(async (id: string) => {
    dispatch({ type: "remove_holiday", id });
    await db.remove("holidays", id);
    try { await api.holidayDelete(id); sync.notifyDirectSync(); }
    catch { await sync.enqueue("holiday.delete", { id }); }
  }, []);

  const savePeriods = useCallback(async (slots: any[]) => {
    dispatch({ type: "set_period_slots", data: slots });
    await db.clearStore("period_slots");
    await db.putMany("period_slots", slots);
    try { const saved = await api.periodSave(slots); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("period.save", slots); return slots; }
  }, []);

  const saveCourse = useCallback(async (data: any) => {
    const row = { ...data, id: data.id || crypto.randomUUID() };
    dispatch({ type: "upsert_course", data: row });
    await db.put("courses", row);
    try { const saved = await api.courseSave(data); await adoptSaved("course", "courses", row, saved); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("course.save", data); return row; }
  }, [adoptSaved]);

  const deleteCourse = useCallback(async (id: string) => {
    dispatch({ type: "remove_course", id });
    await db.remove("courses", id);
    try { await api.courseDelete(id); sync.notifyDirectSync(); }
    catch { await sync.enqueue("course.delete", { id }); }
  }, []);

  const saveTask = useCallback(async (data: any) => {
    const row = { ...data, id: data.id || crypto.randomUUID() };
    dispatch({ type: "upsert_task", data: row });
    await db.put("tasks", row);
    try { const saved = await api.taskSave(data); await adoptSaved("task", "tasks", row, saved); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("task.save", data); return row; }
  }, [adoptSaved]);

  const deleteTask = useCallback(async (id: string) => {
    dispatch({ type: "remove_task", id });
    await db.remove("tasks", id);
    try { await api.taskDelete(id); sync.notifyDirectSync(); }
    catch { await sync.enqueue("task.delete", { id }); }
  }, []);

  const batchTasks = useCallback(async (params: any) => {
    const { ids, op, payload: opPayload } = params;
    const prev = { tasks: state.tasks, completions: state.completions };
    for (const id of ids) {
      switch (op) {
        case "done":
        case "undone":
          dispatch({ type: "upsert_task", data: { ...state.tasks.find(t => t.id === id)!, done: op === "done" } });
          break;
        case "delete":
          dispatch({ type: "remove_task", id });
          break;
        case "move":
          dispatch({ type: "upsert_task", data: { ...state.tasks.find(t => t.id === id)!, date: opPayload.date } });
          break;
        case "category":
          dispatch({ type: "upsert_task", data: { ...state.tasks.find(t => t.id === id)!, category: opPayload.category } });
          break;
      }
    }
    try { await api.taskBatch(params); sync.notifyDirectSync(); }
    catch { await sync.enqueue("task.batch", params); }
    await refresh();
  }, [state, refresh]);

  const completeTask = useCallback(async ({ id, date, done }: { id: string; date: string; done: boolean }) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const rule = JSON.parse(task.repeat_rule || '{"type":"none"}');
    if (rule.type !== "none") {
      if (done) {
        const comp = { id: crypto.randomUUID(), task_id: id, date };
        dispatch({ type: "upsert_completion", data: comp });
        await db.put("task_completions", comp);
        try { await api.taskComplete({ id, date, done }); sync.notifyDirectSync(); }
        catch { await sync.enqueue("task.complete", { id, date, done }); }
      } else {
        dispatch({ type: "remove_completion", task_id: id, date });
        await db.remove("task_completions", `${id}:${date}`);
        try { await api.taskComplete({ id, date, done }); sync.notifyDirectSync(); }
        catch { await sync.enqueue("task.complete", { id, date, done }); }
      }
    } else {
      const updated = { ...task, done };
      dispatch({ type: "upsert_task", data: updated });
      await db.put("tasks", updated);
      try { await api.taskComplete({ id, date, done }); sync.notifyDirectSync(); }
      catch { await sync.enqueue("task.complete", { id, date, done }); }
    }
  }, [state.tasks]);

  const saveCampaign = useCallback(async (data: any) => {
    const row = { ...data, id: data.id || crypto.randomUUID() };
    dispatch({ type: "upsert_campaign", data: row });
    await db.put("campaigns", row);
    try { const saved = await api.campaignSave(data); await adoptSaved("campaign", "campaigns", row, saved); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("campaign.save", data); return row; }
  }, [adoptSaved]);

  const deleteCampaign = useCallback(async (id: string) => {
    dispatch({ type: "remove_campaign", id });
    await db.remove("campaigns", id);
    try { await api.campaignDelete(id); sync.notifyDirectSync(); }
    catch { await sync.enqueue("campaign.delete", { id }); }
  }, []);

  const attachTasks = useCallback(async (campaignId: string | null, taskIds: string[]) => {
    dispatch({ type: "attach_tasks", campaignId, taskIds });
    try { await api.campaignAttach({ campaignId, taskIds }); sync.notifyDirectSync(); }
    catch { await sync.enqueue("campaign.attach", { campaignId, taskIds }); }
    await refresh();
  }, [refresh]);

  const saveCountdown = useCallback(async (data: any) => {
    const row = { ...data, id: data.id || crypto.randomUUID() };
    dispatch({ type: "upsert_countdown", data: row });
    await db.put("countdowns", row);
    try { const saved = await api.countdownSave(data); await adoptSaved("countdown", "countdowns", row, saved); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("countdown.save", data); return row; }
  }, [adoptSaved]);

  const deleteCountdown = useCallback(async (id: string) => {
    dispatch({ type: "remove_countdown", id });
    await db.remove("countdowns", id);
    try { await api.countdownDelete(id); sync.notifyDirectSync(); }
    catch { await sync.enqueue("countdown.delete", { id }); }
  }, []);

  const saveHomework = useCallback(async (data: any) => {
    const row = { ...data, id: data.id || crypto.randomUUID() };
    dispatch({ type: "upsert_homework", data: row });
    await db.put("homework", row);
    try { const saved = await api.homeworkSave(data); await adoptSaved("homework", "homework", row, saved); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("homework.save", data); return row; }
  }, [adoptSaved]);

  const deleteHomework = useCallback(async (id: string) => {
    dispatch({ type: "remove_homework", id });
    await db.remove("homework", id);
    try { await api.homeworkDelete(id); sync.notifyDirectSync(); }
    catch { await sync.enqueue("homework.delete", { id }); }
  }, []);

  const completeHomework = useCallback(async (params: { id: string; completed: boolean }) => {
    const updated = { ...state.homework.find(h => h.id === params.id), completed: params.completed } as Homework;
    dispatch({ type: "upsert_homework", data: updated });
    await db.put("homework", updated);
    try { await api.homeworkComplete(params); sync.notifyDirectSync(); }
    catch { await sync.enqueue("homework.complete", params); }
  }, [state.homework]);

  const saveDayOverride = useCallback(async (data: any) => {
    const row = { ...data, id: data.id || crypto.randomUUID() };
    dispatch({ type: "upsert_day_override", data: row });
    await db.put("day_overrides", row);
    try { const saved = await api.dayOverrideSave(data); await adoptSaved("day_override", "day_overrides", row, saved); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("dayOverride.save", data); return row; }
  }, [adoptSaved]);

  const deleteDayOverride = useCallback(async (params: { id?: string; date?: string }) => {
    if (params.id) {
      dispatch({ type: "remove_day_override", id: params.id });
      await db.remove("day_overrides", params.id);
    } else if (params.date) {
      const existing = state.dayOverrides.find(o => o.date === params.date);
      if (existing) {
        dispatch({ type: "remove_day_override", id: existing.id });
        await db.remove("day_overrides", existing.id);
      }
    }
    try { await api.dayOverrideDelete(params); sync.notifyDirectSync(); }
    catch { await sync.enqueue("dayOverride.delete", params); }
  }, [state.dayOverrides]);

  const saveSettings = useCallback(async (data: any) => {
    const row = { ...data, id: 1 };
    dispatch({ type: "update_settings", data: row });
    await db.put("settings", row);
    try { const saved = await api.settingsSave(data); sync.notifyDirectSync(); return saved; }
    catch { await sync.enqueue("settings.save", data); return row; }
  }, []);

  const exportData = useCallback(async () => {
    const cached = await db.exportAllData();
    if (cached) return cached;
    return await api.dataExport();
  }, []);

  const importData = useCallback(async (data: any) => {
    await db.importAllData(data);
    await api.dataImport(data);
    await refresh();
  }, [refresh]);

  const clearLocalData = useCallback(async () => {
    await db.clearAllData();
    await refresh();
  }, [refresh]);

  return (
    <Ctx.Provider value={{
      state, dispatch, seedIfEmpty, refresh,
      saveSemester, setCurrentSemester, deleteSemester,
      saveHoliday, deleteHoliday, savePeriods,
      saveCourse, deleteCourse,
      saveTask, deleteTask, batchTasks, completeTask,
      saveCampaign, deleteCampaign, attachTasks,
      saveCountdown, deleteCountdown, saveHomework, deleteHomework, completeHomework, saveSettings,
      saveDayOverride, deleteDayOverride,
      exportData, importData, clearLocalData,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
