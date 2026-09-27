import type { Course, Semester, PeriodSlot } from "../../store";
import { courseOccursOn, parseDate, formatDate, weekIndexOf } from "../../lib/date";
import Sheet from "../Sheet";

interface CourseDetailSheetProps {
  open: boolean;
  onClose: () => void;
  course: Course | null;
  semester: Semester;
  periodSlots: PeriodSlot[];
  currentWeek: number;
}

export default function CourseDetailSheet({ open, onClose, course, semester, periodSlots, currentWeek }: CourseDetailSheetProps) {
  if (!course) return null;

  const startSlot = periodSlots.find(s => s.slot_no === course.start_period);
  const endSlot = periodSlots.find(s => s.slot_no === course.end_period);
  const rule = JSON.parse(course.week_rule || '{"ranges":[],"parity":null}');
  const rangeStr = rule.ranges.map(([lo, hi]: number[]) => {
    if (lo === hi) return `第${lo}周`;
    return `第${lo}-${hi}周`;
  }).join("、");
  const parityStr = rule.parity === "odd" ? "（单周）" : rule.parity === "even" ? "（双周）" : "";
  const dayNames = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  return (
    <Sheet open={open} onClose={onClose} title="课程详情">
      <div className="course-detail">
        <div className="course-detail-row">
          <span className="cd-label">课程</span>
          <span className="cd-value">{course.name}</span>
        </div>
        {course.teacher && (
          <div className="course-detail-row">
            <span className="cd-label">教师</span>
            <span className="cd-value">{course.teacher}</span>
          </div>
        )}
        <div className="course-detail-row">
          <span className="cd-label">周次</span>
          <span className="cd-value">{rangeStr}{parityStr}</span>
        </div>
        <div className="course-detail-row">
          <span className="cd-label">星期</span>
          <span className="cd-value">{dayNames[course.weekday]}</span>
        </div>
        <div className="course-detail-row">
          <span className="cd-label">节次</span>
          <span className="cd-value">
            第{course.start_period}-{course.end_period}节
            {startSlot && endSlot && `（${startSlot.start_time}-${endSlot.end_time}）`}
          </span>
        </div>
        {course.location && (
          <div className="course-detail-row">
            <span className="cd-label">教室</span>
            <span className="cd-value">{course.location}</span>
          </div>
        )}
        {course.note && (
          <div className="course-detail-row">
            <span className="cd-label">备注</span>
            <span className="cd-value">{course.note}</span>
          </div>
        )}
      </div>
    </Sheet>
  );
}
