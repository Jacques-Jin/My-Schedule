import { useState, useMemo } from "react";
import { useStore, type Course, type Task } from "../store";
import {
  formatDate, parseDate, weekIndexOf, resolveDayType, courseOccursOn,
  expandTaskOn, taskDoneOn, PERIOD_SLOTS,
} from "../lib/date";
import TimelineItem from "../components/home/TimelineItem";
import FocusCard from "../components/home/FocusCard";
import CountdownChips from "../components/home/CountdownChips";
import TaskFormSheet from "../components/task/TaskFormSheet";
import CourseDetailSheet from "../components/course/CourseDetailSheet";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

interface TimelineEntry {
  type: "course" | "task";
  startTime: string;
  endTime: string;
  course?: Course;
  task?: Task;
  isTaskDone?: boolean;
}

export default function HomePage() {
  const { state, completeTask, saveTask } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);

  const today = new Date();
  const todayStr = formatDate(today);
  const semester = state.semesters.find(s => s.is_current);
  const dayType = semester ? resolveDayType(todayStr, state.holidays, state.dayOverrides) : { isHoliday: false, label: "", effectiveWeekday: today.getDay() || 7, source: "normal" as const };
  const week = semester ? weekIndexOf(today, semester) : 0;

  const todayTasks = useMemo(() => {
    if (!semester) return [];
    return state.tasks.filter(t => {
      const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
      if (rule.type !== "none") return expandTaskOn(t, today, semester);
      return t.date === todayStr;
    });
  }, [state.tasks, semester, todayStr]);

  const todayUndone = todayTasks.filter(t => {
    const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
    if (rule.type !== "none") return !taskDoneOn(t, todayStr, state.completions);
    return !t.done;
  });

  const todayDone = todayTasks.filter(t => {
    const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
    if (rule.type !== "none") return taskDoneOn(t, todayStr, state.completions);
    return t.done;
  });

  const timeline = useMemo(() => {
    if (!semester) return [];
    const entries: TimelineEntry[] = [];

    const todayCourses = dayType.isHoliday ? [] : state.courses.filter(c => courseOccursOn(c, today, semester, dayType.effectiveWeekday));
    for (const c of todayCourses) {
      const slot = PERIOD_SLOTS.find(s => s.slot_no === c.start_period);
      const endSlot = PERIOD_SLOTS.find(s => s.slot_no === c.end_period);
      if (slot && endSlot) {
        entries.push({
          type: "course",
          startTime: slot.start_time,
          endTime: endSlot.end_time,
          course: c,
        });
      }
    }

    if (state.settings.overlay_repeat) {
      const fixedTasks = state.tasks.filter(t => {
        const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
        return rule.type === "daily" && t.start_time;
      });
      for (const t of fixedTasks) {
        const isDone = taskDoneOn(t, todayStr, state.completions);
        entries.push({
          type: "task",
          startTime: t.start_time || "00:00",
          endTime: t.end_time || t.start_time || "23:59",
          task: t,
          isTaskDone: isDone,
        });
      }
    }

    for (const t of todayTasks) {
      const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
      if (rule.type === "daily" && t.start_time) continue;
      if (!t.start_time) continue;
      const isDone = rule.type !== "none"
        ? taskDoneOn(t, todayStr, state.completions)
        : t.done;
      entries.push({
        type: "task",
        startTime: t.start_time,
        endTime: t.end_time || t.start_time,
        task: t,
        isTaskDone: isDone,
      });
    }

    entries.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return entries;
  }, [state.courses, state.tasks, state.completions, state.settings.overlay_repeat, semester, todayStr, dayType]);

  const nowTime = `${String(today.getHours()).padStart(2, "0")}:${String(today.getMinutes()).padStart(2, "0")}`;

  const nextClass = useMemo(() => {
    if (!semester) return null;
    const todayCourses = dayType.isHoliday ? [] : state.courses
      .filter(c => courseOccursOn(c, today, semester, dayType.effectiveWeekday))
      .sort((a, b) => a.start_period - b.start_period);

    for (const c of todayCourses) {
      const endSlot = PERIOD_SLOTS.find(s => s.slot_no === c.end_period);
      if (endSlot && endSlot.end_time > nowTime) {
        const slot = PERIOD_SLOTS.find(s => s.slot_no === c.start_period);
        if (slot) {
          return { course: c, date: todayStr, time: slot.start_time, slot, endSlot };
        }
      }
    }
    return null;
  }, [state.courses, semester, nowTime, dayType]);

  const currentWeek = semester ? weekIndexOf(today, semester) : 1;

  function handleTaskToggle(task: Task) {
    const rule = JSON.parse(task.repeat_rule || '{"type":"none"}');
    if (rule.type !== "none") {
      const isDone = taskDoneOn(task, todayStr, state.completions);
      completeTask({ id: task.id, date: todayStr, done: !isDone });
    } else {
      completeTask({ id: task.id, date: todayStr, done: !task.done });
    }
  }

  function handleTaskSave(data: any) {
    saveTask(data).then(() => setFormOpen(false));
  }

  function handleFormOpen() {
    setEditingTask(null);
    setFormOpen(true);
  }

  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 星期${WEEKDAYS[today.getDay()]}`;

  return (
    <div className="page home-page">
      <div className="home-header">
        <div className="home-date">{dateStr}</div>
        {week > 0 && <div className="home-week">第{week}周</div>}
        {dayType.isHoliday && <div className="home-holiday-badge">{dayType.label}</div>}
      </div>

      <div className="home-layout">
        <div className="home-col-timeline">
          <div className="home-section-header">
            <span>今日时间线</span>
            <button className="home-add-btn" onClick={handleFormOpen}>＋添加</button>
          </div>
          {timeline.length === 0 ? (
            <div className="home-empty">今天没有安排</div>
          ) : (
            <div className="timeline">
              {timeline.map((entry, i) => {
                const isPast = entry.endTime < nowTime;
                const isCurrent = entry.startTime <= nowTime && entry.endTime >= nowTime;
                return (
                  <TimelineItem
                    key={`${entry.type}-${entry.course?.id || entry.task?.id}-${i}`}
                    type={entry.type}
                    course={entry.course}
                    task={entry.task}
                    slot={entry.type === "course" ? PERIOD_SLOTS.find(s => s.slot_no === entry.course!.start_period) : undefined}
                    endSlot={entry.type === "course" ? PERIOD_SLOTS.find(s => s.slot_no === entry.course!.end_period) : undefined}
                    isPast={isPast}
                    isCurrent={isCurrent}
                    onCourseClick={(c) => setDetailCourse(c)}
                    onTaskClick={(t) => { setEditingTask(t); setFormOpen(true); }}
                    onTaskToggle={handleTaskToggle}
                    isTaskDone={entry.isTaskDone}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="home-col-tasks">
          <div className="home-section-header">
            <span>今日待办</span>
            <span className="home-progress">{todayDone.length}/{todayTasks.length}</span>
          </div>
          {todayUndone.length === 0 && todayDone.length === 0 ? (
            <div className="home-empty">今天没有待办</div>
          ) : (
            <div className="home-todo-list">
              {todayUndone.map(t => (
                <label key={t.id} className="home-todo-item">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleTaskToggle(t)}
                  />
                  <span className="home-todo-title">{t.title}</span>
                  {t.start_time && <span className="home-todo-time">{t.start_time}</span>}
                </label>
              ))}
              {todayDone.map(t => (
                <label key={t.id} className="home-todo-item done">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => handleTaskToggle(t)}
                  />
                  <span className="home-todo-title">{t.title}</span>
                  {t.start_time && <span className="home-todo-time">{t.start_time}</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="home-col-right">
          <FocusCard nextClass={nextClass} />
          <div className="home-section-header" style={{ marginTop: 16 }}>
            <span>倒计时</span>
          </div>
          <CountdownChips holidays={state.holidays} countdowns={state.countdowns} />
        </div>
      </div>

      <TaskFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleTaskSave}
        initialData={editingTask}
        campaigns={state.campaigns}
        defaultDate={todayStr}
      />

      <CourseDetailSheet
        open={!!detailCourse}
        onClose={() => setDetailCourse(null)}
        course={detailCourse}
        semester={semester || state.semesters[0]}
        periodSlots={PERIOD_SLOTS}
        currentWeek={currentWeek}
      />
    </div>
  );
}
