"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-safe `matchMedia` subscription hook.
 *
 * Always returns `false` during server-side rendering and on the very first
 * client render (before hydration commits), so that the SSR HTML and the
 * first client paint agree on the same DOM. After mount, the hook reads
 * `window.matchMedia(query).matches` and subscribes to the `change` event,
 * re-committing the correct value.
 *
 * Per FE-01 design: this is what lets `Nav` render the hamburger button in
 * the SSR HTML and switch to the inline tablet/desktop layout once hydrated.
 *
 * The subscription is torn down on unmount and when `query` changes.
 *
 * Implemented with `useSyncExternalStore` so the post-mount read happens as
 * part of React's commit phase (not via a `setState` inside `useEffect`),
 * which keeps the SSR-safe contract — `getServerSnapshot` returns `false` —
 * while satisfying React 19's `react-hooks/set-state-in-effect` rule.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => {
        mql.removeEventListener("change", onStoreChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback((): boolean => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  // SSR (and the very first client render before hydration commits) always
  // returns `false`, matching the SSR-safe contract documented above.
  const getServerSnapshot = useCallback((): boolean => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
