'use client';

import { useEffect, useState, useTransition } from 'react';
import { GoogleMark } from '@/components/auth/GoogleMark';
import { useToast } from '@/components/ui/Toast';
import { demoSignInAction } from '@/app/actions/auth';
import { IS_DEMO } from '@/lib/env';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface SignInButtonProps {
  tone?: 'light' | 'dark';
  label?: string;
  className?: string;
}

/**
 * Real Google OAuth when Supabase is configured; a two-person picker in demo
 * mode so the whole app can be walked through without any keys.
 */
export function SignInButton({
  tone = 'light',
  label = 'Sign in with Google',
  className = '',
}: SignInButtonProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!pickerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [pickerOpen]);

  const buttonClass =
    tone === 'dark'
      ? `btn-dark ${className}`
      : `btn border border-hairline bg-white text-ink shadow-sm hover:-translate-y-0.5 hover:border-green-primary/40 hover:shadow-turtle ${className}`;

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error) {
      setLoading(false);
      toast(error instanceof Error ? error.message : 'Could not start sign-in.', 'error');
    }
  }

  if (!IS_DEMO) {
    return (
      <button type="button" onClick={signInWithGoogle} disabled={loading} className={buttonClass}>
        <GoogleMark />
        {loading ? 'Opening Google…' : label}
      </button>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setPickerOpen(true)} className={buttonClass}>
        <GoogleMark />
        {label}
      </button>

      {pickerOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close sign-in"
            onClick={() => setPickerOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-signin-title"
            className="relative w-full max-w-sm rounded-2xl border border-hairline bg-white p-6 shadow-turtle-lg animate-rise"
          >
            <p className="eyebrow">Demo mode</p>
            <h2 id="demo-signin-title" className="display mt-2 text-2xl">
              Who are you today?
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              No Supabase keys are configured, so Google sign-in is stubbed out. Pick a seeded
              account — the data lives in memory and resets when the server restarts.
            </p>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => demoSignInAction('member'))}
                className="btn-primary w-full"
              >
                Continue as Harsha (member)
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => demoSignInAction('admin'))}
                className="btn-ghost w-full"
              >
                Continue as admin
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
