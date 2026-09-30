import { useState, useMemo, useCallback } from "react";
import { useStore, type Task, type Campaign } from "../store";
import { formatDate, parseDate } from "../lib/date";
import CampaignFormSheet from "../components/campaign/CampaignFormSheet";
import BatchCreateSheet from "../components/campaign/BatchCreateSheet";
import TaskFormSheet from "../components/task/TaskFormSheet";
import TaskItem from "../components/task/TaskItem";
import BatchBar from "../components/task/BatchBar";
import ConfirmDialog from "../components/ConfirmDialog";

type View = "list" | "detail";

export default function CampaignsPage() {
  const { state, saveCampaign, deleteCampaign, saveTask, deleteTask, batchTasks, completeTask, attachTasks } = useStore();
  const { campaigns, tasks, semesters } = state;

  const [view, setView] = useState<View>("list");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [batchCreateOpen, setBatchCreateOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskDeleteConfirm, setTaskDeleteConfirm] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [batchMoveOpen, setBatchMoveOpen] = useState(false);
  const [batchCategoryOpen, setBatchCategoryOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [moveDate, setMoveDate] = useState(formatDate(new Date()));
  const [newCategory, setNewCategory] = useState("学习");

  const todayStr = formatDate(new Date());
  const currentSemester = semesters.find(s => s.is_current) || semesters[0];

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  const campaignTasks = useMemo(() => {
    if (!selectedCampaignId) return [];
    return tasks.filter(t => t.campaign_id === selectedCampaignId);
  }, [tasks, selectedCampaignId]);

  const campaignProgress = useMemo(() => {
    if (!selectedCampaign) return { done: 0, total: 0 };
    const campaignTasks = tasks.filter(t => t.campaign_id === selectedCampaign.id);
    const done = campaignTasks.filter(t => t.done).length;
    return { done, total: campaignTasks.length };
  }, [tasks, selectedCampaign]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const task of campaignTasks) {
      const dateKey = task.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(task);
    }
    const sorted = Object.entries(groups).sort(([a], [b]) => a < b ? -1 : 1);
    return sorted;
  }, [campaignTasks]);

  const handleCampaignSave = async (data: any) => {
    await saveCampaign(data);
    setEditingCampaign(null);
  };

  const handleCampaignDelete = async (id: string) => {
    await deleteCampaign(id);
    setDeleteConfirm(null);
    if (selectedCampaignId === id) {
      setView("list");
      setSelectedCampaignId(null);
    }
  };

  const openCampaignDetail = (id: string) => {
    setSelectedCampaignId(id);
    setView("detail");
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const backToList = () => {
    setView("list");
    setSelectedCampaignId(null);
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleTaskSave = async (data: any) => {
    if (selectedCampaignId && !data.campaign_id) {
      data.campaign_id = selectedCampaignId;
    }
    await saveTask(data);
    setEditingTask(null);
  };

  const handleTaskDelete = async (id: string) => {
    await deleteTask(id);
    setTaskDeleteConfirm(null);
  };

  const handleBatchCreate = async (items: { title: string; date: string }[]) => {
    for (const item of items) {
      await saveTask({
        title: item.title,
        date: item.date,
        category: "学习",
        priority: "中",
        repeat_rule: '{"type":"none"}',
        reminder: "none",
        campaign_id: selectedCampaignId,
        note: "",
      });
    }
  };

  const handleToggle = useCallback((task: Task) => {
    completeTask({ id: task.id, date: task.date, done: !task.done });
  }, [completeTask]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
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

  const unattachedTasks = useMemo(() => {
    return tasks.filter(t => !t.campaign_id);
  }, [tasks]);

  const handleAttachTasks = async (taskIds: string[]) => {
    if (selectedCampaignId) {
      await attachTasks(selectedCampaignId, taskIds);
      setAttachOpen(false);
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const d = parseDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return "今天";
    if (diff === 1) return "明天";
    if (diff === -1) return "昨天";
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return `${month}月${day}日 周${weekdays[d.getDay()]}`;
  };

  if (view === "list") {
    return (
      <div className="page campaigns-page">
        <div className="campaigns-header">
          <h2>战役计划</h2>
          <button className="tasks-add-btn" onClick={() => { setEditingCampaign(null); setFormOpen(true); }}>＋</button>
        </div>

        {campaigns.length === 0 && (
          <div className="tasks-empty">
            <p>暂无战役，点击 ＋ 创建</p>
          </div>
        )}

        <div className="campaign-list">
          {campaigns.map(campaign => {
            const campaignTasks = tasks.filter(t => t.campaign_id === campaign.id);
            const done = campaignTasks.filter(t => t.done).length;
            const total = campaignTasks.length;
            const progress = total > 0 ? (done / total) * 100 : 0;

            let deadlineText = "";
            if (campaign.deadline) {
              const deadlineDate = parseDate(campaign.deadline);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const days = Math.ceil((deadlineDate.getTime() - today.getTime()) / 86400000);
              if (days < 0) deadlineText = `已过期 ${-days} 天`;
              else if (days === 0) deadlineText = "今天截止";
              else deadlineText = `还剩 ${days} 天`;
            }

            return (
              <div key={campaign.id} className="campaign-card" onClick={() => openCampaignDetail(campaign.id)}>
                <div className="campaign-card-header">
                  <div className="campaign-card-dot" style={{ background: campaign.color }} />
                  <div className="campaign-card-name">{campaign.name}</div>
                </div>
                {campaign.goal && <div className="campaign-card-goal">{campaign.goal}</div>}
                <div className="campaign-card-progress">
                  <div className="campaign-progress-bar">
                    <div className="campaign-progress-fill" style={{ width: `${progress}%`, background: campaign.color }} />
                  </div>
                  <div className="campaign-progress-text">{done}/{total}</div>
                </div>
                {deadlineText && <div className="campaign-card-deadline">{deadlineText}</div>}
              </div>
            );
          })}
        </div>

        <CampaignFormSheet
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditingCampaign(null); }}
          onSave={handleCampaignSave}
          onDelete={editingCampaign?.id ? () => handleCampaignDelete(editingCampaign.id) : undefined}
          initialData={editingCampaign}
        />
      </div>
    );
  }

  if (!selectedCampaign) return null;

  return (
    <div className="page campaign-detail-page">
      <div className="campaign-detail-header">
        <button className="campaign-back-btn" onClick={backToList}>‹ 返回</button>
        <div className="campaign-detail-info">
          <div className="campaign-detail-dot" style={{ background: selectedCampaign.color }} />
          <h2>{selectedCampaign.name}</h2>
        </div>
        {!selectMode ? (
          <div className="campaign-detail-actions">
            <button className="tasks-select-btn" onClick={enterSelectMode}>多选</button>
            <button className="tasks-add-btn" onClick={() => { setEditingCampaign({ ...selectedCampaign }); setFormOpen(true); }}>⚙</button>
          </div>
        ) : (
          <button className="tasks-cancel-btn" onClick={exitSelectMode}>取消</button>
        )}
      </div>

      {selectedCampaign.goal && <div className="campaign-detail-goal">{selectedCampaign.goal}</div>}

      <div className="campaign-detail-progress">
        <div className="campaign-progress-bar large">
          <div className="campaign-progress-fill" style={{ width: `${campaignProgress.total > 0 ? (campaignProgress.done / campaignProgress.total) * 100 : 0}%`, background: selectedCampaign.color }} />
        </div>
        <div className="campaign-progress-label">
          进度 {campaignProgress.done}/{campaignProgress.total}
        </div>
      </div>

      <div className="campaign-detail-toolbar">
        <button className="campaign-tool-btn" onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>＋ 新建子计划</button>
        <button className="campaign-tool-btn" onClick={() => setBatchCreateOpen(true)}>批量新建</button>
        <button className="campaign-tool-btn" onClick={() => setAttachOpen(true)}>拉入已有日程</button>
      </div>

      {groupedTasks.length === 0 && (
        <div className="tasks-empty">
          <p>暂无子计划，点击上方按钮添加</p>
        </div>
      )}

      {groupedTasks.map(([dateKey, dateTasks]) => (
        <div key={dateKey} className="task-group">
          <div className="task-group-header">{formatDateLabel(dateKey)}（{dateTasks.length}）</div>
          {dateTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              campaigns={campaigns}
              done={task.done}
              onToggle={() => handleToggle(task)}
              onEdit={() => { setEditingTask(task); setTaskFormOpen(true); }}
              onDelete={() => setTaskDeleteConfirm(task.id)}
              onCampaignClick={() => {}}
              selected={selectedIds.has(task.id)}
              onSelect={() => toggleSelect(task.id)}
              selectMode={selectMode}
            />
          ))}
        </div>
      ))}

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

      <CampaignFormSheet
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingCampaign(null); }}
        onSave={handleCampaignSave}
        onDelete={editingCampaign?.id ? () => handleCampaignDelete(editingCampaign.id) : undefined}
        initialData={editingCampaign}
      />

      <BatchCreateSheet
        open={batchCreateOpen}
        onClose={() => setBatchCreateOpen(false)}
        onSave={handleBatchCreate}
        campaignId={selectedCampaignId!}
      />

      <TaskFormSheet
        open={taskFormOpen}
        onClose={() => { setTaskFormOpen(false); setEditingTask(null); }}
        onSave={handleTaskSave}
        onDelete={editingTask?.id ? () => { deleteTask(editingTask.id); setTaskFormOpen(false); } : undefined}
        initialData={editingTask}
        campaigns={campaigns}
        defaultDate={todayStr}
        totalWeeks={currentSemester?.total_weeks}
      />

      <ConfirmDialog
        open={!!taskDeleteConfirm}
        onClose={() => setTaskDeleteConfirm(null)}
        onConfirm={() => { if (taskDeleteConfirm) handleTaskDelete(taskDeleteConfirm); }}
        title="删除子计划"
        danger
      >
        确定要删除这条子计划吗？
      </ConfirmDialog>

      <ConfirmDialog
        open={batchDeleteConfirm}
        onClose={() => setBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title="批量删除"
        danger
      >
        确定要删除选中的 {selectedIds.size} 条子计划吗？
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

      <ConfirmDialog
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        onConfirm={() => {
          const checkboxes = document.querySelectorAll<HTMLInputElement>(".attach-task-check:checked");
          const checked = new Set(Array.from(checkboxes).map(cb => cb.value));
          // checkbox .value is always a string; map back to the store's real id type
          const ids = unattachedTasks.filter(t => checked.has(String(t.id))).map(t => t.id);
          if (ids.length > 0) handleAttachTasks(ids);
          else setAttachOpen(false);
        }}
        title="拉入已有日程"
      >
        <div className="attach-task-list">
          {unattachedTasks.length === 0 && <p className="attach-empty">没有可拉入的日程</p>}
          {unattachedTasks.map(task => (
            <label key={task.id} className="attach-task-item">
              <input type="checkbox" className="attach-task-check" value={task.id} />
              <span>{task.title}</span>
              <span className="attach-task-date">{task.date}</span>
            </label>
          ))}
        </div>
      </ConfirmDialog>
    </div>
  );
}
