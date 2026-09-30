// Week/date/holiday/repeat calculation utilities

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
export interface DayOverride {
  id: string; date: string; kind: "holiday" | "classday";
  follow_weekday: number | null; name: string | null;
}
export interface DayType {
  isHoliday: boolean;
  label: string;
  effectiveWeekday: number;
  source: "override" | "holiday" | "normal";
}

// Parse "YYYY-MM-DD" to Date (local)
export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Format Date to "YYYY-MM-DD"
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Get Monday of the week containing date
export function mondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get dates of a specific week (Mon-Sun) relative to semester start
export function datesOfWeek(weekIdx: number, semester: Semester): string[] {
  const start = parseDate(semester.start_monday);
  const monday = new Date(start);
  monday.setDate(monday.getDate() + (weekIdx - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });
}

// Week index (1-based) for a given date; 0 if before semester, -1 if after
export function weekIndexOf(date: Date, semester: Semester): number {
  const start = parseDate(semester.start_monday);
  const mon = mondayOfWeek(date);
  const diffDays = Math.round((mon.getTime() - start.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  if (week < 1) return 0;
  if (week > semester.total_weeks) return -1;
  return week;
}

// Check if a date is a holiday
export function holidayOn(date: Date, holidays: Holiday[]): Holiday | null {
  const ds = formatDate(date);
  return holidays.find(h => ds >= h.start_date && ds <= h.end_date) || null;
}

// Find a day override for a specific date
export function overrideOn(dateStr: string, overrides: DayOverride[]): DayOverride | null {
  return overrides.find(o => o.date === dateStr) || null;
}

// Resolve the effective day type: override > holiday > normal
// effectiveWeekday uses 1=Mon … 7=Sun (matches Course.weekday)
export function resolveDayType(dateStr: string, holidays: Holiday[], overrides: DayOverride[]): DayType {
  const date = parseDate(dateStr);
  const dow = date.getDay();
  const realWeekday = dow === 0 ? 7 : dow;
  const override = overrideOn(dateStr, overrides);
  if (override) {
    if (override.kind === "holiday") {
      return {
        isHoliday: true,
        label: override.name || "放假",
        effectiveWeekday: realWeekday,
        source: "override",
      };
    }
    return {
      isHoliday: false,
      label: override.name || "",
      effectiveWeekday: override.follow_weekday || realWeekday,
      source: "override",
    };
  }
  const holiday = holidayOn(date, holidays);
  if (holiday) {
    return {
      isHoliday: true,
      label: holiday.name,
      effectiveWeekday: realWeekday,
      source: "holiday",
    };
  }
  return {
    isHoliday: false,
    label: "",
    effectiveWeekday: realWeekday,
    source: "normal",
  };
}

// Parse week_rule JSON: {"ranges":[[2,17]],"parity":null|"odd"|"even"}
interface WeekRule { ranges: [number, number][]; parity: null | "odd" | "even" }
function parseWeekRule(json: string): WeekRule {
  try { return JSON.parse(json); } catch { return { ranges: [], parity: null }; }
}

// Check if a course occurs on a given date
// effectiveWeekday (1-7, Mon-Sun) overrides the real weekday of date; week is always from real date
export function courseOccursOn(course: Course, date: Date, semester: Semester, effectiveWeekday?: number): boolean {
  const week = weekIndexOf(date, semester);
  if (week < 1) return false;
  const dow = date.getDay(); // 0=Sun, 1=Mon...
  const weekday = effectiveWeekday ?? (dow === 0 ? 7 : dow);
  if (weekday !== course.weekday) return false;
  const rule = parseWeekRule(course.week_rule);
  if (!rule.ranges.some(([lo, hi]) => week >= lo && week <= hi)) return false;
  if (rule.parity === "odd" && week % 2 === 0) return false;
  if (rule.parity === "even" && week % 2 !== 0) return false;
  return true;
}

// Parse repeat_rule JSON
interface RepeatRule {
  type: "none" | "daily" | "weekly" | "biweekly" | "weeks";
  weekdays?: number[];
  weekday?: number;
  anchor?: string;
  weeks?: number[];
}
function parseRepeatRule(json: string): RepeatRule {
  try { return JSON.parse(json); } catch { return { type: "none" }; }
}

// Expand a repeating task to check if it occurs on a given date
export function expandTaskOn(task: Task, date: Date, semester: Semester): boolean {
  const rule = parseRepeatRule(task.repeat_rule);
  if (rule.type === "none") return task.date === formatDate(date);
  const ds = formatDate(date);
  if (ds < task.date) return false;
  const taskDate = parseDate(task.date);
  const dow = date.getDay() || 7;
  const week = weekIndexOf(date, semester);

  switch (rule.type) {
    case "daily": return true;
    case "weekly": return (rule.weekdays || []).includes(dow);
    case "biweekly": {
      if (dow !== rule.weekday) return false;
      const anchor = parseDate(rule.anchor || task.date);
      const diffDays = Math.round((mondayOfWeek(date).getTime() - mondayOfWeek(anchor).getTime()) / 86400000);
      return diffDays >= 0 && diffDays % 14 === 0;
    }
    case "weeks":
      return dow === rule.weekday && (rule.weeks || []).includes(week);
    default: return false;
  }
}

// Check if a task is done on a specific date
export function taskDoneOn(task: Task, date: string, completions: TaskCompletion[]): boolean {
  if (task.done && task.date === date) return true;
  const rule = parseRepeatRule(task.repeat_rule);
  if (rule.type !== "none") {
    return completions.some(c => c.task_id === task.id && c.date === date);
  }
  return false;
}

// Find the next upcoming class from now
// NOTE: does NOT consult day_overrides; callers that need override-aware results
// should compute the next class themselves using resolveDayType + courseOccursOn.
export function nextClassFrom(now: Date, courses: Course[], semester: Semester, holidays: Holiday[]): { course: Course; date: string; time: string } | null {
  const todayStr = formatDate(now);
  for (let d = 0; d < 14; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    date.setHours(0, 0, 0, 0);
    if (holidayOn(date, holidays)) continue;
    const week = weekIndexOf(date, semester);
    if (week < 1) continue;
    const dayCourses = courses.filter(c => courseOccursOn(c, date, semester));
    dayCourses.sort((a, b) => a.start_period - b.start_period);
    for (const c of dayCourses) {
      if (d === 0) {
        // Today: only future periods
        const slot = PERIOD_SLOTS.find(s => s.slot_no === c.start_period);
        if (slot && slot.start_time <= formatTime(now)) {
          // Check if end_time already passed
          const endSlot = PERIOD_SLOTS.find(s => s.slot_no === c.end_period);
          if (endSlot && endSlot.end_time <= formatTime(now)) continue;
        }
      }
      const slot = PERIOD_SLOTS.find(s => s.slot_no === c.start_period);
      return { course: c, date: formatDate(date), time: slot?.start_time || "" };
    }
  }
  return null;
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Default 14 period slots
export const PERIOD_SLOTS: PeriodSlot[] = [
  { id: "p1", slot_no: 1, start_time: "08:00", end_time: "08:45" },
  { id: "p2", slot_no: 2, start_time: "08:50", end_time: "09:35" },
  { id: "p3", slot_no: 3, start_time: "09:50", end_time: "10:35" },
  { id: "p4", slot_no: 4, start_time: "10:40", end_time: "11:25" },
  { id: "p5", slot_no: 5, start_time: "11:30", end_time: "12:15" },
  { id: "p6", slot_no: 6, start_time: "14:00", end_time: "14:45" },
  { id: "p7", slot_no: 7, start_time: "14:50", end_time: "15:35" },
  { id: "p8", slot_no: 8, start_time: "15:50", end_time: "16:35" },
  { id: "p9", slot_no: 9, start_time: "16:40", end_time: "17:25" },
  { id: "p10", slot_no: 10, start_time: "17:30", end_time: "18:15" },
  { id: "p11", slot_no: 11, start_time: "19:00", end_time: "19:45" },
  { id: "p12", slot_no: 12, start_time: "19:50", end_time: "20:35" },
  { id: "p13", slot_no: 13, start_time: "20:40", end_time: "21:25" },
  { id: "p14", slot_no: 14, start_time: "21:30", end_time: "22:15" },
];
