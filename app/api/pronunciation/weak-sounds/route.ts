import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { backfillWeakSoundsIfEmpty } from "@/lib/pronunciation/weakSoundsStore";

export const dynamic = "force-dynamic";

const LIST_LIMIT = 50;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam === "mastered" ? "mastered" : statusParam === "all" ? "all" : "active";
  const orderRecent = searchParams.get("order") === "recent";
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : LIST_LIMIT;

  try {
    await backfillWeakSoundsIfEmpty(supabase, user.id);
  } catch (err) {
    console.warn("[pronunciation/weak-sounds] backfill failed", err);
  }

  let query = supabase.from("pronunciation_weak_sounds").select("*").eq("user_id", user.id);
  if (status !== "all") query = query.eq("status", status);
  query = orderRecent
    ? query.order("last_seen_at", { ascending: false })
    : query.order("times_wrong", { ascending: false }).order("last_seen_at", { ascending: false });

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error("[pronunciation/weak-sounds] list failed", error);
    return NextResponse.json({ error: "Failed to load weak sounds" }, { status: 500 });
  }

  return NextResponse.json({ weakSounds: data ?? [] });
}
