"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Invokes `handler` when a `mousedown` or `touchstart` event fires outside the
 * element referenced by `ref`. Designed for closing dropdowns, popovers, and
 * mobile overlays per FE-01 Req 4.7.
 *
 * Implementation notes:
 * - Listeners are attached to `document` so any pointer-down anywhere in the
 *   page can be observed before `click` resolves on the underlying element.
 * - The handler is stored in a mutable ref so consumers can pass an inline
 *   arrow function without forcing the listeners to detach and re-attach on
 *   every render.
 * - SSR-safe: the effect body never runs during server rendering, and the
 *   `typeof document` guard protects against unusual environments where the
 *   effect may execute without a DOM (e.g. some test runners).
 * - Cleans up listeners on unmount and when `ref` changes.
 */
export function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
): void {
  const handlerRef = useRef(handler);

  // Keep the ref pointing at the latest handler without re-binding listeners.
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const listener = (event: MouseEvent | TouchEvent): void => {
      const node = ref.current;
      if (!node) return;
      const target = event.target as Node | null;
      if (target && node.contains(target)) return;
      handlerRef.current(event);
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref]);
}
