import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from "react";
import { api } from "./lib/api";

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
export interface Settings { id: number; remind_minutes: number; overlay_repeat: boolean }

interface State {
  semesters: Semester[];
  periodSlots: PeriodSlot[];
  holidays: Holiday[];
  courses: Course[];
  campaigns: Campaign[];
  tasks: Task[];
  completions: TaskCompletion[];
  countdowns: Countdown[];
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
  | { type: "update_settings"; data: Settings };

const defaultSettings: Settings = { id: 1, remind_minutes: 10, overlay_repeat: true };

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
    case "update_settings":
      return { ...state, settings: action.data };
    default:
      return state;
  }
}

const initialState: State = {
  semesters: [], periodSlots: [], holidays: [], courses: [],
  campaigns: [], tasks: [], completions: [], countdowns: [],
  settings: defaultSettings, status: "loading",
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
  saveSettings: (data: any) => Promise<Settings>;
  exportData: () => Promise<any>;
  importData: (data: any) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const refresh = useCallback(async () => {
    try {
      const data = await api.bootstrap();
      dispatch({ type: "bootstrap", data });
    } catch {
      dispatch({ type: "error" });
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const seedIfEmpty = useCallback(async () => {
    await api.seedIfEmpty();
    await refresh();
  }, [refresh]);

  const saveSemester = useCallback(async (data: any) => {
    const row = await api.semesterSave(data);
    dispatch({ type: "upsert_semester", data: row });
    return row;
  }, []);

  const setCurrentSemester = useCallback(async (id: string) => {
    const prev = state.semesters;
    dispatch({ type: "set_current_semester", id });
    try { await api.semesterSetCurrent(id); } catch { dispatch({ type: "bootstrap", data: { ...state, semesters: prev } }); }
  }, [state]);

  const deleteSemester = useCallback(async (id: string) => {
    dispatch({ type: "remove_semester", id });
    try { await api.semesterDelete(id); } catch { await refresh(); }
  }, [refresh]);

  const saveHoliday = useCallback(async (data: any) => {
    const row = await api.holidaySave(data);
    dispatch({ type: "upsert_holiday", data: row });
    return row;
  }, []);

  const deleteHoliday = useCallback(async (id: string) => {
    dispatch({ type: "remove_holiday", id });
    try { await api.holidayDelete(id); } catch { await refresh(); }
  }, [refresh]);

  const savePeriods = useCallback(async (slots: any[]) => {
    const rows = await api.periodSave(slots);
    dispatch({ type: "set_period_slots", data: rows });
    return rows;
  }, []);

  const saveCourse = useCallback(async (data: any) => {
    const row = await api.courseSave(data);
    dispatch({ type: "upsert_course", data: row });
    return row;
  }, []);

  const deleteCourse = useCallback(async (id: string) => {
    dispatch({ type: "remove_course", id });
    try { await api.courseDelete(id); } catch { await refresh(); }
  }, [refresh]);

  const saveTask = useCallback(async (data: any) => {
    const row = await api.taskSave(data);
    dispatch({ type: "upsert_task", data: row });
    return row;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    dispatch({ type: "remove_task", id });
    try { await api.taskDelete(id); } catch { await refresh(); }
  }, [refresh]);

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
    try { await api.taskBatch(params); } catch { await refresh(); }
  }, [state, refresh]);

  const completeTask = useCallback(async ({ id, date, done }: { id: string; date: string; done: boolean }) => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const rule = JSON.parse(task.repeat_rule || '{"type":"none"}');
    if (rule.type !== "none") {
      if (done) {
        dispatch({ type: "upsert_completion", data: { id: crypto.randomUUID(), task_id: id, date } });
      } else {
        dispatch({ type: "remove_completion", task_id: id, date });
      }
    } else {
      dispatch({ type: "upsert_task", data: { ...task, done } });
    }
    try { await api.taskComplete({ id, date, done }); } catch { await refresh(); }
  }, [state.tasks, refresh]);

  const saveCampaign = useCallback(async (data: any) => {
    const row = await api.campaignSave(data);
    dispatch({ type: "upsert_campaign", data: row });
    return row;
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    dispatch({ type: "remove_campaign", id });
    try { await api.campaignDelete(id); } catch { await refresh(); }
  }, [refresh]);

  const attachTasks = useCallback(async (campaignId: string | null, taskIds: string[]) => {
    dispatch({ type: "attach_tasks", campaignId, taskIds });
    try { await api.campaignAttach({ campaignId, taskIds }); } catch { await refresh(); }
  }, []);

  const saveCountdown = useCallback(async (data: any) => {
    const row = await api.countdownSave(data);
    dispatch({ type: "upsert_countdown", data: row });
    return row;
  }, []);

  const deleteCountdown = useCallback(async (id: string) => {
    dispatch({ type: "remove_countdown", id });
    try { await api.countdownDelete(id); } catch { await refresh(); }
  }, [refresh]);

  const saveSettings = useCallback(async (data: any) => {
    const row = await api.settingsSave(data);
    dispatch({ type: "update_settings", data: row });
    return row;
  }, []);

  const exportData = useCallback(async () => {
    return await api.dataExport();
  }, []);

  const importData = useCallback(async (data: any) => {
    await api.dataImport(data);
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
      saveCountdown, deleteCountdown, saveSettings,
      exportData, importData,
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
