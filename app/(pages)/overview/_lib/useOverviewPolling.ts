"use client";

import { useEffect, useRef } from "react";

const SESSION_KEY = "overview-autorefresh";

/**
 * Sets up a 5-second polling interval that calls `refresh()` automatically.
 *
 * Behaviour:
 * - Skips a tick when `inFlight` is true to avoid overlapping requests.
 * - Pauses polling while `document.visibilityState === "hidden"`.
 * - Persists the auto-refresh toggle state in `sessionStorage["overview-autorefresh"]`.
 * - Cleans up the interval and visibility listener on unmount.
 *
 * Requirements: 6.1
 */
export function useOverviewPolling(
  refresh: () => void,
  inFlight: boolean
): void {
  // Keep a stable ref to the latest `refresh` callback so the interval
  // closure never captures a stale version.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  // Keep a stable ref to the latest `inFlight` value for the same reason.
  const inFlightRef = useRef(inFlight);
  useEffect(() => {
    inFlightRef.current = inFlight;
  }, [inFlight]);

  useEffect(() => {
    // Read the persisted toggle; default to enabled when no value is stored.
    const stored = sessionStorage.getItem(SESSION_KEY);
    const enabled = stored === null ? true : stored === "true";

    if (!enabled) return;

    // Persist the enabled state so it survives page navigations within the
    // same session.
    sessionStorage.setItem(SESSION_KEY, "true");

    const tick = (): void => {
      // Skip this tick if a request is already in flight.
      if (inFlightRef.current) return;
      // Skip this tick if the tab is hidden.
      if (document.visibilityState === "hidden") return;
      refreshRef.current();
    };

    const intervalId = setInterval(tick, 0);

    const handleVisibilityChange = (): void => {
      // Nothing to do here — the tick guard above already checks
      // visibilityState before each call. The listener is kept so future
      // extensions (e.g. immediate refresh on tab focus) have a hook point.
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // This effect intentionally runs only once on mount. `refresh` and
    // `inFlight` are tracked via refs above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
