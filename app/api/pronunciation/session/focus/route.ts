import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePronunciationDrillForWeakSounds } from "@/lib/deepseek/generate-pronunciation-drill";
import { cefrToHsk } from "@/lib/levelBands";

export const dynamic = "force-dynamic";

const MAX_WEAK_SOUNDS = 6;

type Body = { weakSoundIds?: string[] };

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const requestedIds = Array.isArray(body.weakSoundIds)
      ? body.weakSoundIds.filter((id): id is string => typeof id === "string").slice(0, MAX_WEAK_SOUNDS)
      : null;

    const [{ data: userProfile }, { data: weakSoundRows }] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("cefr_level, hsk_current_level")
        .eq("user_id", user.id)
        .maybeSingle(),
      requestedIds && requestedIds.length > 0
        ? supabase
            .from("pronunciation_weak_sounds")
            .select("id, syllable, pinyin, target_tone")
            .eq("user_id", user.id)
            .in("id", requestedIds)
        : supabase
            .from("pronunciation_weak_sounds")
            .select("id, syllable, pinyin, target_tone")
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("times_wrong", { ascending: false })
            .order("last_seen_at", { ascending: false })
            .limit(MAX_WEAK_SOUNDS),
    ]);

    // Preserve the caller's chosen order (e.g. modal selection order) when
    // specific ids were requested, rather than whatever order the DB returned.
    const orderedRows = requestedIds
      ? requestedIds
          .map((id) => (weakSoundRows ?? []).find((row) => row.id === id))
          .filter((row): row is NonNullable<typeof row> => !!row)
      : weakSoundRows ?? [];

    const weakSounds = orderedRows.map((entry) => ({
      syllable: entry.syllable,
      pinyin: entry.pinyin,
      targetTone: entry.target_tone,
    }));

    if (weakSounds.length === 0) {
      return NextResponse.json(
        { error: "Not enough practice history yet — do a few general sessions first." },
        { status: 400 },
      );
    }

    const hskLevel =
      typeof userProfile?.hsk_current_level === "number"
        ? String(userProfile.hsk_current_level)
        : String(cefrToHsk(userProfile?.cefr_level));

    const items = await generatePronunciationDrillForWeakSounds({ weakSounds, hskLevel });

    const { data: session, error } = await supabase
      .from("pronunciation_sessions")
      .insert({
        user_id: user.id,
        source: "weak_sounds_focus",
        sentences: items,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (error || !session) {
      console.error("[pronunciation/session/focus] insert failed", error);
      return NextResponse.json({ error: "Failed to start focus session" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("[pronunciation/session/focus] error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start focus session" },
      { status: 500 },
    );
  }
}
