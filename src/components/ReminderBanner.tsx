import { useState, useEffect, useRef } from "react";
import { useStore } from "../store";
import { checkReminders, dismissReminder, sendBrowserNotification, updateStartMonday, type Reminder } from "../lib/remind";

export default function ReminderBanner() {
  const { state } = useStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (state.status !== "ready") return;
    const current = state.semesters.find(s => s.is_current);
    if (current) updateStartMonday(current.start_monday);
  }, [state.semesters, state.status]);

  useEffect(() => {
    if (state.status !== "ready") return;

    const check = () => {
      const found = checkReminders(state.courses, state.tasks, state.periodSlots, state.settings);
      setReminders(found);

      for (const r of found) {
        if (!notifiedRef.current.has(r.id)) {
          notifiedRef.current.add(r.id);
          sendBrowserNotification(
            r.type === "course" ? "课程提醒" : "日程提醒",
            `${r.title} — ${r.minutesAway === 0 ? "现在开始" : `${r.minutesAway}分钟后开始`}`,
          );
        }
      }
    };

    check();
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [state.status, state.courses, state.tasks, state.periodSlots, state.settings]);

  const handleDismiss = (id: string) => {
    dismissReminder(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  if (reminders.length === 0) return null;

  return (
    <div className="reminder-banner">
      {reminders.map(r => (
        <div key={r.id} className="reminder-item">
          <span className="reminder-icon">{r.type === "course" ? "📖" : "📋"}</span>
          <span className="reminder-text">
            {r.title}
            {r.minutesAway === 0 ? " — 现在开始" : ` — ${r.minutesAway}分钟后开始`}
          </span>
          <button className="reminder-dismiss" onClick={() => handleDismiss(r.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
