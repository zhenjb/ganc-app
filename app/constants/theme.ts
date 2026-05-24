/**
 * Theme preference constants (FE-01 App Shell).
 *
 * The theme system supports three explicit user choices that cycle in a
 * fixed order when the header toggle button is activated. The active
 * value is persisted in `localStorage` under {@link THEME_STORAGE_KEY}
 * so the choice survives reloads, and the inline no-flash script in
 * `app/layout.tsx` reads it synchronously before the first paint.
 *
 * @see Requirements 14.3 (cycle order), 14.7 (persistence key),
 *      14.8 (default = "system"), 17.4
 */

/** `localStorage` key under which the active {@link ThemeMode} is persisted. */
export const THEME_STORAGE_KEY = "theme";

/**
 * The user's explicit theme choice.
 *
 * - `"system"` — follow `prefers-color-scheme` (default).
 * - `"light"` — always render the light palette.
 * - `"dark"` — always render the dark palette.
 */
export type ThemeMode = "system" | "light" | "dark";

/** Default theme used when no value is persisted in `localStorage`. */
export const THEME_DEFAULT: ThemeMode = "system";

/**
 * Order in which {@link nextTheme} cycles through {@link ThemeMode} values.
 *
 * Cycle: `system → light → dark → system → …`
 */
export const THEME_CYCLE = ["system", "light", "dark"] as const satisfies readonly ThemeMode[];

/**
 * Pure helper that returns the next {@link ThemeMode} in {@link THEME_CYCLE}.
 *
 * Used by the header theme toggle button and exercised directly by the
 * property test for Requirement 14.3.
 *
 * @param current The currently active theme mode.
 * @returns The next theme mode in the cycle, wrapping around at the end.
 */
export function nextTheme(current: ThemeMode): ThemeMode {
  const idx = THEME_CYCLE.indexOf(current);
  // If `current` is somehow outside the cycle, fall back to the first entry
  // so callers never observe `undefined`.
  const nextIdx = idx === -1 ? 0 : (idx + 1) % THEME_CYCLE.length;
  return THEME_CYCLE[nextIdx];
}
