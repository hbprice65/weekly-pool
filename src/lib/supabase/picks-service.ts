import { createClient } from "./client";

export interface SavePicksResult {
  success: boolean;
  savedCount?: number;
  userId?: string;
  error?: string;
}

/**
 * Fetch the currently authenticated Supabase user
 */
export async function getCurrentUser() {
  const supabase = createClient();
  if (!supabase) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error("Error fetching Supabase user:", err);
    return null;
  }
}

/**
 * Fetch user's saved picks from Supabase
 */
export async function fetchUserPicksFromSupabase(
  userId: string
): Promise<{ picks: Record<string, string>; mnfScore?: string }> {
  const supabase = createClient();
  if (!supabase || !userId) return { picks: {} };

  try {
    // 1. Fetch picks for this user
    const { data: picksData, error: picksError } = await supabase
      .from("picks")
      .select("game_id, selected_team")
      .eq("user_id", userId);

    if (picksError) {
      console.error("Error fetching picks from Supabase:", picksError.message);
      return { picks: {} };
    }

    const picks: Record<string, string> = {};
    if (picksData) {
      for (const row of picksData) {
        picks[row.game_id] = row.selected_team;
      }
    }

    // 2. Fetch tiebreaker prediction for Week 6
    const { data: tieData, error: tieError } = await supabase
      .from("tiebreakers")
      .select("predicted_mnf_score")
      .eq("user_id", userId)
      .eq("week_number", 6)
      .maybeSingle();

    if (tieError) {
      console.warn("Error fetching tiebreaker:", tieError.message);
    }

    return {
      picks,
      mnfScore: tieData?.predicted_mnf_score?.toString(),
    };
  } catch (err) {
    console.error("Error loading picks from Supabase:", err);
    return { picks: {} };
  }
}

/**
 * Save / Upsert user picks and tiebreaker score to Supabase
 */
export async function saveUserPicksToSupabase(
  userId: string,
  picks: Record<string, string>,
  mnfScore?: string | number
): Promise<SavePicksResult> {
  const supabase = createClient();
  if (!supabase) {
    return { success: false, error: "Supabase client is not configured" };
  }

  if (!userId) {
    return { success: false, error: "No user authenticated" };
  }

  try {
    const pickEntries = Object.entries(picks);
    if (pickEntries.length === 0) {
      return { success: true, savedCount: 0, userId };
    }

    const rowsToUpsert = pickEntries.map(([gameId, selectedTeam]) => ({
      user_id: userId,
      game_id: gameId,
      selected_team: selectedTeam,
      updated_at: new Date().toISOString(),
    }));

    // Upsert picks into public.picks
    const { error: picksError } = await supabase
      .from("picks")
      .upsert(rowsToUpsert, { onConflict: "user_id,game_id" });

    if (picksError) {
      console.error("Error upserting picks into Supabase:", picksError);
      return { success: false, error: picksError.message, userId };
    }

    // Upsert tiebreaker if provided
    if (mnfScore !== undefined && mnfScore !== "") {
      const parsedScore =
        typeof mnfScore === "number" ? mnfScore : parseInt(mnfScore, 10);
      if (!isNaN(parsedScore)) {
        const { error: tieError } = await supabase.from("tiebreakers").upsert(
          {
            user_id: userId,
            week_number: 6,
            predicted_mnf_score: parsedScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,week_number" }
        );

        if (tieError) {
          console.warn("Could not save tiebreaker score:", tieError.message);
        }
      }
    }

    return {
      success: true,
      savedCount: rowsToUpsert.length,
      userId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error saving picks:", message);
    return { success: false, error: message, userId };
  }
}
