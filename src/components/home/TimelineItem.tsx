import { type Course, type Task, type PeriodSlot } from "../../store";
import { CATEGORY_COLORS } from "../../lib/colors";

interface TimelineItemProps {
  type: "course" | "task";
  course?: Course;
  task?: Task;
  slot?: PeriodSlot;
  endSlot?: PeriodSlot;
  isPast: boolean;
  isCurrent: boolean;
  onCourseClick?: (course: Course) => void;
  onTaskClick?: (task: Task) => void;
  onTaskToggle?: (task: Task) => void;
  isTaskDone?: boolean;
}

export default function TimelineItem({
  type, course, task, slot, endSlot,
  isPast, isCurrent,
  onCourseClick, onTaskClick, onTaskToggle, isTaskDone,
}: TimelineItemProps) {
  const cls = [
    "timeline-item",
    isPast ? "past" : "",
    isCurrent ? "current" : "",
  ].filter(Boolean).join(" ");

  if (type === "course" && course && slot) {
    const time = `${slot.start_time}–${endSlot?.end_time || slot.end_time}`;
    const color = course.color || "#4A6FA5";
    return (
      <div className={cls} onClick={() => onCourseClick?.(course)}>
        <div className="tl-time">{time}</div>
        <div className="tl-dot" style={{ background: color }} />
        <div className="tl-content">
          <div className="tl-title">{course.name}</div>
          <div className="tl-sub">{course.location}{course.teacher ? ` · ${course.teacher}` : ""}</div>
        </div>
      </div>
    );
  }

  if (type === "task" && task) {
    const time = task.start_time
      ? task.end_time ? `${task.start_time}–${task.end_time}` : task.start_time
      : "";
    const catColor = CATEGORY_COLORS[task.category] || "#6b7280";
    return (
      <div className={cls}>
        <div className="tl-time">{time || "全天"}</div>
        <button
          className={`tl-check${isTaskDone ? " checked" : ""}`}
          onClick={() => onTaskToggle?.(task)}
        >
          {isTaskDone ? "✓" : ""}
        </button>
        <div className="tl-content" onClick={() => onTaskClick?.(task)}>
          <div className="tl-title-row">
            <span className={`tl-title${isTaskDone ? " done" : ""}`}>{task.title}</span>
            <span className="tl-cat" style={{ background: catColor }}>{task.category}</span>
          </div>
          <div className="tl-sub">
            {task.priority !== "中" && (
              <span className={`tl-prio prio-${task.priority}`}>
                {task.priority === "高" ? "!" : "↓"}
              </span>
            )}
            {task.campaign_id && <span className="tl-campaign">战役</span>}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
