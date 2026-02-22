"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type Theme,
  getStoredTheme,
  setStoredTheme,
  resolveDark,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return getStoredTheme();
}

function getInitialResolvedDark(): boolean {
  if (typeof window === "undefined") return false;
  return resolveDark(getStoredTheme());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolvedDark, setResolvedDark] = useState(getInitialResolvedDark);

  // Sync state from localStorage on mount so toggle matches the applied theme (set by inline script)
  useEffect(() => {
    const stored = getStoredTheme();
    queueMicrotask(() => {
      setThemeState(stored);
      setResolvedDark(resolveDark(stored));
    });
  }, []);

  useEffect(() => {
    const isDark = resolveDark(theme);
    document.documentElement.classList.toggle("dark", isDark);
    queueMicrotask(() => setResolvedDark(isDark));
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedDark(resolveDark("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setStoredTheme(next);
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, resolvedDark }),
    [theme, setTheme, resolvedDark]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
