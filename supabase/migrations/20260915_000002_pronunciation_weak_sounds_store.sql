-- Dedicated, persistent weak-sound tracking. Every scored character attempt
-- updates a row here (not just a capped top-8 snapshot), so the learner has
-- a real, reviewable record of exactly which sounds they get wrong, with an
-- example sentence for context and a mastery trail once they fix it.
create table if not exists public.pronunciation_weak_sounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  syllable text not null,
  pinyin text,
  target_tone int,
  times_seen int not null default 0,
  times_wrong int not null default 0,
  consecutive_good int not null default 0,
  last_score numeric,
  example_sentence text,
  example_sentence_pinyin text,
  example_sentence_english text,
  status text not null default 'active' check (status in ('active', 'mastered')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  mastered_at timestamptz
);

-- Neutral-tone / unknown-tone rows store NULL; treat those as one identity
-- per character so we don't insert duplicates that maybeSingle() can't read.
create unique index if not exists pronunciation_weak_sounds_identity_uidx
  on public.pronunciation_weak_sounds (user_id, syllable, (coalesce(target_tone, -1)));

create index if not exists pronunciation_weak_sounds_user_status_idx
  on public.pronunciation_weak_sounds (user_id, status, times_wrong desc);

alter table public.pronunciation_weak_sounds enable row level security;

drop policy if exists "Users can view their own weak sounds" on public.pronunciation_weak_sounds;
create policy "Users can view their own weak sounds"
  on public.pronunciation_weak_sounds
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own weak sounds" on public.pronunciation_weak_sounds;
create policy "Users can insert their own weak sounds"
  on public.pronunciation_weak_sounds
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own weak sounds" on public.pronunciation_weak_sounds;
create policy "Users can update their own weak sounds"
  on public.pronunciation_weak_sounds
  for update
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.pronunciation_weak_sounds to authenticated;
grant all on public.pronunciation_weak_sounds to service_role;

notify pgrst, 'reload schema';

-- Superseded by the table above — nothing reads or writes this column anymore.
alter table public.pronunciation_profiles
  drop column if exists weak_sounds;
