import type { SupabaseClient } from "@supabase/supabase-js";
import type { CharacterScore } from "@/lib/pronunciation/normalizeScore";

export const WEAK_SOUND_THRESHOLD = 80;
const MASTERY_STREAK = 3;

export type SentenceContext = {
  hanzi: string;
  pinyin: string | null;
  english: string | null;
};

function throwIfError(error: { message: string } | null, action: string) {
  if (error) throw new Error(`${action}: ${error.message}`);
}

function charactersFromScore(score: unknown): CharacterScore[] {
  if (!score || typeof score !== "object") return [];
  const characters = (score as { characters?: unknown }).characters;
  return Array.isArray(characters) ? (characters as CharacterScore[]) : [];
}

function isUniqueViolation(error: { code?: string; message: string } | null) {
  return Boolean(error && (error.code === "23505" || /duplicate key/i.test(error.message)));
}

async function recordOneCharacter(
  supabase: SupabaseClient,
  userId: string,
  character: CharacterScore,
  sentence: SentenceContext,
  retried = false,
) {
  if (character.score === null) return;

  const syllable = character.hanzi;
  const targetTone = character.citationTone ?? character.targetTone;
  const pinyin = character.citationPinyin ?? character.pinyin;
  const isWrong = character.score < WEAK_SOUND_THRESHOLD;

  let existingQuery = supabase
    .from("pronunciation_weak_sounds")
    .select("id, times_seen, times_wrong, consecutive_good, status")
    .eq("user_id", userId)
    .eq("syllable", syllable);
  existingQuery = targetTone === null ? existingQuery.is("target_tone", null) : existingQuery.eq("target_tone", targetTone);
  const { data: existing, error: lookupError } = await existingQuery.maybeSingle();
  throwIfError(lookupError, "lookup weak sound");

  // Never seen this character be wrong before, and it's fine this time —
  // nothing worth tracking yet.
  if (!existing && !isWrong) return;

  const now = new Date().toISOString();

  if (existing) {
    const nextConsecutiveGood = isWrong ? 0 : existing.consecutive_good + 1;
    const justMastered = !isWrong && nextConsecutiveGood >= MASTERY_STREAK && existing.status !== "mastered";
    const nextStatus = justMastered ? "mastered" : isWrong ? "active" : existing.status;

    const { data: updated, error } = await supabase
      .from("pronunciation_weak_sounds")
      .update({
        times_seen: existing.times_seen + 1,
        times_wrong: existing.times_wrong + (isWrong ? 1 : 0),
        consecutive_good: nextConsecutiveGood,
        last_score: character.score,
        status: nextStatus,
        last_seen_at: now,
        ...(justMastered ? { mastered_at: now } : {}),
        ...(isWrong
          ? {
              example_sentence: sentence.hanzi,
              example_sentence_pinyin: sentence.pinyin,
              example_sentence_english: sentence.english,
            }
          : {}),
      })
      .eq("id", existing.id)
      .eq("times_seen", existing.times_seen)
      .select("id")
      .maybeSingle();
    throwIfError(error, "update weak sound");
    if (!updated && !retried) {
      await recordOneCharacter(supabase, userId, character, sentence, true);
    }
    return;
  }

  const { error } = await supabase.from("pronunciation_weak_sounds").insert({
    user_id: userId,
    syllable,
    pinyin,
    target_tone: targetTone,
    times_seen: 1,
    times_wrong: 1,
    consecutive_good: 0,
    last_score: character.score,
    example_sentence: sentence.hanzi,
    example_sentence_pinyin: sentence.pinyin,
    example_sentence_english: sentence.english,
    status: "active",
    last_seen_at: now,
  });
  if (isUniqueViolation(error) && !retried) {
    await recordOneCharacter(supabase, userId, character, sentence, true);
    return;
  }
  throwIfError(error, "insert weak sound");
}

/**
 * Rolls every scored character from an attempt into the learner's persistent
 * weak-sound record: a wrong score creates/reinforces a row (with this
 * attempt's sentence saved as fresh example context); enough consecutive
 * good scores in a row retires it to 'mastered'.
 */
export async function recordCharacterAttempts(
  supabase: SupabaseClient,
  userId: string,
  characters: CharacterScore[],
  sentence: SentenceContext,
): Promise<void> {
  for (const character of characters) {
    await recordOneCharacter(supabase, userId, character, sentence);
  }
}

/**
 * If this learner has practice history but no weak-sound rows (the table was
 * added after they already recorded), rebuild from stored sentence scores.
 */
export async function backfillWeakSoundsIfEmpty(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { count, error: countError } = await supabase
    .from("pronunciation_weak_sounds")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError || (count ?? 0) > 0) return;

  const [{ data: attempts }, { data: diagnostic }] = await Promise.all([
    supabase
      .from("pronunciation_attempts")
      .select("target_text, target_pinyin, score, created_at")
      .eq("user_id", userId)
      .eq("unit_type", "sentence")
      .order("created_at", { ascending: true }),
    supabase
      .from("pronunciation_diagnostic_attempts")
      .select("reference_text, score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const events: { at: string; characters: CharacterScore[]; sentence: SentenceContext }[] = [];

  for (const attempt of attempts ?? []) {
    const characters = charactersFromScore(attempt.score);
    if (!characters.length) continue;
    events.push({
      at: typeof attempt.created_at === "string" ? attempt.created_at : "",
      characters,
      sentence: {
        hanzi: typeof attempt.target_text === "string" ? attempt.target_text : "",
        pinyin: typeof attempt.target_pinyin === "string" ? attempt.target_pinyin : null,
        english: null,
      },
    });
  }

  for (const attempt of diagnostic ?? []) {
    if (attempt.score && typeof attempt.score === "object" && "skipped" in attempt.score) continue;
    const characters = charactersFromScore(attempt.score);
    if (!characters.length) continue;
    events.push({
      at: typeof attempt.created_at === "string" ? attempt.created_at : "",
      characters,
      sentence: {
        hanzi: typeof attempt.reference_text === "string" ? attempt.reference_text : "",
        pinyin: null,
        english: null,
      },
    });
  }

  events.sort((a, b) => a.at.localeCompare(b.at));
  if (events.length === 0) return;

  const { count: again } = await supabase
    .from("pronunciation_weak_sounds")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if ((again ?? 0) > 0) return;

  for (const event of events) {
    await recordCharacterAttempts(supabase, userId, event.characters, event.sentence);
  }
}
