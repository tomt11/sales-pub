# LIFEOS-INTEGRATION.md — lifting Origination Dojo into LifeOS

This repo was deliberately structured for this merge: all feature code lives in
`src/modules/dojo/` with a thin `src/app/` route layer. This document is the
playbook for the lift. It is written so a Claude Code session opened in the
LifeOS repo can execute it directly ("follow LIFEOS-INTEGRATION.md in
tomt11/sales-pub"), or so it can be done by hand.

## Step 0 — get LifeOS onto GitHub (one-time, on the laptop)

```bash
cd path/to/lifeos
git init                                   # skip if already a git repo
git add -A && git commit -m "LifeOS snapshot"
gh repo create tomt11/lifeos --private --source=. --push
# or: create a private repo in the GitHub UI, then
# git remote add origin git@github.com:tomt11/lifeos.git && git push -u origin main
```

Then grant the Claude GitHub App access to `tomt11/lifeos`
(GitHub → Settings → Applications → Claude → Repository access) and start a
Claude Code session on that repo.

## Step 1 — reconnaissance in the LifeOS repo (do this before moving anything)

Answer these and adapt the steps below accordingly:

1. **Router**: App Router or Pages Router? (Dojo assumes App Router. If LifeOS
   is Pages Router, mount dojo pages under `app/` anyway — Next supports both
   side by side — and keep dojo self-contained.)
2. **Auth**: Supabase Auth, or something else (Clerk/NextAuth)? See Step 4.
3. **Database**: does LifeOS already use Supabase? Same project or separate?
4. **Gamification**: does LifeOS have its own XP/points/streak tables? See Step 6.
5. **Navigation**: how are domains (Health/Career/etc.) surfaced? The dojo
   becomes a Career-domain module.
6. **Styling**: Tailwind config — merge the dojo color tokens (`ink`, `flame`,
   `gold`, `paddock`) or restyle dojo components to LifeOS tokens.

## Step 2 — copy the module

From this repo into LifeOS:

```
src/modules/dojo/            → src/modules/dojo/           (verbatim — the module)
content/playbook/*.md        → content/playbook/           (AI context + reference)
content/seed/*.json          → content/seed/
content/research/RESEARCH.md → content/research/
supabase/migrations/0001_init.sql → merge into LifeOS migrations (Step 5)
scripts/seed.ts              → scripts/seed-dojo.ts
```

The module imports only: `@anthropic-ai/sdk`, `@supabase/ssr`,
`@supabase/supabase-js`, `ts-fsrs`, `zod`, `react-markdown`, `remark-gfm`,
`clsx`, `tailwind-merge`, `lucide-react`. Add any that LifeOS lacks.

`src/modules/dojo/lib/playbook.ts` reads `content/playbook/` from
`process.cwd()` — keep the `content/` directory at the LifeOS repo root, or
change `playbookDir()` if LifeOS prefers another location.

## Step 3 — mount the routes

Copy `src/app/{learn,drill,roleplay,coach,field,playbook,stories,nap}` and
`src/app/api/*` into the LifeOS app directory, ideally namespaced under the
Career domain, e.g. `app/career/dojo/...`. Each page file is a thin wrapper —
adjust only import paths and the dashboard links.

- The dojo dashboard (`src/app/page.tsx` here) becomes a Career-domain page or
  a card on the LifeOS `/today` view (due-drill count + streak + next session
  make a good Today widget; the queries are in `src/modules/dojo/lib/stats.ts`).
- Update `src/modules/dojo/components/Nav.tsx` hrefs for the new base path, or
  delete it and use LifeOS navigation.
- Keep the API routes' paths in sync with the `fetch()` calls in
  `components/` and `hooks/` (search for `"/api/` — they're all relative).

## Step 4 — auth

Dojo code assumes Supabase Auth (`supabase.auth.getUser()` in every route and
`user_id uuid references auth.users` in every table).

- **LifeOS on Supabase Auth**: nothing to do — delete the dojo's
  `src/middleware.ts` and `/login` page; LifeOS's own auth gate covers it.
- **LifeOS on Clerk/NextAuth/other**: two options:
  a) keep dojo data in its own Supabase project and mint a Supabase session for
     the signed-in LifeOS user (heavier), or
  b) replace the `getUser()` calls in `src/modules/dojo/lib/supabase/server.ts`
     and the API routes with the LifeOS session helper, change `user_id`
     columns to plain `uuid`/`text` carrying the LifeOS user id, and drop the
     RLS policies in favour of service-role access from the server (single
     user, server-only writes — acceptable).

## Step 5 — database

Run `supabase/migrations/0001_init.sql` against the LifeOS Supabase project
(or keep a separate project and a second client). Table-name collisions to
check before running: `sessions`, `reviews`, `contacts`, `meetings`,
`profiles`, `xp_events`. If LifeOS already has any of these, prefix the dojo
tables (`dojo_sessions`, …) and update the `.from("…")` strings — they are all
in `src/app/api/**` and `src/modules/dojo/{lib,components}/**`; grep for
`from("`.

Then `npm run seed` equivalent (`scripts/seed-dojo.ts`) with the LifeOS
Supabase URL + service key.

## Step 6 — XP / gamification bridge

All dojo XP flows through one function: `awardXp()` in
`src/modules/dojo/lib/xp.ts`. To unify with LifeOS gamification, change that
single function to also (or instead) write LifeOS's points system. Values and
sources: drill 5–20, session 100, roleplay 50+10×overall, real-world advance
150, touch-without-ask 25, streak bonus 50. Streak logic lives in
`lib/stats.ts:currentStreak` (5+ reviews/day) if LifeOS wants to display it.

## Step 7 — env & Vercel

Add to the LifeOS Vercel project: `ANTHROPIC_API_KEY` (server-only),
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The service-role
key is only needed for seeding (run locally), never at runtime.

## Step 8 — acceptance checklist after the lift

- [ ] Drill queue loads and an "again" rating reschedules sooner than "good"
- [ ] A free-text drill round-trips through `/api/grade/drill`
- [ ] Roleplay END produces a scorecard and pulls weak concepts forward
- [ ] Session 1 runs all five phases and unlocks Session 2
- [ ] Field: contact → pre-brief → debrief updates contact notes + FSRS
- [ ] Voice coach speaks and listens on the phone (Chrome/Safari)
- [ ] Dojo XP appears wherever LifeOS shows points
- [ ] No Anthropic key in the client bundle (`grep -r sk-ant .next/static` empty)

## Out of scope for the lift

The standalone app's `/login`, `middleware.ts`, `manifest.ts` and PWA icons —
LifeOS owns app shell, auth and installability after the merge.
