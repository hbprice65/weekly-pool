import React from "react";

interface SevenSegmentIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

/**
 * 7-segment digital display numbers icon representing scoreboard scores.
 */
export function SevenSegmentIcon({
  className = "w-4 h-4",
  ...props
}: SevenSegmentIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Left 7-segment digit */}
      <line x1="5" y1="4" x2="9" y2="4" />
      <line x1="10" y1="5" x2="10" y2="11" />
      <line x1="10" y1="13" x2="10" y2="19" />
      <line x1="5" y1="20" x2="9" y2="20" />
      <line x1="4" y1="13" x2="4" y2="19" />
      <line x1="4" y1="5" x2="4" y2="11" />
      <line x1="5" y1="12" x2="9" y2="12" />

      {/* Right 7-segment digit */}
      <line x1="15" y1="4" x2="19" y2="4" />
      <line x1="20" y1="5" x2="20" y2="11" />
      <line x1="20" y1="13" x2="20" y2="19" />
      <line x1="15" y1="20" x2="19" y2="20" />
      <line x1="14" y1="13" x2="14" y2="19" />
      <line x1="14" y1="5" x2="14" y2="11" />
      <line x1="15" y1="12" x2="19" y2="12" />
    </svg>
  );
}
