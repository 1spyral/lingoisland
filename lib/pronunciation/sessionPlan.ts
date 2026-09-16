import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TAG_PRACTICE_HINTS,
  type DiagnosticTag,
} from "@/lib/pronunciation/diagnosticBank";
import { tagBreakdown, type TagScore } from "@/lib/pronunciation/diagnosticBreakdown";
import { itemsForMinutes } from "@/lib/pronunciation/sessionSizing";
import { backfillWeakSoundsIfEmpty } from "@/lib/pronunciation/weakSoundsStore";

const MIN_WEAK_SOUNDS_FOR_CHARACTERS = 2;
const RECENT_WORD_LIMIT = 30;
const WEAK_SOUND_LIMIT = 8;
const TOP_TAG_LIMIT = 3;

export type RecentWord = {
  hanzi: string;
  pinyin: string;
  english: string;
};

export type PlannedWeakSound = {
  syllable: string;
  pinyin: string | null;
  targetTone: number | null;
  timesWrong: number;
};

export type DrillSlot =
  | { kind: "character"; sound: PlannedWeakSound }
  | { kind: "tag"; tag: DiagnosticTag; label: string; hint: string }
  | { kind: "mixed" };

export type SessionPlan = {
  count: number;
  hskLevel: string;
  easierHskLevel: string;
  topics: string[];
  recentWords: RecentWord[];
  slots: DrillSlot[];
  mode: "characters" | "tags" | "open";
};

export function easierHskLevel(hskLevel: string): string {
  if (hskLevel === "7-9") return "6";
  const n = Number(hskLevel);
  if (!Number.isFinite(n)) return "1";
  return String(Math.max(1, Math.round(n) - 1));
}

export function targetedSlotCount(count: number): number {
  if (count <= 0) return 0;
  return Math.min(count, Math.max(1, Math.round((count * 2) / 3)));
}

function cycle<T>(items: T[], n: number): T[] {
  if (items.length === 0 || n <= 0) return [];
  return Array.from({ length: n }, (_, i) => items[i % items.length]);
}

export function buildSlots(
  count: number,
  weakSounds: PlannedWeakSound[],
  tags: TagScore[],
): { slots: DrillSlot[]; mode: SessionPlan["mode"] } {
  const targeted = targetedSlotCount(count);
  const mixedCount = Math.max(0, count - targeted);

  let targetedSlots: DrillSlot[] = [];
  let mode: SessionPlan["mode"] = "open";

  if (weakSounds.length >= MIN_WEAK_SOUNDS_FOR_CHARACTERS) {
    mode = "characters";
    targetedSlots = cycle(weakSounds, targeted).map((sound) => ({ kind: "character" as const, sound }));
  } else if (tags.length > 0) {
    mode = "tags";
    targetedSlots = cycle(tags.slice(0, TOP_TAG_LIMIT), targeted).map((tag) => ({
      kind: "tag" as const,
      tag: tag.tag,
      label: tag.label,
      hint: TAG_PRACTICE_HINTS[tag.tag] ?? tag.label,
    }));
  } else {
    targetedSlots = Array.from({ length: targeted }, () => ({ kind: "mixed" as const }));
  }

  const mixedSlots: DrillSlot[] = Array.from({ length: mixedCount }, () => ({ kind: "mixed" }));
  return { slots: [...targetedSlots, ...mixedSlots], mode };
}

async function loadRecentWords(
  supabase: SupabaseClient,
  userId: string,
): Promise<RecentWord[]> {
  const selectWithLearned = await supabase
    .from("island_words")
    .select("hanzi, pinyin, english, learned_at, created_at")
    .eq("user_id", userId)
    .order("learned_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(RECENT_WORD_LIMIT);

  const rows =
    selectWithLearned.error
      ? (
          await supabase
            .from("island_words")
            .select("hanzi, pinyin, english, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(RECENT_WORD_LIMIT)
        ).data
      : selectWithLearned.data;

  const seen = new Set<string>();
  const words: RecentWord[] = [];
  for (const row of rows ?? []) {
    const hanzi = typeof row.hanzi === "string" ? row.hanzi.trim() : "";
    if (!hanzi || seen.has(hanzi)) continue;
    seen.add(hanzi);
    words.push({
      hanzi,
      pinyin: typeof row.pinyin === "string" ? row.pinyin : "",
      english: typeof row.english === "string" ? row.english : "",
    });
  }
  return words;
}

export async function loadSessionPlan(
  supabase: SupabaseClient,
  userId: string,
  {
    hskLevel,
    topics,
    dailyMinutes,
  }: {
    hskLevel: string;
    topics: string[];
    dailyMinutes: number | null | undefined;
  },
): Promise<SessionPlan> {
  const count = itemsForMinutes(dailyMinutes);

  try {
    await backfillWeakSoundsIfEmpty(supabase, userId);
  } catch (err) {
    console.warn("[sessionPlan] weak-sound backfill failed", err);
  }

  const [{ data: weakRows }, { data: diagnosticRows }, recentWords] = await Promise.all([
    supabase
      .from("pronunciation_weak_sounds")
      .select("syllable, pinyin, target_tone, times_wrong, last_seen_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("times_wrong", { ascending: false })
      .order("last_seen_at", { ascending: false })
      .limit(WEAK_SOUND_LIMIT),
    supabase
      .from("pronunciation_diagnostic_attempts")
      .select("overall_score, target_tags")
      .eq("user_id", userId)
      .eq("pass_label", "day1"),
    loadRecentWords(supabase, userId),
  ]);

  const weakSounds: PlannedWeakSound[] = (weakRows ?? [])
    .filter((row) => typeof row.syllable === "string" && row.syllable.trim())
    .map((row) => ({
      syllable: row.syllable.trim(),
      pinyin: typeof row.pinyin === "string" ? row.pinyin : null,
      targetTone: typeof row.target_tone === "number" ? row.target_tone : null,
      timesWrong: typeof row.times_wrong === "number" ? row.times_wrong : 0,
    }));

  const tags = tagBreakdown(diagnosticRows ?? []).slice(0, TOP_TAG_LIMIT);
  const { slots, mode } = buildSlots(count, weakSounds, tags);

  return {
    count,
    hskLevel,
    easierHskLevel: easierHskLevel(hskLevel),
    topics,
    recentWords,
    slots,
    mode,
  };
}
