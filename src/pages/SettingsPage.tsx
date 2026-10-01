import { useState, useRef } from "react";
import { useStore, type Semester, type Holiday, type PeriodSlot, type DayOverride } from "../store";
import ConfirmDialog from "../components/ConfirmDialog";
import ThemeCard from "../components/settings/ThemeCard";
import { THEMES } from "../themes/registry";
import { applyTheme, getStoredTheme } from "../themes/loader";

export default function SettingsPage() {
  const { state, saveSemester, setCurrentSemester, deleteSemester, saveHoliday, deleteHoliday, savePeriods, saveSettings, exportData, importData, refresh } = useStore();
  const [section, setSection] = useState<"semester" | "holiday" | "period" | "reminder" | "appearance" | "data">("semester");

  const sections = [
    { key: "semester" as const, label: "学期管理" },
    { key: "holiday" as const, label: "校历节假日" },
    { key: "period" as const, label: "作息时间表" },
    { key: "reminder" as const, label: "提醒设置" },
    { key: "appearance" as const, label: "外观" },
    { key: "data" as const, label: "数据备份" },
  ];

  return (
    <div className="page settings-page">
      <h2>设置</h2>
      <div className="settings-tabs">
        {sections.map(s => (
          <button key={s.key} className={`settings-tab ${section === s.key ? "active" : ""}`} onClick={() => setSection(s.key)}>{s.label}</button>
        ))}
      </div>
      <div className="settings-content">
        {section === "semester" && <SemesterSection />}
        {section === "holiday" && <HolidaySection />}
        {section === "period" && <PeriodSection />}
        {section === "reminder" && <ReminderSection />}
        {section === "appearance" && <AppearanceSection />}
        {section === "data" && <DataSection />}
      </div>
    </div>
  );
}

function SemesterSection() {
  const { state, saveSemester, setCurrentSemester, deleteSemester } = useStore();
  const [editing, setEditing] = useState<Semester | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", start_monday: "", total_weeks: 19 });

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ name: "", start_monday: "", total_weeks: 19 });
  };

  const startEdit = (s: Semester) => {
    setEditing(s);
    setCreating(false);
    setForm({ name: s.name, start_monday: s.start_monday, total_weeks: s.total_weeks });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.start_monday) return;
    const data: any = { ...form, is_current: editing?.is_current || false };
    if (editing) data.id = editing.id;
    await saveSemester(data);
    setEditing(null);
    setCreating(false);
  };

  const handleSetCurrent = async (id: string) => {
    await setCurrentSemester(id);
  };

  const handleDelete = async () => {
    if (!confirm) return;
    await deleteSemester(confirm.id);
    setConfirm(null);
  };

  const showForm = creating || editing;

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>学期列表</h3>
        <button className="btn-primary btn-sm" onClick={startCreate}>新建学期</button>
      </div>

      {showForm && (
        <div className="settings-form">
          <label className="sf-label">名称</label>
          <input className="sf-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如 2026秋" />
          <label className="sf-label">第1周周一</label>
          <input className="sf-input" type="date" value={form.start_monday} onChange={e => setForm(f => ({ ...f, start_monday: e.target.value }))} />
          <label className="sf-label">总周数</label>
          <input className="sf-input" type="number" min={1} max={52} value={form.total_weeks} onChange={e => setForm(f => ({ ...f, total_weeks: parseInt(e.target.value) || 1 }))} />
          <div className="sf-actions">
            <button className="btn-secondary btn-sm" onClick={() => { setEditing(null); setCreating(false); }}>取消</button>
            <button className="btn-primary btn-sm" onClick={handleSave}>保存</button>
          </div>
        </div>
      )}

      <div className="settings-list">
        {state.semesters.map(s => (
          <div key={s.id} className={`settings-list-item ${s.is_current ? "current" : ""}`}>
            <div className="sli-info">
              <span className="sli-name">{s.name}</span>
              <span className="sli-detail">{s.start_monday} · {s.total_weeks}周</span>
            </div>
            <div className="sli-actions">
              {s.is_current ? (
                <span className="sli-badge">当前</span>
              ) : (
                <button className="btn-text btn-sm" onClick={() => handleSetCurrent(s.id)}>切换</button>
              )}
              <button className="btn-text btn-sm" onClick={() => startEdit(s)}>编辑</button>
              {!s.is_current && (
                <button className="btn-text danger btn-sm" onClick={() => setConfirm({ id: s.id, name: s.name })}>删除</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {confirm && (
        <ConfirmDialog open={true} title="删除学期" onClose={() => setConfirm(null)} onConfirm={handleDelete}>确定删除学期「{confirm.name}」？</ConfirmDialog>
      )}
    </div>
  );
}

function HolidaySection() {
  const { state, saveHoliday, deleteHoliday, deleteDayOverride } = useStore();
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "" });

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ name: "", start_date: "", end_date: "" });
  };

  const startEdit = (h: Holiday) => {
    setEditing(h);
    setCreating(false);
    setForm({ name: h.name, start_date: h.start_date, end_date: h.end_date });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.start_date || !form.end_date) return;
    const data: any = { ...form };
    if (editing) data.id = editing.id;
    await saveHoliday(data);
    setEditing(null);
    setCreating(false);
  };

  const handleDelete = async () => {
    if (!confirm) return;
    await deleteHoliday(confirm.id);
    setConfirm(null);
  };

  const sorted = [...state.holidays].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const showForm = creating || editing;

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>节假日列表</h3>
        <button className="btn-primary btn-sm" onClick={startCreate}>新增</button>
      </div>

      {showForm && (
        <div className="settings-form">
          <label className="sf-label">名称</label>
          <input className="sf-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="如 国庆" />
          <label className="sf-label">开始日期</label>
          <input className="sf-input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          <label className="sf-label">结束日期</label>
          <input className="sf-input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          <div className="sf-actions">
            <button className="btn-secondary btn-sm" onClick={() => { setEditing(null); setCreating(false); }}>取消</button>
            <button className="btn-primary btn-sm" onClick={handleSave}>保存</button>
          </div>
        </div>
      )}

      <div className="settings-list">
        {sorted.map(h => (
          <div key={h.id} className="settings-list-item">
            <div className="sli-info">
              <span className="sli-name">{h.name}</span>
              <span className="sli-detail">{h.start_date === h.end_date ? h.start_date : `${h.start_date} ~ ${h.end_date}`}</span>
            </div>
            <div className="sli-actions">
              <button className="btn-text btn-sm" onClick={() => startEdit(h)}>编辑</button>
              <button className="btn-text danger btn-sm" onClick={() => setConfirm({ id: h.id, name: h.name })}>删除</button>
            </div>
          </div>
        ))}
      </div>

      {confirm && (
        <ConfirmDialog open={true} title="删除节假日" onClose={() => setConfirm(null)} onConfirm={handleDelete}>确定删除「{confirm.name}」？</ConfirmDialog>
      )}

      <OverrideList />
    </div>
  );
}

function OverrideList() {
  const { state, deleteDayOverride } = useStore();
  const [confirm, setConfirm] = useState<{ id: string; label: string } | null>(null);
  const sorted = [...state.dayOverrides].sort((a, b) => a.date.localeCompare(b.date));

  const WEEKDAY_NAMES = ["", "一", "二", "三", "四", "五", "六", "日"];

  const handleDelete = async () => {
    if (!confirm) return;
    await deleteDayOverride({ id: confirm.id });
    setConfirm(null);
  };

  return (
    <>
      <div className="section-header" style={{ marginTop: 24 }}>
        <h3>调休标记</h3>
      </div>
      {sorted.length === 0 ? (
        <div className="empty-state">暂无调休标记</div>
      ) : (
        <div className="settings-list">
          {sorted.map(o => {
            const kindLabel = o.kind === "holiday" ? "放假" : "补课";
            const detail = o.kind === "classday" && o.follow_weekday
              ? `按周${WEEKDAY_NAMES[o.follow_weekday]}课表`
              : o.date;
            return (
              <div key={o.id} className="settings-list-item override-list-item">
                <div className="sli-info">
                  <span className="sli-name">{o.date}</span>
                  <span className={`sli-kind ${o.kind}`}>{kindLabel}</span>
                  <span className="sli-detail">{detail}{o.name ? ` · ${o.name}` : ""}</span>
                </div>
                <div className="sli-actions">
                  <button className="btn-text danger btn-sm" onClick={() => setConfirm({ id: o.id, label: `${o.date} ${kindLabel}` })}>删除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {confirm && (
        <ConfirmDialog open={true} title="清除标记" onClose={() => setConfirm(null)} onConfirm={handleDelete}>确定清除「{confirm.label}」的标记？</ConfirmDialog>
      )}
    </>
  );
}

function PeriodSection() {
  const { state, savePeriods } = useStore();
  const [slots, setSlots] = useState<PeriodSlot[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const initialized = useRef(false);

  if (!initialized.current && state.periodSlots.length > 0) {
    setSlots([...state.periodSlots].sort((a, b) => a.slot_no - b.slot_no));
    initialized.current = true;
  }

  const updateTime = (index: number, field: "start_time" | "end_time", value: string) => {
    setSlots(s => s.map((slot, i) => i === index ? { ...slot, [field]: value } : slot));
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    const toSave = slots.map(s => ({ id: s.id, slot_no: s.slot_no, start_time: s.start_time, end_time: s.end_time }));
    const result = await savePeriods(toSave);
    setSlots(result);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (slots.length === 0) return <div className="settings-section"><p>加载中…</p></div>;

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>节次时间</h3>
        <div>
          {saved && <span className="save-hint">已保存</span>}
          <button className="btn-primary btn-sm" onClick={handleSave} disabled={!dirty}>保存</button>
        </div>
      </div>
      <div className="period-table">
        <div className="pt-header">
          <span>节次</span><span>开始</span><span>结束</span>
        </div>
        {slots.map((s, i) => (
          <div key={s.id || i} className="pt-row">
            <span className="pt-no">第{s.slot_no}节</span>
            <input className="pt-time" type="time" value={s.start_time} onChange={e => updateTime(i, "start_time", e.target.value)} />
            <input className="pt-time" type="time" value={s.end_time} onChange={e => updateTime(i, "end_time", e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReminderSection() {
  const { state, saveSettings } = useStore();
  const [remindMinutes, setRemindMinutes] = useState(state.settings.remind_minutes);
  const [overlayRepeat, setOverlayRepeat] = useState(state.settings.overlay_repeat);
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await saveSettings({ remind_minutes: remindMinutes, overlay_repeat: overlayRepeat });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const requestNotif = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  return (
    <div className="settings-section">
      <h3>提醒设置</h3>
      <div className="settings-form">
        <label className="sf-label">上课提醒提前量（分钟）</label>
        <input className="sf-input" type="number" min={0} max={60} value={remindMinutes} onChange={e => setRemindMinutes(parseInt(e.target.value) || 0)} />

        <label className="sf-row-label">
          <input type="checkbox" checked={overlayRepeat} onChange={e => setOverlayRepeat(e.target.checked)} />
          课表叠显示重复日程
        </label>

        <label className="sf-label">浏览器通知</label>
        <div className="sf-row">
          {notifPermission === "granted" ? (
            <span className="notif-status granted">已授权</span>
          ) : notifPermission === "unsupported" ? (
            <span className="notif-status unsupported">不支持</span>
          ) : (
            <button className="btn-primary btn-sm" onClick={requestNotif}>授权通知</button>
          )}
        </div>

        <div className="sf-actions">
          {saved && <span className="save-hint">已保存</span>}
          <button className="btn-primary btn-sm" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}

function DataSection() {
  const { exportData, importData, clearLocalData, refresh } = useStore();
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const data = await exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `schedule-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("导出成功");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("导出失败");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.semesters || !data.tasks) {
        setMessage("文件格式不正确");
        setImporting(false);
        return;
      }
      await importData(data);
      setMessage("导入成功，数据已恢复");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage("导入失败：" + (err?.message || "未知错误"));
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClear = async () => {
    await clearLocalData();
    setConfirmClear(false);
    setMessage("本地数据已清除");
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div className="settings-section">
      <h3>数据备份</h3>
      <div className="data-section">
        <div className="data-card">
          <h4>导出</h4>
          <p>将所有数据（学期、课程、日程、战役等）导出为 JSON 文件。</p>
          <button className="btn-primary" onClick={handleExport}>导出 JSON</button>
        </div>
        <div className="data-card">
          <h4>导入</h4>
          <p>从 JSON 备份文件恢复数据。导入将覆盖当前所有数据。</p>
          <label className="btn-secondary import-label">
            选择文件
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
          </label>
          {importing && <span className="importing-hint">导入中…</span>}
        </div>
        <div className="data-card">
          <h4>清除本地数据</h4>
          <p>清除 IndexedDB 中的所有本地缓存数据。下次加载将从云端重新拉取。</p>
          <button className="btn-danger" onClick={() => setConfirmClear(true)}>清除本地数据</button>
        </div>
      </div>
      {message && <p className="data-message">{message}</p>}
      {confirmClear && (
        <ConfirmDialog open={true} title="清除本地数据" onClose={() => setConfirmClear(false)} onConfirm={handleClear}>
          确定清除所有本地缓存数据？未同步的修改将丢失。
        </ConfirmDialog>
      )}
    </div>
  );
}

function AppearanceSection() {
  const { saveSettings } = useStore();
  const [currentTheme, setCurrentTheme] = useState(getStoredTheme);

  const handleSelect = async (themeId: string) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
    try { await saveSettings({ theme: themeId }); } catch { /* server may lack theme column */ }
  };

  return (
    <div className="settings-section">
      <h3>外观主题</h3>
      <div className="settings-theme-grid">
        {THEMES.map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={currentTheme === theme.id}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}
