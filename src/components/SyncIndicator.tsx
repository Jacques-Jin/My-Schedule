import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getSyncStatus, onSyncChange, syncNow, type SyncStatus } from "../lib/sync";

const labels: Record<SyncStatus, string> = {
  synced: "",
  syncing: "同步中…",
  offline: "离线",
  error: "同步失败",
};

export default function SyncIndicator() {
  const [status, setStatus] = useState(getSyncStatus);
  const prevStatus = useRef<SyncStatus>(status.status);
  const toastId = useRef<string | number | null>(null);

  useEffect(() => onSyncChange((s, p) => {
    const prev = prevStatus.current;
    setStatus({ status: s, pending: p });

    if (s === "syncing" && prev !== "syncing" && p > 0) {
      toastId.current = toast.loading("数据同步中…");
    } else if (s === "synced" && prev === "syncing") {
      if (toastId.current != null) {
        toast.success("数据同步成功", { id: toastId.current });
        toastId.current = null;
      } else {
        // Direct online writes pulse syncing->synced without a loading toast;
        // reuse a stable id so rapid successive saves coalesce into one toast.
        toast.success("数据同步成功", { id: "sync-direct" });
      }
    } else if ((s === "offline" || s === "error") && prev === "syncing") {
      if (toastId.current != null) {
        toast.error("数据同步失败，将在恢复后重试", { id: toastId.current });
        toastId.current = null;
      } else {
        toast.error("数据同步失败，将在恢复后重试");
      }
    }

    prevStatus.current = s;
  }), []);

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
