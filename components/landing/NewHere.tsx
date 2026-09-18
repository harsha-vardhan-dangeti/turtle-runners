import { SignInButton } from '@/components/auth/SignInButton';
import { Accordion } from '@/components/ui/Accordion';
import { Reveal } from '@/components/ui/Reveal';
import { FAQS } from '@/lib/club';

/** The three questions everyone asks before their first Sunday. */
export function NewHere({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="new-here" aria-labelledby="new-here-title" className="section py-20 sm:py-28">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <Reveal>
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">New here?</p>
            <h2 id="new-here-title" className="display mt-3 text-4xl sm:text-6xl">
              Nobody starts <span className="text-gradient">good.</span>
            </h2>
            <p className="mt-4 text-ink-muted">
              Every turtle in this club had a first session where they had no idea what they were
              doing. Come find out what yours looks like.
            </p>
            {!signedIn ? (
              <div className="mt-6">
                <SignInButton label="Join the club" />
              </div>
            ) : null}
          </div>
        </Reveal>

        <Reveal index={1}>
          <Accordion items={FAQS} />
        </Reveal>
      </div>
    </section>
  );
}
