import type { SVGProps } from "react";

/**
 * Trade icon — candlestick chart style representing trading.
 */
export default function TradeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Candlestick bars */}
      <line x1="6" y1="4" x2="6" y2="20" />
      <rect x="4" y="8" width="4" height="6" rx="1" fill="currentColor" stroke="none" />
      <line x1="12" y1="2" x2="12" y2="18" />
      <rect x="10" y="5" width="4" height="7" rx="1" fill="currentColor" stroke="none" />
      <line x1="18" y1="6" x2="18" y2="22" />
      <rect x="16" y="10" width="4" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
