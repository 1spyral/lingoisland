import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePronunciationDrill } from "@/lib/deepseek/generate-pronunciation-drill";
import { cefrToHsk } from "@/lib/levelBands";
import { loadSessionPlan } from "@/lib/pronunciation/sessionPlan";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: userProfile }, { data: journeys }, { data: pronunciationProfile }] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("cefr_level, hsk_current_level")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("journeys")
        .select("topic")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("pronunciation_profiles")
        .select("daily_minutes")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const hskLevel =
      typeof userProfile?.hsk_current_level === "number"
        ? String(userProfile.hsk_current_level)
        : String(cefrToHsk(userProfile?.cefr_level));
    const topics = Array.from(
      new Set(
        (journeys ?? [])
          .map((journey) => journey.topic?.trim())
          .filter((topic): topic is string => Boolean(topic)),
      ),
    );

    const plan = await loadSessionPlan(supabase, user.id, {
      hskLevel,
      topics,
      dailyMinutes: pronunciationProfile?.daily_minutes,
    });

    const items = await generatePronunciationDrill({
      hskLevel: plan.hskLevel,
      easierHskLevel: plan.easierHskLevel,
      topics: plan.topics,
      count: plan.count,
      recentWords: plan.recentWords,
      slots: plan.slots,
    });

    // Keep pronunciation-only progress in its own record. Shared preferences
    // (level, interests, and practice time) live in user_profiles/Journeys.
    await supabase.from("pronunciation_profiles").upsert(
      {
        user_id: user.id,
        onboarded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

    const { data: session, error } = await supabase
      .from("pronunciation_sessions")
      .insert({
        user_id: user.id,
        source: "standalone",
        sentences: items,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (error || !session) {
      console.error("[pronunciation/session] insert failed", error);
      return NextResponse.json({ error: "Failed to start practice session" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("[pronunciation/session] error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start practice session" },
      { status: 500 },
    );
  }
}
