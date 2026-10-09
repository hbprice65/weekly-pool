import { createClient } from "./client";
import { LeaderboardEntry } from "@/types";
import { MOCK_LEADERBOARD } from "@/lib/mock-data";

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

/**
 * Fetch and compute the live pool leaderboard from Supabase
 */
export async function fetchLiveLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createClient();
  if (!supabase) return MOCK_LEADERBOARD;

  try {
    // 1. Fetch all registered pool profiles
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url");

    if (profErr || !profiles || profiles.length === 0) {
      return MOCK_LEADERBOARD;
    }

    // 2. Fetch all picks
    const { data: allPicks } = await supabase
      .from("picks")
      .select("user_id, game_id, selected_team, is_correct, points_awarded");

    // 3. Fetch all tiebreaker predictions
    const { data: allTiebreakers } = await supabase
      .from("tiebreakers")
      .select("user_id, predicted_mnf_score");

    // 4. Fetch games to evaluate outcomes
    const { data: allGames } = await supabase
      .from("games")
      .select("id, winner_team, status");

    const gamesMap: Record<string, { winner_team?: string | null; status: string }> = {};
    if (allGames) {
      for (const g of allGames) {
        gamesMap[g.id] = { winner_team: g.winner_team, status: g.status };
      }
    }

    const tiebreakersMap: Record<string, number> = {};
    if (allTiebreakers) {
      for (const t of allTiebreakers) {
        tiebreakersMap[t.user_id] = t.predicted_mnf_score;
      }
    }

    // Group picks by user
    const userPicksMap: Record<string, Record<string, string>> = {};
    const userPointsMap: Record<string, { weekly: number; correct: number; total: number }> = {};

    if (allPicks) {
      for (const p of allPicks) {
        if (!userPicksMap[p.user_id]) userPicksMap[p.user_id] = {};
        userPicksMap[p.user_id][p.game_id] = p.selected_team;

        if (!userPointsMap[p.user_id]) {
          userPointsMap[p.user_id] = { weekly: 0, correct: 0, total: 0 };
        }
        userPointsMap[p.user_id].total += 1;

        // Check if pick is correct (explicit column or matched final game winner)
        const game = gamesMap[p.game_id];
        const isWinner =
          p.is_correct === true ||
          (game && game.status === "FINAL" && game.winner_team === p.selected_team);

        if (isWinner) {
          userPointsMap[p.user_id].correct += 1;
          userPointsMap[p.user_id].weekly += p.points_awarded || 1;
        }
      }
    }

    // Build leaderboard entries for each registered profile
    const entries: LeaderboardEntry[] = profiles.map((prof) => {
      const stats = userPointsMap[prof.id] || { weekly: 0, correct: 0, total: 0 };
      const picks = userPicksMap[prof.id] || {};
      const totalPicksCount = Object.keys(picks).length;

      return {
        userId: prof.id,
        displayName: prof.display_name || "Pool Player",
        avatarUrl: prof.avatar_url,
        weeklyPoints: stats.weekly,
        totalPoints: stats.weekly, // Season points
        correctPicks: stats.correct,
        totalPicks: totalPicksCount,
        predictedMnfScore: tiebreakersMap[prof.id],
        picks,
        rank: 1, // Will be computed after sorting
      };
    });

    // Sort: 1. points descending, 2. total picks descending, 3. name
    entries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.totalPicks !== a.totalPicks) {
        return b.totalPicks - a.totalPicks;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    // Assign ranking with tie handling
    let currentRank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i].totalPoints < entries[i - 1].totalPoints) {
        currentRank = i + 1;
      }
      entries[i].rank = currentRank;
    }

    return entries;
  } catch (err) {
    console.error("Error computing live leaderboard:", err);
    return MOCK_LEADERBOARD;
  }
}
