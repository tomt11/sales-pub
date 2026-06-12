-- Origination Dojo — initial schema
-- Content tables (concepts, drills, sessions, personas) are shared, seeded with the
-- service role and readable by any authenticated user. All user-data tables are
-- scoped to auth.uid() via RLS.

create extension if not exists "pgcrypto";

-- ---------- content ----------
create table concepts (
  id text primary key,
  book text not null,
  name text not null,
  playbook_file text not null
);

create table drills (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,                          -- seed ids d01..d36
  concept_id text not null references concepts(id),
  type text not null check (type in ('classify','spot','produce','rewrite','plan')),
  prompt text not null,
  options jsonb,
  answer int,
  grading_focus text,
  explain text,
  source text not null default 'seed',            -- seed | generated
  difficulty text not null default 'normal',
  user_id uuid references auth.users(id)          -- null = shared seed content
);

create table sessions (
  id int primary key,
  book text not null,
  title text not null,
  concepts text[] not null,
  application_prompt text not null
);

create table personas (
  id text primary key,
  sheet jsonb not null
);

-- ---------- user data ----------
create table profiles (
  user_id uuid primary key references auth.users(id),
  blue_flame text not null default 'the agri lending specialist who grew up in ag broking and understands family succession'
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  drill_id uuid not null references drills(id),
  user_id uuid not null references auth.users(id) default auth.uid(),
  fsrs_state jsonb not null,
  due timestamptz not null default now(),
  last_rating text,
  reps int not null default 0,
  lapses int not null default 0,
  unique (drill_id, user_id)
);

create table review_log (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id),
  user_id uuid not null references auth.users(id) default auth.uid(),
  answered_at timestamptz not null default now(),
  rating text not null,
  answer_text text,
  ai_feedback text,
  score int
);

create table session_progress (
  user_id uuid not null references auth.users(id) default auth.uid(),
  session_id int not null references sessions(id),
  status text not null default 'locked' check (status in ('locked','available','in_progress','done')),
  transcript jsonb,
  completed_at timestamptz,
  primary key (user_id, session_id)
);

create table roleplays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  persona_id text not null references personas(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  transcript jsonb,
  grade jsonb,
  overall int,
  advance_secured boolean
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  firm text,
  type text not null default 'referrer' check (type in ('referrer','client')),
  ladder_level int not null default 1 check (ladder_level between 1 and 4),
  super_connector boolean not null default false,
  glue text,
  personal_notes jsonb not null default '{}'::jsonb,
  cadence_days int not null default 30,
  last_touch date,
  priority int not null default 3
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  contact_id uuid not null references contacts(id),
  scheduled_at timestamptz,
  purpose text,
  prebrief jsonb,
  debrief_raw text,
  debrief jsonb,
  outcome text check (outcome in ('advance','continuation','setback')),
  technique_practised text,
  technique_score int
);

create table xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  source text not null,
  points int not null,
  created_at timestamptz not null default now(),
  meta jsonb
);

create table case_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  region text,
  commodity text,
  scale text,
  story text not null,
  deidentified boolean not null default true
);

create table nap_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  horizon text not null check (horizon in ('3yr','1yr','90d')),
  goal_a text,
  goal_b text,
  people text[] not null default '{}',
  actions text[] not null default '{}',
  cycle_start date
);

-- ---------- indexes ----------
create index reviews_due_idx on reviews (user_id, due);
create index review_log_user_idx on review_log (user_id, answered_at);
create index meetings_contact_idx on meetings (contact_id);
create index xp_user_idx on xp_events (user_id, created_at);

-- ---------- RLS ----------
alter table concepts enable row level security;
alter table drills enable row level security;
alter table sessions enable row level security;
alter table personas enable row level security;
alter table profiles enable row level security;
alter table reviews enable row level security;
alter table review_log enable row level security;
alter table session_progress enable row level security;
alter table roleplays enable row level security;
alter table contacts enable row level security;
alter table meetings enable row level security;
alter table xp_events enable row level security;
alter table case_stories enable row level security;
alter table nap_goals enable row level security;

-- shared content: any authenticated user can read; writes only via service role
create policy "read concepts" on concepts for select to authenticated using (true);
create policy "read sessions" on sessions for select to authenticated using (true);
create policy "read personas" on personas for select to authenticated using (true);
create policy "read drills" on drills for select to authenticated
  using (user_id is null or user_id = auth.uid());

-- user data: owner-only
create policy "own profile" on profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own reviews" on reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own review_log" on review_log for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own session_progress" on session_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own roleplays" on roleplays for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own contacts" on contacts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own meetings" on meetings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own xp" on xp_events for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own case_stories" on case_stories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own nap_goals" on nap_goals for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
