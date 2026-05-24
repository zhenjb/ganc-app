// =============================================================================
// FE-01 App Shell — Footer
// -----------------------------------------------------------------------------
// Pure server component rendered as the bottommost element of the App Shell
// (Req 1.2, 15.3). Until FE-12 wires up real targets, the `Survey` and `Docs`
// links are placeholders with `href="#"` and `aria-disabled="true"`
// (Req 15.4, 15.5).
//
// Disabled-link pattern (mirrors the `Failure Demo` NavItem in design.md):
//   - `aria-disabled="true"` flags the placeholder state to assistive tech.
//   - `tabIndex={-1}` removes the placeholder from the keyboard tab order so
//     keyboard users skip it instead of landing on a `#` anchor that would
//     otherwise scroll to the top of the page.
//   - Click neutralization is owned by `Footer.module.scss` via
//     `pointer-events: none` because this component renders as a Server
//     Component and cannot attach DOM event handlers. FE-12 will replace the
//     `href="#"` placeholders with real targets and drop both safeguards.
//
// Styling rule:
//   - Tailwind utilities own layout / spacing / responsive variants.
//   - `Footer.module.scss` owns stateful styles (the disabled-link cursor and
//     pointer-events lock) so the placeholders cannot accidentally navigate.
// =============================================================================

import styles from "./Footer.module.scss";

export function Footer(): React.JSX.Element {
  return (
    <footer
      className="w-full border-t border-black/10 dark:border-white/10 py-4 px-4 text-sm flex gap-4 justify-center"
      role="contentinfo"
    >
      <a
        href="#"
        aria-disabled="true"
        tabIndex={-1}
        className={styles.link}
      >
        Survey
      </a>
      <a
        href="#"
        aria-disabled="true"
        tabIndex={-1}
        className={styles.link}
      >
        Docs
      </a>
    </footer>
  );
}

export default Footer;
