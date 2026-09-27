import { type Task, type Campaign } from "../../store";

const CATEGORY_COLORS: Record<string, string> = {
  "作业": "#3b82f6",
  "考试": "#ef4444",
  "学习": "#6366f1",
  "生活": "#10b981",
  "社团": "#8b5cf6",
};

const PRIORITY_LABEL: Record<string, string> = {
  "高": "!",
  "中": "",
  "低": "-",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || "#6b7280";
}

function getRepeatIcon(repeatRule: string): string | null {
  try {
    const rule = JSON.parse(repeatRule);
    if (rule.type === "none") return null;
    if (rule.type === "daily") return "↻";
    if (rule.type === "weekly") return "📅";
    return "↻";
  } catch {
    return null;
  }
}

interface TaskItemProps {
  task: Task;
  campaigns: Campaign[];
  done: boolean;
  overdue?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCampaignClick?: (campaignId: string) => void;
  selected?: boolean;
  onSelect?: () => void;
  selectMode?: boolean;
}

export default function TaskItem({ task, campaigns, done, overdue, onToggle, onEdit, onDelete, onCampaignClick, selected, onSelect, selectMode }: TaskItemProps) {
  const catColor = getCategoryColor(task.category);
  const repeatIcon = getRepeatIcon(task.repeat_rule);
  const campaign = task.campaign_id ? campaigns.find(c => c.id === task.campaign_id) : null;

  const timeStr = task.start_time
    ? task.end_time ? `${task.start_time}-${task.end_time}` : task.start_time
    : "";

  return (
    <div className={`task-item ${done ? "done" : ""} ${selected ? "selected" : ""}`}>
      {selectMode ? (
        <label className="task-check" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={selected || false} onChange={() => onSelect?.()} />
        </label>
      ) : (
        <button className={`task-check-btn ${done ? "checked" : ""}`} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {done && "✓"}
        </button>
      )}
      <div className="task-content" onClick={selectMode ? onSelect : onEdit}>
        <div className="task-top-row">
          <span className="task-title">{task.title}</span>
          {task.priority !== "中" && (
            <span className={`task-priority priority-${task.priority}`}>{PRIORITY_LABEL[task.priority] || task.priority}</span>
          )}
        </div>
        <div className="task-meta">
          {timeStr && <span className={`task-time ${overdue ? "overdue-time" : ""}`}>{timeStr}</span>}
          <span className="task-category-tag" style={{ background: catColor + "20", color: catColor }}>{task.category}</span>
          {repeatIcon && <span className="task-repeat-icon" title="重复">{repeatIcon}</span>}
          {campaign && (
            <span className="task-campaign-tag" style={{ background: (campaign.color || "#6b7280") + "20", color: campaign.color || "#6b7280" }}
              onClick={(e) => { e.stopPropagation(); onCampaignClick?.(campaign.id); }}>
              {campaign.name}
            </span>
          )}
        </div>
      </div>
      {!selectMode && (
        <button className="task-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="删除">×</button>
      )}
    </div>
  );
}
