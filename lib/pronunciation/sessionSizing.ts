/**
 * Maps the user's stored daily-practice-length preference to a sentence
 * count. ~2.5 min per item (record word, hear feedback, record sentence,
 * hear feedback, optionally drill one syllable) is the rough per-item pace
 * of the Flow 2 loop.
 */
export const DAILY_MINUTES_OPTIONS = [5, 10, 15, 20] as const;
export const DEFAULT_DAILY_MINUTES = 15;
const MINUTES_PER_ITEM = 2.5;
const MIN_ITEMS = 2;
const MAX_ITEMS = 30;

export function itemsForMinutes(minutes: number | null | undefined): number {
  const value = typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0
    ? minutes
    : DEFAULT_DAILY_MINUTES;
  return Math.min(MAX_ITEMS, Math.max(MIN_ITEMS, Math.round(value / MINUTES_PER_ITEM)));
}
