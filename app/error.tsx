'use client';

import { useEffect } from 'react';
import { TurtleLogo } from '@/components/brand/TurtleLogo';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="section flex min-h-dvh items-center justify-center py-20">
      <div className="card max-w-md p-10 text-center shadow-turtle">
        <div className="flex justify-center">
          <TurtleLogo size={56} />
        </div>
        <h1 className="display mt-6 text-3xl">Something cramped up</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          We hit an error loading this page. Give it another go — if it keeps happening, tell an
          admin in the WhatsApp group.
        </p>
        <button type="button" onClick={reset} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    </main>
  );
}
