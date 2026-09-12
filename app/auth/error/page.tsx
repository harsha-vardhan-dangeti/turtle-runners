import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { TurtleLogo } from '@/components/brand/TurtleLogo';

export const metadata: Metadata = { title: 'Sign-in problem' };

const REASONS: Record<string, string> = {
  'not-configured':
    'This deployment has no Supabase keys, so Google sign-in is switched off. Run it in demo mode instead.',
  'missing-code': 'Google sent us back without an authorisation code. Try signing in again.',
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = (reason && REASONS[reason]) || reason || 'Something interrupted the sign-in.';

  return (
    <>
      <SiteHeader />
      <main id="main" className="section flex min-h-[60vh] items-center justify-center py-20">
        <div className="card w-full max-w-md p-8 text-center shadow-turtle">
          <div className="flex justify-center">
            <TurtleLogo size={52} />
          </div>
          <h1 className="display mt-5 text-3xl">Sign-in didn&apos;t finish</h1>
          <p className="mt-3 break-words text-sm leading-relaxed text-ink-muted">{message}</p>
          <Link href="/" className="btn-primary mt-6">
            Back to the club
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
