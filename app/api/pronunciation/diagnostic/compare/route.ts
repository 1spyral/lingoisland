import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DIAGNOSTIC_BANK,
  DIAGNOSTIC_TAG_LABELS,
  type DiagnosticTag,
} from "@/lib/pronunciation/diagnosticBank";
import { avgScores, tagScoreMap } from "@/lib/pronunciation/diagnosticBreakdown";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: day1 }, { data: remeasure }, { data: weakSounds }] = await Promise.all([
      supabase
        .from("pronunciation_diagnostic_attempts")
        .select("item_index, overall_score, target_tags, audio_path, reference_text")
        .eq("user_id", user.id)
        .eq("pass_label", "day1")
        .order("item_index", { ascending: true }),
      supabase
        .from("pronunciation_diagnostic_attempts")
        .select("item_index, overall_score, target_tags, audio_path, reference_text")
        .eq("user_id", user.id)
        .eq("pass_label", "remeasure")
        .order("item_index", { ascending: true }),
      supabase
        .from("pronunciation_weak_sounds")
        .select("id, syllable, pinyin, target_tone, times_wrong")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("times_wrong", { ascending: false })
        .limit(3),
    ]);

    if (!day1?.length || !remeasure?.length) {
      return NextResponse.json(
        { error: "Need both a baseline and a progress check to compare." },
        { status: 400 },
      );
    }

    const day1Overall = avgScores(
      day1.map((r) => r.overall_score).filter((s): s is number => typeof s === "number"),
    );
    const remeasureOverall = avgScores(
      remeasure.map((r) => r.overall_score).filter((s): s is number => typeof s === "number"),
    );

    const day1Tags = tagScoreMap(day1);
    const remeasureTags = tagScoreMap(remeasure);
    const allTags = Array.from(new Set([...Array.from(day1Tags.keys()), ...Array.from(remeasureTags.keys())]));

    const perTag = allTags
      .map((tag) => {
        const before = day1Tags.get(tag) ?? null;
        const after = remeasureTags.get(tag) ?? null;
        const delta = before != null && after != null ? Math.round((after - before) * 10) / 10 : null;
        return {
          tag: tag as DiagnosticTag,
          label: DIAGNOSTIC_TAG_LABELS[tag as DiagnosticTag] ?? tag,
          before,
          after,
          delta,
        };
      })
      .sort((a, b) => (b.delta ?? -999) - (a.delta ?? -999));

    const sentences = DIAGNOSTIC_BANK.map((item) => {
      const d1 = day1.find((r) => r.item_index === item.index);
      const rm = remeasure.find((r) => r.item_index === item.index);
      return {
        index: item.index,
        hanzi: item.hanzi,
        pinyin: item.pinyin,
        english: item.english,
        day1Score: d1?.overall_score ?? null,
        remeasureScore: rm?.overall_score ?? null,
        day1AudioPath: d1?.audio_path ?? null,
        remeasureAudioPath: rm?.audio_path ?? null,
      };
    });

    // Signed URLs for audio playback (1 hour).
    const paths = sentences
      .flatMap((s) => [s.day1AudioPath, s.remeasureAudioPath])
      .filter((p): p is string => !!p);
    const signed = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signedRows } = await supabase.storage
        .from("pronunciation-recordings")
        .createSignedUrls(paths, 3600);
      for (const row of signedRows ?? []) {
        if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
      }
    }

    const sentencesWithAudio = sentences.map((s) => ({
      ...s,
      day1AudioUrl: s.day1AudioPath ? signed.get(s.day1AudioPath) ?? null : null,
      remeasureAudioUrl: s.remeasureAudioPath ? signed.get(s.remeasureAudioPath) ?? null : null,
    }));

    return NextResponse.json({
      day1Overall,
      remeasureOverall,
      delta:
        day1Overall != null && remeasureOverall != null
          ? Math.round((remeasureOverall - day1Overall) * 10) / 10
          : null,
      perTag,
      sentences: sentencesWithAudio,
      nextWeakSounds: weakSounds ?? [],
    });
  } catch (error) {
    console.error("[diagnostic/compare]", error);
    return NextResponse.json({ error: "Failed to compare diagnostics" }, { status: 500 });
  }
}
