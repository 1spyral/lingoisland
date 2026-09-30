import { NextResponse } from "next/server";
import { loadHomeStats } from "@/lib/home/loadHomeDashboard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const tzOffset = Number(new URL(request.url).searchParams.get("tzOffset"));
  try {
    const stats = await loadHomeStats(Number.isFinite(tzOffset) ? tzOffset : NaN);
    if (!stats.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error in GET /api/home/stats:", error);
    return NextResponse.json({ error: "Failed to load home stats" }, { status: 500 });
  }
}
