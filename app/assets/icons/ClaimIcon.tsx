import type { SVGProps } from "react";

/**
 * Claim icon — hand collecting coins.
 */
export default function ClaimIcon(props: SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="7" r="3.25" />
      <path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
      <path d="M12 7v3" />
      <path d="M10.5 8.5h3" />
    </svg>
  );
}
