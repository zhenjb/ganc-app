/**
 * Viewport breakpoint constants (FE-01 App Shell).
 *
 * Mirrors the Tailwind v4 default breakpoints (`md = 900px`, `lg = 1024px`)
 * so that the JavaScript-side `useMediaQuery` hook stays in sync with
 * Tailwind utility classes used in the markup.
 *
 * @see Requirements 7.1 (Desktop ≥ 1024px), 7.2 (Tablet ≥ 900px), 17.4
 */

/** Minimum viewport width (in pixels) at which the layout switches to the tablet treatment. */
export const BREAKPOINT_TABLET_MIN = 900;

/** Minimum viewport width (in pixels) at which the layout switches to the desktop treatment. */
export const BREAKPOINT_DESKTOP_MIN = 1024;

/** Minimum viewport width (in pixels) at which nav labels become visible (icon+text mode). */
export const BREAKPOINT_NAV_LABELS_MIN = 1280;

/** Media query string matching tablet-and-up viewports (≥ 900px). */
export const MEDIA_TABLET_AND_UP = `(min-width: ${BREAKPOINT_TABLET_MIN}px)`;

/** Media query string matching desktop-and-up viewports (≥ 1024px). */
export const MEDIA_DESKTOP_AND_UP = `(min-width: ${BREAKPOINT_DESKTOP_MIN}px)`;

/** Media query string matching viewports wide enough for nav labels (≥ 1280px). */
export const MEDIA_NAV_LABELS = `(min-width: ${BREAKPOINT_NAV_LABELS_MIN}px)`;
