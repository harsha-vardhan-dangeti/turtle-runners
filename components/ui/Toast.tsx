'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type Tone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastContextValue {
  toast: (message: string, tone?: Tone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Every mutation in the app reports through this. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

const TONE_STYLES: Record<Tone, string> = {
  success: 'border-green-primary/40 bg-green-forest text-white',
  error: 'border-red-300 bg-[#3B0D0D] text-white',
  info: 'border-white/20 bg-ink text-white',
};

const TONE_ICON: Record<Tone, string> = {
  success: '✓',
  error: '!',
  info: 'i',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, tone: Tone = 'success') => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current, { id, message, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-turtle-lg animate-toast-in ${TONE_STYLES[item.tone]}`}
          >
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-bright text-xs font-bold text-ink"
            >
              {TONE_ICON[item.tone]}
            </span>
            <span>{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
