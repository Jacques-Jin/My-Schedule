import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useStore, type Course, type Task } from "../store";
import {
  formatDate, parseDate, datesOfWeek, weekIndexOf,
  holidayOn, courseOccursOn, expandTaskOn, PERIOD_SLOTS,
} from "../lib/date";
import WeekSwitcher from "../components/course/WeekSwitcher";
import DayChips from "../components/course/DayChips";
import CourseBlock from "../components/course/CourseBlock";
import CourseDetailSheet from "../components/course/CourseDetailSheet";

type ViewMode = "day" | "week";

function getDefaultView(): ViewMode {
  const saved = localStorage.getItem("schedule_view");
  if (saved === "day" || saved === "week") return saved;
  return window.innerWidth < 768 ? "day" : "week";
}

const DAY_SHORT = ["一", "二", "三", "四", "五", "六", "日"];

export default function SchedulePage() {
  const { state, saveTask } = useStore();
  const { semesters, holidays, courses, tasks, periodSlots, settings } = state;

  const currentSemester = semesters.find(s => s.is_current) || semesters[0];
  const today = formatDate(new Date());
  const todayWeek = currentSemester ? weekIndexOf(new Date(), currentSemester) : 1;

  const [view, setView] = useState<ViewMode>(getDefaultView);
  const [week, setWeek] = useState(todayWeek > 0 ? todayWeek : 1);
  const [selectedDate, setSelectedDate] = useState(today);
  const [detailCourse, setDetailCourse] = useState<Course | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
    return semesterCourses.filter(c => courseOccursOn(c, date, currentSemester!));
  }, [semesterCourses, currentSemester]);

  const getHolidayForDate = useCallback((dateStr: string) => {
    return holidayOn(parseDate(dateStr), holidays);
  }, [holidays]);

  const getRepeatTasksForDate = useCallback((dateStr: string) => {
    if (!settings.overlay_repeat || !currentSemester) return [];
    const date = parseDate(dateStr);
    return tasks.filter(t => {
      const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
      if (rule.type === "none") return false;
      return expandTaskOn(t, date, currentSemester);
    });
  }, [tasks, settings.overlay_repeat, currentSemester]);

  const openCourseDetail = useCallback((course: Course) => {
    setDetailCourse(course);
    setDetailOpen(true);
  }, []);

  const handleTaskTimeChange = useCallback(async (taskId: string, newStart: string, newEnd: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await saveTask({ ...task, start_time: newStart, end_time: newEnd });
  }, [tasks, saveTask]);

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
      </div>

      {view === "day" ? (
        <DayView
          dates={weekDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          today={today}
          getCourses={getCoursesForDate}
          getHoliday={getHolidayForDate}
          getRepeatTasks={getRepeatTasksForDate}
          periodSlots={pSlots}
          onCourseClick={openCourseDetail}
        />
      ) : (
        <WeekView
          dates={weekDates}
          today={today}
          getCourses={getCoursesForDate}
          getHoliday={getHolidayForDate}
          getRepeatTasks={getRepeatTasksForDate}
          periodSlots={pSlots}
          onCourseClick={openCourseDetail}
          onTaskTimeChange={handleTaskTimeChange}
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
    </div>
  );
}

// ---- Day View ----
function DayView({ dates, selectedDate, onSelectDate, today, getCourses, getHoliday, getRepeatTasks, periodSlots, onCourseClick }: {
  dates: string[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  today: string;
  getCourses: (d: string) => Course[];
  getHoliday: (d: string) => { name: string } | null;
  getRepeatTasks: (d: string) => Task[];
  periodSlots: { id: string; slot_no: number; start_time: string; end_time: string }[];
  onCourseClick: (c: Course) => void;
}) {
  const dayCourses = getCourses(selectedDate);
  const holiday = getHoliday(selectedDate);
  const repeatTasks = getRepeatTasks(selectedDate);

  const morning = dayCourses.filter(c => c.start_period <= 5);
  const afternoon = dayCourses.filter(c => c.start_period >= 6 && c.start_period <= 10);
  const evening = dayCourses.filter(c => c.start_period >= 11);

  const renderGroup = (label: string, items: Course[]) => (
    <div className="day-group">
      <div className="day-group-label">{label}</div>
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
      {holiday && <div className="day-holiday-banner">{holiday.name}</div>}
      {!holiday && (
        <div className="day-groups">
          {renderGroup("上午", morning)}
          {renderGroup("下午", afternoon)}
          {renderGroup("晚上", evening)}
        </div>
      )}
    </div>
  );
}

// ---- Week View ----
function WeekView({ dates, today, getCourses, getHoliday, getRepeatTasks, periodSlots, onCourseClick, onTaskTimeChange }: {
  dates: string[];
  today: string;
  getCourses: (d: string) => Course[];
  getHoliday: (d: string) => { name: string } | null;
  getRepeatTasks: (d: string) => Task[];
  periodSlots: { id: string; slot_no: number; start_time: string; end_time: string }[];
  onCourseClick: (c: Course) => void;
  onTaskTimeChange: (taskId: string, newStart: string, newEnd: string) => Promise<void>;
}) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const dragTask = useRef<{ task: Task; durationMin: number } | null>(null);

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
          const holiday = getHoliday(d);
          const routines = holiday ? [] : getRepeatTasks(d);
          const sorted = [...routines].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
          return (
            <div key={d} className={`rb-day ${holiday ? "rb-holiday" : ""}`}>
              {sorted.map(t => (
                <div
                  key={t.id}
                  className="rb-chip"
                  draggable
                  onDragStart={e => handleDragStart(e, t)}
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
          const holiday = getHoliday(d);
          const isToday = d === today;
          const dayNum = parseDate(d).getDate();
          return (
            <div key={d} className={`wg-day-head ${isToday ? "today" : ""} ${holiday ? "holiday" : ""}`}>
              <span className="wg-day-name">周{DAY_SHORT[i]}</span>
              <span className="wg-day-num">{dayNum}</span>
              {holiday && <span className="wg-day-fest">{holiday.name}</span>}
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
              const holiday = getHoliday(d);
              const cellKey = `${d}-${slot.slot_no}`;
              return (
                <div
                  key={`cell-${cellKey}`}
                  className={`wg-cell ${holiday ? "holiday-cell" : ""} ${dragOverCell === cellKey ? "drag-over" : ""}`}
                  style={{ gridRow: slot.slot_no + 1, gridColumn: colIdx + 2 }}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCell(cellKey); }}
                  onDragLeave={() => setDragOverCell(prev => prev === cellKey ? null : prev)}
                  onDrop={e => handleDrop(e, slot)}
                />
              );
            })}
          </>
        ))}

        {/* Course blocks */}
        {dates.map((d, colIdx) => {
          const holiday = getHoliday(d);
          if (holiday) return null;
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
      </div>
    </div>
  );
}
