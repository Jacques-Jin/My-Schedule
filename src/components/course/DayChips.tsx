import { formatDate, parseDate } from "../../lib/date";

const DAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

interface DayChipsProps {
  dates: string[];
  selectedDate: string;
  onSelect: (date: string) => void;
  today: string;
}

export default function DayChips({ dates, selectedDate, onSelect, today }: DayChipsProps) {
  return (
    <div className="day-chips">
      {dates.map((d, i) => {
        const dateObj = parseDate(d);
        const dayNum = dateObj.getDate();
        const isSelected = d === selectedDate;
        const isToday = d === today;
        return (
          <button
            key={d}
            className={`day-chip ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
            onClick={() => onSelect(d)}
          >
            <span className="day-chip-name">周{DAY_NAMES[i]}</span>
            <span className="day-chip-num">{dayNum}</span>
          </button>
        );
      })}
    </div>
  );
}
