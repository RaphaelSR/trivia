export type ThemeMode =
  | "light"
  | "dark"
  | "cinema"
  | "retro"
  | "matrix"
  | "brazil";

export const themeTokens: Record<ThemeMode, Record<string, string>> = {
  light: {
    "--color-primary": "#4f46e5",
    "--color-secondary": "#22d3ee",
    "--color-surface": "#f9fafb",
    "--color-background": "#ffffff",
    "--color-border": "#e5e7eb",
    "--color-text": "#111827",
    "--color-muted": "#6b7280",
    "--color-tooltip-bg": "#1f2937",
    "--color-tooltip-text": "#ffffff",
    "--color-shadow": "#0f172a",
    "--color-disabled": "#f3f4f6",
    "--color-disabled-text": "#6b7280",
    "--color-overlay": "rgba(0, 0, 0, 0.5)"
  },
  dark: {
    "--color-primary": "#818cf8",
    "--color-secondary": "#38bdf8",
    "--color-surface": "#0f172a",
    "--color-background": "#1e293b",
    "--color-border": "#475569",
    "--color-text": "#f8fafc",
    "--color-muted": "#cbd5e1",
    "--color-tooltip-bg": "#f8fafc",
    "--color-tooltip-text": "#0f172a",
    "--color-shadow": "#000000",
    "--color-disabled": "#334155",
    "--color-disabled-text": "#94a3b8",
    "--color-overlay": "rgba(0, 0, 0, 0.7)"
  },
  cinema: {
    "--color-primary": "#fb923c",
    "--color-secondary": "#fde047",
    "--color-surface": "#0c0a09",
    "--color-background": "#1c1917",
    "--color-border": "#44403c",
    "--color-text": "#fef3c7",
    "--color-muted": "#d97706",
    "--color-tooltip-bg": "#fb923c",
    "--color-tooltip-text": "#0c0a09",
    "--color-shadow": "#000000",
    "--color-disabled": "#44403c",
    "--color-disabled-text": "#a3a3a3",
    "--color-overlay": "rgba(0, 0, 0, 0.7)"
  },
  retro: {
    "--color-primary": "#ff0080",
    "--color-secondary": "#00ffff",
    "--color-surface": "#1a0033",
    "--color-background": "#2d1b69",
    "--color-border": "#ff0080",
    "--color-text": "#00ffff",
    "--color-muted": "#ff80ff",
    "--color-tooltip-bg": "#ff0080",
    "--color-tooltip-text": "#00ffff",
    "--color-shadow": "#ff0080",
    "--color-disabled": "#4a1a69",
    "--color-disabled-text": "#ff80ff",
    "--color-overlay": "rgba(0, 0, 0, 0.8)"
  },
  matrix: {
    "--color-primary": "#00ff00",
    "--color-secondary": "#00ff41",
    "--color-surface": "#000000",
    "--color-background": "#001100",
    "--color-border": "#00ff00",
    "--color-text": "#00ff00",
    "--color-muted": "#00cc00",
    "--color-tooltip-bg": "#000000",
    "--color-tooltip-text": "#00ff00",
    "--color-shadow": "#00ff00",
    "--color-disabled": "#003300",
    "--color-disabled-text": "#00cc00",
    "--color-overlay": "rgba(0, 0, 0, 0.9)"
  },
  brazil: {
    "--color-primary": "#009739",
    "--color-secondary": "#FFDF00",
    "--color-surface": "#e8f5e9",
    "--color-background": "#f1f8e9",
    "--color-border": "#4caf50",
    "--color-text": "#1b5e20",
    "--color-muted": "#558b2f",
    "--color-tooltip-bg": "#009739",
    "--color-tooltip-text": "#FFDF00",
    "--color-shadow": "#2e7d32",
    "--color-disabled": "#c8e6c9",
    "--color-disabled-text": "#7cb342",
    "--color-overlay": "rgba(0, 0, 0, 0.5)"
  }
};

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const tokens = themeTokens[mode];
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  root.dataset.theme = mode;

  // Aplicar color-scheme para melhor suporte aos temas
  if (mode === "light" || mode === "brazil") {
    root.style.colorScheme = "light";
  } else {
    root.style.colorScheme = "dark";
  }
}
