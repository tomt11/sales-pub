# SPEC.md — "Origination Dojo" Build Specification
### Sales & relationship mastery app for Tom — hand this folder to Claude Code

---

## 0. What you are building and why

A personal training system that turns five sales/relationship books into durable, applied
skill for an agricultural finance originator. It is NOT a book-summary app. Design is driven
by learning science:

- **Spaced retrieval, not re-reading.** Retrieval practice beats passive review by 30-50%
  for retention; distributed practice + practice testing are the two most effective
  techniques across 242 studies. Engine: FSRS scheduling over scenario drills.
- **Behaviour change needs deliberate practice with feedback.** Roleplay works when it has
  realism, immediate feedback, and psychological safety; AI handles high-frequency practice
  and measurement. Engine: persona-based AI roleplay with structured grading.
- **Transfer requires field application.** Roleplay performance alone doesn't predict live
  results. Engine: per-meeting pre-brief (one deliberate technique) + post-meeting debrief,
  wired to the real referral CRM.
- **Encoding first.** Guided interactive sessions (activate -> teach -> teach-back -> apply)
  before concepts enter the drill queue.

## 1. Stack (match the user's existing Life OS for later merge)

- **Next.js 14, App Router, TypeScript, Tailwind** (+ shadcn/ui)
- **Supabase**: Postgres, Auth (single user is fine, still use auth), RLS on all tables
- **Anthropic SDK** server-side only (route handlers). Models: claude-sonnet-4-6 for
  tutor/roleplay, claude-haiku-4-5 for grading/generation. ANTHROPIC_API_KEY,
  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local (create
  .env.example; never commit secrets).
- **ts-fsrs** npm package for spaced repetition scheduling (do not hand-roll SM-2)
- Mobile-first responsive — primary use is phone (drills in spare minutes, debrief in the car)
- Voice input where supported: Web Speech API for roleplay turns and debriefs, with text
  fallback. Degrade gracefully.
- Build as a standalone app BUT structure all feature code under `src/modules/dojo/` with
  clean boundaries, so it can later be lifted into the Life OS repo as a Career-domain module.

## 2. Repo contents you have been given

```
sales-mastery/
  SPEC.md                      <- this file
  PROMPTS.md                   <- system prompts for the 5 AI roles (use verbatim as base)
  content/
    playbook/01..05-*.md       <- distilled framework content; AI context + in-app reference
    seed/personas.json         <- 6 roleplay personas
    seed/curriculum.json       <- 15 guided sessions
    seed/drill-bank.json       <- 24 seed drills + drill JSON schema
```

Write a seed script (`npm run seed`) that loads all seed JSON + playbook files into the DB.

## 3. Data model (Supabase)

```sql
concepts        (id text pk, book text, name text, playbook_file text)
drills          (id uuid pk, concept_id fk, type text, prompt text, options jsonb,
                 answer int, grading_focus text, explain text, source text default 'seed',
                 difficulty text default 'normal')
reviews         (id uuid pk, drill_id fk, user_id fk, fsrs_state jsonb, due timestamptz,
                 last_rating text, reps int, lapses int)        -- one row per drill per user
review_log      (id uuid pk, review_id fk, answered_at timestamptz, rating text,
                 answer_text text, ai_feedback text, score int)
sessions        (id int pk, book text, title text, concepts text[], application_prompt text)
session_progress(user_id, session_id, status text check (locked|available|in_progress|done),
                 transcript jsonb, completed_at)
personas        (id text pk, sheet jsonb)
roleplays       (id uuid pk, persona_id fk, started_at, ended_at, transcript jsonb,
                 grade jsonb, overall int, advance_secured bool)
contacts        (id uuid pk, name text, firm text, type text check (referrer|client),
                 ladder_level int, super_connector bool, glue text, personal_notes jsonb,
                 cadence_days int, last_touch date, priority int)
meetings        (id uuid pk, contact_id fk, scheduled_at, purpose text, prebrief jsonb,
                 debrief_raw text, debrief jsonb, outcome text check (advance|continuation|setback),
                 technique_practised text, technique_score int)
xp_events       (id uuid pk, source text, points int, created_at, meta jsonb)
case_stories    (id uuid pk, region text, commodity text, scale text, story text,
                 deidentified bool default true)   -- social-proof library
nap_goals       (id uuid pk, horizon text check (3yr|1yr|90d), goal_a text, goal_b text,
                 people text[], actions text[], cycle_start date)
```

RLS: all tables scoped to auth.uid(). Contacts table: include a CSV import endpoint
(the user has a 63-contact Excel CRM to import; columns will be mapped at import time).

## 4. Features / pages

### `/` Dashboard
- Today card: due-drill count, next session, upcoming meetings needing pre-brief,
  current streak, XP this week
- Skill radar: per-framework rolling averages from grader data (SPIN / Trust / Influence /
  Carnegie / Network)
- "One thing" banner: latest grader `one_thing` from the most recent roleplay
- Blue-flame statement pinned in header (editable; seed: "the agri lending specialist who
  grew up in ag broking and understands family succession")

### `/learn` Guided sessions (Loop 0 — encoding)
- Sequential unlock per curriculum.json. Chat UI streaming against SESSION TUTOR prompt.
- Phase tracker (Activate -> Teach -> Teach-back -> Apply -> Close) visible.
- On completion: session's concepts get review rows created (due immediately),
  session_progress -> done, +XP.

### `/drill` Daily drills (Loop 1 — retention)
- FSRS queue of due reviews; target 5-minute session; show queue length and est. time.
- classify/spot: tap options, instant explain, self-evident rating mapping
  (correct+fast=easy, correct=good, wrong=again).
- produce/rewrite/plan: textarea (voice option), submit -> GRADER mode A -> show feedback
  -> fsrs_rating applied.
- When the due queue is empty and the user wants more: call DRILL GENERATOR for the user's
  3 weakest concepts (lowest rolling score), insert, continue.
- Streak logic: a day counts if >= 5 reviews completed.

### `/roleplay` Simulator (Loop 2 — skill)
- Persona picker (cards with difficulty, what it trains, last score). Streaming chat with
  ROLEPLAY ENGINE. Voice input toggle. PAUSE/RESUME coaching timeout and END controls
  as visible buttons.
- On END: GRADER mode B -> scorecard view (framework scores w/ evidence, question-mix
  donut, incidents lists, best moment, one_thing). Grade -> roleplays row; weak
  `drill_seeds` concepts get their review due-dates pulled forward.
- "Scenario remix" button: regenerates persona context fields (keeps archetype) via
  Claude so replays stay fresh.

### `/field` Meetings (Loop 3 — transfer)
- Contact list (import CSV; sortable by priority/cadence-overdue; ladder level and
  super-connector badges; touch-without-ask counter).
- New meeting -> PRE-BRIEF generated (uses contact record + weakest concepts) ->
  shown as a tight card optimised for reading in a car park.
- After meeting: debrief capture (voice-first, big mic button) -> DEBRIEF coach ->
  outcome classified, technique scored (feeds FSRS for that concept), new personal
  details merged into contact.personal_notes, next-touch suggestion.
- Cadence view: who's overdue, suggested glue-based touch.

### `/playbook` Reference
- Renders the five playbook markdown files, searchable. Each drillable concept links to
  "drill this now".

### `/nap` Goals
- NAP editor per never-eat-alone session 14: 3yr/1yr/90d, A/B goals, people/actions.
  90-day cycle generates weekly networking tasks that surface on the dashboard.

### Gamification (Life OS-compatible)
- XP: drill answered (5-20 by rating), session complete (100), roleplay complete (50 + 10x
  overall), advance secured in real meeting (150), touch-without-ask logged (25),
  streak bonuses. Levels per framework + overall rank ladder:
  Prospector -> Originator -> Advisor -> Trusted Advisor -> Rainmaker (capstone-gated).

## 5. API routes (route handlers, all server-side Anthropic calls)

```
POST /api/tutor          {sessionId, messages[]}            -> stream
POST /api/roleplay       {personaId, messages[], mode}      -> stream
POST /api/grade/drill    {drillId, answer}                  -> json
POST /api/grade/roleplay {roleplayId}                       -> json
POST /api/generate/drills{conceptId, n, difficulty}         -> json (inserts)
POST /api/meetings/prebrief  {meetingId}                    -> json
POST /api/meetings/debrief   {meetingId, raw}               -> json
POST /api/contacts/import    multipart CSV                  -> json
```

Inject playbook file content per PROMPTS.md placeholders. Add basic retry + JSON-mode
guards (strip fences, validate with zod before insert).

## 6. Build order (overnight plan)

1. Scaffold (Next 14 + Tailwind + shadcn + Supabase client/auth) and migrations
2. Seed script: concepts (from playbook DRILLABLE CONCEPT LISTs), drills, personas,
   sessions, playbook files into storage/table
3. Drill loop end-to-end with ts-fsrs (the daily-use core — highest priority)
4. Grader endpoints (drill mode first)
5. Roleplay chat + grading scorecard
6. Session tutor flow
7. Field loop: contacts import, pre-brief/debrief
8. Dashboard, XP, streaks, skill radar
9. Playbook reference + NAP (lowest priority — cut first if time-constrained)

## 7. Acceptance criteria

- [ ] `npm run seed` populates everything; app boots with 24 due drills
- [ ] Full drill session works on a phone viewport incl. AI-graded free-text drill
- [ ] FSRS: an "again" rating reschedules sooner than a "good" (verify in review row)
- [ ] Roleplay with grazier-sceptic persona: pitching in message 1 produces a visibly
      colder response than an acknowledge-then-question opening
- [ ] Roleplay END produces a complete scorecard and pulls weak concepts' due dates forward
- [ ] Session 1 runs all five phases and unlocks Session 2; its concepts appear in queue
- [ ] Meeting flow: create contact -> pre-brief renders -> voice/text debrief -> contact
      notes updated and technique score logged
- [ ] No Anthropic key ever reaches the client bundle

## 8. Out of scope (v1)
Push notifications, Garmin/Whoop, multi-user, native app (responsive web only),
Life OS merge (just keep the module boundary clean).
