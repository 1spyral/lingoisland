import { NextResponse } from "next/server";
import { loadHomeCore } from "@/lib/home/loadHomeDashboard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? undefined;
  try {
    const core = await loadHomeCore(date);
    if (!core.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(core);
  } catch (error) {
    console.error("Error in GET /api/home/dashboard:", error);
    return NextResponse.json({ error: "Failed to load home" }, { status: 500 });
  }
}
