interface TurtleLogoProps {
  size?: number;
  className?: string;
  title?: string;
}

/** The shell: dark green circle, green hexagon, bright inner hexagon. */
export function TurtleLogo({ size = 36, className = '', title }: TurtleLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <circle cx="50" cy="50" r="48" fill="#0A3D22" />
      <polygon points="50,20 75.98,35 75.98,65 50,80 24.02,65 24.02,35" fill="#12A150" />
      <polygon points="50,34 63.86,42 63.86,58 50,66 36.14,58 36.14,42" fill="#2ED573" />
    </svg>
  );
}
