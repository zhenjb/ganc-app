"use client";

import { useEffect, useRef } from "react";

/**
 * Subscribes to `keydown` on `document` and invokes `handler` whenever the
 * Escape key is pressed.
 *
 * The latest `handler` reference is kept in a ref so that updating it does
 * not detach and re-attach the underlying listener — only `enabled` triggers
 * (re)attachment. This is convenient for callers that pass freshly-created
 * closures on every render (e.g. dropdown / overlay close handlers).
 *
 * SSR-safe: the effect body is the only place that touches `document`, so
 * the hook is a no-op during server rendering.
 *
 * Used by:
 *  - Req 4.8 (Nav dropdown closes on Escape)
 *  - Req 17.5 (shared hooks live under `app/lib/hooks/`)
 *
 * @param handler  Invoked with the original `KeyboardEvent` when Escape fires.
 * @param enabled  When `false`, no listener is attached and any previously
 *                 attached listener is removed. Defaults to `true`.
 */
export function useEscapeKey(
  handler: (event: KeyboardEvent) => void,
  enabled: boolean = true,
): void {
  const handlerRef = useRef(handler);

  // Keep the ref pointing at the latest handler without re-running the
  // listener-attaching effect below.
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        handlerRef.current(event);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled]);
}
