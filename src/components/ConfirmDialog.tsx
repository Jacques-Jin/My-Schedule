import { useEffect, type ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  children: ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export default function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmText = "确认", cancelText = "取消", danger }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-panel" onClick={(e) => e.stopPropagation()}>
        {title && <div className="confirm-title">{title}</div>}
        <div className="confirm-body">{children}</div>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onClose}>{cancelText}</button>
          <button className={`confirm-ok ${danger ? "danger" : ""}`} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
