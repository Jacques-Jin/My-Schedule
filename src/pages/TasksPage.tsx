import { useState, useMemo, useCallback } from "react";
import { useStore, type Task } from "../store";
import { formatDate, expandTaskOn } from "../lib/date";
import TaskItem from "../components/task/TaskItem";
import TaskFormSheet from "../components/task/TaskFormSheet";
import FilterChips from "../components/task/FilterChips";
import BatchBar from "../components/task/BatchBar";
import ConfirmDialog from "../components/ConfirmDialog";

type GroupKey = "today" | "tomorrow" | "thisweek" | "earlier" | "overdue" | "done";
const GROUP_LABELS: Record<GroupKey, string> = {
  today: "今天",
  tomorrow: "明天",
  thisweek: "本周",
  earlier: "更早",
  overdue: "已逾期",
  done: "已完成",
};
const GROUP_ORDER: GroupKey[] = ["today", "tomorrow", "thisweek", "earlier", "overdue", "done"];

function getGroupKey(taskDate: string, todayStr: string, tomorrowStr: string, weekEndStr: string): GroupKey {
  if (taskDate === todayStr) return "today";
  if (taskDate === tomorrowStr) return "tomorrow";
  if (taskDate > todayStr && taskDate <= weekEndStr) return "thisweek";
  if (taskDate < todayStr) return "overdue";
  return "earlier";
}

export default function TasksPage() {
  const { state, saveTask, deleteTask, batchTasks, completeTask } = useStore();
  const { tasks, campaigns, semesters } = state;

  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [batchMoveOpen, setBatchMoveOpen] = useState(false);
  const [batchCategoryOpen, setBatchCategoryOpen] = useState(false);
  const [moveDate, setMoveDate] = useState(formatDate(new Date()));
  const [newCategory, setNewCategory] = useState("学习");

  const todayStr = formatDate(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  const dow = new Date().getDay();
  const daysToSunday = dow === 0 ? 0 : 7 - dow;
  const sunday = new Date();
  sunday.setDate(sunday.getDate() + daysToSunday);
  const weekEndStr = formatDate(sunday);

  const currentSemester = semesters.find(s => s.is_current) || semesters[0];

  const categories = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => set.add(t.category));
    return Array.from(set).sort();
  }, [tasks]);

  const isTaskDone = useCallback((task: Task, date: string): boolean => {
    const rule = JSON.parse(task.repeat_rule || '{"type":"none"}');
    if (rule.type !== "none") {
      return state.completions.some(c => c.task_id === task.id && c.date === date);
    }
    return task.done;
  }, [state.completions]);

  const taskOccursToday = useCallback((task: Task): boolean => {
    const rule = JSON.parse(task.repeat_rule || '{"type":"none"}');
    if (rule.type === "none") return task.date === todayStr;
    if (!currentSemester) return false;
    return expandTaskOn(task, new Date(), currentSemester);
  }, [todayStr, currentSemester]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    if (filter === "today") {
      result = result.filter(t => taskOccursToday(t));
    } else if (filter === "undone") {
      result = result.filter(t => {
        const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
        if (rule.type !== "none") {
          return !isTaskDone(t, todayStr);
        }
        return !t.done;
      });
    } else if (filter === "overdue") {
      result = result.filter(t => {
        const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
        if (rule.type !== "none") return false;
        return !t.done && t.date < todayStr;
      });
    } else if (filter === "done") {
      result = result.filter(t => {
        const rule = JSON.parse(t.repeat_rule || '{"type":"none"}');
        if (rule.type !== "none") {
          return isTaskDone(t, todayStr);
        }
        return t.done;
      });
    }

    if (category) {
      result = result.filter(t => t.category === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.note.toLowerCase().includes(q));
    }

    return result;
  }, [tasks, filter, category, search, todayStr, taskOccursToday, isTaskDone]);

  const grouped = useMemo(() => {
    const groups: Record<GroupKey, Task[]> = { today: [], tomorrow: [], thisweek: [], earlier: [], overdue: [], done: [] };

    for (const task of filteredTasks) {
      const rule = JSON.parse(task.repeat_rule || '{"type":"none"}');
      const isRepeat = rule.type !== "none";
      const isDone = isRepeat ? isTaskDone(task, todayStr) : task.done;

      if (isDone) {
        groups.done.push(task);
      } else if (isRepeat && taskOccursToday(task)) {
        groups.today.push(task);
      } else {
        const key = getGroupKey(task.date, todayStr, tomorrowStr, weekEndStr);
        groups[key].push(task);
      }
    }

    for (const key of GROUP_ORDER) {
      groups[key].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.start_time && b.start_time) return a.start_time < b.start_time ? -1 : 1;
        return 0;
      });
    }

    return groups;
  }, [filteredTasks, todayStr, tomorrowStr, weekEndStr, isTaskDone, taskOccursToday]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggle = useCallback((task: Task) => {
    const rule = JSON.parse(task.repeat_rule || '{"type":"none"}');
    if (rule.type !== "none") {
      const done = !state.completions.some(c => c.task_id === task.id && c.date === todayStr);
      completeTask({ id: task.id, date: todayStr, done });
    } else {
      completeTask({ id: task.id, date: task.date, done: !task.done });
    }
  }, [completeTask, todayStr, state.completions]);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm(id);
  };

  const handleSave = async (data: any) => {
    await saveTask(data);
    setEditingTask(null);
  };

  const handleBatchDone = async () => {
    const ids = Array.from(selectedIds);
    await batchTasks({ ids, op: "done", payload: { date: todayStr } });
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleBatchUndone = async () => {
    const ids = Array.from(selectedIds);
    await batchTasks({ ids, op: "undone", payload: { date: todayStr } });
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    await batchTasks({ ids, op: "delete", payload: {} });
    setSelectedIds(new Set());
    setSelectMode(false);
    setBatchDeleteConfirm(false);
  };

  const handleBatchMove = async () => {
    const ids = Array.from(selectedIds);
    await batchTasks({ ids, op: "move", payload: { date: moveDate } });
    setSelectedIds(new Set());
    setSelectMode(false);
    setBatchMoveOpen(false);
  };

  const handleBatchCategory = async () => {
    const ids = Array.from(selectedIds);
    await batchTasks({ ids, op: "category", payload: { category: newCategory } });
    setSelectedIds(new Set());
    setSelectMode(false);
    setBatchCategoryOpen(false);
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const hasAnyTasks = GROUP_ORDER.some(k => grouped[k].length > 0);

  return (
    <div className="page tasks-page">
      <div className="tasks-header">
        <h2>日程</h2>
        {!selectMode ? (
          <div className="tasks-header-actions">
            <button className="tasks-select-btn" onClick={enterSelectMode}>多选</button>
            <button className="tasks-add-btn" onClick={() => { setEditingTask(null); setFormOpen(true); }}>＋</button>
          </div>
        ) : (
          <button className="tasks-cancel-btn" onClick={exitSelectMode}>取消</button>
        )}
      </div>

      <FilterChips
        filter={filter}
        onFilterChange={setFilter}
        category={category}
        onCategoryChange={setCategory}
        search={search}
        onSearchChange={setSearch}
        categories={categories}
      />

      {!hasAnyTasks && (
        <div className="tasks-empty">
          <p>{filter === "all" ? "暂无日程，点击 ＋ 添加" : "没有匹配的日程"}</p>
        </div>
      )}

      {GROUP_ORDER.map(key => {
        const items = grouped[key];
        if (items.length === 0) return null;
        const isDoneGroup = key === "done";
        return (
          <div key={key} className="task-group">
            <div className="task-group-header">{GROUP_LABELS[key]}（{items.length}）</div>
            {items.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                campaigns={campaigns}
                done={task.done || (JSON.parse(task.repeat_rule || '{"type":"none"}').type !== "none" && isTaskDone(task, todayStr))}
                overdue={JSON.parse(task.repeat_rule || '{"type":"none"}').type === "none" && !task.done && task.date < todayStr}
                onToggle={() => handleToggle(task)}
                onEdit={() => handleEdit(task)}
                onDelete={() => handleDelete(task.id)}
                onCampaignClick={(cid) => { window.location.hash = `#/campaigns?highlight=${cid}`; }}
                selected={selectedIds.has(task.id)}
                onSelect={() => toggleSelect(task.id)}
                selectMode={selectMode}
              />
            ))}
          </div>
        );
      })}

      {selectMode && (
        <BatchBar
          count={selectedIds.size}
          onDone={handleBatchDone}
          onUndone={handleBatchUndone}
          onDelete={() => setBatchDeleteConfirm(true)}
          onMove={() => setBatchMoveOpen(true)}
          onCategory={() => setBatchCategoryOpen(true)}
          onCancel={exitSelectMode}
        />
      )}

      <TaskFormSheet
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingTask(null); }}
        onSave={handleSave}
        onDelete={editingTask?.id ? () => { deleteTask(editingTask.id); setFormOpen(false); } : undefined}
        initialData={editingTask}
        campaigns={campaigns}
        defaultDate={todayStr}
        totalWeeks={currentSemester?.total_weeks}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) deleteTask(deleteConfirm); }}
        title="删除日程"
        danger
      >
        确定要删除这条日程吗？此操作不可恢复。
      </ConfirmDialog>

      <ConfirmDialog
        open={batchDeleteConfirm}
        onClose={() => setBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title="批量删除"
        danger
      >
        确定要删除选中的 {selectedIds.size} 条日程吗？
      </ConfirmDialog>

      <ConfirmDialog
        open={batchMoveOpen}
        onClose={() => setBatchMoveOpen(false)}
        onConfirm={handleBatchMove}
        title="批量改期"
      >
        <div className="batch-move-form">
          <label>移动到日期：</label>
          <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={batchCategoryOpen}
        onClose={() => setBatchCategoryOpen(false)}
        onConfirm={handleBatchCategory}
        title="批量改分类"
      >
        <div className="batch-move-form">
          <label>新分类：</label>
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)}>
            {["作业", "考试", "学习", "生活", "社团"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </ConfirmDialog>
    </div>
  );
}
