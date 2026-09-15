'use client';

import { useState } from 'react';

const MAX_GROUPS = 8;

interface Row {
  key: number;
  name: string;
  limit: string;
}

/**
 * Pace groups as rows of name + places, submitted as pace_group_name_N and
 * pace_group_limit_N. Mounted fresh each time the schedule drawer opens, so
 * its state always starts from the session being edited.
 */
export function PaceGroupEditor({
  groups,
  limits,
}: {
  groups: string[];
  limits: Record<string, number>;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    groups.map((name, index) => ({ key: index, name, limit: limits[name] ? String(limits[name]) : '' })),
  );
  const [nextKey, setNextKey] = useState(groups.length);

  function update(key: number, patch: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function add() {
    setRows((current) => [...current, { key: nextKey, name: '', limit: '' }]);
    setNextKey((key) => key + 1);
  }

  function remove(key: number) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  return (
    <fieldset>
      <legend className="label">Pace groups</legend>
      <p className="mb-2 text-xs text-ink-muted">
        Slowest first. Places are optional: leave blank for no limit. Members pick a group when
        they RSVP, and a full group closes while the others stay open.
      </p>

      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-2">
              <input
                name={`pace_group_name_${index}`}
                value={row.name}
                onChange={(event) => update(row.key, { name: event.target.value })}
                maxLength={60}
                placeholder="6:30+ /km"
                aria-label={`Pace group ${index + 1} name`}
                className="field"
              />
              <input
                name={`pace_group_limit_${index}`}
                value={row.limit}
                onChange={(event) => update(row.key, { limit: event.target.value.replace(/[^\d]/g, '') })}
                inputMode="numeric"
                placeholder="∞"
                aria-label={`Places in pace group ${index + 1}`}
                className="field text-center"
              />
              <button
                type="button"
                onClick={() => remove(row.key)}
                aria-label={`Remove pace group ${index + 1}`}
                className="rounded-full border border-hairline px-3 py-2 text-xs font-semibold text-ink-muted hover:border-[#8B1D1D]/40 hover:text-[#8B1D1D]"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-hairline px-4 py-3 text-xs text-ink-muted">
          No pace groups. Fine for a social: members just say they are coming.
        </p>
      )}

      {rows.length < MAX_GROUPS ? (
        <button type="button" onClick={add} className="btn-ghost mt-2.5 px-4 py-2 text-xs">
          <span aria-hidden="true">＋</span> Add a pace group
        </button>
      ) : null}
      <p className="mt-1.5 text-[11px] text-ink-muted">
        Renaming or removing a group moves anyone already in it to &ldquo;no group&rdquo;.
      </p>
    </fieldset>
  );
}
