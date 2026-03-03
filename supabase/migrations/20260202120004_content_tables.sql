alter table public.loops
  add column if not exists expires_at timestamptz,
  add column if not exists radius_miles numeric,
  add column if not exists is_public boolean not null default true,
  add column if not exists location_label text,
  add column if not exists distance_miles numeric,
  add column if not exists author text,
  add column if not exists author_trust_score integer;

create table if not exists public.loopplus_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  details text,
  images jsonb,
  author text,
  author_trust_score integer not null default 0,
  location_label text,
  lat double precision,
  lon double precision,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.loopplus_posts enable row level security;

create policy "LoopPlus posts are readable by everyone"
  on public.loopplus_posts
  for select
  using (true);

create policy "LoopPlus posts are insertable by owner"
  on public.loopplus_posts
  for insert
  with check (auth.uid() = user_id);

create policy "LoopPlus posts are updatable by owner"
  on public.loopplus_posts
  for update
  using (auth.uid() = user_id);

create policy "LoopPlus posts are deletable by owner"
  on public.loopplus_posts
  for delete
  using (auth.uid() = user_id);

create policy "LoopPlus posts admin override"
  on public.loopplus_posts
  for all
  using (auth.uid() = 'c0d61f7c-7609-4e6d-92e6-7eb9174527a2')
  with check (auth.uid() = 'c0d61f7c-7609-4e6d-92e6-7eb9174527a2');

alter table public.chat_threads
  add column if not exists loop_id uuid references public.loops(id) on delete set null;
