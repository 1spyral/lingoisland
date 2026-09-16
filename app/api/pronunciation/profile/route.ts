import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("pronunciation_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ profile: profile ?? null });
}

const ALLOWED_DAILY_MINUTES = new Set([5, 10, 15, 20, 30, 60]);

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { dailyMinutes } = body as { dailyMinutes?: number };

  if (
    typeof dailyMinutes !== "number" ||
    !Number.isFinite(dailyMinutes) ||
    (!ALLOWED_DAILY_MINUTES.has(dailyMinutes) && (dailyMinutes < 1 || dailyMinutes > 180))
  ) {
    return NextResponse.json({ error: "Invalid dailyMinutes" }, { status: 400 });
  }

  const { data: profile, error } = await supabase
    .from("pronunciation_profiles")
    .upsert(
      {
        user_id: user.id,
        daily_minutes: dailyMinutes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .single();

  if (error || !profile) {
    console.error("[pronunciation/profile] PATCH upsert failed", error);
    return NextResponse.json({ error: "Failed to save preference" }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
