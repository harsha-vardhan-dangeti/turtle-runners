# Strava integration — design

**Date:** 2026-09-12
**Status:** approved, ready for implementation

## Goal

Let a Turtle Runners member connect their Strava account, pull their activities
into the club's existing training log, and see their Strava standing on the
dashboard.

## Decisions taken

| Question | Decision |
|---|---|
| Relationship to the manual log | Import into the existing `sessions` table |
| Sync trigger | On demand via a button, plus a stale check on dashboard load |
| Visibility | Private to the member; public club stats are unaffected |
| Dashboard surface | Connection card, recent activities, year-to-date totals, gear and bests |

## Security model

This is the part of the design that constrains everything else.

The app talks to Supabase with the anon key under Row Level Security. That is
correct for sessions and testimonials, where the member is allowed to read their
own rows. It is **wrong for OAuth tokens**: a policy letting a member select
their own connection row would put a live Strava bearer token where any script
on the page can read it.

Therefore:

- `strava_connections` has RLS enabled and **no policies whatsoever**, which
  makes it unreachable from the browser and from the anon key entirely.
- All access goes through a server-only admin client using
  `SUPABASE_SERVICE_ROLE_KEY`.
- The dashboard is handed only safe display fields. Tokens never cross the
  server boundary.

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It must never carry a `NEXT_PUBLIC_`
prefix, and the admin client must never be imported by a client component.

## Schema

New table:

```
strava_connections
  user_id         uuid primary key -> profiles(id) on delete cascade
  athlete_id      bigint not null unique
  athlete_name    text
  athlete_avatar  text
  access_token    text not null
  refresh_token   text not null
  expires_at      timestamptz not null
  scope           text not null
  last_synced_at  timestamptz
  created_at      timestamptz not null default now()
```

Two columns added to `sessions`:

- `source text not null default 'manual'` constrained to `manual` or `strava`.
- `strava_activity_id bigint` with a **partial unique index** where not null.

The partial unique index is what makes re-syncing idempotent. Without it every
sync duplicates every activity.

## OAuth flow

1. `GET /api/strava/connect` requires a session, generates a random `state`
   nonce, stores it in an httpOnly cookie, and redirects to Strava.
2. `GET /api/strava/callback` compares `state` against that cookie **before**
   exchanging the code. This is the CSRF protection for the flow and is the
   step most often omitted.
3. Tokens are upserted and the member returns to the dashboard.

Requested scope is `read,activity:read_all`, which includes activities the
member has marked private. `activity:read` would cover public activities only.

## Token refresh

Strava access tokens expire roughly every six hours, so refresh is not optional.

One wrapper owns it. Before any call it refreshes when expiry is within a small
margin and persists the new pair. On a 401 it refreshes once and retries. On a
429 it raises a readable rate-limit message rather than a stack trace.

## Sync

A server action, capped at a few hundred recent activities per run, fetching
activities after the last sync point.

Mapping rules:

- Run, TrailRun, VirtualRun map to `run`.
- Ride, VirtualRide, GravelRide, MountainBikeRide, EBikeRide map to `bike`.
- Swim maps to `swim`.
- Everything else is skipped. Walks, hikes, yoga and weight training are not
  triathlon volume.
- Activities with no distance or no moving time are skipped, because they would
  violate the existing check constraints on `sessions`.

Distance is stored in metres and duration in seconds, matching the existing
column contract. The date comes from the activity's local start date, not UTC,
so an early morning session lands on the right day in IST.

## Personal bests — known gap

Strava exposes no clean personal-records endpoint. Real segment records require
a call per activity, which would exhaust the rate limit quickly.

So bests come from two places: genuine records from the athlete stats endpoint
(biggest ride, biggest climb), and bests derived locally from activities already
synced. The member gets personal bests, but not Strava's segment crowns. This
was flagged and accepted.

## Demo mode

Demo mode gets a fixture connection and fixture activities, so the feature is
fully demoable with no Strava credentials and no network.

## Rate limits

Strava applies both a short-window and a daily cap per application, shared
across all members. Sync is capped per run and is user-triggered rather than
scheduled, which keeps usage proportional to real activity.

## Files

- `supabase/migrations/0004_strava.sql`
- `lib/supabase/admin.ts` — server-only service role client
- `lib/strava/types.ts`, `lib/strava/client.ts`, `lib/strava/map.ts`
- `app/api/strava/connect/route.ts`, `app/api/strava/callback/route.ts`
- `app/actions/strava.ts` — sync and disconnect
- `components/dashboard/StravaCard.tsx` and supporting components
- `lib/data.ts`, `types/index.ts`, `types/database.ts`, `lib/env.ts`,
  `.env.example`, demo fixtures, dashboard page

## Verification boundary

The mapping, schema, demo path and types are testable here. A live OAuth round
trip is not: it needs real credentials and outbound network, which this
environment does not have. The real handshake must be confirmed by the user.
