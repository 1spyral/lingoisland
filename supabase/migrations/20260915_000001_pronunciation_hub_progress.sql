-- Pronunciation Hub: a per-user daily practice length preference (the one
-- field from 20260913's blanket drop that isn't a level/topic duplicate —
-- it has nowhere else to live), and a distinct session source for
-- weakness-targeted drills generated from pronunciation_profiles.weak_sounds.

alter table public.pronunciation_profiles
  add column if not exists daily_minutes int;

alter table public.pronunciation_sessions
  drop constraint if exists pronunciation_sessions_source_check;

alter table public.pronunciation_sessions
  add constraint pronunciation_sessions_source_check
  check (source in ('journey_node', 'standalone', 'weak_sounds_focus'));
