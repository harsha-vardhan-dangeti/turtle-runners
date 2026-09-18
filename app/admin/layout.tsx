import type { Metadata } from 'next';
import Link from 'next/link';
import { SignedOutPanel } from '@/components/SignedOutPanel';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { getCurrentProfile, getPendingTestimonialCount } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Club operations: events, members and testimonial moderation.',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <>
        <SiteHeader variant="app" />
        <main id="main">
          <SignedOutPanel
            title="Admin area"
            message="Sign in with an admin account to manage events, members and testimonials."
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  // UX only. The real gate is RLS: a member's session simply cannot write
  // events or update a testimonial status, whatever the UI lets them click.
  if (profile.role !== 'admin') {
    return (
      <>
        <SiteHeader variant="app" />
        <main id="main" className="section flex min-h-[60vh] items-center justify-center py-20">
          <div className="card max-w-md p-8 text-center shadow-turtle">
            <p className="display text-6xl text-gradient">403</p>
            <h1 className="display mt-3 text-3xl">Admins only, sorry</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              This corner is for the folks who publish the sessions. Everything you actually need is
              on your dashboard — including the bib.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/dashboard" className="btn-primary">
                Back to my dashboard
              </Link>
              <Link href="/" className="btn-ghost">
                Club home
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const pendingCount = await getPendingTestimonialCount();

  return (
    <>
      <SiteHeader variant="app" />

      <main id="main" className="section py-8 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Club operations</p>
            <h1 className="display mt-2 text-4xl sm:text-5xl">Admin</h1>
          </div>
          <p className="text-sm text-ink-muted">
            Signed in as <span className="font-semibold text-ink">{profile.name}</span>
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
          <AdminSidebar pendingCount={pendingCount} />
          <div className="min-w-0">{children}</div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
