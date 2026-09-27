import { useEffect, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function Sheet({ open, onClose, children, title }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="sheet-header">
            <h3>{title}</h3>
            <button className="sheet-close" onClick={onClose}>&times;</button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
