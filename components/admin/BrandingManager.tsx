'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { LogoMark } from '@/components/brand/LogoMark';
import { useToast } from '@/components/ui/Toast';
import {
  removeLogoAction,
  setCustomLogoAction,
  uploadLogoAction,
} from '@/app/actions/branding';
import type { ClubBranding } from '@/types';

/** Mirrors the server-side checks in app/actions/branding.ts. */
const ACCEPT = 'image/png,image/jpeg,image/webp';
const MAX_BYTES = 2 * 1024 * 1024;

const DEFAULT_MARK: ClubBranding = { useCustomLogo: false, logoUrl: null };

export function BrandingManager({ branding }: { branding: ClubBranding }) {
  const [chosen, setChosen] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  // Object URLs hold the file in memory until revoked.
  useEffect(() => {
    if (!chosen) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(chosen);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [chosen]);

  const hasLogo = Boolean(branding.logoUrl);
  const uploaded: ClubBranding = { useCustomLogo: true, logoUrl: branding.logoUrl };
  const pendingPreview: ClubBranding = { useCustomLogo: true, logoUrl: previewUrl };
  // What visitors see right now: the uploaded logo only when it is switched on.
  const live = branding.useCustomLogo && hasLogo ? uploaded : DEFAULT_MARK;

  function clearChoice() {
    setChosen(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function onChoose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return clearChoice();

    if (!ACCEPT.split(',').includes(file.type)) {
      toast('Use a PNG, JPG or WebP image.', 'error');
      return clearChoice();
    }
    if (file.size > MAX_BYTES) {
      toast('That image is over 2 MB. Try a smaller export.', 'error');
      return clearChoice();
    }
    setChosen(file);
  }

  function onUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chosen) return;
    const formData = new FormData();
    formData.set('logo', chosen);

    startTransition(async () => {
      const result = await uploadLogoAction(formData);
      toast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) clearChoice();
    });
  }

  function onToggle() {
    const next = !branding.useCustomLogo;
    startTransition(async () => {
      const result = await setCustomLogoAction(next);
      toast(result.message, result.ok ? 'success' : 'error');
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeLogoAction();
      toast(result.message, result.ok ? 'success' : 'error');
      setConfirmingRemove(false);
    });
  }

  return (
    <div className="space-y-5">
      <section aria-labelledby="branding-title" className="card p-6">
        <h2 id="branding-title" className="display text-2xl">
          Club logo
        </h2>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">
          Upload the Turtle Runners logo and it replaces the default mark in the header, the footer
          and the sign-in panels straight away. Switch it off any time to go back.
        </p>

        {/* The switch */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline bg-white px-5 py-4">
          <div className="min-w-0">
            <p id="logo-switch-label" className="text-sm font-semibold">
              Use the club logo across the site
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {hasLogo
                ? branding.useCustomLogo
                  ? 'On. Visitors see your uploaded logo.'
                  : 'Off. Visitors see the default mark. Switch on to show your uploaded logo.'
                : 'Upload a logo below to enable this.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={branding.useCustomLogo}
            aria-labelledby="logo-switch-label"
            disabled={!hasLogo || pending}
            onClick={onToggle}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 ease-turtle disabled:cursor-not-allowed disabled:opacity-40 ${
              branding.useCustomLogo ? 'bg-green-primary' : 'bg-hairline'
            }`}
          >
            <span
              aria-hidden="true"
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-turtle ${
                branding.useCustomLogo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* What is live, on both backgrounds the logo sits on */}
        <div className="mt-5">
          <p className="label">Live on the site now</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-hairline bg-paper px-4 py-3">
              <LogoMark branding={live} size={32} />
              <span className="display text-xl leading-none">
                Turtle<span className="text-gradient"> Runners</span>
              </span>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Header
              </span>
            </div>
            <div className="dark-section flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3 text-white">
              <LogoMark branding={live} size={40} />
              <span className="display text-xl">Turtle Runners</span>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Footer
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="upload-title" className="card p-6">
        <h2 id="upload-title" className="display text-2xl">
          {hasLogo ? 'Replace the logo' : 'Upload the logo'}
        </h2>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">
          PNG, JPG or WebP, up to 2 MB. A square image of at least 512 × 512 px looks sharpest;
          a transparent PNG sits best on both the light header and the dark footer. Uploading puts
          it live straight away.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
          <div className="grid grid-cols-2 gap-3">
            <figure className="flex flex-col items-center gap-2">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-hairline bg-white">
                <LogoMark branding={DEFAULT_MARK} size={64} />
              </div>
              <figcaption className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Default
              </figcaption>
            </figure>
            <figure className="flex flex-col items-center gap-2">
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-2xl border bg-white ${
                  previewUrl || hasLogo ? 'border-hairline' : 'border-dashed border-hairline'
                }`}
              >
                {previewUrl ? (
                  <LogoMark branding={pendingPreview} size={72} />
                ) : hasLogo ? (
                  <LogoMark branding={uploaded} size={72} />
                ) : (
                  <span className="px-2 text-center text-[11px] text-ink-muted">No logo yet</span>
                )}
              </div>
              <figcaption className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                {previewUrl ? 'New, not saved' : 'Club logo'}
              </figcaption>
            </figure>
          </div>

          <form onSubmit={onUpload} className="space-y-3">
            <label htmlFor="logo-file" className="label">
              Image file
            </label>
            <input
              ref={inputRef}
              id="logo-file"
              name="logo"
              type="file"
              accept={ACCEPT}
              onChange={onChoose}
              disabled={pending}
              className="field file:mr-3 file:rounded-full file:border-0 file:bg-green-tint file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-green-deep"
            />
            {chosen ? (
              <p className="text-xs text-ink-muted">
                {chosen.name} · {(chosen.size / 1024).toFixed(0)} KB
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={!chosen || pending} className="btn-primary">
                {pending && chosen ? 'Uploading…' : hasLogo ? 'Upload replacement' : 'Upload logo'}
              </button>
              {chosen ? (
                <button type="button" onClick={clearChoice} disabled={pending} className="btn-ghost">
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>

        {hasLogo ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
            {confirmingRemove ? (
              <>
                <p className="text-sm text-ink-muted">
                  Delete the uploaded logo and go back to the default mark?
                </p>
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={pending}
                  className="rounded-full bg-[#8B1D1D] px-4 py-2 text-xs font-semibold text-white"
                >
                  Remove logo
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingRemove(false)}
                  className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-ink-muted"
                >
                  Keep it
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingRemove(true)}
                disabled={pending}
                className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-[#8B1D1D]/40 hover:text-[#8B1D1D]"
              >
                Remove uploaded logo
              </button>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
