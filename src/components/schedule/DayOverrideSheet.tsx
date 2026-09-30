import { useState, useEffect } from "react";
import Sheet from "../Sheet";
import { type DayOverride } from "../../store";

interface DayOverrideSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onClear?: () => void;
  initialData?: DayOverride | null;
  defaultDate?: string;
}

const WEEKDAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];

export default function DayOverrideSheet({ open, onClose, onSave, onClear, initialData, defaultDate }: DayOverrideSheetProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    id: "",
    date: defaultDate || today,
    kind: "holiday" as "holiday" | "classday",
    follow_weekday: null as number | null,
    name: "",
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          id: initialData.id,
          date: initialData.date,
          kind: initialData.kind,
          follow_weekday: initialData.follow_weekday,
          name: initialData.name || "",
        });
      } else {
        setForm({
          id: "",
          date: defaultDate || today,
          kind: "holiday",
          follow_weekday: null,
          name: "",
        });
      }
    }
  }, [open, initialData, defaultDate]);

  const update = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const handleSave = () => {
    if (!form.date) return;
    const data: any = {
      date: form.date,
      kind: form.kind,
      follow_weekday: form.kind === "classday" ? form.follow_weekday : null,
      name: form.name.trim() || null,
    };
    if (form.id) data.id = form.id;
    onSave(data);
    onClose();
  };

  const handleClear = () => {
    if (onClear) onClear();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="标记这天">
      <div className="task-form">
        <label className="tf-label">日期</label>
        <input className="tf-input" type="date" value={form.date} onChange={e => update({ date: e.target.value })} />

        <label className="tf-label">类型</label>
        <div className="do-kind-row">
          <button
            type="button"
            className={`do-kind-btn ${form.kind === "holiday" ? "active holiday" : ""}`}
            onClick={() => update({ kind: "holiday" })}
          >放假</button>
          <button
            type="button"
            className={`do-kind-btn ${form.kind === "classday" ? "active classday" : ""}`}
            onClick={() => update({ kind: "classday" })}
          >上课（调休补课）</button>
        </div>

        {form.kind === "classday" && (
          <>
            <label className="tf-label">按周几课表</label>
            <div className="tf-weekdays">
              <button
                type="button"
                className={`tf-wd-btn ${form.follow_weekday === null ? "active" : ""}`}
                onClick={() => update({ follow_weekday: null })}
              >按当天</button>
              {WEEKDAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  className={`tf-wd-btn ${form.follow_weekday === i + 1 ? "active" : ""}`}
                  onClick={() => update({ follow_weekday: i + 1 })}
                >周{name}</button>
              ))}
            </div>
          </>
        )}

        <label className="tf-label">标记名（可选）</label>
        <input
          className="tf-input"
          value={form.name}
          onChange={e => update({ name: e.target.value })}
          placeholder={form.kind === "classday" ? "如：补周三的课" : "如：调休放假"}
          maxLength={30}
        />

        <div className="tf-actions">
          {initialData && onClear && (
            <button className="tf-btn danger" onClick={handleClear}>清除标记</button>
          )}
          <div className="tf-spacer" />
          <button className="tf-btn secondary" onClick={onClose}>取消</button>
          <button className="tf-btn primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </Sheet>
  );
}
