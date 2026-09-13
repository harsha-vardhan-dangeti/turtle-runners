import { Hero } from '@/components/landing/Hero';
import { NewHere } from '@/components/landing/NewHere';
import { NextSessionCard } from '@/components/landing/NextSessionCard';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { StatsBand } from '@/components/landing/StatsBand';
import { Ticker } from '@/components/landing/Ticker';
import { TrainingGrounds } from '@/components/landing/TrainingGrounds';
import { UpcomingEvents } from '@/components/landing/UpcomingEvents';
import { Voices } from '@/components/landing/Voices';
import { WeeklySchedule } from '@/components/landing/WeeklySchedule';
import { SiteHeader } from '@/components/nav/SiteHeader';
import {
  getApprovedTestimonials,
  getClubStats,
  getCurrentProfile,
  getMyTestimonials,
  getTrainingGrounds,
  getUpcomingEvents,
  getWeeklySchedule,
} from '@/lib/data';

export default async function LandingPage() {
  const [profile, upcoming, testimonials, mine, stats, schedule, grounds] = await Promise.all([
    getCurrentProfile(),
    getUpcomingEvents(4),
    getApprovedTestimonials(),
    getMyTestimonials(),
    getClubStats(),
    getWeeklySchedule(),
    getTrainingGrounds(),
  ]);

  const [nextEvent, ...rest] = upcoming;
  const signedIn = Boolean(profile);

  return (
    <>
      <SiteHeader />

      <main id="main">
        <Hero />
        <Ticker schedule={schedule} />

        <div className="section pt-16 sm:pt-20">
          <NextSessionCard event={nextEvent ?? null} signedIn={signedIn} schedule={schedule} />
          <UpcomingEvents events={rest} signedIn={signedIn} />
        </div>

        <WeeklySchedule schedule={schedule} />
        <TrainingGrounds grounds={grounds} />
        <StatsBand stats={stats} />
        <NewHere signedIn={signedIn} />
        <Voices testimonials={testimonials} mine={mine} signedIn={signedIn} />
      </main>

      <SiteFooter />
    </>
  );
}
