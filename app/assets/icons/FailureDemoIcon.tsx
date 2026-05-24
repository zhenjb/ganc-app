import type { SVGProps } from "react";

/**
 * Failure Demo icon — warning triangle with exclamation.
 */
export default function FailureDemoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v5" />
      <path d="M12 18h0" />
    </svg>
  );
}
