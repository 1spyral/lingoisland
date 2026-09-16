import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DIAGNOSTIC_ITEM_COUNT } from "@/lib/pronunciation/diagnosticBank";
import { avgScores, tagBreakdown } from "@/lib/pronunciation/diagnosticBreakdown";

export const dynamic = "force-dynamic";

type Body = { passLabel?: "day1" | "remeasure" };

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
    const passLabel = body.passLabel === "remeasure" ? "remeasure" : "day1";

    const { data: rows } = await supabase
      .from("pronunciation_diagnostic_attempts")
      .select("item_index, overall_score, target_tags")
      .eq("user_id", user.id)
      .eq("pass_label", passLabel);

    if ((rows?.length ?? 0) < DIAGNOSTIC_ITEM_COUNT) {
      return NextResponse.json(
        {
          error: "Finish all check sentences before completing.",
          recorded: rows?.length ?? 0,
          total: DIAGNOSTIC_ITEM_COUNT,
        },
        { status: 400 },
      );
    }

    const overall = avgScores(
      (rows ?? [])
        .map((r) => r.overall_score)
        .filter((s): s is number => typeof s === "number"),
    );
    const worthWorkingOn = tagBreakdown(rows ?? []).slice(0, 3);

    if (passLabel === "day1") {
      await supabase.from("pronunciation_profiles").upsert(
        {
          user_id: user.id,
          diagnostic_completed_at: new Date().toISOString(),
          overall_score: overall,
          onboarded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } else {
      const { data: profile } = await supabase
        .from("pronunciation_profiles")
        .select("overall_score")
        .eq("user_id", user.id)
        .maybeSingle();
      const existing = typeof profile?.overall_score === "number" ? profile.overall_score : null;
      const blended =
        overall === null ? existing : existing === null ? overall : existing * 0.7 + overall * 0.3;
      await supabase
        .from("pronunciation_profiles")
        .update({
          overall_score: blended,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      passLabel,
      overallScore: overall,
      worthWorkingOn,
    });
  } catch (error) {
    console.error("[diagnostic/complete]", error);
    return NextResponse.json({ error: "Failed to complete diagnostic" }, { status: 500 });
  }
}
