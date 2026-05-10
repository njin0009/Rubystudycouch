create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  category text,
  question_type text,
  question_count integer not null default 0,
  correct_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.question_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.study_sessions(id) on delete set null,
  question_id integer not null,
  selected_answers text[] not null default '{}',
  correct_answers text[] not null default '{}',
  is_correct boolean not null,
  category text,
  is_multi_select boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.saved_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table public.important_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table public.question_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id integer not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table public.study_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

create table public.study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  question_id integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.study_sessions enable row level security;
alter table public.question_attempts enable row level security;
alter table public.saved_questions enable row level security;
alter table public.important_questions enable row level security;
alter table public.question_notes enable row level security;
alter table public.study_checkins enable row level security;
alter table public.study_events enable row level security;

create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can manage own sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own attempts" on public.question_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own saved questions" on public.saved_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own important questions" on public.important_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own notes" on public.question_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own checkins" on public.study_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own events" on public.study_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index question_attempts_user_created_idx on public.question_attempts(user_id, created_at desc);
create index question_attempts_user_question_idx on public.question_attempts(user_id, question_id);
create index study_events_user_created_idx on public.study_events(user_id, created_at desc);
create index study_checkins_user_date_idx on public.study_checkins(user_id, checkin_date desc);
