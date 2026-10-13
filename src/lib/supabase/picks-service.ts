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

    // 2. Fetch all picks across all weeks (selecting valid schema columns)
    const { data: allPicks, error: picksErr } = await supabase
      .from("picks")
      .select("user_id, game_id, selected_team, is_correct, points, week_number");

    if (picksErr) {
      console.warn("Notice: could not fetch picks from Supabase:", picksErr.message);
    }

    // 3. Fetch tiebreakers for the target week
    const { data: allTiebreakers } = await supabase
      .from("tiebreakers")
      .select("user_id, predicted_score, predicted_mnf_score, week_number")
      .eq("week_number", targetWeek);

    // 4. Build comprehensive games map to know week_number, winner, and status for all games
    interface GameEvaluation {
      week_number: number;
      season_year: number;
      winner_team: string | null;
      status: string;
      isFinal: boolean;
      isTie: boolean;
    }
    const gamesMap: Record<string, GameEvaluation> = {};

    // Populate from liveGames first (authoritative for current week)
    if (liveGames && liveGames.length > 0) {
      for (const g of liveGames) {
        const isFinal = g.status === "FINAL";
        const isTie =
          isFinal &&
          g.awayScore !== undefined &&
          g.homeScore !== undefined &&
          g.awayScore === g.homeScore;
        let winner = g.winnerTeamId || null;
        if (
          isFinal &&
          !winner &&
          g.awayScore !== undefined &&
          g.homeScore !== undefined
        ) {
          winner = isTie
            ? "TIE"
            : g.homeScore > g.awayScore
            ? g.homeTeam.id
            : g.awayTeam.id;
        }
        gamesMap[g.id] = {
          week_number: g.weekNumber,
          season_year: g.seasonYear || 2026,
          winner_team: winner,
          status: g.status,
          isFinal,
          isTie,
        };
      }
    }

    // Fetch all games in database to evaluate previous weeks as well
    const { data: allGames } = await supabase
      .from("games")
      .select(
        "id, week_number, winner_team, status, season_year, home_score, away_score, home_team, away_team"
      );

    if (allGames && allGames.length > 0) {
      for (const g of allGames) {
        if (!gamesMap[g.id]) {
          const isFinal = g.status === "FINAL";
          const isTie =
            isFinal &&
            g.away_score !== null &&
            g.home_score !== null &&
            g.away_score === g.home_score;
          let winner = g.winner_team || null;
          if (
            isFinal &&
            !winner &&
            g.home_score !== null &&
            g.away_score !== null
          ) {
            winner = isTie
              ? "TIE"
              : g.home_score > g.away_score
              ? g.home_team
              : g.away_team;
          }
          gamesMap[g.id] = {
            week_number: g.week_number,
            season_year: g.season_year || 2026,
            winner_team: winner,
            status: g.status,
            isFinal,
            isTie,
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

    // Track detailed user metrics
    const userWeeklyPicksMap: Record<string, Record<string, string>> = {};
    const userSeasonPoints: Record<string, number> = {};
    const userSeasonWins: Record<string, number> = {};
    const userSeasonLosses: Record<string, number> = {};
    const userWeeklyPoints: Record<number, Record<string, number>> = {};
    const userLifetimePoints: Record<string, number> = {};
    const userLifetimeWins: Record<string, number> = {};
    const userLifetimeLosses: Record<string, number> = {};
    const userSeasons: Record<string, Set<number>> = {};
    const userCurrentWeekPoints: Record<string, number> = {};

    if (allPicks) {
      for (const p of allPicks) {
        // Skip unpicked or blank games - never count against the user
        if (!p.selected_team || p.selected_team.trim() === "") continue;

        const game = gamesMap[p.game_id];
        if (!game) continue;

        const sYear = game.season_year || 2026;
        const wNum = game.week_number || p.week_number || targetWeek;

        if (!userSeasons[p.user_id]) userSeasons[p.user_id] = new Set();
        userSeasons[p.user_id].add(sYear);

        // Save into weekly picks map for the current week scoreboard matrix
        if (wNum === targetWeek) {
          if (!userWeeklyPicksMap[p.user_id]) userWeeklyPicksMap[p.user_id] = {};
          userWeeklyPicksMap[p.user_id][p.game_id] = p.selected_team;
        }

        // Only evaluate win/loss record on finalized games (unfinalized games are neither wins nor losses)
        if (!game.isFinal) continue;

        const isWinner = Boolean(
          game.winner_team && game.winner_team === p.selected_team
        );
        const isTie = game.isTie || game.winner_team === "TIE";

        if (isWinner) {
          userLifetimeWins[p.user_id] = (userLifetimeWins[p.user_id] || 0) + 1;
          userLifetimePoints[p.user_id] = (userLifetimePoints[p.user_id] || 0) + 1;

          if (!userWeeklyPoints[wNum]) userWeeklyPoints[wNum] = {};
          userWeeklyPoints[wNum][p.user_id] = (userWeeklyPoints[wNum][p.user_id] || 0) + 1;

          if (wNum === targetWeek) {
            userCurrentWeekPoints[p.user_id] = (userCurrentWeekPoints[p.user_id] || 0) + 1;
          }

          if (sYear === 2026) {
            userSeasonWins[p.user_id] = (userSeasonWins[p.user_id] || 0) + 1;
            userSeasonPoints[p.user_id] = (userSeasonPoints[p.user_id] || 0) + 1;
          }
        } else if (!isTie) {
          // Submitted pick that lost on a final game
          userLifetimeLosses[p.user_id] = (userLifetimeLosses[p.user_id] || 0) + 1;
          if (sYear === 2026) {
            userSeasonLosses[p.user_id] = (userSeasonLosses[p.user_id] || 0) + 1;
          }
        }
      }
    }

    // Calculate weekly wins (how many weeks the participant had the most points in the pool)
    const userSeasonWeeksWon: Record<string, number> = {};
    const userLifetimeWeeksWon: Record<string, number> = {};

    for (const [, scoresMap] of Object.entries(userWeeklyPoints)) {
      const scores = Object.values(scoresMap);
      if (scores.length === 0) continue;
      const maxScore = Math.max(...scores);
      if (maxScore > 0) {
        for (const [userId, score] of Object.entries(scoresMap)) {
          if (score === maxScore) {
            userSeasonWeeksWon[userId] = (userSeasonWeeksWon[userId] || 0) + 1;
            userLifetimeWeeksWon[userId] = (userLifetimeWeeksWon[userId] || 0) + 1;
          }
        }
      }
    }

    // Build leaderboard entries with full season and lifetime stats
    const entries: LeaderboardEntry[] = profiles.map((prof) => {
      const mockFallback = MOCK_LEADERBOARD.find((m) => m.userId === prof.id);

      const sWins = userSeasonWins[prof.id] ?? mockFallback?.seasonRecord.wins ?? 0;
      const sLosses = userSeasonLosses[prof.id] ?? mockFallback?.seasonRecord.losses ?? 0;
      const sEval = sWins + sLosses;
      const sWinPct = sEval > 0 ? Math.round((sWins / sEval) * 1000) / 10 : 0;
      const sWeeksWon = userSeasonWeeksWon[prof.id] ?? mockFallback?.seasonWeeksWon ?? 0;
      const sPoints = userSeasonPoints[prof.id] ?? mockFallback?.totalPoints ?? 0;

      const lWins = userLifetimeWins[prof.id] ?? mockFallback?.lifetimeStats?.record.wins ?? sWins;
      const lLosses = userLifetimeLosses[prof.id] ?? mockFallback?.lifetimeStats?.record.losses ?? sLosses;
      const lEval = lWins + lLosses;
      const lWinPct = lEval > 0 ? Math.round((lWins / lEval) * 1000) / 10 : 0;
      const lWeeksWon = userLifetimeWeeksWon[prof.id] ?? mockFallback?.lifetimeStats?.weeksWon ?? sWeeksWon;
      const lPoints = userLifetimePoints[prof.id] ?? mockFallback?.lifetimeStats?.totalPoints ?? sPoints;
      const seasonsCount = Math.max(userSeasons[prof.id]?.size ?? mockFallback?.lifetimeStats?.seasonsCount ?? 1, 1);

      const picks = userWeeklyPicksMap[prof.id] || {};

      return {
        userId: prof.id,
        displayName: prof.display_name || mockFallback?.displayName || "Pool Player",
        avatarUrl: prof.avatar_url || mockFallback?.avatarUrl,
        weeklyPoints: userCurrentWeekPoints[prof.id] ?? mockFallback?.weeklyPoints ?? 0,
        totalPoints: sPoints,
        correctPicks: sWins,
        totalPicks: sEval,
        predictedMnfScore: tiebreakersMap[prof.id] ?? mockFallback?.predictedMnfScore,
        picks,
        rank: 1,
        weeklyRank: 1,
        seasonWeeksWon: sWeeksWon,
        seasonRecord: {
          wins: sWins,
          losses: sLosses,
          evaluatedPicks: sEval,
          winPct: sWinPct,
          formatted: `${sWins}-${sLosses}`,
        },
        lifetimeStats: {
          totalPoints: lPoints,
          record: {
            wins: lWins,
            losses: lLosses,
            evaluatedPicks: lEval,
            winPct: lWinPct,
            formatted: `${lWins}-${lLosses}`,
          },
          weeksWon: lWeeksWon,
          rank: mockFallback?.lifetimeStats?.rank,
          seasonsCount,
        },
      };
    });

    // 1. Calculate Season Ranks (sorted by totalPoints descending, then wins)
    entries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.seasonRecord.wins !== a.seasonRecord.wins) {
        return b.seasonRecord.wins - a.seasonRecord.wins;
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
