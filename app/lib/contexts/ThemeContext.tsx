"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  THEME_DEFAULT,
  THEME_STORAGE_KEY,
  nextTheme,
  type ThemeMode,
} from "@/app/constants/theme";

/**
 * Public shape of the value published by {@link ThemeProvider}.
 *
 * - `theme` is the active palette: `"light"` or `"dark"`.
 * - `setTheme` replaces the active choice (and persists it).
 * - `toggleTheme` switches between light and dark.
 */
export interface ThemeContextValue {
  /** The active theme: "light" | "dark". */
  theme: ThemeMode;
  /** Alias kept for compatibility — same as `theme`. */
  resolvedTheme: "light" | "dark";
  setTheme: (next: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Set of valid {@link ThemeMode} values accepted from `localStorage`. */
const VALID_THEMES: ReadonlySet<string> = new Set(["light", "dark"]);

/**
 * Read the persisted {@link ThemeMode} from `localStorage`, falling back
 * to {@link THEME_DEFAULT} when no value is stored or the value is invalid.
 */
function readPersistedTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return THEME_DEFAULT;
  }
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw != null && VALID_THEMES.has(raw)) {
      return raw as ThemeMode;
    }
  } catch {
    // Ignore — fall through to the default.
  }
  return THEME_DEFAULT;
}

/**
 * Apply the theme to `<html>` by toggling the `"dark"` class. No-op on server.
 */
function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/**
 * Provider that owns the user's theme preference. Mount at the root of
 * `app/layout.tsx` so the inline no-flash script's choice is taken over
 * by React after hydration without flicker.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize with THEME_DEFAULT so server and first client render match.
  // The no-flash script already applied the correct class to <html>, so
  // there's no visual flash even if localStorage has "dark".
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    // On the client, read localStorage immediately during initialization.
    // This is safe because the no-flash script already set the correct
    // class on <html>, so the visual state is already correct.
    if (typeof window === "undefined") {
      return THEME_DEFAULT;
    }
    return readPersistedTheme();
  });

  // Track whether we've completed the first render to skip redundant persistence.
  const isInitialRender = useRef(true);

  // Keep `<html class="dark">` in sync whenever the theme changes.
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Persist the theme on every change after the initial render.
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore — persistence is best-effort.
    }
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeState((current) => nextTheme(current));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: theme, setTheme, cycleTheme }),
    [theme, setTheme, cycleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook for consuming the active theme value. Throws when used outside a
 * `<ThemeProvider>` so misconfiguration fails loudly during development.
 */
export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      "useThemeContext must be used inside <ThemeProvider>.",
    );
  }
  return ctx;
}
