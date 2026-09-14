# Weekly session RSVP with pace groups — design

**Date:** 2026-09-14
**Status:** draft, awaiting approval

## The problem

Members can only RSVP to one-off `events`. There is one event, with zero RSVPs.
The sessions people actually attend are the four recurring weekly ones, and
those cannot be RSVP'd at all.

Two things follow. Nobody can see who is coming on Sunday, which is the single
strongest reason to open the site midweek. And a nervous new member has no way
to learn that three people run at their pace, which is the difference between
turning up and quietly not.

## Decisions taken

These shape everything below. Each is reversible before implementation.

| Decision | Choice | Why |
|---|---|---|
| What an RSVP attaches to | The pair (session, date) | No materialisation, no cron, template stays authoritative |
| Where capacity applies | Per pace group | Matches how the sessions run: 8 per pool lane, not 8 per pool |
| How far ahead | Next occurrence only | Commit to this Sunday, not one in March |
| When full | Closed, no waitlist | A waitlist is a promise someone has to manage |

## The central problem: a recurring session has no date

`weekly_sessions` is a template. It says "Sunday, 06:00, Durgam Cheruvu", not
"Sunday 20 September". An RSVP needs a concrete occurrence.

Three ways to get one:

**Materialise occurrences into `events`.** A job turns each upcoming session
into a real event row, and existing RSVPs work untouched. Rejected: it needs a
scheduler, and once a row exists, edits to the template stop reaching it. Two
sources of truth for the same Sunday.

**Key the RSVP by session and date.** The occurrence is not stored at all; it is
just the pair. `nextOccurrence(iso_dow, time)` already computes the date, and is
already used by the countdown on the landing page. **Chosen.**

**Unify events and occurrences.** Cleanest long term, and the largest change to
code that currently works. Rejected for now, not forever.

## Data model

### Pace groups become first-class

Today `pace_groups` is `text[]`, edited as a comma-separated string. A capacity
per group has nowhere to live.

```
pace_groups jsonb   -- [{ "name": "6:30+ /km", "capacity": 12 }, ...]
```

Capacity is nullable, meaning unlimited. The migration converts existing arrays
in place, giving every group a null capacity, so nothing breaks on deploy.

Rejected alternative: keep `text[]` and add a separate `name -> limit` map. It
keeps two structures in sync by hand, and a renamed group silently orphans its
limit.

### The RSVP table

```
session_rsvps
  weekly_session_id  uuid    -> weekly_sessions(id) on delete cascade
  occurs_on          date
  user_id            uuid    -> profiles(id) on delete cascade
  pace_group         text    -- null means "no group chosen"
  created_at         timestamptz
  primary key (weekly_session_id, occurs_on, user_id)
```

The composite key is the whole design. One member, one session, one date. RSVPs
for past dates are not deleted: they become the attendance record, which is what
a consistency board would later be built from.

### Why capacity must live in the database

Two members clicking "I'm in" on the last place at the same moment will both
pass a check made in application code. The count and the insert have to happen
in one atomic step.

A `before insert` trigger that counts existing rows for that session, date and
group, and raises when the group is full. Same pattern as
`profiles_guard_role` and `profiles_guard_removal`: the UI can disable the
button, but the database is what actually holds the line.

The trigger also rejects a `pace_group` that is not one of the session's
declared groups, so a renamed group cannot leave orphaned RSVPs.

## Row Level Security

- **Read:** everyone, including signed-out visitors. Seeing that six people are
  coming is the point, and it works on the public landing page.
- **Insert and delete:** authenticated, and only `user_id = auth.uid()`. A
  member RSVPs for themselves only.
- **Admin delete:** admins may remove anyone's RSVP, for the member who cannot
  make it and does not say so.

What is exposed publicly: a member's name, their pace group, and that they are
attending. That is the same visibility testimonials already have. Individual
training data stays private, as it is today.

## Behaviour

**Choosing a group is optional.** Forcing a beginner to classify themselves
before they have ever run with the club is exactly the friction this feature
exists to remove. No group chosen is a valid, visible state.

**A full group does not block the session.** If the 5:00 group is full, the
other groups remain open. Only when every group is full is the session closed,
and a session with no groups defined is never full.

**RSVP closes when the session starts.** `nextOccurrence` already rolls past a
session once its time has passed, so this falls out of the existing helper
rather than needing a rule.

**Changing group is one action, not two.** Picking a different group updates the
row. Members should not have to cancel and re-add.

## Interface

**Landing page, weekly schedule.** Each row gains a count and a control:

> **Sun 06:00 · Long run** — 6 turtles in
> `[ 6:30+ /km · 3 ]` `[ 5:45–6:30 · 2/8 ]` `[ 5:00–5:45 · full ]`

Signed out, the counts still show and the control prompts sign-in. That is the
recruiting surface: a visitor sees a living club, not a timetable.

**Dashboard.** "You're in for Sunday's long run, 6:30+ group" with a way out.
Members who have RSVP'd to nothing see the week's sessions instead.

**Admin, schedule manager.** A capacity field per pace group, and the attendee
list per occurrence with the ability to remove someone.

## Testing

Unit, on pure logic:

- Occurrence date for every weekday and time, including the roll past a session
  that has already started today
- Capacity maths: full, one place left, unlimited when null, no groups defined

Against the database, which is where the guarantees actually live:

- Concurrent inserts on the last place: exactly one succeeds
- An RSVP naming a group the session does not have is rejected
- A member cannot insert an RSVP for someone else
- An admin can delete anyone's; a member cannot delete another's
- Deleting a weekly session removes its RSVPs, not the members

## Deliberately out of scope

**Waitlists.** A promise someone has to manage, and with three members it
solves a problem you do not have.

**Cancelling an occurrence.** Wanted, and the natural next piece, but it is its
own feature with its own notification question.

**Notifications.** The thing that would make this genuinely powerful is a
message when a session fills or is cancelled. That needs a channel decision,
most likely WhatsApp, and belongs in its own spec.

**Recurring RSVP.** "I come every Sunday" is appealing and quietly harmful: the
counts stop meaning anything once they include people who set it months ago.

## Migration order

1. `pace_groups` to jsonb, converting existing rows
2. `session_rsvps` with its RLS policies
3. Capacity trigger
4. Admin capacity editing
5. Member-facing RSVP on the landing page and dashboard

Steps 1 to 3 are invisible to members. The feature only appears at step 5, so
the risky database work ships and settles before anyone can use it.
