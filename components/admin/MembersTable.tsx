'use client';

import { useMemo, useState, useTransition } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { setRoleAction } from '@/app/actions/members';
import { bibNumber } from '@/lib/club';
import { memberSince } from '@/lib/time';
import { LEVEL_LABEL, SPORT_EMOJI, SPORT_LABEL, type Profile } from '@/types';

export function MembersTable({ members, currentUserId }: { members: Profile[]; currentUserId: string }) {
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(term) ||
        SPORT_LABEL[member.sport].toLowerCase().includes(term) ||
        LEVEL_LABEL[member.level].toLowerCase().includes(term) ||
        bibNumber(member.id).includes(term),
    );
  }, [members, query]);

  function toggleRole(member: Profile) {
    const nextRole = member.role === 'admin' ? 'member' : 'admin';
    setPendingId(member.id);
    startTransition(async () => {
      const result = await setRoleAction(member.id, nextRole);
      toast(result.message, result.ok ? 'success' : 'error');
      setPendingId(null);
    });
  }

  return (
    <section aria-labelledby="members-title" className="card p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="members-title" className="display text-2xl">
            Members
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {members.length} on the roster · promote the people who publish sessions.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <label htmlFor="member-search" className="label">
            Search
          </label>
          <input
            id="member-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, sport, level or bib"
            className="field"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-ink-muted">
          No turtle matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="mt-5 -mx-2 overflow-x-auto px-2">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <caption className="sr-only">Club roster with roles</caption>
            <thead>
              <tr className="border-b border-hairline">
                {['Member', 'Sport', 'Level', 'Joined', 'Role', ''].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {filtered.map((member) => (
                <tr key={member.id}>
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} src={member.avatar_url} size={36} />
                      <div>
                        <p className="text-sm font-semibold">{member.name}</p>
                        <p className="display text-xs text-green-primary">#{bibNumber(member.id)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-sm text-ink-muted">
                    <span aria-hidden="true">{SPORT_EMOJI[member.sport]}</span>{' '}
                    {SPORT_LABEL[member.sport]}
                  </td>
                  <td className="py-3.5 text-sm text-ink-muted">{LEVEL_LABEL[member.level]}</td>
                  <td className="py-3.5 text-sm tabular-nums text-ink-muted">
                    {memberSince(member.joined_at)}
                  </td>
                  <td className="py-3.5">
                    <span className={member.role === 'admin' ? 'chip-green' : 'chip'}>
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      disabled={pendingId === member.id || member.id === currentUserId}
                      onClick={() => toggleRole(member)}
                      title={
                        member.id === currentUserId
                          ? 'You cannot change your own role'
                          : undefined
                      }
                      className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold transition-colors hover:border-green-primary/40 hover:text-green-deep disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {member.role === 'admin' ? 'Make member' : 'Make admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
