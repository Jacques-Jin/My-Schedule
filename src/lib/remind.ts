import type { Task, Course, PeriodSlot, Settings } from "../store";

export interface Reminder {
  id: string;
  type: "course" | "task";
  title: string;
  time: string;
  minutesAway: number;
}

const DISMISSED_KEY = "remind_dismissed";

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const obj = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    if (obj._date !== today) return new Set();
    return new Set(obj.ids || []);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify({ _date: today, ids: [...ids] }));
}

export function dismissReminder(id: string) {
  const dismissed = getDismissed();
  dismissed.add(id);
  saveDismissed(dismissed);
}

function getCurrentWeekNumber(startMonday: string): number {
  const start = new Date(startMonday);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return diff + 1;
}

function isCourseActiveThisWeek(weekRule: string, currentWeek: number): boolean {
  try {
    const rule = JSON.parse(weekRule);
    if (!rule.ranges) return false;
    for (const [s, e] of rule.ranges) {
      if (currentWeek >= s && currentWeek <= e) {
        if (rule.parity === "odd" && currentWeek % 2 === 0) continue;
        if (rule.parity === "even" && currentWeek % 2 !== 0) continue;
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function getTodayWeekday(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

function getTimeMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getNowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function checkReminders(
  courses: Course[],
  tasks: Task[],
  periodSlots: PeriodSlot[],
  settings: Settings,
): Reminder[] {
  const dismissed = getDismissed();
  const reminders: Reminder[] = [];
  const nowMin = getNowMinutes();
  const today = new Date().toISOString().slice(0, 10);
  const todayStr = today;
  const weekday = getTodayWeekday();
  const currentWeek = getCurrentWeekNumber(
    courses.length > 0 ? "" : ""
  );

  const periodMap = new Map<number, PeriodSlot>();
  for (const p of periodSlots) {
    periodMap.set(p.slot_no, p);
  }

  const startMonday = findStartMonday();
  const weekNum = startMonday ? getCurrentWeekNumber(startMonday) : 1;

  for (const course of courses) {
    if (course.weekday !== weekday) continue;
    if (!isCourseActiveThisWeek(course.week_rule, weekNum)) continue;

    const slot = periodMap.get(course.start_period);
    if (!slot) continue;

    const courseStartMin = getTimeMinutes(slot.start_time);
    const diff = courseStartMin - nowMin;
    const remindMin = settings.remind_minutes ?? 10;

    if (diff >= 0 && diff <= remindMin) {
      const id = `course-${course.id}-${todayStr}`;
      if (!dismissed.has(id)) {
        reminders.push({
          id,
          type: "course",
          title: `${course.name} (${slot.start_time})`,
          time: slot.start_time,
          minutesAway: diff,
        });
      }
    }
  }

  const todayTasks = tasks.filter(t => t.date === todayStr);
  for (const task of todayTasks) {
    if (!task.start_time) continue;
    if (task.reminder === "none" || !task.reminder) continue;

    const taskStartMin = getTimeMinutes(task.start_time);
    const diff = taskStartMin - nowMin;

    let remindMin = 0;
    if (task.reminder === "on_time") remindMin = 0;
    else if (task.reminder === "10") remindMin = 10;
    else if (task.reminder === "30") remindMin = 30;
    else if (task.reminder === "60") remindMin = 60;
    else continue;

    if (diff >= 0 && diff <= remindMin) {
      const id = `task-${task.id}-${todayStr}`;
      if (!dismissed.has(id)) {
        reminders.push({
          id,
          type: "task",
          title: `${task.title} (${task.start_time})`,
          time: task.start_time,
          minutesAway: diff,
        });
      }
    }
  }

  return reminders.sort((a, b) => a.minutesAway - b.minutesAway);
}

function findStartMonday(): string | null {
  try {
    const raw = localStorage.getItem("remind_start_monday");
    return raw;
  } catch {
    return null;
  }
}

export function updateStartMonday(startMonday: string) {
  localStorage.setItem("remind_start_monday", startMonday);
}

export function sendBrowserNotification(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {}
}
