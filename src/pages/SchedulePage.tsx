import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useStore, type Course, type Task } from "../store";
import {
  formatDate, parseDate, datesOfWeek, weekIndexOf,
  resolveDayType, courseOccursOn, expandTaskOn, PERIOD_SLOTS,
  type DayOverride, type DayType,
} from "../lib/date";
import WeekSwitcher from "../components/course/WeekSwitcher";
import DayChips from "../components/course/DayChips";
import CourseBlock from "../components/course/CourseBlock";
import CourseDetailSheet from "../components/course/CourseDetailSheet";
import CourseFormSheet from "../components/course/CourseFormSheet";
import TaskFormSheet from "../components/task/TaskFormSheet";
import DayOverrideSheet from "../components/schedule/DayOverrideSheet";
import { parseScheduleXlsx } from "../lib/xlsx-import";
import { cellToTaskDraft, type TaskDraft } from "../lib/schedule-cell";
import { useNow } from "../hooks/useNow";
import { getNowPosition, getNowDayPart } from "../lib/time-indicator";

type ViewMode = "day" | "week";

function getDefaultView(): ViewMode {
  const saved = localStorage.getItem("schedule_view");
  if (saved === "day" || saved === "week") return saved;
  return window.innerWidth < 768 ? "day" : "week";
}

const DAY_SHORT = ["一", "二", "三", "四", "五", "六", "日"];

export default function SchedulePage() {
  const { state, saveTask, saveCourse, saveDayOverride, deleteDayOverride } = useStore();
  const { semesters, holidays, courses, tasks, periodSlots, settings, dayOverrides } = state;

  const currentSemester = semesters.find(s => s.is_current) || semesters[0];
  const today = formatDate(new Date());
  const todayWeek = currentSemester ? weekIndexOf(new Date(), currentSemester) : 1;

  const [view, setView] = useState<ViewMode>(getDefaultView);
  const [week, setWeek] = useState(todayWeek > 0 ? todayWeek : 1);
  const [selectedDate, setSelectedDate] = useState(today);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState(today);
  const [overrideInitial, setOverrideInitial] = useState<DayOverride | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const now = useNow();

  useEffect(() => { localStorage.setItem("schedule_view", view); }, [view]);

  useEffect(() => {
    if (currentSemester) {
      const tw = weekIndexOf(new Date(), currentSemester);
      setWeek(tw > 0 ? tw : 1);
    }
  }, [currentSemester?.id]);

  const weekDates = useMemo(() => {
    if (!currentSemester) return [];
    return datesOfWeek(week, currentSemester);
  }, [week, currentSemester]);

  useEffect(() => {
    if (weekDates.length > 0 && !weekDates.includes(selectedDate)) {
      setSelectedDate(weekDates[0]);
    }
  }, [weekDates]);

  const pSlots = periodSlots.length > 0
    ? [...periodSlots].sort((a, b) => a.slot_no - b.slot_no)
    : PERIOD_SLOTS.map(p => ({ ...p, id: String(p.slot_no) }));

  const semesterCourses = useMemo(() => {
    if (!currentSemester) return [];
    return courses.filter(c => c.semester_id === currentSemester.id);
  }, [courses, currentSemester]);

  const getCoursesForDate = useCallback((dateStr: string) => {
    const date = parseDate(dateStr);
    const dayType = resolveDayType(dateStr, holidays, dayOverrides);
    if (dayType.isHoliday) return [];
    return semesterCourses.filter(c => courseOccursOn(c, date, currentSemester!, dayType.effectiveWeekday));
  }, [semesterCourses, currentSemester, holidays, dayOverrides]);

  const getDayTypeForDate = useCallback((dateStr: string) => {
    return resolveDayType(dateStr, holidays, dayOverrides);
  }, [holidays, dayOverrides]);

  const getRepeatTasksForDate = useCallback((dateStr: string) => {
    if (!settings.overlay_repeat || !currentSemester) return [];
    const dayType = resolveDayType(dateStr, holidays, dayOverrides);
    if (dayType.isHoliday) return [];
    const date = parseDate(dateStr);
    return tasks.filter(t => {
      const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
      if (rule.type === "none") return false;
      return expandTaskOn(t, date, currentSemester);
    });
  }, [tasks, settings.overlay_repeat, currentSemester, holidays, dayOverrides]);

  const openCourseDetail = useCallback((course: Course) => {
    setDetailCourse(course);
    setDetailOpen(true);
  }, []);

  const handleTaskTimeChange = useCallback(async (taskId: string, newStart: string, newEnd: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await saveTask({ ...task, start_time: newStart, end_time: newEnd });
  }, [tasks, saveTask]);

  const handleCellClick = useCallback((dateStr: string, slot: { start_time: string; end_time: string }) => {
    if (taskFormOpen) return;
    const draft = cellToTaskDraft(dateStr, slot);
    setTaskDraft(draft);
    setTaskFormOpen(true);
  }, [taskFormOpen]);

  const openOverrideSheet = useCallback((dateStr: string) => {
    setOverrideDate(dateStr);
    setOverrideInitial(dayOverrides.find(o => o.date === dateStr) || null);
    setOverrideOpen(true);
  }, [dayOverrides]);

  const handleOverrideSave = useCallback(async (data: any) => {
    await saveDayOverride(data);
  }, [saveDayOverride]);

  const handleOverrideClear = useCallback(async () => {
    await deleteDayOverride({ date: overrideDate });
  }, [deleteDayOverride, overrideDate]);

  const handleXlsxFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentSemester) return;
    setImportMsg("解析中...");
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseScheduleXlsx(buf);
      if (parsed.length === 0) { setImportMsg("未识别到课程，请检查文件格式"); return; }
      setImportMsg(`识别到 ${parsed.length} 门课程，导入中...`);
      for (const c of parsed) {
        await saveCourse({ ...c, semester_id: currentSemester.id });
      }
      setImportMsg(`成功导入 ${parsed.length} 门课程`);
      setTimeout(() => setImportMsg(""), 3000);
    } catch (err: any) {
      setImportMsg(`导入失败：${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [currentSemester, saveCourse]);

  if (!currentSemester) {
    return <div className="page"><p>暂无学期数据，请在设置中添加。</p></div>;
  }

  return (
    <div className="page schedule-page">
      <div className="schedule-toolbar">
        <WeekSwitcher
          week={week}
          totalWeeks={currentSemester.total_weeks}
          onWeekChange={setWeek}
          onBackToCurrent={() => setWeek(todayWeek > 0 ? todayWeek : 1)}
          semesters={semesters}
          currentSemesterId={currentSemester.id}
          onSemesterChange={(id) => {
            const sem = semesters.find(s => s.id === id);
            if (sem) {
              const tw = weekIndexOf(new Date(), sem);
              setWeek(tw > 0 ? tw : 1);
            }
          }}
        />
        <div className="view-toggle">
          <button className={`view-btn ${view === "day" ? "active" : ""}`} onClick={() => setView("day")}>日</button>
          <button className={`view-btn ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>周</button>
        </div>
        <div className="toolbar-actions">
          <button className="tb-btn" onClick={() => fileInputRef.current?.click()} title="从 xlsx 导入课表">导入</button>
          <button className="tb-btn tb-btn-primary" onClick={() => setFormOpen(true)} title="手动添加课程">+ 课程</button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleXlsxFile} />
        </div>
      </div>
      {importMsg && <div className="import-toast">{importMsg}</div>}

      {view === "day" ? (
        <DayView
          dates={weekDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          today={today}
          now={now}
          getCourses={getCoursesForDate}
          getDayType={getDayTypeForDate}
          getRepeatTasks={getRepeatTasksForDate}
          periodSlots={pSlots}
          onCourseClick={openCourseDetail}
          onMarkDay={openOverrideSheet}
        />
      ) : (
        <WeekView
          dates={weekDates}
          today={today}
          now={now}
          getCourses={getCoursesForDate}
          getDayType={getDayTypeForDate}
          getRepeatTasks={getRepeatTasksForDate}
          periodSlots={pSlots}
          onCourseClick={openCourseDetail}
          onTaskTimeChange={handleTaskTimeChange}
          onCellClick={handleCellClick}
          onDayHeaderClick={openOverrideSheet}
        />
      )}

      <CourseDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        course={detailCourse}
        semester={currentSemester}
        periodSlots={pSlots}
        currentWeek={week}
      />

      <CourseFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        semesterId={currentSemester.id}
        periodSlots={pSlots}
      />

      <TaskFormSheet
        open={taskFormOpen}
        onClose={() => { setTaskFormOpen(false); setTaskDraft(null); }}
        onSave={(d) => saveTask(d)}
        initialData={taskDraft || undefined}
        campaigns={state.campaigns}
        totalWeeks={currentSemester.total_weeks}
      />

      <DayOverrideSheet
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        onSave={handleOverrideSave}
        onClear={handleOverrideClear}
        initialData={overrideInitial}
        defaultDate={overrideDate}
      />
    </div>
  );
}

// ---- Day View ----
function DayView({ dates, selectedDate, onSelectDate, today, now, getCourses, getDayType, getRepeatTasks, periodSlots, onCourseClick, onMarkDay }: {
  dates: string[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  today: string;
  now: Date;
  getCourses: (d: string) => Course[];
  getDayType: (d: string) => DayType;
  getRepeatTasks: (d: string) => Task[];
  periodSlots: { id: string; slot_no: number; start_time: string; end_time: string }[];
  onCourseClick: (c: Course) => void;
  onMarkDay: (d: string) => void;
}) {
  const dayCourses = getCourses(selectedDate);
  const dayType = getDayType(selectedDate);
  const repeatTasks = getRepeatTasks(selectedDate);

  const dayPart = useMemo(() => {
    if (selectedDate !== today) return null;
    if (dayType.isHoliday) return null;
    return getNowDayPart(now, periodSlots);
  }, [now, selectedDate, today, dayType.isHoliday, periodSlots]);

  const morning = dayCourses.filter(c => c.start_period <= 5);
  const afternoon = dayCourses.filter(c => c.start_period >= 6 && c.start_period <= 10);
  const evening = dayCourses.filter(c => c.start_period >= 11);

  const renderGroup = (label: string, items: Course[], part: "morning" | "afternoon" | "evening") => (
    <div className={`day-group${dayPart === part ? " now-group" : ""}`}>
      <div className="day-group-label">
        {label}
        {dayPart === part && <span className="day-now-tag">现在</span>}
      </div>
      {items.length === 0 ? (
        <div className="day-empty">暂无课程</div>
      ) : (
        items.map(c => {
          const slot = periodSlots.find(s => s.slot_no === c.start_period);
          const endSlot = periodSlots.find(s => s.slot_no === c.end_period);
          return (
            <div key={c.id} className="day-course-card" onClick={() => onCourseClick(c)}>
              <div className="dcc-time">
                第{c.start_period}-{c.end_period}节
                {slot && <span className="dcc-time-detail">{slot.start_time}-{endSlot?.end_time}</span>}
              </div>
              <div className="dcc-info">
                <span className="dcc-name">{c.name}</span>
                {c.location && <span className="dcc-loc">{c.location}</span>}
              </div>
            </div>
          );
        })
      )}
      {repeatTasks.length > 0 && items.length === 0 && (
        <div className="day-repeat-tasks">
          {repeatTasks.map(t => (
            <div key={t.id} className="day-task-chip">{t.title}</div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="day-view">
      <DayChips dates={dates} selectedDate={selectedDate} onSelect={onSelectDate} today={today} />
      {dayType.isHoliday && (
        <div className="day-holiday-banner">
          {dayType.label}
          {dayType.source === "override" && <span className="day-override-tag">调休</span>}
        </div>
      )}
      {!dayType.isHoliday && dayType.source === "override" && (
        <div className="day-class-banner">
          补课日{dayType.label ? `：${dayType.label}` : ""}
        </div>
      )}
      {!dayType.isHoliday && (
        <div className="day-groups">
          {renderGroup("上午", morning, "morning")}
          {renderGroup("下午", afternoon, "afternoon")}
          {renderGroup("晚上", evening, "evening")}
        </div>
      )}
      <button className="day-mark-btn" onClick={() => onMarkDay(selectedDate)}>标记这天</button>
    </div>
  );
}

// ---- Week View ----
function WeekView({ dates, today, now, getCourses, getDayType, getRepeatTasks, periodSlots, onCourseClick, onTaskTimeChange, onCellClick, onDayHeaderClick }: {
  dates: string[];
  today: string;
  now: Date;
  getCourses: (d: string) => Course[];
  getDayType: (d: string) => DayType;
  getRepeatTasks: (d: string) => Task[];
  periodSlots: { id: string; slot_no: number; start_time: string; end_time: string }[];
  onCourseClick: (c: Course) => void;
  onTaskTimeChange: (taskId: string, newStart: string, newEnd: string) => Promise<void>;
  onCellClick: (dateStr: string, slot: { start_time: string; end_time: string }) => void;
  onDayHeaderClick: (d: string) => void;
}) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const dragTask = useRef<{ task: Task; durationMin: number } | null>(null);

  const nowPos = useMemo(() => {
    if (!dates.includes(today)) return null;
    const todayType = getDayType(today);
    if (todayType.isHoliday) return null;
    return getNowPosition(now, periodSlots);
  }, [now, dates, today, getDayType, periodSlots]);

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    const start = task.start_time || "08:00";
    const end = task.end_time || "08:30";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const durationMin = (eh * 60 + em) - (sh * 60 + sm) || 30;
    dragTask.current = { task, durationMin };
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, slot: { slot_no: number; start_time: string }) => {
    e.preventDefault();
    setDragOverCell(null);
    const data = dragTask.current;
    if (!data) return;
    const [h, m] = slot.start_time.split(":").map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + data.durationMin;
    const newStart = `${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}`;
    const newEnd = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    onTaskTimeChange(data.task.id, newStart, newEnd);
    dragTask.current = null;
  }, [onTaskTimeChange]);

  return (
    <div className="week-view">
      {/* Routine band */}
      <div className="routine-band">
        <div className="rb-label">日常</div>
        {dates.map((d, i) => {
          const dayType = getDayType(d);
          const routines = dayType.isHoliday ? [] : getRepeatTasks(d);
          const sorted = [...routines].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
          return (
            <div key={d} className={`rb-day ${dayType.isHoliday ? "rb-holiday" : ""}`}>
              {sorted.map(t => (
                <div
                  key={t.id}
                  className="rb-chip"
                  draggable
                  onDragStart={e => handleDragStart(e, t)}
                  onDragEnd={() => { dragTask.current = null; }}
                  title={`${t.title}${t.start_time ? ` ${t.start_time}-${t.end_time}` : ""}`}
                >
                  {t.start_time && <span className="rb-chip-time">{t.start_time}</span>}
                  {t.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="week-grid">
        {/* Header row */}
        <div className="wg-corner" />
        {dates.map((d, i) => {
          const dayType = getDayType(d);
          const isToday = d === today;
          const dayNum = parseDate(d).getDate();
          const headClass = [
            "wg-day-head",
            isToday ? "today" : "",
            dayType.isHoliday ? "holiday" : "",
            !dayType.isHoliday && dayType.source === "override" ? "override-class" : "",
          ].filter(Boolean).join(" ");
          return (
            <div key={d} className={headClass} onClick={() => onDayHeaderClick(d)}>
              <span className="wg-day-name">周{DAY_SHORT[i]}</span>
              <span className="wg-day-num">{dayNum}</span>
              {dayType.isHoliday && <span className="wg-day-fest">{dayType.label}</span>}
              {dayType.source === "override" && (
                <span className={`wg-day-badge ${dayType.isHoliday ? "badge-holiday" : "badge-class"}`}>
                  {dayType.isHoliday ? "休" : "补"}
                </span>
              )}
            </div>
          );
        })}

        {/* Period rows */}
        {periodSlots.map(slot => (
          <>
            <div key={`lbl-${slot.slot_no}`} className="wg-period-label" style={{ gridRow: slot.slot_no + 1 }}>
              <span className="wg-pno">{slot.slot_no}</span>
              <span className="wg-ptime">{slot.start_time}</span>
            </div>
            {dates.map((d, colIdx) => {
              const dayType = getDayType(d);
              const cellKey = `${d}-${slot.slot_no}`;
              return (
                <div
                  key={`cell-${cellKey}`}
                  className={`wg-cell ${dayType.isHoliday ? "holiday-cell" : ""} ${dragOverCell === cellKey ? "drag-over" : ""}`}
                  style={{ gridRow: slot.slot_no + 1, gridColumn: colIdx + 2 }}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCell(cellKey); }}
                  onDragLeave={() => setDragOverCell(prev => prev === cellKey ? null : prev)}
                  onDrop={e => handleDrop(e, slot)}
                  onClick={() => { if (dragTask.current) return; onCellClick(d, slot); }}
                />
              );
            })}
          </>
        ))}

        {/* Course blocks */}
        {dates.map((d, colIdx) => {
          const dayType = getDayType(d);
          if (dayType.isHoliday) return null;
          const dayCourses = getCourses(d);
          return dayCourses.map(c => (
            <CourseBlock
              key={c.id}
              course={c}
              startPeriod={c.start_period}
              endPeriod={c.end_period}
              onClick={() => onCourseClick(c)}
              gridRow={c.start_period + 1}
              gridColumn={colIdx + 2}
              rowSpan={c.end_period - c.start_period + 1}
            />
          ));
        })}

        {/* Now indicator line */}
        {nowPos && (
          <div
            className="wg-now-line"
            style={{
              gridRow: nowPos.slotNo + 1,
              gridColumn: dates.indexOf(today) + 2,
              top: `${nowPos.ratio * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
