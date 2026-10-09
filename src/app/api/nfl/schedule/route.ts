import { NextRequest, NextResponse } from "next/server";
import { fetchNFLWeekSchedule, syncScheduleToSupabase } from "@/lib/api/nfl";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const weekParam = searchParams.get("week");
    const yearParam = searchParams.get("year");
    const syncParam = searchParams.get("sync"); // optional: sync=true to trigger Supabase upsert

    const weekNumber = weekParam ? parseInt(weekParam, 10) : 6;
    const seasonYear = yearParam ? parseInt(yearParam, 10) : 2026;
    const shouldSync = syncParam === "true";

    if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 22) {
      return NextResponse.json(
        { error: "Invalid week number. Must be between 1 and 22." },
        { status: 400 }
      );
    }

    const data = await fetchNFLWeekSchedule(weekNumber, seasonYear);

    // If requested, sync games into Supabase
    if (shouldSync && data.week.games.length > 0) {
      await syncScheduleToSupabase(data.week.games, weekNumber, seasonYear);
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API error fetching NFL schedule:", message);

    return NextResponse.json(
      { error: "Failed to fetch NFL schedule", details: message },
      { status: 500 }
    );
  }
}
