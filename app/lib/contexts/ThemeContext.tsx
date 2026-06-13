"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
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

// ---------------------------------------------------------------------------
// localStorage as an external store via useSyncExternalStore
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribeToThemeStore(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Notify all subscribers that the persisted theme changed. */
function emitThemeChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Snapshot reader for the client — reads localStorage. */
function getThemeSnapshot(): ThemeMode {
  return readPersistedTheme();
}

/** Snapshot reader for the server — always returns the default. */
function getServerThemeSnapshot(): ThemeMode {
  return THEME_DEFAULT;
}

/**
 * Provider that owns the user's theme preference. Mount at the root of
 * `app/layout.tsx` so the inline no-flash script's choice is taken over
 * by React after hydration without flicker.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use useSyncExternalStore to read the persisted theme from localStorage.
  // The server snapshot always returns THEME_DEFAULT, ensuring hydration
  // parity. On the client, getThemeSnapshot reads localStorage directly.
  const persistedTheme = useSyncExternalStore(
    subscribeToThemeStore,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  // Local state tracks the active theme. Initialized from the external
  // store value so client picks up the persisted choice after hydration.
  const [theme, setThemeState] = useState<ThemeMode>(persistedTheme);

  // Keep `<html class="dark">` in sync whenever the theme changes.
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  // Persist the theme to localStorage and notify subscribers.
  useEffect(() => {
    try {
      const current = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (current !== theme) {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        emitThemeChange();
      }
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
