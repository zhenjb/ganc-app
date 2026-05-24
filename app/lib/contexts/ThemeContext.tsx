"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
 * - `theme` reflects the user's explicit choice.
 * - `resolvedTheme` is what is actually applied to `<html>` and is always
 *   either `"light"` or `"dark"` — it collapses the `"system"` case down
 *   to whichever palette `prefers-color-scheme` currently reports.
 * - `setTheme` replaces the active choice (and persists it).
 * - `cycleTheme` advances through `system → light → dark → system` per
 *   {@link nextTheme} (Req 14.3).
 */
export interface ThemeContextValue {
  /** What the user explicitly chose. */
  theme: ThemeMode;
  /** What is actually applied to <html>: "light" | "dark". */
  resolvedTheme: "light" | "dark";
  setTheme: (next: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Media query used to mirror the OS-level dark/light preference. */
const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";

/** Set of literal {@link ThemeMode} values accepted by `localStorage`. */
const VALID_THEMES: ReadonlySet<ThemeMode> = new Set<ThemeMode>([
  "system",
  "light",
  "dark",
]);

/**
 * Read the persisted {@link ThemeMode} from `localStorage`, falling back
 * to {@link THEME_DEFAULT} when no value is stored, the value is not in
 * `{"system","light","dark"}`, or the call happens during SSR (Req 14.7,
 * 14.8). Wrapped in a `try`/`catch` so that browsers blocking storage
 * access (e.g. private mode quotas) cannot crash the provider.
 */
function readPersistedTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return THEME_DEFAULT;
  }
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw != null && VALID_THEMES.has(raw as ThemeMode)) {
      return raw as ThemeMode;
    }
  } catch {
    // Ignore — fall through to the default.
  }
  return THEME_DEFAULT;
}

/**
 * Subscribe to the OS-level `prefers-color-scheme: dark` media query via
 * `useSyncExternalStore`. SSR (and the very first client render before
 * hydration commits) reports `false`; the post-mount read picks up the
 * real OS preference and any subsequent changes. Using
 * `useSyncExternalStore` keeps `resolvedTheme` purely derived, avoiding a
 * `setState` inside `useEffect` (Req 14.6).
 */
function usePrefersDark(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return () => {};
    }
    const media = window.matchMedia(PREFERS_DARK_QUERY);
    media.addEventListener("change", onStoreChange);
    return () => {
      media.removeEventListener("change", onStoreChange);
    };
  }, []);

  const getSnapshot = useCallback((): boolean => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(PREFERS_DARK_QUERY).matches;
  }, []);

  const getServerSnapshot = useCallback((): boolean => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Apply `resolvedTheme` to `<html>` by toggling the literal `"dark"`
 * class (Req 14.4, 14.5, 14.6). No-op on the server.
 */
function applyResolvedThemeToDocument(resolved: "light" | "dark"): void {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/**
 * Provider that owns the user's theme preference and the resolved
 * light/dark palette. Mount at the root of `app/layout.tsx` so the
 * inline no-flash script's choice is taken over by React after
 * hydration without flicker (Req 14).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readPersistedTheme);
  const prefersDark = usePrefersDark();

  // `resolvedTheme` is purely derived from the explicit `theme` and the
  // current OS preference. Keeping it derived (no `useState` +
  // `useEffect`) avoids cascading renders and satisfies React 19's
  // `react-hooks/set-state-in-effect` rule, while still re-applying the
  // `<html class="dark">` toggle whenever either input changes.
  const resolvedTheme: "light" | "dark" =
    theme === "light" || theme === "dark"
      ? theme
      : prefersDark
        ? "dark"
        : "light";

  // Skip persistence on the very first render: the value already came
  // from `localStorage`, so writing it back would be a redundant
  // round-trip and would also clobber a fresh value written by the
  // inline no-flash script in between SSR and hydration.
  const isInitialRender = useRef(true);

  // Keep `<html class="dark">` in sync whenever the resolved palette
  // changes (Req 14.4, 14.5, 14.6).
  useEffect(() => {
    applyResolvedThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  // Persist the active theme on every change after the initial render
  // (Req 14.7). Wrapped in `try`/`catch` so storage failures cannot
  // crash the provider.
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
    () => ({ theme, resolvedTheme, setTheme, cycleTheme }),
    [theme, resolvedTheme, setTheme, cycleTheme],
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
