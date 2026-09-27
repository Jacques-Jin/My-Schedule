import { useState } from "react";
import Sheet from "../Sheet";
import { formatDate } from "../../lib/date";

interface BatchCreateSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (items: { title: string; date: string }[]) => void;
  campaignId: string;
}

interface BatchItem {
  title: string;
  date: string;
}

export default function BatchCreateSheet({ open, onClose, onSave, campaignId }: BatchCreateSheetProps) {
  const today = formatDate(new Date());
  const [items, setItems] = useState<BatchItem[]>([
    { title: "", date: today },
    { title: "", date: today },
    { title: "", date: today },
  ]);

  const updateItem = (index: number, patch: Partial<BatchItem>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, { title: "", date: today }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const validItems = items.filter(item => item.title.trim());
    if (validItems.length === 0) return;
    onSave(validItems.map(item => ({ title: item.title.trim(), date: item.date })));
    setItems([{ title: "", date: today }, { title: "", date: today }, { title: "", date: today }]);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="批量新建子计划">
      <div className="batch-create-form">
        <div className="batch-create-list">
          {items.map((item, i) => (
            <div key={i} className="batch-create-item">
              <input
                className="tf-input"
                value={item.title}
                onChange={e => updateItem(i, { title: e.target.value })}
                placeholder={`子计划 ${i + 1} 标题`}
              />
              <input
                className="tf-input"
                type="date"
                value={item.date}
                onChange={e => updateItem(i, { date: e.target.value })}
              />
              {items.length > 1 && (
                <button type="button" className="batch-remove-btn" onClick={() => removeItem(i)}>×</button>
              )}
            </div>
          ))}
        </div>

        <button type="button" className="batch-add-more" onClick={addItem}>＋ 添加一行</button>

        <div className="tf-actions">
          <div className="tf-spacer" />
          <button className="tf-btn secondary" onClick={onClose}>取消</button>
          <button className="tf-btn primary" onClick={handleSave} disabled={!items.some(i => i.title.trim())}>
            创建 {items.filter(i => i.title.trim()).length} 条
          </button>
        </div>
      </div>
    </Sheet>
  );
}
