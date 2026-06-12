# Origination Dojo

A personal sales & relationship mastery training system for agricultural-finance
origination, built per [SPEC.md](./SPEC.md). It turns seven sales/relationship
books into durable, applied skill through four loops:

| Loop | Page | Engine |
|---|---|---|
| 0 — Encoding | `/learn` | AI-tutored guided sessions (activate → teach → teach-back → apply → close) |
| 1 — Retention | `/drill` | FSRS-scheduled scenario drills, AI-graded free text |
| 2 — Skill | `/roleplay` | Persona-based AI roleplay with structured grading + scorecard |
| 3 — Transfer | `/field` | CRM-wired meeting pre-brief / voice debrief |
| Voice agent | `/coach` | Hands-free voice coach + spoken drill quiz (Web Speech API) |

Plus `/playbook` (searchable framework reference, drill-this-now), `/nap`
(Networking Action Plan), XP/streak/rank gamification and a 7-axis skill radar.

## The seven playbooks

The original five (provided) plus two added after a research review — see
[content/research/RESEARCH.md](./content/research/RESEARCH.md) for the evidence
base and reasoning:

1. The Trusted Advisor — operating model
2. SPIN Selling Fieldbook — conversation method
3. Influence (Cialdini) — psychology
4. How to Win Friends — interpersonal fundamentals
5. Never Eat Alone — network architecture
6. **Never Split the Difference (Voss)** — negotiation / late-stage tension *(added)*
7. **The Challenger Sale + The JOLT Effect** — insight selling / buyer indecision *(added)*

18 guided sessions, 8 roleplay personas, 36 seed drills, and a runtime drill
generator for unlimited expansion.

## Setup

1. Create a Supabase project; run `supabase/migrations/0001_init.sql` in the SQL
   editor (or `supabase db push`).
2. `cp .env.example .env.local` and fill in keys (Anthropic key is server-side
   only and never reaches the client bundle).
3. ```bash
   npm install
   npm run seed     # creates the user, loads content, queues 36 due drills
   npm run dev
   ```
4. Sign in with `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`.

## Architecture notes

- **Next.js 14 App Router + TypeScript + Tailwind**; mobile-first (drills on the
  phone, debrief in the car).
- All feature code lives under `src/modules/dojo/` with clean boundaries so the
  module can later be lifted into the Life OS repo as a Career-domain module.
  The only code outside it is the thin `src/app/` route layer and middleware.
- **Anthropic SDK server-side only** (route handlers): `claude-sonnet-4-6` for
  tutor/roleplay/coach/pre-brief, `claude-haiku-4-5` for grading and drill
  generation. JSON replies are fence-stripped, zod-validated, and retried once
  with the validation error fed back.
- **ts-fsrs** for scheduling; an "again" reschedules sooner than a "good"; weak
  concepts from roleplay grading and the field loop are pulled forward in the
  queue.
- **Voice**: Web Speech API (`SpeechRecognition` + `speechSynthesis`) with
  graceful text fallback everywhere — roleplay turns, drill dictation, the car
  park debrief, and the `/coach` hands-free loop. Best in Chrome/Safari.
- **RLS**: shared content tables (concepts/drills/sessions/personas) are
  read-only to authenticated users and seeded with the service role; all user
  data is scoped to `auth.uid()`.

## API routes

```
POST /api/tutor              {sessionId, messages[]}          → text stream
POST /api/roleplay           {personaId, messages[], mode}    → text stream | remix JSON
POST /api/grade/drill        {drillId, reviewId, answer}      → grade JSON (applies FSRS)
POST /api/drill/answer       {reviewId, rating}               → applies FSRS (tap answers)
POST /api/grade/roleplay     {roleplayId}                     → scorecard JSON
POST /api/generate/drills    {conceptId, n, difficulty}       → inserts drills + reviews
POST /api/sessions/complete  {sessionId, transcript}          → seeds concepts, unlocks next
POST /api/meetings/prebrief  {meetingId}                      → pre-brief JSON
POST /api/meetings/debrief   {meetingId, raw}                 → debrief JSON (FSRS + CRM merge)
POST /api/contacts/import    multipart CSV                    → {imported}
POST /api/coach              {messages[]}                     → text stream (voice coach)
```
