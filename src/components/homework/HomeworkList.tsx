import { useMemo, useState } from "react";
import { useStore, type Homework, type Course } from "../../store";
import { formatDate } from "../../lib/date";
import { groupHomework } from "../../lib/homework";

interface HomeworkListProps {
  courseId?: string;
  showCompleted?: boolean;
  grouped?: boolean;
  courseFilter?: string;
}

export default function HomeworkList({ courseId, showCompleted = false, grouped = false, courseFilter }: HomeworkListProps) {
  const { state, saveHomework, deleteHomework, completeHomework } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Homework | null>(null);

  const allMatchIds = useMemo(() => {
    if (courseId) {
      const name = state.courses.find(c => String(c.id) === String(courseId))?.name;
      if (name) return new Set(state.courses.filter(c => c.name === name).map(c => String(c.id)));
    }
    if (courseFilter) {
      return new Set(state.courses.filter(c => c.name === courseFilter).map(c => String(c.id)));
    }
    return null;
  }, [courseId, courseFilter, state.courses]);

  const filteredHomework = state.homework.filter(h => {
    if (allMatchIds && !allMatchIds.has(String(h.course_id))) return false;
    if (!grouped && !showCompleted && h.completed) return false;
    return true;
  });

  const sortedHomework = [...filteredHomework].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  const getCourseName = (courseId: string) => {
    const course = state.courses.find(c => String(c.id) === String(courseId));
    return course?.name || "未知课程";
  };

  const handleDelete = async (id: string) => {
    if (confirm("确定删除这条作业吗？")) {
      await deleteHomework(id);
    }
  };

  const handleToggleComplete = async (homework: Homework) => {
    await completeHomework({ id: homework.id, completed: !homework.completed });
  };

  const renderItem = (hw: Homework, overdue = false) => (
    <div key={hw.id} className={`homework-item ${hw.completed ? "completed" : ""} ${overdue ? "overdue" : ""}`}>
      <div className="hw-checkbox">
        <input
          type="checkbox"
          checked={hw.completed}
          onChange={() => handleToggleComplete(hw)}
        />
      </div>
      <div className="hw-content">
        <div className="hw-title">{hw.title}</div>
        <div className="hw-meta">
          {!courseId && <span className="hw-course">{getCourseName(hw.course_id)}</span>}
          {hw.due_date && (
            <span className="hw-due">
              截止: {formatDate(new Date(hw.due_date))}
            </span>
          )}
        </div>
        {hw.description && <div className="hw-desc">{hw.description}</div>}
      </div>
      <div className="hw-actions">
        <button className="btn-text btn-sm" onClick={() => { setEditing(hw); setShowForm(true); }}>
          编辑
        </button>
        <button className="btn-text danger btn-sm" onClick={() => handleDelete(hw.id)}>
          删除
        </button>
      </div>
    </div>
  );

  const groups = grouped ? groupHomework(filteredHomework, formatDate(new Date())) : [];

  return (
    <div className="homework-list">
      <div className={`homework-header ${grouped ? "grouped" : ""}`}>
        {!grouped && <h3>{courseId ? "课程作业" : "全部作业"}</h3>}
        <button className="btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          + 添加作业
        </button>
      </div>

      {showForm && (
        <HomeworkForm
          courseId={courseId}
          homework={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={async (data) => {
            await saveHomework(data);
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {grouped ? (
        filteredHomework.length === 0 ? (
          <div className="empty-state">
            <p>暂无作业</p>
          </div>
        ) : (
          <div className="homework-groups">
            {groups.map(g => {
              if (g.items.length === 0) return null;
              if (g.key === "completed") {
                return (
                  <details key={g.key} className="hw-group hw-group-done">
                    <summary className="hw-group-title">{g.label} ({g.items.length})</summary>
                    <div className="homework-items">{g.items.map(hw => renderItem(hw))}</div>
                  </details>
                );
              }
              return (
                <div key={g.key} className={`hw-group ${g.variant ? `hw-group-${g.variant}` : ""}`}>
                  <div className="hw-group-title">{g.label} ({g.items.length})</div>
                  <div className="homework-items">
                    {g.items.map(hw => renderItem(hw, g.variant === "overdue"))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : sortedHomework.length === 0 ? (
        <div className="empty-state">
          <p>暂无作业</p>
        </div>
      ) : (
        <div className="homework-items">
          {sortedHomework.map(hw => renderItem(hw))}
        </div>
      )}
    </div>
  );
}

interface HomeworkFormProps {
  courseId?: string;
  homework: Homework | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

function HomeworkForm({ courseId, homework, onClose, onSave }: HomeworkFormProps) {
  const { state } = useStore();
  const [form, setForm] = useState({
    title: homework?.title || "",
    course_id: homework?.course_id || courseId || "",
    due_date: homework?.due_date || "",
    description: homework?.description || "",
  });

  const availableCourses = useMemo(() => {
    const list = courseId
      ? state.courses.filter(c => c.id === courseId)
      : state.courses;
    const map = new Map<string, { id: string; name: string; teachers: string[] }>();
    for (const c of list) {
      const existing = map.get(c.name);
      if (existing) {
        if (c.teacher && !existing.teachers.includes(c.teacher)) {
          existing.teachers.push(c.teacher);
        }
      } else {
        map.set(c.name, { id: c.id, name: c.name, teachers: c.teacher ? [c.teacher] : [] });
      }
    }
    return [...map.values()];
  }, [courseId, state.courses]);

  const handleSave = async () => {
    if (!form.title.trim() || !form.course_id) return;
    const data: any = {
      title: form.title.trim(),
      course_id: form.course_id,
      due_date: form.due_date || null,
      description: form.description.trim(),
      completed: homework?.completed || false,
    };
    if (homework?.id) data.id = homework.id;
    await onSave(data);
  };

  return (
    <div className="homework-form">
      <label className="tf-label">作业标题 *</label>
      <input
        className="tf-input"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="如：预习第三课"
      />

      <label className="tf-label">课程 *</label>
      <select
        className="tf-input"
        value={form.course_id}
        onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
      >
        <option value="">选择课程</option>
        {availableCourses.map(c => (
          <option key={c.id} value={c.id}>
            {c.name}{c.teachers.length > 0 ? `（${c.teachers.join("、")}）` : ""}
          </option>
        ))}
      </select>

      <label className="tf-label">截止日期</label>
      <input
        className="tf-input"
        type="date"
        value={form.due_date}
        onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
      />

      <label className="tf-label">描述</label>
      <textarea
        className="tf-input tf-textarea"
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="作业详情"
        rows={3}
      />

      <div className="tf-actions">
        <button className="tf-btn secondary" onClick={onClose}>取消</button>
        <button className="tf-btn primary" onClick={handleSave} disabled={!form.title.trim() || !form.course_id}>
          保存
        </button>
      </div>
    </div>
  );
}
