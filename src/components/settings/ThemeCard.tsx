import type { ThemeInfo } from "../../themes/registry";

interface Props {
  theme: ThemeInfo;
  active: boolean;
  onSelect: (id: string) => void;
}

export default function ThemeCard({ theme, active, onSelect }: Props) {
  return (
    <button
      className={`settings-theme-card ${active ? "active" : ""}`}
      onClick={() => onSelect(theme.id)}
    >
      <div className="stc-preview">
        <div className="stc-preview-bar" />
        <div className="stc-preview-body">
          <div className="stc-preview-line" />
          <div className="stc-preview-line short" />
        </div>
      </div>
      <div className="stc-info">
        <span className="stc-name">{theme.name}</span>
        <span className="stc-desc">{theme.description}</span>
      </div>
      {active && <span className="stc-check">✓</span>}
    </button>
  );
}
