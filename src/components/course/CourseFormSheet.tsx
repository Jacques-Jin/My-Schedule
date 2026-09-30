import { useState } from "react";
import Sheet from "../Sheet";
import { useStore } from "../../store";

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

interface CourseFormSheetProps {
  open: boolean;
  onClose: () => void;
  semesterId: string;
  periodSlots: { slot_no: number; start_time: string }[];
}

export default function CourseFormSheet({ open, onClose, semesterId, periodSlots }: CourseFormSheetProps) {
  const { saveCourse } = useStore();
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [location, setLocation] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startPeriod, setStartPeriod] = useState(1);
  const [endPeriod, setEndPeriod] = useState(2);
  const [weekRanges, setWeekRanges] = useState("2-17");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleWeekday = (d: number) => {
    setWeekdays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort());
  };

  const parseRanges = (str: string): [number, number][] => {
    const ranges: [number, number][] = [];
    for (const part of str.split(/[,，、\s]+/)) {
      const trimmed = part.replace(/周/g, "").trim();
      if (!trimmed) continue;
      const m = trimmed.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (m) ranges.push([Number(m[1]), Number(m[2])]);
      else if (/^\d+$/.test(trimmed)) ranges.push([Number(trimmed), Number(trimmed)]);
    }
    return ranges;
  };

  const handleSave = async () => {
    setError("");
    if (!name.trim()) { setError("请输入课程名称"); return; }
    if (weekdays.length === 0) { setError("请至少选择一天"); return; }
    const ranges = parseRanges(weekRanges);
    if (ranges.length === 0) { setError("周次格式不正确，例如 2-17 或 1-8,10-15"); return; }
    if (endPeriod < startPeriod) { setError("结束节次不能小于开始节次"); return; }

    setSaving(true);
    try {
      const week_rule = JSON.stringify({ ranges, parity: null });
      for (const wd of weekdays) {
        await saveCourse({
          semester_id: semesterId,
          name: name.trim(),
          teacher: teacher.trim(),
          weekday: wd,
          start_period: startPeriod,
          end_period: endPeriod,
          week_rule,
          location: location.trim(),
          color: "#3b82f6",
          note: "",
        });
      }
      setName(""); setTeacher(""); setLocation("");
      setWeekdays([]); setWeekRanges("2-17");
      setStartPeriod(1); setEndPeriod(2);
      onClose();
    } catch (e: any) {
      setError(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="添加课程">
      <div className="course-form">
        <label className="cf-field">
          <span className="cf-label">课程名称 *</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：综合法语" />
        </label>
        <label className="cf-field">
          <span className="cf-label">教师</span>
          <input value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="例如：蔡小燕" />
        </label>
        <label className="cf-field">
          <span className="cf-label">教室</span>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="例如：教2-4005" />
        </label>

        <div className="cf-field">
          <span className="cf-label">上课日 * （可多选）</span>
          <div className="cf-weekdays">
            {DAY_NAMES.map((label, i) => (
              <button
                key={i}
                type="button"
                className={`cf-wd-btn ${weekdays.includes(i + 1) ? "active" : ""}`}
                onClick={() => toggleWeekday(i + 1)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="cf-row">
          <label className="cf-field cf-half">
            <span className="cf-label">开始节次</span>
            <select value={startPeriod} onChange={e => setStartPeriod(Number(e.target.value))}>
              {periodSlots.map(s => <option key={s.slot_no} value={s.slot_no}>第{s.slot_no}节 ({s.start_time})</option>)}
            </select>
          </label>
          <label className="cf-field cf-half">
            <span className="cf-label">结束节次</span>
            <select value={endPeriod} onChange={e => setEndPeriod(Number(e.target.value))}>
              {periodSlots.map(s => <option key={s.slot_no} value={s.slot_no}>第{s.slot_no}节</option>)}
            </select>
          </label>
        </div>

        <label className="cf-field">
          <span className="cf-label">上课周次</span>
          <input value={weekRanges} onChange={e => setWeekRanges(e.target.value)} placeholder="例如：2-17 或 1-8,10-15" />
        </label>

        {error && <div className="cf-error">{error}</div>}

        <button className="cf-save" onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : `保存（${weekdays.length || 0} 天 × 1 门课）`}
        </button>
      </div>
    </Sheet>
  );
}
