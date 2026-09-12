import type { Metadata } from 'next';
import { SignedOutPanel } from '@/components/SignedOutPanel';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/nav/SiteHeader';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { getCurrentProfile } from '@/lib/data';
import { memberSince } from '@/lib/time';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your sport, your level and the race you are chasing.',
};

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <>
        <SiteHeader variant="app" />
        <main id="main">
          <SignedOutPanel
            title="Your profile"
            message="Sign in with Google to set your sport, level and goal race."
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader variant="app" />

      <main id="main" className="section py-10 sm:py-14">
        <div className="max-w-2xl">
          <p className="eyebrow">Turtle since {memberSince(profile.joined_at)}</p>
          <h1 className="display mt-2 text-[clamp(2.4rem,7vw,4.5rem)]">
            {profile.name}
          </h1>
          <p className="mt-3 text-ink-muted">
            This is what the club sees on your bib. Change it whenever your season changes — admins
            edit theirs on this exact page too.
          </p>
        </div>

        <div className="mt-10">
          <ProfileForm profile={profile} />
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
