import { cn } from "@/lib/utils";

/** Hand-drawn spring branch used as a decorative accent. */
export function Branch({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 120"
      fill="none"
      aria-hidden="true"
      className={cn("text-primary/40", className)}
    >
      <path
        d="M4 108C48 96 86 74 118 44 138 26 168 12 232 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {[
        [46, 92],
        [82, 74],
        [116, 50],
        [152, 30],
        [190, 16],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${-18 * i})`}>
          <ellipse cx="0" cy="-9" rx="6" ry="11" fill="currentColor" opacity="0.35" />
          <ellipse cx="8" cy="-2" rx="11" ry="6" fill="currentColor" opacity="0.22" />
        </g>
      ))}
    </svg>
  );
}

/** Five-petal blossom. */
export function Blossom({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className={cn("text-blush", className)}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="50"
          cy="28"
          rx="13"
          ry="21"
          fill="currentColor"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="8" className="fill-primary/60" />
    </svg>
  );
}

/** Soft pastel blur washes for section backgrounds. */
export function Wash({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute -z-10 blur-3xl opacity-70", className)}
    />
  );
}
