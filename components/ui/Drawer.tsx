'use client';

import { useEffect, useRef } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** Right-hand slide-over used by the admin event form. */
export function Drawer({ open, onClose, title, description, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const firstField = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button',
    );
    firstField?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-hairline bg-white shadow-turtle-lg animate-rise"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-hairline bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <h2 className="display text-2xl">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-ink-muted">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-hairline px-3 py-1 text-sm text-ink-muted transition-colors hover:border-green-primary/40 hover:text-ink"
          >
            Close
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
