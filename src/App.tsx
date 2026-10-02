import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import Nav from "./components/Nav";
import { StoreProvider, useStore } from "./store";
import SchedulePage from "./pages/SchedulePage";
import TasksPage from "./pages/TasksPage";
import HomePage from "./pages/HomePage";
import CampaignsPage from "./pages/CampaignsPage";
import SettingsPage from "./pages/SettingsPage";
import HomeworkPage from "./pages/HomeworkPage";
import ReminderBanner from "./components/ReminderBanner";
import SyncIndicator from "./components/SyncIndicator";
import SplashScreen from "./components/SplashScreen";
import { applyTheme, getStoredTheme } from "./themes/loader";
import { initSync } from "./lib/sync";
import "./styles.css";

function getHashPage(): string {
  const h = window.location.hash.replace("#/", "").replace("#", "");
  return h || "home";
}

const pages: Record<string, () => ReactNode> = {
  home: HomePage,
  schedule: SchedulePage,
  tasks: TasksPage,
  homework: HomeworkPage,
  campaigns: CampaignsPage,
  settings: SettingsPage,
};

function AppInner() {
  const [page, setPage] = useState(getHashPage);
  const [showSplash, setShowSplash] = useState(true);
  const { state, seedIfEmpty } = useStore();

  useEffect(() => {
    const onHash = () => setPage(getHashPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (state.status === "ready") {
      applyTheme(getStoredTheme());
      initSync();
      if (state.courses.length === 0 && state.tasks.length === 0 && state.semesters.length === 0) {
        seedIfEmpty();
      }
    }
  }, [state.status]);

  const Page = pages[page] || HomePage;

  return (
    <div className="app-shell">
      {showSplash && <SplashScreen onFinished={() => setShowSplash(false)} ready={state.status === "ready"} />}
      <Toaster theme="dark" position="top-center" closeButton />
      <SyncIndicator />
      <ReminderBanner />
      <Nav />
      <main className="main-content">
        {state.status === "loading" && <div className="page"><p>加载中…</p></div>}
        {state.status === "error" && (
          <div className="page">
            <p>连接服务失败，请确认本地服务已启动。</p>
            <Page />
          </div>
        )}
        {state.status === "ready" && <Page />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}
