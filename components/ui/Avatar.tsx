'use client';

import { useState } from 'react';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'T';
}

/** Google avatar when we have one, tinted initials when we do not. */
export function Avatar({ name, src, size = 44, className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size };

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full border border-hairline object-cover ${className}`}
        style={dimension}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-green-tint font-semibold text-green-deep ${className}`}
      style={{ ...dimension, fontSize: Math.max(11, size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}
