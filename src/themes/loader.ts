import { getTheme } from "./registry";

const STORAGE_KEY = "app-theme";

export function applyTheme(themeId: string): void {
  if (themeId === "default" || !getTheme(themeId)) {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", themeId);
  }
  localStorage.setItem(STORAGE_KEY, themeId);
}

export function getStoredTheme(): string {
  return localStorage.getItem(STORAGE_KEY) || "default";
}
