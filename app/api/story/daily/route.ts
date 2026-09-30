import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDailyStory } from "@/lib/stories/getOrCreateDailyStory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || undefined;
    const story = await getOrCreateDailyStory({
      supabaseServerClient: supabase,
      date,
    });

    if (!story) {
      return NextResponse.json(
        {
          error:
            "Daily stories need vocabulary from your topic islands. Create an island and generate words first.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ story });
  } catch (error) {
    console.error("Error in GET /api/story/daily:", error);
    return NextResponse.json(
      {
        error:
          "We couldn't generate today's story. Please try again in a moment.",
      },
      { status: 502 }
    );
  }
}

