import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DIAGNOSTIC_BANK,
  DIAGNOSTIC_ITEM_COUNT,
} from "@/lib/pronunciation/diagnosticBank";

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

    if (passLabel === "remeasure") {
      const { data: profile } = await supabase
        .from("pronunciation_profiles")
        .select("diagnostic_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.diagnostic_completed_at) {
        return NextResponse.json(
          { error: "Complete your first pronunciation check before remeasuring." },
          { status: 400 },
        );
      }
    }

    const { data: existing } = await supabase
      .from("pronunciation_diagnostic_attempts")
      .select("item_index, overall_score")
      .eq("user_id", user.id)
      .eq("pass_label", passLabel)
      .order("item_index", { ascending: true });

    const doneIndexes = new Set((existing ?? []).map((row) => row.item_index));
    let nextIndex = 0;
    while (nextIndex < DIAGNOSTIC_ITEM_COUNT && doneIndexes.has(nextIndex)) nextIndex += 1;

    const completed = nextIndex >= DIAGNOSTIC_ITEM_COUNT;

    return NextResponse.json({
      passLabel,
      itemCount: DIAGNOSTIC_ITEM_COUNT,
      nextIndex: completed ? DIAGNOSTIC_ITEM_COUNT - 1 : nextIndex,
      completed,
      recordedCount: doneIndexes.size,
      items: DIAGNOSTIC_BANK.map((item) => ({
        index: item.index,
        hanzi: item.hanzi,
        pinyin: item.pinyin,
        english: item.english,
        tags: item.tags,
        recorded: doneIndexes.has(item.index),
      })),
    });
  } catch (error) {
    console.error("[pronunciation/diagnostic/start]", error);
    return NextResponse.json({ error: "Failed to start diagnostic" }, { status: 500 });
  }
}
