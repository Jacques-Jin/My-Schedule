import { useEffect, useState } from "react";
import { getSyncStatus, onSyncChange, syncNow, type SyncStatus } from "../lib/sync";

const labels: Record<SyncStatus, string> = {
  synced: "",
  syncing: "同步中…",
  offline: "离线",
  error: "同步失败",
};

export default function SyncIndicator() {
  const [status, setStatus] = useState(getSyncStatus);

  useEffect(() => onSyncChange((s, p) => setStatus({ status: s, pending: p })), []);

  if (status.status === "synced" && status.pending === 0) return null;

  return (
    <div
      className="sync-indicator"
      onClick={() => status.status !== "syncing" && syncNow()}
      title={status.pending > 0 ? `${status.pending} 条待同步` : labels[status.status]}
    >
      <span className={`sync-dot sync-${status.status}`} />
      {status.pending > 0 && <span className="sync-count">{status.pending}</span>}
      {status.status === "offline" && <span className="sync-label">{labels.offline}</span>}
    </div>
  );
}
