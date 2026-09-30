export interface ThemeInfo {
  id: string;
  name: string;
  description: string;
  cssFile: string;
  preview?: string;
}

export const THEMES: ThemeInfo[] = [
  { id: "default", name: "Liquid Glass", description: "macOS 液态玻璃风格", cssFile: "" },
];

export function getTheme(id: string): ThemeInfo | undefined {
  return THEMES.find(t => t.id === id);
}
