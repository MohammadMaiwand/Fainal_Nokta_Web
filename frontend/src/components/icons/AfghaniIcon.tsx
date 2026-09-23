import { forwardRef } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react';

export const AfghaniIcon: LucideIcon = Object.assign(
  forwardRef<SVGSVGElement, LucideProps>(function AfghaniIcon(
    { className, color = 'currentColor', size = 24, strokeWidth = 2, ...props },
    ref
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <text
          x="12"
          y="15.75"
          textAnchor="middle"
          fontSize="7.5"
          fill={color}
          stroke="none"
          fontWeight="800"
          fontFamily="var(--app-font-family)"
          letterSpacing="-0.4"
        >
          AF
        </text>
      </svg>
    );
  }),
  { displayName: 'AfghaniIcon' }
);
