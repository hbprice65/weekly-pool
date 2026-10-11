import { createClient } from "./client";
import { Game, GameStatus, LeaderboardEntry, DEFAULT_POOL_ID } from "@/types";
import { MOCK_LEADERBOARD, MOCK_GAMES } from "@/lib/mock-data";
import { NFL_TEAMS } from "@/lib/nfl-data";
import {
  fetchNFLWeekSchedule,
  syncScheduleToSupabase,
  calculateFallbackWeek,
} from "@/lib/api/nfl";

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
 * Fallback: Supabase games table, then static fallback data
 */
export async function fetchWeekGames(
  weekNumber?: number,
  seasonYear: number = 2026,
  forceFresh: boolean = false
): Promise<Game[]> {
  const targetWeek = weekNumber ?? calculateFallbackWeek();

  try {
    const liveData = await fetchNFLWeekSchedule(targetWeek, seasonYear, forceFresh);
    if (liveData && liveData.week && liveData.week.games.length > 0) {
      // Background non-blocking sync to Supabase
      syncScheduleToSupabase(liveData.week.games, targetWeek, seasonYear).catch(() => {});
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
      .eq("week_number", targetWeek)
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
  weekNumber?: number
): Promise<{ picks: Record<string, string>; mnfScore?: string }> {
  const targetWeek = weekNumber ?? calculateFallbackWeek();
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
      .select("predicted_score, predicted_mnf_score")
      .eq("user_id", userId)
      .eq("week_number", targetWeek)
      .maybeSingle();

    if (tieError) {
      console.warn("Notice: could not query tiebreaker:", tieError.message);
    }

    const resolvedScore =
      tieData?.predicted_score ?? tieData?.predicted_mnf_score;

    return {
      picks,
      mnfScore: resolvedScore !== undefined && resolvedScore !== null ? resolvedScore.toString() : undefined,
    };
  } catch (err) {
    console.error("Error loading picks from Supabase:", err);
    return { picks: {} };
  }
}

/**
 * Save / Upsert user picks and tiebreaker score to Supabase for the current week
 */
export async function saveUserPicksToSupabase(
  userId: string,
  picks: Record<string, string>,
  mnfScore?: string | number,
  weekNumber?: number,
  games?: Game[]
): Promise<SavePicksResult> {
  const targetWeek = weekNumber ?? calculateFallbackWeek();
  const supabase = createClient();
  if (!supabase) {
    return { success: false, error: "Supabase client is not configured" };
  }

  if (!userId) {
    return { success: false, error: "No user authenticated" };
  }

  try {
    // Validate that target week is not in the future
    const activeWeek = calculateFallbackWeek();
    if (targetWeek > activeWeek) {
      return {
        success: false,
        error: `Picks for Week ${targetWeek} are locked. Picks will open when this week officially begins.`,
        userId,
      };
    }

    const pickEntries = Object.entries(picks);
    if (pickEntries.length === 0) {
      return { success: true, savedCount: 0, userId };
    }

    const now = Date.now();
    // Validate on the client that we only attempt to save picks for games that have not kicked off
    const pickEntriesToSave = pickEntries.filter(([gameId]) => {
      const g = games?.find((game) => game.id === gameId);
      if (!g) return true;
      const isPastKickoff = new Date(g.kickoffTime).getTime() <= now;
      const isLiveOrFinal = g.status === "IN_PROGRESS" || g.status === "FINAL";
      return !isPastKickoff && !isLiveOrFinal;
    });

    if (pickEntriesToSave.length === 0 && (!mnfScore || mnfScore === "")) {
      return { success: true, savedCount: 0, userId };
    }

    // 1. Ensure profile exists in public.profiles with display name & avatar
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user && userData.user.id === userId) {
        const metadata = userData.user.user_metadata || {};
        const displayName =
          metadata.full_name ||
          metadata.name ||
          userData.user.email?.split("@")[0] ||
          "Player";
        const avatarUrl = metadata.avatar_url || metadata.picture || null;

        await supabase.from("profiles").upsert(
          {
            id: userId,
            display_name: displayName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      }
    } catch {
      // Non-blocking fallback
    }

    // 2. Upsert picks into public.picks (V2 schema with pool_id, fallback to V1)
    let savedCount = 0;
    if (pickEntriesToSave.length > 0) {
      const rowsV2 = pickEntriesToSave.map(([gameId, selectedTeam]) => ({
        pool_id: DEFAULT_POOL_ID,
        user_id: userId,
        game_id: gameId,
        week_number: targetWeek,
        selected_team: selectedTeam,
        updated_at: new Date().toISOString(),
      }));

      let { error: picksError } = await supabase
        .from("picks")
        .upsert(rowsV2, { onConflict: "pool_id,user_id,game_id" });

      // Fallback to V1 schema if pool_id column does not exist yet
      if (
        picksError &&
        (picksError.message.includes("pool_id") ||
          picksError.message.includes("column") ||
          picksError.code === "PGRST204" ||
          picksError.code === "42703")
      ) {
        const rowsV1 = pickEntriesToSave.map(([gameId, selectedTeam]) => ({
          user_id: userId,
          game_id: gameId,
          selected_team: selectedTeam,
          updated_at: new Date().toISOString(),
        }));
        const resV1 = await supabase
          .from("picks")
          .upsert(rowsV1, { onConflict: "user_id,game_id" });
        picksError = resV1.error;
      }

      if (picksError) {
        console.error("Error upserting picks into Supabase:", picksError);
        const isRls =
          picksError.message.toLowerCase().includes("row-level security") ||
          picksError.message.toLowerCase().includes("policy");
        const errorMsg = isRls
          ? "Picks cannot be submitted or changed after a game kicks off."
          : picksError.message;
        return { success: false, error: errorMsg, userId };
      }
      savedCount = pickEntriesToSave.length;
    }

    // Upsert tiebreaker for target week (only before MNF kickoff)
    const mnfGame =
      games?.find((g) => g.isMondayNight) ||
      (games && games.length > 0 ? games[games.length - 1] : undefined);
    const isMnfStarted = Boolean(
      mnfGame &&
        (new Date(mnfGame.kickoffTime).getTime() <= now ||
          mnfGame.status === "IN_PROGRESS" ||
          mnfGame.status === "FINAL")
    );

    if (mnfScore !== undefined && mnfScore !== "" && !isMnfStarted) {
      const parsedScore =
        typeof mnfScore === "number" ? mnfScore : parseInt(mnfScore, 10);
      if (!isNaN(parsedScore)) {
        let { error: tieError } = await supabase.from("tiebreakers").upsert(
          {
            pool_id: DEFAULT_POOL_ID,
            user_id: userId,
            week_number: targetWeek,
            predicted_score: parsedScore,
            predicted_mnf_score: parsedScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "pool_id,user_id,week_number" }
        );

        if (
          tieError &&
          (tieError.message.includes("pool_id") ||
            tieError.message.includes("column") ||
            tieError.code === "PGRST204" ||
            tieError.code === "42703")
        ) {
          const resTieV1 = await supabase.from("tiebreakers").upsert(
            {
              user_id: userId,
              week_number: targetWeek,
              predicted_mnf_score: parsedScore,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,week_number" }
          );
          tieError = resTieV1.error;
        }

        if (tieError) {
          console.warn("Could not save tiebreaker score:", tieError.message);
        }
      }
    }

    return {
      success: true,
      savedCount,
      userId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error saving picks:", message);
    return { success: false, error: message, userId };
  }
}

/**
 * Fetch and compute live pool leaderboard adapting to actual games and season-wide picks
 */
export async function fetchLiveLeaderboard(
  weekNumber?: number,
  liveGames?: Game[]
): Promise<LeaderboardEntry[]> {
  const targetWeek = weekNumber ?? calculateFallbackWeek();
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

    // 2. Fetch all picks across all weeks
    const { data: allPicks } = await supabase
      .from("picks")
      .select("user_id, game_id, selected_team, is_correct, points, points_awarded");

    // 3. Fetch tiebreakers for the target week
    const { data: allTiebreakers } = await supabase
      .from("tiebreakers")
      .select("user_id, predicted_score, predicted_mnf_score, week_number")
      .eq("week_number", targetWeek);

    // 4. Build comprehensive games map to know week_number, winner, and status for all games
    const gamesMap: Record<
      string,
      { week_number?: number; winner_team?: string | null; status: string }
    > = {};

    // Populate from liveGames first (authoritative for current week)
    if (liveGames && liveGames.length > 0) {
      for (const g of liveGames) {
        gamesMap[g.id] = {
          week_number: g.weekNumber,
          winner_team: g.winnerTeamId || null,
          status: g.status,
        };
      }
    }

    // Fetch all games in database to evaluate previous weeks as well
    const { data: allGames } = await supabase
      .from("games")
      .select("id, week_number, winner_team, status");

    if (allGames && allGames.length > 0) {
      for (const g of allGames) {
        if (!gamesMap[g.id]) {
          gamesMap[g.id] = {
            week_number: g.week_number,
            winner_team: g.winner_team,
            status: g.status,
          };
        }
      }
    }

    const tiebreakersMap: Record<string, number> = {};
    if (allTiebreakers) {
      for (const t of allTiebreakers) {
        const record = t as Record<string, unknown>;
        const val = record.predicted_score ?? record.predicted_mnf_score;
        if (val !== undefined && val !== null) {
          tiebreakersMap[t.user_id] = Number(val);
        }
      }
    }

    // Group picks and compute real stats per user
    const userWeeklyPicksMap: Record<string, Record<string, string>> = {};
    const userStatsMap: Record<
      string,
      { weeklyPoints: number; totalPoints: number; totalCorrect: number; totalPicks: number }
    > = {};

    if (allPicks) {
      for (const p of allPicks) {
        const game = gamesMap[p.game_id];
        const isCurrentWeekGame =
          game?.week_number === targetWeek ||
          (!game?.week_number && liveGames?.some((g) => g.id === p.game_id));

        // Save into weekly picks map for the current week scoreboard matrix
        if (isCurrentWeekGame) {
          if (!userWeeklyPicksMap[p.user_id]) userWeeklyPicksMap[p.user_id] = {};
          userWeeklyPicksMap[p.user_id][p.game_id] = p.selected_team;
        }

        if (!userStatsMap[p.user_id]) {
          userStatsMap[p.user_id] = {
            weeklyPoints: 0,
            totalPoints: 0,
            totalCorrect: 0,
            totalPicks: 0,
          };
        }
        userStatsMap[p.user_id].totalPicks += 1;

        // Evaluate whether this pick won based strictly on verified game winner
        const isWinner = Boolean(
          game &&
          (game.status === "FINAL" || Boolean(game.winner_team)) &&
          game.winner_team === p.selected_team
        );

        if (isWinner) {
          const pts = 1;
          userStatsMap[p.user_id].totalPoints += pts;
          userStatsMap[p.user_id].totalCorrect += 1;

          if (isCurrentWeekGame) {
            userStatsMap[p.user_id].weeklyPoints += pts;
          }
        }
      }
    }

    // Build leaderboard entries from actual user picks
    const entries: LeaderboardEntry[] = profiles.map((prof) => {
      const stats = userStatsMap[prof.id] || {
        weeklyPoints: 0,
        totalPoints: 0,
        totalCorrect: 0,
        totalPicks: 0,
      };
      const picks = userWeeklyPicksMap[prof.id] || {};

      return {
        userId: prof.id,
        displayName: prof.display_name || "Pool Player",
        avatarUrl: prof.avatar_url,
        weeklyPoints: stats.weeklyPoints,
        totalPoints: stats.totalPoints,
        correctPicks: stats.totalCorrect,
        totalPicks: stats.totalPicks,
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
      if (b.correctPicks !== a.correctPicks) {
        return b.correctPicks - a.correctPicks;
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
