interface BatchBarProps {
  count: number;
  onDone: () => void;
  onUndone: () => void;
  onDelete: () => void;
  onMove: () => void;
  onCategory: () => void;
  onCancel: () => void;
}

export default function BatchBar({ count, onDone, onUndone, onDelete, onMove, onCategory, onCancel }: BatchBarProps) {
  return (
    <div className="batch-bar">
      <span className="batch-count">已选 {count} 项</span>
      <div className="batch-actions">
        <button className="batch-btn" onClick={onDone}>完成</button>
        <button className="batch-btn" onClick={onUndone}>取消完成</button>
        <button className="batch-btn" onClick={onMove}>改期</button>
        <button className="batch-btn" onClick={onCategory}>改分类</button>
        <button className="batch-btn danger" onClick={onDelete}>删除</button>
      </div>
      <button className="batch-cancel" onClick={onCancel}>取消</button>
    </div>
  );
}
