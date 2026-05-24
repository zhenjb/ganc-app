/**
 * Viewport breakpoint constants (FE-01 App Shell).
 *
 * Mirrors the Tailwind v4 default breakpoints (`md = 768px`, `lg = 1024px`)
 * so that the JavaScript-side `useMediaQuery` hook stays in sync with
 * Tailwind utility classes used in the markup.
 *
 * @see Requirements 7.1 (Desktop ≥ 1024px), 7.2 (Tablet ≥ 768px), 17.4
 */

/** Minimum viewport width (in pixels) at which the layout switches to the tablet treatment. */
export const BREAKPOINT_TABLET_MIN = 768;

/** Minimum viewport width (in pixels) at which the layout switches to the desktop treatment. */
export const BREAKPOINT_DESKTOP_MIN = 1024;

/** Media query string matching tablet-and-up viewports (≥ 768px). */
export const MEDIA_TABLET_AND_UP = `(min-width: ${BREAKPOINT_TABLET_MIN}px)`;

/** Media query string matching desktop-and-up viewports (≥ 1024px). */
export const MEDIA_DESKTOP_AND_UP = `(min-width: ${BREAKPOINT_DESKTOP_MIN}px)`;
