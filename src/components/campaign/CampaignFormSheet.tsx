import { useState, useEffect } from "react";
import Sheet from "../Sheet";

interface CampaignFormSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: () => void;
  initialData?: any;
}

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"];

export default function CampaignFormSheet({ open, onClose, onSave, onDelete, initialData }: CampaignFormSheetProps) {
  const [form, setForm] = useState({
    name: "",
    goal: "",
    deadline: "",
    color: COLORS[0],
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          name: initialData.name || "",
          goal: initialData.goal || "",
          deadline: initialData.deadline || "",
          color: initialData.color || COLORS[0],
        });
      } else {
        setForm({ name: "", goal: "", deadline: "", color: COLORS[0] });
      }
    }
  }, [open, initialData]);

  const update = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    const data: any = {
      name: form.name.trim(),
      goal: form.goal.trim(),
      deadline: form.deadline || null,
      color: form.color,
    };
    if (initialData?.id) data.id = initialData.id;
    onSave(data);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={initialData?.id ? "编辑战役" : "新建战役"}>
      <div className="task-form">
        <label className="tf-label">战役名称 *</label>
        <input className="tf-input" value={form.name} onChange={e => update({ name: e.target.value })} placeholder="如：备考四级" />

        <label className="tf-label">目标描述</label>
        <textarea className="tf-input tf-textarea" value={form.goal} onChange={e => update({ goal: e.target.value })} placeholder="战役目标" rows={2} />

        <label className="tf-label">截止日期</label>
        <input className="tf-input" type="date" value={form.deadline} onChange={e => update({ deadline: e.target.value })} />

        <label className="tf-label">颜色</label>
        <div className="tf-color-picker">
          {COLORS.map(c => (
            <button key={c} type="button" className={`tf-color-btn ${form.color === c ? "active" : ""}`}
              style={{ background: c }} onClick={() => update({ color: c })} />
          ))}
        </div>

        <div className="tf-actions">
          {initialData?.id && onDelete && (
            <button className="tf-btn danger" onClick={() => { onDelete(); onClose(); }}>删除</button>
          )}
          <div className="tf-spacer" />
          <button className="tf-btn secondary" onClick={onClose}>取消</button>
          <button className="tf-btn primary" onClick={handleSave} disabled={!form.name.trim()}>保存</button>
        </div>
      </div>
    </Sheet>
  );
}
