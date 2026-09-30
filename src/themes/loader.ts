import { getTheme } from "./registry";

const STORAGE_KEY = "app-theme";
let loadedThemeLink: HTMLLinkElement | null = null;

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
      link.href = `/src/themes/${theme.cssFile}`;
      link.dataset.theme = themeId;
      document.head.appendChild(link);
      loadedThemeLink = link;
    }
  }
  localStorage.setItem(STORAGE_KEY, themeId);
}

export function getStoredTheme(): string {
  return localStorage.getItem(STORAGE_KEY) || "default";
}
