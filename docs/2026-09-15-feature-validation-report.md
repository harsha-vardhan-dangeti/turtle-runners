# Turtle Runners — feature validation report

**Date:** 2026-09-15
**Scope:** Every feature on the live site (https://turtle-runners.vercel.app), plus the one feature still to build: weekly session RSVP.
**Status:** B1, B2 and B3 are fixed in code (uncommitted, verified in demo mode; see each item). B2's migration `0010` is **not yet applied to production**. Everything else is findings only and waits for your go-ahead.

---

## 1. How this was checked

| Check | Result |
|---|---|
| `tsc --noEmit` | Pass |
| `next build` (production) | Pass, all 19 routes compile |
| Live site route probe (`/`, `/dashboard`, `/profile`, `/admin/*`, `/api/*`, GPX files, 404) | All return the expected status |
| Live Supabase, read-only anon queries | Migrations up to `0009` are applied. `session_rsvps` does not exist |
| Demo mode in a browser (member and admin) | Walked through sign-in, RSVP, logging a session, sign-out, signed-out admin, and the admin schedule and grounds pages |
| Code review | All 9 migrations, `lib/data.ts`, every server action, API route, page, and the main components |

**What could not be checked:**

- **Vercel runtime logs and deployments.** The Vercel connector returned `403 Forbidden`.
- **Real Google sign-in and Strava OAuth.** These need your accounts. Those flows were reviewed in the code only.
- **Running migration SQL locally.** Docker was not running, so `0010` was reviewed but not executed. Removing a member in the browser was later tested in demo mode (see B2).

**Live data today:** 3 members, 4 weekly sessions, 3 training grounds, 1 event ("Stadium Run", 19 Sep) with 0 RSVPs, 0 sessions logged this week, 0 published testimonials.

### Severity key

- **Breaking**: the feature does not do what it claims, end to end.
- **High**: a security, privacy or data-correctness problem. Members may not notice it yet.
- **Medium**: a hidden bug that will show up under conditions that are likely to happen.
- **Low**: polish, wrong copy, or out-of-date docs.

---

## 2. Feature inventory — end-to-end status

| # | Feature | Status | Findings |
|---|---|---|---|
| 1 | Landing page: hero, ticker, next-session countdown | ✅ Works | L6 |
| 2 | One-off event RSVP (landing and dashboard) | ✅ Works. Optimistic toggle, count updates, signed-out visitors are prompted to sign in | L7 |
| 3 | Weekly schedule with meeting-point maps | ✅ Works | M4 |
| 4 | Training grounds cards: logistics, status note, "club trains here" | ⚠️ Partial (B1 fixed) | M1, L5 |
| 5 | Club stats band | ✅ Fixed once `0010` is applied | L6 |
| 6 | Testimonials: submit, moderate, publish | ✅ Fixed once `0010` is applied | — |
| 7 | Google sign-in and sign-out | ✅ Sign-out verified. OAuth reviewed in code only | L3 |
| 8 | Member dashboard: rings, streak, PBs, session log | ✅ Works. Logging a session updated the rings and the log immediately | L2 |
| 9 | Log a session at a training ground | ✅ Fixed | B1 |
| 10 | Strava connect, sync, disconnect | ⚠️ Works on the normal path, fragile on edge cases | M2, M3, L4 |
| 11 | Profile editor | ✅ Works | — |
| 12 | Admin: overview | ✅ Fixed | B2 |
| 13 | Admin: events CRUD with place search | ✅ Works | — |
| 14 | Admin: weekly schedule CRUD | ⚠️ Breaks when the table is empty | M4 |
| 15 | Admin: training grounds with elevation profile | ✅ Fixed | B3 |
| 16 | Admin: members (promote, demote, remove, reinstate) | ⚠️ Removal is only partly enforced | B2, H1 |
| 17 | Signed-out `/admin` | ✅ Fixed (commit `ac35fa6`). ARCHITECTURE.md still lists it as broken | L8 |
| 18 | **Weekly session RSVP with pace groups** | 🟡 **Not built.** The spec is a draft and has design gaps | Section 4 |

---

## 3. Breaking points and bugs in live features

### Breaking

#### B1. A manually logged session can never be linked to a training ground

- **Where:** `components/dashboard/LogSessionForm.tsx`, `app/actions/sessions.ts:17-48`
- **What happens:** Migration `0009` added `sessions.ground_id`, described as *"chosen when logging by hand"*. The log form has no ground picker, and `logSessionAction` never reads or passes a `ground_id`. Confirmed in the browser: the drawer has no ground field.
- **Impact:** The "you: 14 sessions here" line on the ground cards (commit `7b126ed`) only fills from Strava imports. Members who log by hand, which is everyone without Strava, never see it.
- **✅ Fixed:** The log form has an optional "Where?" picker that lists only grounds for the chosen sport. The action passes `ground_id`, and `logSession` checks on the server that the ground exists, matches the sport, and is a real row (not a built-in fallback card). *Verified:* a run logged at Lake loop showed "1 club session logged here, 5.2 km · you: 1" on the landing card. A forged swim at Lake loop was rejected.

#### B2. A removed member is not removed from public surfaces

- **Where:** `supabase/migrations/0001_init.sql` (`public_testimonials` view), `0002` (`public_week_volume.members`), `lib/data.ts:734-747` (admin overview), `lib/data.ts:408-421` and `:701` (demo)
- **What happens:** `removeMemberAction` says *"Their name comes off the testimonial wall and the member count"*. It does not:
  - `public_testimonials` joins `profiles` with no `removed_at` filter, so their approved quote stays public with their name and photo.
  - The landing page's "Active members" count comes from `count(*) from profiles`, so removed members are included.
  - The admin overview "Members" KPI counts every profile, removed or not.
  - In demo mode, testimonials and club stats ignore `removed_at` as well.
- **Impact:** A member removed for cause stays on the public site.
- **✅ Fixed:** Migration `0010_hide_removed_members.sql` recreates both views with a `removed_at is null` filter (same columns, so it is safe to apply before or after the deploy). The admin overview and the demo-mode reads filter the same way. Removed members' kilometres still count, as 0008 intends. *Verified in demo:* removing Aditi took her quote off the wall and dropped the landing and admin counts from 9 to 8. **To do:** apply `0010` to production (`supabase db push`). The SQL could not be run locally because Docker was not running.

#### B3. Admin → Grounds: typing in the drawer loses every keystroke after the first

- **Where:** `components/ui/Drawer.tsx:17-37` together with `components/admin/GroundsManager.tsx`
- **What happens:** The Drawer's effect depends on `onClose`, and GroundsManager passes a new arrow function on every render. The route-point input and the elevation textarea store their state in GroundsManager, so each keystroke re-renders it. The effect then runs again and focuses the first focusable element, which is the **Close** button.
- **Reproduced:** Focused "New route point", typed `1`, `2`, `3`. Only `1` landed, and focus ended on "Close".
- **Impact:** Admins can only paste coordinates. Typing a route point or editing the elevation by hand does not work. Any toast shown while a drawer is open (for example a failed save) moves focus in the other admin drawers too.
- **✅ Fixed:** `Drawer` keeps `onClose` in a ref, so its effect runs only when `open` changes. This fixes every drawer, not just Grounds. *Verified:* keystrokes typed one at a time all landed, focus stayed in the input, Enter added the point, and Escape still closes the drawer.

### High

#### H1. The database does not enforce member removal

- **Where:** Every RLS policy (`0001`, `0002`); `app/auth/callback/route.ts:58`
- **What happens:** Removal is enforced in two places only: `getCurrentProfile()` and the sign-in callback. No RLS policy checks `removed_at`.
- **Impact:** A removed member whose session is still active can still read every profile and session. They can also insert sessions, RSVPs and testimonials by calling Supabase directly with their token, which lives in a JS-readable cookie. ARCHITECTURE.md says *"RLS is the actual protection"*; for removal, it is not.

#### H2. Members' training logs can be read by every signed-in member, but the UI says they are private

- **Where:** `0002_sessions_and_schedule.sql` policy *"Sessions are readable by members … using (true)"*, and `components/dashboard/StravaCard.tsx:99`
- **What happens:** The Strava card tells members *"Your activities stay private to you — the club page only ever shows combined distance."* RLS lets any signed-in member read everyone's sessions, including dates, notes, distances and times, through the API. The RSVP spec repeats the claim: *"Individual training data stays private, as it is today."*
- **Decision needed:** Either restrict the policy to the owner (and admins), with aggregates served by definer views, or change the copy.

#### H3. Local development writes to the production database

- **Where:** `/Users/harsha/RunningClub/.env.local` (main checkout)
- **What happens:** That file sets `NEXT_PUBLIC_DEMO=false`, points `NEXT_PUBLIC_SUPABASE_URL` at the production project (`ednkwyxcprwbrdyapqko`), and includes the service role key. Running `npm run dev` there works on live member data.
- **Impact:** Testing a delete, a removal or a Strava disconnect locally changes production. Building RSVP, with its migrations, makes this riskier.

### Medium

#### M1. Signed-out visitors never see ground activity

- **Where:** `lib/data.ts:911-957` (`getGroundActivity`)
- **What happens:** It reads `sessions` with the anon client. `sessions` is readable by authenticated users only, so visitors always get zero. The code comment says *"Signed-out visitors get the club numbers"*.
- **Impact:** Once members start logging, members see "23 club sessions here" while visitors see nothing.

#### M2. Strava sync fails when the training grounds table is empty

- **Where:** `lib/strava/sync.ts:119`, `lib/data.ts:887`
- **What happens:** `getTrainingGrounds()` falls back to `DEFAULT_TRAINING_GROUNDS`, whose ids (`'lake-loop'` and so on) are not UUIDs. An activity that starts near the lake is matched to `ground_id = 'lake-loop'`. The upsert then fails with `invalid input syntax for type uuid`, and the whole sync throws.
- **Current state:** Production has 3 real grounds, so this is hidden today. It surfaces if an admin deletes all grounds.

#### M3. Strava token refresh can lose the refresh token

- **Where:** `lib/strava/client.ts:136-144`; `lib/strava/sync.ts:65-68`
- **What happens:**
  - The update that saves a refreshed token pair ignores its `error`. If that write fails, the database keeps a refresh token Strava may already have rotated, and the member ends up stuck on "Strava access expired".
  - `getStravaOverview` refreshes twice in parallel (`Promise.all` of stats and athlete). Near expiry, both calls race on the same refresh token.

#### M4. Admin schedule and grounds break when the table is empty

- **Where:** `lib/data.ts:788`, `:887`; `ScheduleManager`, `GroundsManager`
- **What happens:** If an admin deletes every weekly session (or ground), the built-in defaults come back, **including on the admin page**. Their ids are not UUIDs, so "Edit" and "Delete" on those rows fail with a Postgres uuid error.
- **Impact:** An admin cannot pause the club down to zero sessions.

### Low

| # | Finding | Where |
|---|---|---|
| L1 | Sign-in always returns to `/dashboard`. An admin who signs in from `/admin` is dropped on the dashboard | `components/auth/SignInButton.tsx:51` |
| L2 | The duration field rejects `120` (3-digit minutes) but accepts `5:75`. There is no 0-59 check on minutes or seconds | `lib/stats.ts:177-192` |
| L3 | The Strava callback redirects to `NEXT_PUBLIC_SITE_URL`, so a preview deploy sends members back to production | `app/api/strava/callback/route.ts:24` |
| L4 | The "Pulled N activities" toast counts rows re-sent in the 60-minute overlap, so "Already up to date" rarely shows | `lib/strava/sync.ts:155` |
| L5 | Copy is hard-coded: "One lake. Three playgrounds." and "Same time, same lake." show whatever the counts or locations are (the ORR and Gachibowli are not the lake). Ground cards show two "Directions" links | `TrainingGrounds.tsx:31`, `WeeklySchedule.tsx:27` |
| L6 | `CountUp` server-renders `0`, so link previews, crawlers and no-JS visitors see "0 km · 0 members" | `components/ui/CountUp.tsx:24` |
| L7 | RSVPs are not date-checked on the server. Nothing stops an RSVP (or un-RSVP) on a past event through the API | `lib/data.ts:287` |
| L8 | ARCHITECTURE.md is out of date: says "Seven tables", its migration list stops at `0007`, and "Known limits" still says signed-out `/admin` throws | `ARCHITECTURE.md` |
| L9 | Demo mode lets a removed member stay signed in (`getDemoProfile` ignores `removed_at`) | `lib/demo/session.ts:12` |

---

## 4. New feature required: weekly session RSVP with pace groups

**Spec:** `docs/superpowers/specs/2026-09-14-weekly-session-rsvp-design.md`. Status: *draft, awaiting approval*.
**Built so far:** Nothing. There is no migration, no data layer, no UI, and `session_rsvps` does not exist in production.

### 4.1 What the spec asks for

| Layer | Deliverable |
|---|---|
| Migration 1 | `weekly_sessions.pace_groups`: `text[]` → `jsonb` `[{name, capacity}]`, converting existing rows |
| Migration 2 | `session_rsvps (weekly_session_id, occurs_on, user_id, pace_group)` with RLS |
| Migration 3 | Capacity trigger. Also rejects unknown pace groups |
| Admin | A capacity field per pace group, the attendee list for each occurrence, removing an attendee |
| Landing | Per-session count, and per-group chips (`3`, `2/8`, `full`) that work signed out |
| Dashboard | "You're in for Sunday's long run", with a way out. Empty state shows the week's sessions |
| Tests | Unit tests for occurrence and capacity maths. Database tests for concurrency, RLS and cascade |

### 4.2 Gaps in the spec to settle before building

These would ship bugs if the spec were built exactly as written.

| # | Problem | Why it matters | Suggested resolution |
|---|---|---|---|
| S1 | **"Nothing breaks on deploy" is not true.** 8+ call sites assume `pace_groups: string[]`: `NextSessionCard`, `paceGroupsFor`, `ScheduleManager` (`.join(', ')`, rendered as chip text), `parseWeeklySession`, `types/database.ts`, `DEFAULT_WEEKLY_SCHEDULE`, and the demo fixtures | Once the jsonb migration runs, the live landing page crashes with *"Objects are not valid as a React child"* until the new code deploys | Add a `pace_groups_v2 jsonb` column first. Or ship code that reads both shapes before running the migration |
| S2 | **The capacity trigger is not atomic.** A `before insert` trigger that runs `count(*)` under READ COMMITTED lets two concurrent inserts both see 7 of 8 | The spec's central guarantee ("exactly one succeeds") would fail its own test | Lock the parent row: `select … from weekly_sessions where id = new.weekly_session_id for update` (or `pg_advisory_xact_lock`) before counting |
| S3 | **Changing group is an UPDATE, and the trigger only covers INSERT.** RLS also lists only insert and delete | "Change group" is either denied by RLS or bypasses capacity | Make the trigger `before insert or update`, and add an owner-only update policy |
| S4 | **The trigger does not stop orphaned groups on rename.** An insert-time check does nothing to rows that already exist | Renaming "6:30+ /km" leaves RSVPs pointing at a group that no longer exists, and the counts drift | Give each group a stable `id` in the jsonb and store that. Or block renames and removals while future RSVPs exist |
| S5 | **`occurs_on` is not validated in the database.** "Next occurrence only" and "closes when the session starts" are UI rules only | A member can RSVP for any date, including past or wrong weekdays, via the API, which pollutes the "attendance record" | Trigger check: the `iso_dow` matches, the occurrence has not started in IST, it is the next occurrence, and the session is `active` |
| S6 | **Public read exposes `user_id` only.** Names come from `profiles`, which is members-only | Signed-out visitors cannot see "who's coming" without widening `profiles` | A definer view `public_session_rsvp_counts` (counts per group) for visitors. Names only for signed-in members. Filter out removed members |
| S7 | **Cascade deletes the attendance record.** `on delete cascade` from `weekly_sessions` wipes past RSVPs, but the spec says past RSVPs *are* the attendance record | Deleting a session erases history | Tell admins to pause (`active=false`) rather than delete. Or use `on delete restrict` when past RSVPs exist |
| S8 | **Two RSVP systems for the same morning.** Demo and production both have one-off events that match weekly sessions (for example "Long ride" on Saturday). `NextSessionCard` shows the event when one exists | Members can RSVP to the event and to the session and get two different counts | Rule: an event on the same date and type replaces that occurrence. Or link events to `weekly_session_id` |
| S9 | **Fallback schedule ids are not UUIDs** (see M4) | An RSVP control on the built-in defaults would fail | Hide the RSVP control when the schedule is the fallback |
| S10 | **There is no test runner in the repo.** `package.json` has no `test` script | The spec's Testing section cannot run | Add Vitest for pure logic. For the DB tests, run SQL against `supabase start` (local), never production (see H3) |
| S11 | **Removed members' RSVPs** are not covered | They stay in counts, the same bug as B2 | Filter on `profiles.removed_at is null` in every count |

### 4.3 Deliberately out of scope in the spec (future features)

1. Cancelling a single occurrence, which needs its own notification decision
2. Notifications, most likely WhatsApp, when a session fills or is cancelled
3. A consistency or attendance board built from past RSVPs
4. Waitlists and recurring RSVPs, rejected on purpose

---

## 5. Suggested fix order (pending your approval)

1. **H3**: point local dev at a local Supabase or demo mode before touching any migration.
2. **B3, B1, B2**: the three live breakages. Each is small and self-contained.
3. **H1, H2**: RLS changes. H2 needs a product decision first: private logs or club-visible logs?
4. **M1–M4**: the hidden bugs.
5. **Approve the RSVP spec with S1–S11 resolved**, then build it in the spec's migration order.
6. **L1–L9**: polish and docs, batched.

Nothing above has been changed. Tell me which items to fix, and which way to go on H2.
