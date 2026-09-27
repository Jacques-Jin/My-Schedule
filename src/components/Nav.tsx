import { useCallback, useEffect, useState } from "react";

const TABS = [
  { id: "home", label: "首页", icon: "🏠" },
  { id: "schedule", label: "课表", icon: "📅" },
  { id: "tasks", label: "日程", icon: "✅" },
  { id: "campaigns", label: "战役", icon: "🎯" },
  { id: "settings", label: "设置", icon: "⚙️" },
];

function getHash(): string {
  const h = window.location.hash.replace("#/", "").replace("#", "");
  return h || "home";
}

export default function Nav() {
  const [active, setActive] = useState(getHash);

  useEffect(() => {
    const onHash = () => setActive(getHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((tab: string) => {
    window.location.hash = `#/${tab}`;
  }, []);

  return (
    <>
      {/* Desktop top nav */}
      <nav className="nav-top">
        <div className="nav-top-inner">
          <span className="nav-brand">我的日程</span>
          <div className="nav-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`nav-tab ${active === t.id ? "active" : ""}`}
                onClick={() => navigate(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="nav-bottom">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-bottom-tab ${active === t.id ? "active" : ""}`}
            onClick={() => navigate(t.id)}
          >
            <span className="nav-bottom-icon">{t.icon}</span>
            <span className="nav-bottom-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
