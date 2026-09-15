# Turtle Runners

The web app for **Turtle Runners**, a triathlon club (swim · bike · run) based at Durgam Cheruvu
Lake Front Park, Hyderabad.

A public landing page with a live countdown to the next session, a member dashboard, a profile
editor with a race-bib preview, and an admin console for events, members and testimonial
moderation.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase**, deployable to Vercel.

It runs two ways:

| Mode | What it uses | When to use it |
| --- | --- | --- |
| **Demo** (`NEXT_PUBLIC_DEMO=true`) | Seeded in-memory data, fake sign-in picker | Trying it out, design review, offline work |
| **Live** | Supabase Postgres + Google OAuth + RLS | Anything real |

If no Supabase keys are present, the app falls back to demo mode automatically rather than
crashing.

---

## 1. Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 20 or newer | `node -v` |
| npm | 10 or newer | ships with Node |
| Supabase account | — | free tier is enough ([supabase.com](https://supabase.com)) — **live mode only** |
| Supabase CLI | latest | `npm i -g supabase` — **live mode only** |
| Google Cloud account | — | for the OAuth client — **live mode only** |

---

## 2. Run it in demo mode (60 seconds, no accounts)

```bash
git clone <your-repo-url> turtle-runners
cd turtle-runners
npm install
cp .env.example .env.local     # already set to NEXT_PUBLIC_DEMO=true
npm run dev
```

Open <http://localhost:3000>.

Click **Sign in with Google** and you get a picker instead of Google:

- **Continue as Harsha (member)** → member dashboard, profile, RSVPs
- **Continue as admin** → everything above plus `/admin`

Demo data lives in memory on the server (`lib/demo/`), seeded with 1 admin, 8 members, the four
recurring weekly sessions, the next few weeks of events generated from them, eight weeks of
logged training per member, and 7 testimonials (5 approved, 2 waiting in the moderation queue).
Everything you change — RSVPs, logged sessions, new events, schedule edits, approvals, profile
edits — is real for the life of the process and resets when the dev server restarts.

> The SQL seed (`supabase/seed.sql`) is deliberately smaller and matches the club's actual starting
> state: 1 admin, 4 members, 3 events, 3 testimonials (1 approved, 2 pending).

---

## 3. Run it for real (Supabase)

### 3.1 Create the project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Pick a region close to Hyderabad (`ap-south-1`, Mumbai) and save the database password.
3. Once it is provisioned, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The anon key is *meant* to be public. Row Level Security is what protects the data — see
[§7 Security](#7-security-notes-read-this-one).

### 3.2 Fill in `.env.local`

```bash
NEXT_PUBLIC_DEMO=false
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3.3 Run the migration

Link the CLI to your project and push the schema:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

That applies both migrations in order.

`0001_init.sql`:

- the enums (`sport`, `level`, `user_role`, `event_type`, `testimonial_status`)
- the tables `profiles`, `events`, `rsvps`, `testimonials`
- `is_admin()`, the role-escalation guard, and the `handle_new_user()` signup trigger
- every RLS policy
- two read-only views (`public_testimonials`, `public_event_rsvp_counts`) so anonymous visitors
  can see approved quotes and RSVP head-counts without `profiles` being world-readable

`0002_sessions_and_schedule.sql`:

- `weekly_sessions` — the club's recurring rhythm, editable by admins from **Admin → Schedule**
- `sessions` — what members actually logged: sport, distance, duration, per member
- the `session_sport` enum, RLS for both tables, and `public_week_volume`, a third read-only view
  carrying this week's club totals and the member head-count, so the landing page can show both
  to signed-out visitors without exposing anyone's training log or the roster

`0003_session_locations.sql`:

- optional `lat` / `lng` on both `events` and `weekly_sessions`, so the map and the directions
  button point at the session's real meeting point rather than the club's home base
- approximate pins for the seeded recurring sessions, which admins can re-pin

Prefer working locally? `supabase start` then `supabase db reset` runs the migration **and** the
seed against a local Postgres.

### 3.4 Seed (optional, local only)

`supabase/seed.sql` inserts fake `auth.users` rows so its foreign keys resolve. That is fine
locally, and a bad idea on a hosted project.

```bash
supabase db reset          # local: migrations + seed, from scratch
```

On a hosted project, skip the seed: sign in with Google first, then promote yourself
([§5](#5-make-yourself-an-admin)).

---

## 4. Google OAuth

Three places have to agree: Google Cloud, Supabase, and your app URL.

### 4.1 Google Cloud Console

1. <https://console.cloud.google.com> → create (or pick) a project.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name `Turtle Runners`, support email, developer email
   - Scopes: the defaults (`email`, `profile`, `openid`) are all this app needs
   - While in *Testing*, add your own Google account under **Test users**
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorised JavaScript origins**
     ```
     http://localhost:3000
     https://your-app.vercel.app
     ```
   - **Authorised redirect URI** — this one points at *Supabase*, not at your app:
     ```
     https://<project-ref>.supabase.co/auth/v1/callback
     ```
4. Copy the **Client ID** and **Client secret**.

### 4.2 Supabase

1. Dashboard → **Authentication → Sign In / Providers → Google** → enable it.
2. Paste the Client ID and Client secret, save.
3. Dashboard → **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` (dev) or `https://your-app.vercel.app` (prod)
   - **Redirect URLs**: add both
     ```
     http://localhost:3000/**
     https://your-app.vercel.app/**
     ```

### 4.3 How the round-trip works

```
SignInButton  →  supabase.auth.signInWithOAuth({ provider: 'google',
                   redirectTo: `${origin}/auth/callback?next=/dashboard` })
              →  Google consent
              →  https://<ref>.supabase.co/auth/v1/callback
              →  /auth/callback (app/auth/callback/route.ts)
                   exchangeCodeForSession → sets the cookie
                   upserts a profiles row (name + avatar from Google)
              →  /dashboard
```

Anything that goes wrong lands on `/auth/error` with the reason spelled out.

### 4.4 Environment variables

| Variable | Required | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_DEMO` | no | `true` forces demo mode. Default when keys are absent. |
| `NEXT_PUBLIC_SUPABASE_URL` | live mode | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | live mode | anon/public key — safe in the browser |
| `NEXT_PUBLIC_SITE_URL` | no | Public origin. Vercel infers it if unset. |

There is **no service-role key anywhere in this project**, and there should never be one: every
privileged action is authorised by RLS against the signed-in user.

---

## 5. Make yourself an admin

Roles are not self-service — the `profiles_guard_role` trigger rejects any update where a
non-admin changes a `role`. The first admin is promoted by hand:

1. Sign in with Google once, so your `profiles` row exists.
2. Supabase dashboard → **SQL Editor**, then:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

3. Reload the app. An **Admin** link appears in the nav and `/admin` opens.

After that, admins promote and demote each other from **Admin → Members**. An admin cannot demote
themselves — promote someone else first, so the club is never left without one.

---

## 5a. Strava integration (optional)

Members can link their Strava account and have their runs, rides and swims imported straight into
their training log. The app runs perfectly well without this — the card simply says Strava is not
set up yet.

Setting it up is four steps.

### 5a.1 Register a Strava API application

1. Go to <https://www.strava.com/settings/api> while signed in to Strava.
2. Create an application. Name and icon are yours to choose.
3. Set **Authorization Callback Domain** to the *bare host only*, with no scheme and no path:

   | Where | Value |
   |---|---|
   | Local development | `localhost` |
   | Production | `turtle-runners.vercel.app` |

   Strava rejects `http://localhost:3000` and `https://turtle-runners.vercel.app/api/...` here. Host only.
4. Copy the **Client ID** and **Client Secret** from that page.

### 5a.2 Fill in the environment

Add three values to `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
```

The service role key is in the Supabase dashboard under **Project Settings → API → service_role**.

Two warnings about that key. It **bypasses Row Level Security entirely**, so it must never gain a
`NEXT_PUBLIC_` prefix and must never be committed. It exists here for one reason: OAuth tokens live
in a table that no browser is allowed to read, and reaching that table requires the service role.

Also confirm `NEXT_PUBLIC_SITE_URL` matches where the app actually runs. The Strava redirect URI is
built from it, so a stale value (`localhost:3000` while you run on `:3100`, say) sends members to
the wrong place after they approve, and the failure looks unrelated.

### 5a.3 Run the migration

```bash
supabase db push
```

`0004_strava.sql` adds the `strava_connections` table, plus `source` and `strava_activity_id`
columns on `sessions`. That last column carries a partial unique index, which is what makes
re-syncing idempotent rather than duplicating a member's whole history.

### 5a.4 Check it

Restart the dev server, open **/dashboard**, and the Strava card should offer **Connect with
Strava** instead of saying it is not configured. Connect once yourself before telling the club.

### What members see

Connecting is one button for them. The card walks them through the three steps, then:

- Only **runs, rides and swims** import. Walks, hikes, yoga and gym sessions are ignored.
- Imported activities feed their rings, their streak and the club's combined distance. Individual
  activities stay private to the member.
- **Disconnect** removes every imported session and leaves hand-logged ones untouched.

If the connection fails, the callback redirects back with a `?strava=` status and the card explains
what happened in plain language — cancelled, already linked to another member, expired link, and so
on.

### Rate limits

Strava caps requests per application, shared across all your members. Sync is member-triggered
rather than scheduled, and each run is capped, so usage stays proportional to real activity. A
member who hits the cap is told to wait rather than shown an error.

---

## 6. Deploy to Vercel

1. Push the repo to GitHub.
2. <https://vercel.com/new> → import it. Framework preset: **Next.js** (auto-detected). No build
   settings to change.
3. **Environment variables** — add for Production *and* Preview:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_DEMO=false
   ```
   (Or set `NEXT_PUBLIC_DEMO=true` on Preview only, to get a keyless demo on every PR.)
4. Deploy, then go back and finish the OAuth wiring with the real domain:
   - Google Cloud → add `https://your-app.vercel.app` to authorised origins
   - Supabase → **URL Configuration** → Site URL + `https://your-app.vercel.app/**`
5. Custom domain? Repeat step 4 with it, then set `NEXT_PUBLIC_SITE_URL`.

> **Demo mode in production:** the in-memory store is per serverless instance, so writes vanish
> when the instance recycles and are not shared between visitors. That is fine for a demo and
> useless for a club. Use Supabase for anything real.

---

## 7. Security notes (read this one)

**RLS is the security boundary. Everything in the UI is a convenience.**

- `/admin` checks `profile.role === 'admin'` so members get a friendly 403 instead of a broken
  page. That check is **cosmetic**. A member who forges the request still cannot write: the
  `events` insert/update/delete policies all require `public.is_admin()`, evaluated in Postgres
  against their own JWT.
- **Testimonials never auto-publish.** Members insert with a policy of
  `auth.uid() = user_id and status = 'pending'` — the status literal is in the `WITH CHECK`, so a
  crafted insert asking for `approved` is rejected by the database. Only `is_admin()` may update
  `status`. The public landing page reads `public_testimonials`, which filters to
  `status = 'approved'`.
- **Roles are not self-updatable.** Members may update their own profile row, but
  `profiles_guard_role` raises if `role` changed and the caller is not an admin.
- **RSVPs are yours alone.** Insert and delete both require `auth.uid() = user_id`; there is no
  update path, so nobody can RSVP on your behalf or cancel your spot.
- **`profiles` is members-only.** Anonymous visitors cannot read the roster. The two
  `security_invoker = off` views are the only exception, and they expose exactly two things: an
  approved quote with its author's display name, and a bare head-count per event.
- **Training logs are yours to write, the club's to see.** Members can read every session (that is
  what training together means) but insert, update and delete only rows where
  `auth.uid() = user_id`. Nobody can log a session on your behalf or delete one of yours.
- **The weekly schedule is public to read, admin-only to write.** It renders before sign-in, so
  the select policy allows `anon`; all three write policies require `public.is_admin()`.
- **The anon key is public by design.** It identifies the project, it does not authorise anything.
  Never add the service-role key to this app — it bypasses RLS completely.
- `is_admin()` and the trigger functions are `SECURITY DEFINER` with `search_path = public` pinned,
  so they cannot be hijacked by a shadowed schema.

### Verifying the policies

In the Supabase SQL editor you can impersonate a member and watch a write fail:

```sql
-- as a normal member's JWT, this returns 0 rows changed / raises
update public.testimonials set status = 'approved' where id = '<some-id>';
```

---

## 8. Project structure

```
app/
  layout.tsx                 fonts (Anton + Space Grotesk), metadata, ToastProvider
  page.tsx                   public landing page
  globals.css                design tokens, component classes, reduced-motion gate
  loading.tsx / error.tsx / not-found.tsx
  actions/                   server actions — the only place mutations start
    auth.ts  events.ts  members.ts  profile.ts  schedule.ts  sessions.ts
    testimonials.ts
  api/places/route.ts        admin-gated proxy for the location picker's search
  auth/callback/route.ts     OAuth code exchange + profile upsert
  auth/error/page.tsx
  dashboard/page.tsx         member dashboard (rings, streak, sessions, RSVPs, bib)
  profile/page.tsx           profile editor with live bib preview
  admin/
    layout.tsx               role gate + sidebar shell
    page.tsx                 KPIs + attendance chart
    events/  schedule/  members/  testimonials/

components/
  BibCard.tsx                race-bib member card
  RaceClock.tsx              LED countdown to the next session
  SignedOutPanel.tsx
  admin/                     AdminSidebar, EventsManager, ScheduleManager, LocationPicker,
                             MembersTable, TestimonialQueue, AttendanceChart
  auth/                      SignInButton (real OAuth + demo picker), UserMenu, GoogleMark
  brand/TurtleLogo.tsx       the shell SVG
  dashboard/                 LogSessionForm, SessionsTable, UpcomingList
  landing/                   Hero, Ticker, NextSessionCard, RsvpButton, UpcomingEvents,
                             WeeklySchedule, TrainingGrounds, ElevationLine, RouteLine,
                             StatsBand, NewHere, Voices, TestimonialForm, SiteFooter
  nav/                       SiteHeader, MobileNav
  profile/ProfileForm.tsx
  ui/                        Accordion, Avatar, CountUp, Drawer, ProgressRing, Reveal,
                             Skeleton, Toast

lib/
  data.ts                    ← the data access layer. Demo vs Supabase branches here, once.
  club.ts                    default schedule, routes, FAQs, bib-number hash, pace-group rule
                             (pure config — no imports, so it stays trivially testable)
  maps.ts                    pin parsing + keyless map embed / directions links
  places.ts                  place search provider (swap this one file for Google)
  time.ts                    IST-anchored date maths (UTC+5:30, no DST)
  stats.ts                   training analytics: volume, streaks, PBs, pace formatting
  action-result.ts           uniform { ok, message } for every action
  env.ts                     IS_DEMO / HAS_SUPABASE
  demo/                      fixtures.ts, store.ts (in-memory db), session.ts (cookie)
  supabase/                  client.ts (browser), server.ts (RSC + actions)

supabase/
  migrations/
    0001_init.sql            profiles, events, rsvps, testimonials, RLS, views
    0002_sessions_and_schedule.sql
                             weekly_sessions + sessions, RLS, club-volume view
    0003_session_locations.sql
                             optional lat/lng pins on events and weekly sessions
  seed.sql                   1 admin, 4 members, 3 events, 3 testimonials,
                             4 weekly sessions, 8 weeks of training history

types/                       index.ts (domain) · database.ts (Postgres schema)
public/routes/               downloadable GPX for the three training grounds
middleware.ts                refreshes the Supabase session cookie
```

### The one rule

`lib/data.ts` is the **only** module that imports Supabase or the demo store. Pages and actions
call `getUpcomingEvents()`, `toggleRsvp()`, `moderateTestimonial()` and never know which backend
answered. That is what makes `NEXT_PUBLIC_DEMO` a one-line switch instead of a fork.

---

## 8a. Where sessions meet

Each event and each recurring session carries an optional **pin** (`lat` / `lng`) alongside its
human-readable `location`. The map embed and the "Get directions" button resolve in this order
(`lib/maps.ts`):

1. the session's pin, if it has one — `?q=17.4239,78.3898`
2. otherwise a text search for its `location`, with "Hyderabad" appended when it is not already
   there, so "ORR service roads" resolves locally
3. otherwise the club's home base

**Setting a pin.** The admin event and schedule forms have a place search: start typing a venue
name, pick from the suggestions, and the display name and coordinates are both filled in. It is
keyboard-navigable (arrow keys, Enter, Escape) and shows a preview map before you save.

Search is served by [Photon](https://photon.komoot.io), an OpenStreetMap geocoder that needs **no
API key and no billing account** — the same reason the maps themselves are keyless embeds. Requests
go through `/api/places`, which is **admin-gated on purpose**: without that check the route would be
an open geocoding proxy running on your server's IP and quota. `lib/places.ts` is the only file that
knows which provider is in use.

> **Coverage trade-off.** OpenStreetMap is excellent for named venues, parks and stadiums, and
> weaker on small businesses than Google. If you need Google Places autocomplete instead, it is a
> billed API key plus a rewrite of `searchPlaces()` in `lib/places.ts` — nothing else changes,
> because the picker and the storage already speak `{ name, description, lat, lng }`. Self-hosting
> Photon is the other option if you outgrow the public instance's fair-use policy.

> **Privacy.** What an admin types into the search box is sent to the geocoder. Nothing else is —
> not the member roster, not the session, not the admin's IP (the request is made server-side).

You can also paste coordinates (`17.4239, 78.3898`) or a full Google Maps URL straight into the
search box — it is offered as a result of its own. Short `maps.app.goo.gl` links cannot be resolved
and are rejected with instructions. Clearing the box removes the pin, and the map falls back to
searching the location text.

Both admin lists show each session's pin (or "no pin") so you can see at a glance which ones still
need one. Editing a recurring session's pin does **not** rewrite events already published from it —
published events are independent once created.

## 9. Design system

Defined once in `tailwind.config.ts` and `app/globals.css`.

- **Type** — `Anton` for display headings (always uppercase, `line-height: 0.95`),
  `Space Grotesk` for everything else.
- **Paper** `#FAFDFB` under soft radial green washes.
  **Ink** `#0A0F0C`, muted `#5C6B62`, hairlines `#E2EAE5`.
- **Greens** — primary `#12A150`, bright `#2ED573`, deep `#0B6B36`, forest `#0A3D22`,
  tint `#E3F5EB`. Accent gradient `linear-gradient(135deg,#12A150,#0B6B36)`; dark sections use
  `linear-gradient(165deg,#0A0F0C,#0E2417,#0A3D22)`, which reads as pre-dawn light.
- **Shadows** are green-tinted: `0 14px 34px rgba(18,161,80,0.16)`.
- **Signature elements** — the race clock (bright green LED digits with a green glow), the race-bib
  member card (striped tape, Anton bib number derived from the user id), the turtle-shell logo, and
  the animated dashed route line in the hero.
- **Motion** — hero lines rise in staggered on load; sections fade up on scroll via
  `IntersectionObserver` with ~80 ms stagger; stat numbers count up with ease-out cubic; cards lift
  with a green shadow and an accent bar that scales in from the left; progress rings animate
  `stroke-dashoffset`. All of it is gated behind `prefers-reduced-motion: reduce`.

---

## 10. Scripts

```bash
npm run dev         # dev server on :3000
npm run build       # production build
npm start           # serve the production build
npm run typecheck   # tsc --noEmit (strict, noUncheckedIndexedAccess)
```

---

## 11. Known gaps / what's next

- **Training data is entered by hand.** Members log each session from the dashboard; there is no
  Strava sync. The `sessions` table and `lib/stats.ts` are shaped so a sync could write into the
  same rows later without touching the UI.
- **Weekly sessions do not auto-publish.** The recurring schedule drives the landing page and the
  countdown fallback, but an admin still creates each event row members RSVP to. A `pg_cron` job
  materialising the next four weeks would remove that chore — deliberately left out for now so
  publishing stays a decision.
- **PBs are coarse.** "Longest run" and "Fastest 5K+" are derived from whole sessions, not from
  splits, so a fast 5K inside a long run does not count. Real segment PBs need per-kilometre data.
- **No drag-the-marker picker.** You search and select rather than dragging a pin, because a
  draggable map needs a billed Maps JavaScript API key. Pasting exact coordinates covers the case
  where the meeting point has no name.
- **The ORR meeting point is approximate.** The stadium and the lake are geocoded; "ORR service
  roads" is not a single place, so its pin is a judgement call. Re-pin it to wherever the group
  actually gathers.
- **Club links** in `lib/club.ts` point at the real accounts: Strava (`strava.com/clubs/2337097`),
  Instagram (`@turtlerunnersclub`) and the WhatsApp group invite. If the group's invite link is
  reset in WhatsApp, update it there. The three GPX files in `public/routes/` are plausible but
  invented; replace them with real recorded tracks.
