import { SignInButton } from '@/components/auth/SignInButton';
import { TestimonialForm } from '@/components/landing/TestimonialForm';
import { Avatar } from '@/components/ui/Avatar';
import { Reveal } from '@/components/ui/Reveal';
import type { Testimonial, TestimonialWithAuthor } from '@/types';

interface VoicesProps {
  testimonials: TestimonialWithAuthor[];
  mine: Testimonial[];
  signedIn: boolean;
}

const STATUS_COPY: Record<string, string> = {
  pending: 'Waiting for an admin to review',
  approved: 'Published',
  rejected: 'Not published',
};

export function Voices({ testimonials, mine, signedIn }: VoicesProps) {
  const pendingMine = mine.filter((item) => item.status !== 'approved');

  return (
    <section id="voices" aria-labelledby="voices-title" className="section py-20 sm:py-28">
      <Reveal>
        <p className="eyebrow">Turtle voices</p>
        <h2 id="voices-title" className="display mt-3 max-w-3xl text-4xl sm:text-6xl">
          In their <span className="text-gradient">own words.</span>
        </h2>
      </Reveal>

      {testimonials.length === 0 ? (
        <Reveal index={1}>
          <div className="mt-10 card border-dashed p-10 text-center">
            <p className="display text-2xl">No quotes published yet</p>
            <p className="mt-2 text-sm text-ink-muted">
              Members can submit theirs below — an admin approves them before they appear here.
            </p>
          </div>
        </Reveal>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal as="li" key={testimonial.id} index={index % 3} className="h-full">
              <figure className="card card-hover flex h-full flex-col p-6">
                <span aria-hidden="true" className="display text-4xl leading-none text-green-tint">
                  &ldquo;
                </span>
                <blockquote className="-mt-3 flex-1 text-[15px] leading-relaxed text-ink">
                  {testimonial.text}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-hairline pt-4">
                  <Avatar name={testimonial.author_name} src={testimonial.author_avatar} size={40} />
                  <div>
                    <p className="text-sm font-semibold">{testimonial.author_name}</p>
                    <p className="text-xs text-ink-muted">{testimonial.author_role_label}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      )}

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Reveal>
          {signedIn ? (
            <TestimonialForm />
          ) : (
            <div className="card flex flex-col items-start gap-4 p-6">
              <div>
                <p className="display text-2xl">Been training with us?</p>
                <p className="mt-2 text-sm text-ink-muted">
                  Sign in and tell the next beginner what it was actually like.
                </p>
              </div>
              <SignInButton label="Sign in to add yours" />
            </div>
          )}
        </Reveal>

        {pendingMine.length > 0 ? (
          <Reveal index={1}>
            <div className="card p-6">
              <p className="label">Your submissions</p>
              <ul className="mt-2 divide-y divide-hairline">
                {pendingMine.map((item) => (
                  <li key={item.id} className="py-3">
                    <p className="text-sm text-ink">{item.text}</p>
                    <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-green-deep">
                      {STATUS_COPY[item.status]}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
