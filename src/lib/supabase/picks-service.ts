import { createClient } from "./client";
import { Game, GameStatus, LeaderboardEntry } from "@/types";
import { MOCK_LEADERBOARD, MOCK_GAMES } from "@/lib/mock-data";
import { NFL_TEAMS } from "@/lib/nfl-data";
import { fetchNFLWeekSchedule, syncScheduleToSupabase } from "@/lib/api/nfl";

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
 * Fetch accurate live games and results for any NFL week
 * Primary: Real-time ESPN Scoreboard API (with background Supabase sync)
 * Fallback: Supabase games table, then static mock data
 */
export async function fetchWeekGames(
  weekNumber: number = 6,
  seasonYear: number = 2026,
  forceFresh: boolean = false
): Promise<Game[]> {
  try {
    const liveData = await fetchNFLWeekSchedule(weekNumber, seasonYear, forceFresh);
    if (liveData && liveData.week && liveData.week.games.length > 0) {
      // Background non-blocking sync to Supabase
      syncScheduleToSupabase(liveData.week.games, weekNumber, seasonYear).catch(() => {});
      return liveData.week.games;
    }
  } catch (err) {
    console.warn(`Notice: ESPN live schedule fetch returned error, falling back to database:`, err);
  }

  // Fallback to Supabase database
  const supabase = createClient();
  if (!supabase) return MOCK_GAMES;

  try {
    const { data: gamesData, error } = await supabase
      .from("games")
      .select("*")
      .eq("week_number", weekNumber)
      .order("kickoff_time", { ascending: true });

    if (error || !gamesData || gamesData.length === 0) {
      return MOCK_GAMES;
    }

    return gamesData.map((row) => {
      const mockFallback = MOCK_GAMES.find((g) => g.id === row.id);
      const homeTeam =
        NFL_TEAMS[row.home_team as keyof typeof NFL_TEAMS] ||
        mockFallback?.homeTeam;
      const awayTeam =
        NFL_TEAMS[row.away_team as keyof typeof NFL_TEAMS] ||
        mockFallback?.awayTeam;

      return {
        id: row.id,
        weekNumber: row.week_number,
        seasonYear: row.season_year,
        homeTeam: homeTeam || mockFallback!.homeTeam,
        awayTeam: awayTeam || mockFallback!.awayTeam,
        kickoffTime: row.kickoff_time,
        status: (row.status || mockFallback?.status || "SCHEDULED") as GameStatus,
        statusDetail: row.status === "FINAL" ? "Final" : undefined,
        spread:
          row.spread !== null && row.spread !== undefined
            ? Number(row.spread)
            : mockFallback?.spread,
        homeScore:
          row.home_score !== null && row.home_score !== undefined
            ? Number(row.home_score)
            : mockFallback?.homeScore,
        awayScore:
          row.away_score !== null && row.away_score !== undefined
            ? Number(row.away_score)
            : mockFallback?.awayScore,
        winnerTeamId: row.winner_team || mockFallback?.winnerTeamId,
        tvNetwork: row.tv_network || mockFallback?.tvNetwork,
        isMondayNight: Boolean(row.is_monday_night),
      };
    });
  } catch (err) {
    console.error("Error fetching games from Supabase:", err);
    return MOCK_GAMES;
  }
}

/**
 * Fetch user's saved picks from Supabase for a specific week
 */
export async function fetchUserPicksFromSupabase(
  userId: string,
  weekNumber: number = 6
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

    // 2. Fetch tiebreaker prediction for the selected week
    const { data: tieData, error: tieError } = await supabase
      .from("tiebreakers")
      .select("predicted_mnf_score")
      .eq("user_id", userId)
      .eq("week_number", weekNumber)
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
  mnfScore?: string | number,
  weekNumber: number = 6
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
            week_number: weekNumber,
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
 * Fetch and compute the live pool leaderboard from Supabase and live game outcomes
 */
export async function fetchLiveLeaderboard(
  weekNumber: number = 6,
  liveGames?: Game[]
): Promise<LeaderboardEntry[]> {
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

    // 3. Fetch all tiebreaker predictions for this week
    const { data: allTiebreakers } = await supabase
      .from("tiebreakers")
      .select("user_id, predicted_mnf_score, week_number")
      .eq("week_number", weekNumber);

    // 4. Build games map for evaluating winner outcomes
    const gamesMap: Record<string, { winner_team?: string | null; status: string }> = {};

    // First populate from liveGames if supplied
    if (liveGames && liveGames.length > 0) {
      for (const g of liveGames) {
        gamesMap[g.id] = {
          winner_team: g.winnerTeamId || null,
          status: g.status,
        };
      }
    }

    // Next merge Supabase games
    const { data: allGames } = await supabase
      .from("games")
      .select("id, winner_team, status")
      .eq("week_number", weekNumber);

    if (allGames && allGames.length > 0) {
      for (const g of allGames) {
        if (!gamesMap[g.id] || !gamesMap[g.id].winner_team) {
          const mockG = MOCK_GAMES.find((mg) => mg.id === g.id);
          gamesMap[g.id] = {
            winner_team: g.winner_team || mockG?.winnerTeamId,
            status: g.status || mockG?.status || "SCHEDULED",
          };
        }
      }
    }

    // If still empty, fallback to MOCK_GAMES
    if (Object.keys(gamesMap).length === 0) {
      for (const mg of MOCK_GAMES) {
        gamesMap[mg.id] = {
          winner_team: mg.winnerTeamId,
          status: mg.status,
        };
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
    const userPointsMap: Record<
      string,
      { weekly: number; correct: number; total: number }
    > = {};

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
          (game && (game.status === "FINAL" || game.winner_team) && game.winner_team === p.selected_team);

        if (isWinner) {
          userPointsMap[p.user_id].correct += 1;
          userPointsMap[p.user_id].weekly += p.points_awarded || 1;
        }
      }
    }

    // Baseline points for prior weeks to simulate a season-long race
    const BASELINE_SEASON_POINTS = 50;

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
        totalPoints: BASELINE_SEASON_POINTS + stats.weekly,
        correctPicks: BASELINE_SEASON_POINTS + stats.correct,
        totalPicks: 60 + totalPicksCount,
        predictedMnfScore: tiebreakersMap[prof.id],
        picks,
        rank: 1,
        weeklyRank: 1,
      };
    });

    // 1. Calculate Season Ranks (sorted by totalPoints descending)
    entries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    let currentSeasonRank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i].totalPoints < entries[i - 1].totalPoints) {
        currentSeasonRank = i + 1;
      }
      entries[i].rank = currentSeasonRank;
    }

    // 2. Calculate Weekly Ranks (sorted by weeklyPoints descending)
    const weeklySorted = [...entries].sort((a, b) => {
      if (b.weeklyPoints !== a.weeklyPoints) {
        return b.weeklyPoints - a.weeklyPoints;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    let currentWeeklyRank = 1;
    for (let i = 0; i < weeklySorted.length; i++) {
      if (i > 0 && weeklySorted[i].weeklyPoints < weeklySorted[i - 1].weeklyPoints) {
        currentWeeklyRank = i + 1;
      }
      weeklySorted[i].weeklyRank = currentWeeklyRank;
    }

    return entries;
  } catch (err) {
    console.error("Error computing live leaderboard:", err);
    return MOCK_LEADERBOARD;
  }
}
