/**
 * Theme preference constants (FE-01 App Shell).
 *
 * The theme system supports two modes: light and dark. The toggle button
 * switches between them. The active value is persisted in `localStorage`
 * under {@link THEME_STORAGE_KEY} so the choice survives reloads, and
 * the inline no-flash script in `app/layout.tsx` reads it synchronously
 * before the first paint.
 */

/** `localStorage` key under which the active {@link ThemeMode} is persisted. */
export const THEME_STORAGE_KEY = "theme";

/**
 * The user's explicit theme choice.
 *
 * - `"light"` — render the light palette.
 * - `"dark"` — render the dark palette.
 */
export type ThemeMode = "light" | "dark";

/** Default theme used when no value is persisted in `localStorage`. */
export const THEME_DEFAULT: ThemeMode = "light";

/**
 * Pure helper that returns the opposite {@link ThemeMode}.
 *
 * Used by the header theme toggle button.
 */
export function nextTheme(current: ThemeMode): ThemeMode {
  return current === "light" ? "dark" : "light";
}
