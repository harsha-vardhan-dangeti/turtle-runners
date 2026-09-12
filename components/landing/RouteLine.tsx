/** The dashed route that flows across the hero. Purely decorative. */
export function RouteLine({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 320"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M-20 250 C 140 250, 170 120, 320 130 C 470 140, 470 260, 620 250 C 770 240, 790 70, 940 90 C 1060 106, 1100 200, 1220 180"
        stroke="#12A150"
        strokeOpacity="0.55"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 10"
        className="animate-dashflow"
      />
      <circle cx="320" cy="130" r="6" fill="#2ED573" />
      <circle cx="620" cy="250" r="6" fill="#12A150" />
      <circle cx="940" cy="90" r="6" fill="#0B6B36" />
    </svg>
  );
}
