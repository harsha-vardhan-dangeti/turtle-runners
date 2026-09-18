'use client';

import { useState, useTransition } from 'react';
import { BibCard } from '@/components/BibCard';
import { useToast } from '@/components/ui/Toast';
import { updateProfileAction } from '@/app/actions/profile';
import {
  LEVELS,
  LEVEL_LABEL,
  SPORTS,
  SPORT_EMOJI,
  SPORT_LABEL,
  type Level,
  type Profile,
  type Sport,
} from '@/types';

/** Edit the three fields that shape a bib, with the bib updating as you type. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const [sport, setSport] = useState<Sport>(profile.sport);
  const [level, setLevel] = useState<Level>(profile.level);
  const [goal, setGoal] = useState(profile.goal ?? '');
  const [onBoard, setOnBoard] = useState(profile.show_on_leaderboard);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  const dirty =
    sport !== profile.sport ||
    level !== profile.level ||
    (goal.trim() || null) !== profile.goal ||
    onBoard !== profile.show_on_leaderboard;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      toast(result.message, result.ok ? 'success' : 'error');
    });
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
      <form onSubmit={onSubmit} className="card p-6 sm:p-8">
        <fieldset>
          <legend className="label">Primary sport</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {SPORTS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-3 py-3.5 text-center text-sm font-semibold transition-all duration-300 ease-turtle ${
                  sport === option
                    ? 'border-green-primary bg-green-tint text-green-deep shadow-turtle'
                    : 'border-hairline bg-white text-ink-muted hover:border-green-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="sport"
                  value={option}
                  checked={sport === option}
                  onChange={() => setSport(option)}
                  className="sr-only"
                />
                <span aria-hidden="true" className="text-xl leading-none">
                  {SPORT_EMOJI[option]}
                </span>
                {SPORT_LABEL[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-7">
          <legend className="label">Where you are right now</legend>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {LEVELS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-300 ease-turtle ${
                  level === option
                    ? 'border-green-primary bg-green-tint text-green-deep shadow-turtle'
                    : 'border-hairline bg-white text-ink-muted hover:border-green-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="level"
                  value={option}
                  checked={level === option}
                  onChange={() => setLevel(option)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    level === option ? 'bg-green-primary' : 'bg-hairline'
                  }`}
                />
                {LEVEL_LABEL[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-7">
          <label htmlFor="goal" className="label">
            Goal race <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="goal"
            name="goal"
            type="text"
            maxLength={120}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="IRONMAN 70.3 Goa, Hyderabad Marathon, first 5K…"
            className="field"
          />
        </div>

        <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-white px-4 py-3.5">
          <input
            type="checkbox"
            name="show_on_leaderboard"
            checked={onBoard}
            onChange={(event) => setOnBoard(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#12A150]"
          />
          <span>
            <span className="block text-sm font-semibold">Show me on the club leaderboard</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
              Other members see your name with this month&apos;s run, ride and swim totals and how many
              weeks you trained. Your individual sessions stay private either way — visible only to
              you and the club&apos;s admins.
            </span>
          </span>
        </label>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || !dirty} className="btn-primary">
            {pending ? 'Saving…' : 'Save profile'}
          </button>
          {dirty ? <p className="text-xs text-ink-muted">Unsaved changes</p> : null}
        </div>
      </form>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <p className="label">Your bib</p>
        <BibCard
          id={profile.id}
          name={profile.name}
          sport={sport}
          level={level}
          goal={goal.trim() || null}
          role={profile.role}
        />
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Your bib number comes from your account id — it never changes, however many times you
          switch sports.
        </p>
      </div>
    </div>
  );
}
