"use client";

/**
 * Thin re-export of {@link useThemeContext} so callers can import the
 * theme hook from the conventional `app/lib/hooks/` location alongside
 * the rest of the project's hooks (Req 17.5). The actual implementation
 * lives in `app/lib/contexts/ThemeContext.tsx`; this module exists only
 * as an alias and intentionally does not add behaviour of its own
 * (Req 14).
 */

import {
  useThemeContext,
  type ThemeContextValue,
} from "@/app/lib/contexts/ThemeContext";

export type { ThemeContextValue };

/**
 * Convenience alias for {@link useThemeContext}. Returns the active
 * {@link ThemeContextValue} from the nearest `<ThemeProvider>` and
 * throws when used outside one.
 */
export function useTheme(): ThemeContextValue {
  return useThemeContext();
}

export default useTheme;
