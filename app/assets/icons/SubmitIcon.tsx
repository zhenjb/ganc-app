import type { SVGProps } from "react";

/**
 * Submit icon — paper plane.
 */
export default function SubmitIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M21 3 3 10l7 3 3 7 8-17Z" />
      <path d="m10 13 5-5" />
    </svg>
  );
}
