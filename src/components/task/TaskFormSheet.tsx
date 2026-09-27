import { useState, useEffect } from "react";
import Sheet from "../Sheet";
import { type Campaign } from "../../store";

interface TaskFormData {
  id?: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  category: string;
  priority: string;
  repeat_type: string;
  repeat_weekdays: number[];
  repeat_weekday: number;
  repeat_weeks: number[];
  repeat_anchor: string;
  reminder: string;
  campaign_id: string;
  note: string;
}

interface TaskFormSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: () => void;
  initialData?: any;
  campaigns: Campaign[];
  defaultDate?: string;
  totalWeeks?: number;
}

const CATEGORIES = ["作业", "考试", "学习", "生活", "社团"];
const PRIORITIES = ["高", "中", "低"];
const REMINDERS = [
  { value: "none", label: "不提醒" },
  { value: "on_time", label: "准时" },
  { value: "10", label: "提前10分钟" },
  { value: "30", label: "提前30分钟" },
  { value: "60", label: "提前60分钟" },
];
const WEEKDAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

function parseRepeatToForm(repeatRule: string): Partial<TaskFormData> {
  try {
    const rule = JSON.parse(repeatRule);
    switch (rule.type) {
      case "daily":
        return { repeat_type: "daily", repeat_weekdays: [], repeat_weekday: 1, repeat_weeks: [] };
      case "weekly":
        return { repeat_type: "weekly", repeat_weekdays: rule.weekdays || [1], repeat_weekday: 1, repeat_weeks: [] };
      case "biweekly":
        return { repeat_type: "biweekly", repeat_weekdays: [], repeat_weekday: rule.weekday || 1, repeat_weeks: [], repeat_anchor: rule.anchor || "" };
      case "weeks":
        return { repeat_type: "weeks", repeat_weekdays: [], repeat_weekday: rule.weekday || 1, repeat_weeks: rule.weeks || [] };
      default:
        return { repeat_type: "none", repeat_weekdays: [], repeat_weekday: 1, repeat_weeks: [] };
    }
  } catch {
    return { repeat_type: "none", repeat_weekdays: [], repeat_weekday: 1, repeat_weeks: [] };
  }
}

function buildRepeatRule(form: TaskFormData): string {
  switch (form.repeat_type) {
    case "daily":
      return JSON.stringify({ type: "daily" });
    case "weekly":
      return JSON.stringify({ type: "weekly", weekdays: form.repeat_weekdays });
    case "biweekly":
      return JSON.stringify({ type: "biweekly", weekday: form.repeat_weekday, anchor: form.repeat_anchor || form.date });
    case "weeks":
      return JSON.stringify({ type: "weeks", weekday: form.repeat_weekday, weeks: form.repeat_weeks });
    default:
      return JSON.stringify({ type: "none" });
  }
}

export default function TaskFormSheet({ open, onClose, onSave, onDelete, initialData, campaigns, defaultDate, totalWeeks }: TaskFormSheetProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<TaskFormData>({
    title: "", date: defaultDate || today, start_time: "", end_time: "",
    category: "学习", priority: "中",
    repeat_type: "none", repeat_weekdays: [], repeat_weekday: 1, repeat_weeks: [], repeat_anchor: "",
    reminder: "none", campaign_id: "", note: "",
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        const rep = parseRepeatToForm(initialData.repeat_rule || '{"type":"none"}');
        setForm({
          id: initialData.id,
          title: initialData.title || "",
          date: initialData.date || defaultDate || today,
          start_time: initialData.start_time || "",
          end_time: initialData.end_time || "",
          category: initialData.category || "学习",
          priority: initialData.priority || "中",
          repeat_type: rep.repeat_type || "none",
          repeat_weekdays: rep.repeat_weekdays || [],
          repeat_weekday: rep.repeat_weekday || 1,
          repeat_weeks: rep.repeat_weeks || [],
          repeat_anchor: rep.repeat_anchor || "",
          reminder: initialData.reminder || "none",
          campaign_id: initialData.campaign_id || "",
          note: initialData.note || "",
        });
      } else {
        setForm({
          title: "", date: defaultDate || today, start_time: "", end_time: "",
          category: "学习", priority: "中",
          repeat_type: "none", repeat_weekdays: [], repeat_weekday: 1, repeat_weeks: [], repeat_anchor: "",
          reminder: "none", campaign_id: "", note: "",
        });
      }
    }
  }, [open, initialData, defaultDate]);

  const update = (patch: Partial<TaskFormData>) => setForm(f => ({ ...f, ...patch }));

  const toggleWeekday = (d: number) => {
    const arr = form.repeat_weekdays.includes(d)
      ? form.repeat_weekdays.filter(x => x !== d)
      : [...form.repeat_weekdays, d].sort();
    update({ repeat_weekdays: arr });
  };

  const toggleWeek = (w: number) => {
    const arr = form.repeat_weeks.includes(w)
      ? form.repeat_weeks.filter(x => x !== w)
      : [...form.repeat_weeks, w].sort();
    update({ repeat_weeks: arr });
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    const data: any = {
      title: form.title.trim(),
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      category: form.category,
      priority: form.priority,
      repeat_rule: buildRepeatRule(form),
      reminder: form.reminder,
      campaign_id: form.campaign_id || null,
      note: form.note,
    };
    if (form.id) data.id = form.id;
    onSave(data);
    onClose();
  };

  const weeks = Array.from({ length: totalWeeks || 19 }, (_, i) => i + 1);

  return (
    <Sheet open={open} onClose={onClose} title={initialData?.id ? "编辑日程" : "新建日程"}>
      <div className="task-form">
        <label className="tf-label">标题 *</label>
        <input className="tf-input" value={form.title} onChange={e => update({ title: e.target.value })} placeholder="日程标题" />

        <label className="tf-label">日期</label>
        <input className="tf-input" type="date" value={form.date} onChange={e => update({ date: e.target.value })} />

        <div className="tf-row">
          <div className="tf-half">
            <label className="tf-label">开始时间</label>
            <input className="tf-input" type="time" value={form.start_time} onChange={e => update({ start_time: e.target.value })} />
          </div>
          <div className="tf-half">
            <label className="tf-label">结束时间</label>
            <input className="tf-input" type="time" value={form.end_time} onChange={e => update({ end_time: e.target.value })} />
          </div>
        </div>

        <div className="tf-row">
          <div className="tf-half">
            <label className="tf-label">分类</label>
            <select className="tf-input" value={form.category} onChange={e => update({ category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="tf-half">
            <label className="tf-label">优先级</label>
            <select className="tf-input" value={form.priority} onChange={e => update({ priority: e.target.value })}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <label className="tf-label">重复</label>
        <select className="tf-input" value={form.repeat_type} onChange={e => update({ repeat_type: e.target.value })}>
          <option value="none">不重复</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="biweekly">每两周</option>
          <option value="weeks">自定义周次</option>
        </select>

        {form.repeat_type === "weekly" && (
          <div className="tf-weekdays">
            {WEEKDAY_NAMES.map((name, i) => (
              <button key={i} type="button" className={`tf-wd-btn ${form.repeat_weekdays.includes(i + 1) ? "active" : ""}`}
                onClick={() => toggleWeekday(i + 1)}>周{name}</button>
            ))}
          </div>
        )}

        {form.repeat_type === "biweekly" && (
          <div className="tf-weekdays">
            <span className="tf-wd-label">选择星期：</span>
            {WEEKDAY_NAMES.map((name, i) => (
              <button key={i} type="button" className={`tf-wd-btn ${form.repeat_weekday === i + 1 ? "active" : ""}`}
                onClick={() => update({ repeat_weekday: i + 1 })}>周{name}</button>
            ))}
          </div>
        )}

        {form.repeat_type === "weeks" && (
          <div className="tf-weeks-section">
            <div className="tf-weekdays">
              <span className="tf-wd-label">星期：</span>
              {WEEKDAY_NAMES.map((name, i) => (
                <button key={i} type="button" className={`tf-wd-btn ${form.repeat_weekday === i + 1 ? "active" : ""}`}
                  onClick={() => update({ repeat_weekday: i + 1 })}>周{name}</button>
              ))}
            </div>
            <div className="tf-weeks-grid">
              {weeks.map(w => (
                <button key={w} type="button" className={`tf-week-btn ${form.repeat_weeks.includes(w) ? "active" : ""}`}
                  onClick={() => toggleWeek(w)}>{w}</button>
              ))}
            </div>
          </div>
        )}

        <label className="tf-label">提醒</label>
        <select className="tf-input" value={form.reminder} onChange={e => update({ reminder: e.target.value })}>
          {REMINDERS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <label className="tf-label">归属战役</label>
        <select className="tf-input" value={form.campaign_id} onChange={e => update({ campaign_id: e.target.value })}>
          <option value="">无</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <label className="tf-label">备注</label>
        <textarea className="tf-input tf-textarea" value={form.note} onChange={e => update({ note: e.target.value })} placeholder="备注信息" rows={2} />

        <div className="tf-actions">
          {initialData?.id && onDelete && (
            <button className="tf-btn danger" onClick={() => { onDelete(); onClose(); }}>删除</button>
          )}
          <div className="tf-spacer" />
          <button className="tf-btn secondary" onClick={onClose}>取消</button>
          <button className="tf-btn primary" onClick={handleSave} disabled={!form.title.trim()}>保存</button>
        </div>
      </div>
    </Sheet>
  );
}
