import type { Semester } from "../../store";

interface WeekSwitcherProps {
  week: number;
  totalWeeks: number;
  onWeekChange: (w: number) => void;
  onBackToCurrent: () => void;
  semesters: Semester[];
  currentSemesterId: string;
  onSemesterChange: (id: string) => void;
}

export default function WeekSwitcher({
  week, totalWeeks, onWeekChange, onBackToCurrent,
  semesters, currentSemesterId, onSemesterChange,
}: WeekSwitcherProps) {
  return (
    <div className="week-switcher">
      <div className="week-nav">
        <button
          className="week-btn"
          disabled={week <= 1}
          onClick={() => onWeekChange(week - 1)}
        >
          ‹
        </button>
        <span className="week-label">第 {week} 周</span>
        <button
          className="week-btn"
          disabled={week >= totalWeeks}
          onClick={() => onWeekChange(week + 1)}
        >
          ›
        </button>
        <button className="week-btn week-back" onClick={onBackToCurrent}>
          本周
        </button>
      </div>
      <select
        className="semester-select"
        value={currentSemesterId}
        onChange={(e) => onSemesterChange(e.target.value)}
      >
        {semesters.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
