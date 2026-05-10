create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  file_name text not null,
  file_type text,
  storage_path text,
  parse_status text not null default 'pending',
  parse_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_document_id uuid references public.documents(id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  question_set_id uuid not null references public.question_sets(id) on delete cascade,
  question_number integer,
  question_text text not null,
  options jsonb not null default '{}'::jsonb,
  correct_answers text[] not null default '{}',
  explanation text,
  category text,
  page_number integer,
  is_multi_select boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_sessions
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists question_set_id uuid references public.question_sets(id) on delete set null;

alter table public.question_attempts
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists question_set_id uuid references public.question_sets(id) on delete set null;

alter table public.projects enable row level security;
alter table public.documents enable row level security;
alter table public.question_sets enable row level security;
alter table public.questions enable row level security;

create policy "Users can manage own projects" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own documents" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own question sets" on public.question_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage own questions" on public.questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index projects_user_created_idx on public.projects(user_id, created_at desc);
create index documents_project_created_idx on public.documents(project_id, created_at desc);
create index question_sets_project_created_idx on public.question_sets(project_id, created_at desc);
create index questions_set_number_idx on public.questions(question_set_id, question_number);
create index questions_project_category_idx on public.questions(project_id, category);
