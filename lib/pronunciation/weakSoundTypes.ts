export type WeakSoundRow = {
  id: string;
  syllable: string;
  pinyin: string | null;
  target_tone: number | null;
  times_seen: number;
  times_wrong: number;
  consecutive_good: number;
  last_score: number | null;
  example_sentence: string | null;
  example_sentence_pinyin: string | null;
  example_sentence_english: string | null;
  status: "active" | "mastered";
  first_seen_at: string;
  last_seen_at: string;
  mastered_at: string | null;
};

export function scoreTier(score: number | null) {
  if (score === null) return { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" };
  if (score >= 80) return { bg: "#e7f7f5", text: "#0f766e", border: "#99f6e4" };
  if (score >= 60) return { bg: "#fdf3e3", text: "#92400e", border: "#fcd9a0" };
  return { bg: "#fdecea", text: "#9f1c14", border: "#f5c2bd" };
}

export function scoreTierStyle(score: number | null) {
  const tier = scoreTier(score);
  return { background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` };
}
