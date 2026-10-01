import { getTheme } from "./registry";
import { Capacitor } from "@capacitor/core";

const STORAGE_KEY = "app-theme";
let loadedThemeLink: HTMLLinkElement | null = null;

async function updateStatusBar(themeId: string) {
  if (!Capacitor.isNativePlatform()) return;
  const { StatusBar, Style } = await import("@capacitor/status-bar");
  const isDark = themeId === "dark-glass" || themeId === "paper-terminal";
  await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
}

export function applyTheme(themeId: string): void {
  // Remove previously loaded theme CSS
  if (loadedThemeLink) {
    loadedThemeLink.remove();
    loadedThemeLink = null;
  }

  if (themeId === "default" || !getTheme(themeId)) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    const theme = getTheme(themeId)!;
    document.documentElement.setAttribute("data-theme", themeId);

    // Dynamically load theme CSS file
    if (theme.cssFile) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `/themes/${theme.cssFile}`;
      link.dataset.theme = themeId;
      document.head.appendChild(link);
      loadedThemeLink = link;
    }
  }
  localStorage.setItem(STORAGE_KEY, themeId);
  updateStatusBar(themeId);
}

export function getStoredTheme(): string {
  return localStorage.getItem(STORAGE_KEY) || "default";
}
