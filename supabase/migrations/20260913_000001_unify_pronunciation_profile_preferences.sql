-- Pronunciation now reads the learner's level from user_profiles and topics
-- from journeys. Keep pronunciation_profiles limited to pronunciation-specific
-- progress and measurements.
alter table public.pronunciation_profiles
  drop column if exists hsk_level,
  drop column if exists topics,
  drop column if exists custom_topic,
  drop column if exists daily_minutes;
