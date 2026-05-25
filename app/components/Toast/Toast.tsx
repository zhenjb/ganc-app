// =============================================================================
// Toast — lightweight copy-confirmation live region.
// -----------------------------------------------------------------------------
// Renders a transient notification that screen readers announce via the
// `role="status"` live region. Visibility is controlled entirely by the parent
// via the `visible` prop — this component does NOT manage its own timers.
//
// Requirements covered: 1.3, 10.1
// =============================================================================

import styles from "./Toast.module.scss";

export interface ToastProps {
  /** Text announced to screen readers and displayed visually. */
  message: string;
  /** When true the toast is visible; when false it is hidden. */
  visible: boolean;
  /**
   * Duration hint in milliseconds — exposed as a prop so the parent can
   * align its `setTimeout` with the CSS transition duration if desired.
   * Defaults to 1500. This component does NOT start any timer itself.
   */
  durationMs?: number;
}

/**
 * Toast — a polite live region for transient confirmations (e.g. "Copied!").
 *
 * The parent is responsible for toggling `visible` via `setTimeout`. This
 * component only applies the visible/hidden CSS class and exposes the
 * accessibility attributes required by WCAG 4.1.3.
 */
export function Toast({ message, visible, durationMs = 1500 }: ToastProps): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      // Keep the element in the DOM at all times so the live region is
      // registered before the message is injected — removing/adding the node
      // can cause screen readers to miss the announcement.
      className={`${styles.toast} ${visible ? styles["toast--visible"] : styles["toast--hidden"]}`}
      // Expose duration as a CSS custom property so the transition can match.
      style={{ "--toast-duration": `${durationMs}ms` } as React.CSSProperties}
    >
      {/* Only populate text content when visible so screen readers announce
          the message on each new appearance. */}
      {visible ? message : ""}
    </div>
  );
}

export default Toast;
