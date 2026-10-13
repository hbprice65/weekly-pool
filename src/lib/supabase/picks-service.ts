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

    // 3. Fetch tiebreakers across all weeks
    const { data: allTiebreakers } = await supabase
      .from("tiebreakers")
      .select("user_id, predicted_score, predicted_mnf_score, week_number");

    // Determine game broadcast window for clutch calculations
    function getGameWindow(
      kickoffTime?: string,
      isMondayNight?: boolean
    ): "EARLY" | "SNF" | "MNF" {
      if (isMondayNight) return "MNF";
      if (!kickoffTime) return "EARLY";

      try {
        const date = new Date(kickoffTime);
        if (isNaN(date.getTime())) return "EARLY";

        const formatter = new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          hour: "numeric",
          hour12: false,
          timeZone: "America/New_York",
        });
        const parts = formatter.formatToParts(date);
        const weekday = parts.find((p) => p.type === "weekday")?.value;
        const hour = parseInt(
          parts.find((p) => p.type === "hour")?.value || "0",
          10
        );

        if (weekday === "Mon") {
          return "MNF";
        }
        if (weekday === "Sun" && hour >= 19) {
          return "SNF";
        }
        return "EARLY";
      } catch {
        return "EARLY";
      }
    }

    // 4. Build comprehensive games map to know week_number, winner, and status for all games
    interface GameEvaluation {
      week_number: number;
      season_year: number;
      winner_team: string | null;
      status: string;
      isFinal: boolean;
      isTie: boolean;
      kickoff_time?: string;
      is_monday_night?: boolean;
      home_score?: number | null;
      away_score?: number | null;
    }
    const gamesMap: Record<string, GameEvaluation> = {};

    const registerGameToMap = (g: Game) => {
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
        kickoff_time: g.kickoffTime,
        is_monday_night: Boolean(g.isMondayNight),
        home_score: g.homeScore,
        away_score: g.awayScore,
      };
    };

    // Fetch all games in database
    const { data: allGames } = await supabase
      .from("games")
      .select(
        "id, week_number, winner_team, status, season_year, home_score, away_score, home_team, away_team, kickoff_time, is_monday_night"
      );

    // Identify all weeks that need game scores to evaluate picks accurately
    const weeksToFetch = new Set<number>();
    if (targetWeek && !isNaN(targetWeek)) weeksToFetch.add(targetWeek);
    const fallbackW = calculateFallbackWeek();
    if (fallbackW && !isNaN(fallbackW)) weeksToFetch.add(fallbackW);

    const dbGameWeekMap = new Map<string, number>();
    if (allGames) {
      for (const g of allGames) {
        if (g.id && g.week_number) dbGameWeekMap.set(g.id, g.week_number);
      }
    }

    if (allPicks) {
      for (const p of allPicks) {
        const w = Number(p.week_number);
        if (!isNaN(w) && w > 0) {
          weeksToFetch.add(w);
        } else if (p.game_id && dbGameWeekMap.has(p.game_id)) {
          weeksToFetch.add(dbGameWeekMap.get(p.game_id)!);
        }
      }
    }

    // Fetch official live/final schedules for all relevant weeks from ESPN in parallel (with in-memory cache)
    await Promise.all(
      Array.from(weeksToFetch).map(async (w) => {
        if (w === targetWeek && liveGames && liveGames.length > 0) {
          for (const g of liveGames) {
            registerGameToMap(g);
          }
          return;
        }
        try {
          const liveData = await fetchNFLWeekSchedule(w, 2026);
          if (liveData?.week?.games) {
            for (const g of liveData.week.games) {
              registerGameToMap(g);
            }
          }
        } catch (err) {
          console.warn(`Could not fetch live schedule for week ${w}:`, err);
        }
      })
    );

    // If liveGames was provided for targetWeek, ensure it is registered (authoritative for targetWeek)
    if (liveGames && liveGames.length > 0) {
      for (const g of liveGames) {
        registerGameToMap(g);
      }
    }

    // Fallback: Populate any remaining games from Supabase games table
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
            kickoff_time: g.kickoff_time,
            is_monday_night: Boolean(g.is_monday_night),
            home_score: g.home_score,
            away_score: g.away_score,
          };
        }
      }
    }

    const tiebreakersByWeek: Record<number, Record<string, number>> = {};
    const tiebreakersMap: Record<string, number> = {};
    if (allTiebreakers) {
      for (const t of allTiebreakers) {
        const record = t as Record<string, unknown>;
        const val = record.predicted_score ?? record.predicted_mnf_score;
        const w = Number(record.week_number);
        const uid = String(record.user_id);
        if (val !== undefined && val !== null && !isNaN(w)) {
          if (!tiebreakersByWeek[w]) tiebreakersByWeek[w] = {};
          tiebreakersByWeek[w][uid] = Number(val);
          if (w === targetWeek) {
            tiebreakersMap[uid] = Number(val);
          }
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
    const weekSeasonMap: Record<number, number> = {};

    // Tracking for Clutch calculations:
    // Points earned in EARLY final games per season and week
    const userEarlyPointsByWeek: Record<string, Record<number, Record<string, number>>> = {};
    // Points earned in EARLY + SNF final games per season and week
    const userPreMnfPointsByWeek: Record<string, Record<number, Record<string, number>>> = {};

    interface PrimetimePick {
      userId: string;
      seasonYear: number;
      weekNumber: number;
      isWinner: boolean;
      isTie: boolean;
    }
    const snfPicksList: PrimetimePick[] = [];
    const mnfPicksList: PrimetimePick[] = [];

    if (allPicks) {
      for (const p of allPicks) {
        // Skip unpicked or blank games - never count against the user
        if (!p.selected_team || p.selected_team.trim() === "") continue;

        const game = gamesMap[p.game_id];
        if (!game) continue;

        const sYear = game.season_year || 2026;
        const wNum = game.week_number || p.week_number || targetWeek;
        weekSeasonMap[wNum] = sYear;

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

        // Track points by time window for clutch game evaluation
        const windowType = getGameWindow(game.kickoff_time, game.is_monday_night);
        const sYearKey = String(sYear);

        if (windowType === "EARLY") {
          if (isWinner) {
            if (!userEarlyPointsByWeek[sYearKey]) userEarlyPointsByWeek[sYearKey] = {};
            if (!userEarlyPointsByWeek[sYearKey][wNum]) userEarlyPointsByWeek[sYearKey][wNum] = {};
            userEarlyPointsByWeek[sYearKey][wNum][p.user_id] =
              (userEarlyPointsByWeek[sYearKey][wNum][p.user_id] || 0) + 1;

            if (!userPreMnfPointsByWeek[sYearKey]) userPreMnfPointsByWeek[sYearKey] = {};
            if (!userPreMnfPointsByWeek[sYearKey][wNum]) userPreMnfPointsByWeek[sYearKey][wNum] = {};
            userPreMnfPointsByWeek[sYearKey][wNum][p.user_id] =
              (userPreMnfPointsByWeek[sYearKey][wNum][p.user_id] || 0) + 1;
          }
        } else if (windowType === "SNF") {
          if (isWinner) {
            if (!userPreMnfPointsByWeek[sYearKey]) userPreMnfPointsByWeek[sYearKey] = {};
            if (!userPreMnfPointsByWeek[sYearKey][wNum]) userPreMnfPointsByWeek[sYearKey][wNum] = {};
            userPreMnfPointsByWeek[sYearKey][wNum][p.user_id] =
              (userPreMnfPointsByWeek[sYearKey][wNum][p.user_id] || 0) + 1;
          }
          snfPicksList.push({
            userId: p.user_id,
            seasonYear: sYear,
            weekNumber: wNum,
            isWinner,
            isTie,
          });
        } else if (windowType === "MNF") {
          mnfPicksList.push({
            userId: p.user_id,
            seasonYear: sYear,
            weekNumber: wNum,
            isWinner,
            isTie,
          });
        }
      }
    }

    // Calculate weekly wins and evaluate tiebreakers when MNF goes final:
    // If there is a tie after the MNF game goes final, the tiebreaker goes to the person
    // who got closest to the MNF total score. They get an extra point to break the tie
    // and name a winner for the week.
    // If still tied after the tiebreaker, all tied first place users win that week.
    // Tiebreaker outcomes count on the overall picks record, and are tracked in tiebreakRecord.
    const userSeasonTbWins: Record<string, number> = {};
    const userSeasonTbLosses: Record<string, number> = {};
    const userLifetimeTbWins: Record<string, number> = {};
    const userLifetimeTbLosses: Record<string, number> = {};

    const userSeasonWeeksWon: Record<string, number> = {};
    const userLifetimeWeeksWon: Record<string, number> = {};
    const userTargetWeekDiff: Record<string, number> = {};

    // Group games by week number
    const gamesByWeek: Record<number, GameEvaluation[]> = {};
    for (const g of Object.values(gamesMap)) {
      if (!gamesByWeek[g.week_number]) gamesByWeek[g.week_number] = [];
      gamesByWeek[g.week_number].push(g);
    }

    for (const [wStr, scoresMap] of Object.entries(userWeeklyPoints)) {
      const wNum = Number(wStr);
      const sYear = weekSeasonMap[wNum] || 2026;
      const scores = Object.values(scoresMap);
      if (scores.length === 0) continue;

      const maxScore = Math.max(...scores);
      if (maxScore <= 0) continue;

      const tiedForFirst = Object.entries(scoresMap)
        .filter(([, score]) => score === maxScore)
        .map(([userId]) => userId);

      const weekGames = gamesByWeek[wNum] || [];
      const mnfGames = weekGames.filter(
        (g) =>
          g.is_monday_night ||
          getGameWindow(g.kickoff_time, g.is_monday_night) === "MNF"
      );

      // MNF game is final when all MNF games in that week (or all games if none were MNF) are final
      const isMnfFinal =
        mnfGames.length > 0
          ? mnfGames.every((g) => g.isFinal)
          : weekGames.length > 0 && weekGames.every((g) => g.isFinal);

      if (tiedForFirst.length > 1 && isMnfFinal) {
        // Tiebreaker goes into effect!
        const tbGame =
          mnfGames.length > 0
            ? mnfGames[mnfGames.length - 1]
            : weekGames[weekGames.length - 1];

        const actualMnfTotal =
          tbGame &&
          tbGame.home_score !== null &&
          tbGame.home_score !== undefined &&
          tbGame.away_score !== null &&
          tbGame.away_score !== undefined
            ? tbGame.home_score + tbGame.away_score
            : null;

        const userDiffs: Record<string, number> = {};
        for (const uid of tiedForFirst) {
          const predicted = tiebreakersByWeek[wNum]?.[uid];
          if (
            actualMnfTotal !== null &&
            predicted !== undefined &&
            predicted !== null
          ) {
            userDiffs[uid] = Math.abs(predicted - actualMnfTotal);
          } else {
            userDiffs[uid] = Infinity;
          }
        }

        const validDiffs = Object.values(userDiffs).filter((d) => d !== Infinity);
        const minDiff = validDiffs.length > 0 ? Math.min(...validDiffs) : Infinity;

        if (minDiff !== Infinity) {
          const tbWinners = tiedForFirst.filter((uid) => userDiffs[uid] === minDiff);
          const tbLosers = tiedForFirst.filter((uid) => userDiffs[uid] > minDiff);

          // Winner(s) get an extra point to break the tie and win the week
          for (const winnerId of tbWinners) {
            scoresMap[winnerId] = (scoresMap[winnerId] || 0) + 1;
            if (wNum === targetWeek) {
              userCurrentWeekPoints[winnerId] =
                (userCurrentWeekPoints[winnerId] || 0) + 1;
            }
            if (sYear === 2026) {
              userSeasonPoints[winnerId] = (userSeasonPoints[winnerId] || 0) + 1;
              userSeasonWeeksWon[winnerId] =
                (userSeasonWeeksWon[winnerId] || 0) + 1;
              userSeasonTbWins[winnerId] = (userSeasonTbWins[winnerId] || 0) + 1;
            }
            userLifetimePoints[winnerId] =
              (userLifetimePoints[winnerId] || 0) + 1;
            userLifetimeWeeksWon[winnerId] =
              (userLifetimeWeeksWon[winnerId] || 0) + 1;
            userLifetimeTbWins[winnerId] =
              (userLifetimeTbWins[winnerId] || 0) + 1;
          }

          // Losers in tiebreak scenario
          for (const loserId of tbLosers) {
            if (sYear === 2026) {
              userSeasonTbLosses[loserId] = (userSeasonTbLosses[loserId] || 0) + 1;
            }
            userLifetimeTbLosses[loserId] = (userLifetimeTbLosses[loserId] || 0) + 1;
          }
        } else {
          // If no tied participant submitted a tiebreaker, all tied first place users win that week
          for (const uid of tiedForFirst) {
            if (sYear === 2026) {
              userSeasonWeeksWon[uid] = (userSeasonWeeksWon[uid] || 0) + 1;
            }
            userLifetimeWeeksWon[uid] = (userLifetimeWeeksWon[uid] || 0) + 1;
          }
        }
      } else {
        // Sole leader, or MNF not yet final
        for (const uid of tiedForFirst) {
          if (sYear === 2026) {
            userSeasonWeeksWon[uid] = (userSeasonWeeksWon[uid] || 0) + 1;
          }
          userLifetimeWeeksWon[uid] = (userLifetimeWeeksWon[uid] || 0) + 1;
        }
      }
    }

    // Record tiebreaker diff for targetWeek if target MNF is final
    const targetWeekGames = gamesByWeek[targetWeek] || [];
    const targetMnfGames = targetWeekGames.filter(
      (g) =>
        g.is_monday_night ||
        getGameWindow(g.kickoff_time, g.is_monday_night) === "MNF"
    );
    const targetTbGame =
      targetMnfGames.length > 0
        ? targetMnfGames[targetMnfGames.length - 1]
        : targetWeekGames[targetWeekGames.length - 1];
    const targetActualMnfTotal =
      targetTbGame &&
      targetTbGame.isFinal &&
      targetTbGame.home_score !== null &&
      targetTbGame.home_score !== undefined &&
      targetTbGame.away_score !== null &&
      targetTbGame.away_score !== undefined
        ? targetTbGame.home_score + targetTbGame.away_score
        : null;

    if (targetActualMnfTotal !== null) {
      for (const [uid, pred] of Object.entries(tiebreakersMap)) {
        if (pred !== undefined && pred !== null) {
          userTargetWeekDiff[uid] = Math.abs(pred - targetActualMnfTotal);
        }
      }
    }

    // Calculate Clutch record:
    // In SNF and MNF games when the participant was within 2 points of the weekly lead at kickoff
    const userSeasonClutchWins: Record<string, number> = {};
    const userSeasonClutchLosses: Record<string, number> = {};
    const userLifetimeClutchWins: Record<string, number> = {};
    const userLifetimeClutchLosses: Record<string, number> = {};

    for (const pick of snfPicksList) {
      const sKey = String(pick.seasonYear);
      const earlyScores = Object.values(userEarlyPointsByWeek[sKey]?.[pick.weekNumber] || {});
      const maxEarly = earlyScores.length > 0 ? Math.max(...earlyScores) : 0;
      const userEarly = userEarlyPointsByWeek[sKey]?.[pick.weekNumber]?.[pick.userId] || 0;

      // Within 2 points of the weekly lead prior to SNF kickoff
      if (maxEarly - userEarly <= 2) {
        if (pick.isWinner) {
          userLifetimeClutchWins[pick.userId] = (userLifetimeClutchWins[pick.userId] || 0) + 1;
          if (pick.seasonYear === 2026) {
            userSeasonClutchWins[pick.userId] = (userSeasonClutchWins[pick.userId] || 0) + 1;
          }
        } else if (!pick.isTie) {
          userLifetimeClutchLosses[pick.userId] = (userLifetimeClutchLosses[pick.userId] || 0) + 1;
          if (pick.seasonYear === 2026) {
            userSeasonClutchLosses[pick.userId] = (userSeasonClutchLosses[pick.userId] || 0) + 1;
          }
        }
      }
    }

    for (const pick of mnfPicksList) {
      const sKey = String(pick.seasonYear);
      const preMnfScores = Object.values(userPreMnfPointsByWeek[sKey]?.[pick.weekNumber] || {});
      const maxPreMnf = preMnfScores.length > 0 ? Math.max(...preMnfScores) : 0;
      const userPreMnf = userPreMnfPointsByWeek[sKey]?.[pick.weekNumber]?.[pick.userId] || 0;

      // Within 2 points of the weekly lead prior to MNF kickoff
      if (maxPreMnf - userPreMnf <= 2) {
        if (pick.isWinner) {
          userLifetimeClutchWins[pick.userId] = (userLifetimeClutchWins[pick.userId] || 0) + 1;
          if (pick.seasonYear === 2026) {
            userSeasonClutchWins[pick.userId] = (userSeasonClutchWins[pick.userId] || 0) + 1;
          }
        } else if (!pick.isTie) {
          userLifetimeClutchLosses[pick.userId] = (userLifetimeClutchLosses[pick.userId] || 0) + 1;
          if (pick.seasonYear === 2026) {
            userSeasonClutchLosses[pick.userId] = (userSeasonClutchLosses[pick.userId] || 0) + 1;
          }
        }
      }
    }

    // Build leaderboard entries with full season and lifetime stats
    const entries: LeaderboardEntry[] = profiles.map((prof) => {
      const mockFallback = MOCK_LEADERBOARD.find((m) => m.userId === prof.id);

      const sWins = mockFallback
        ? Math.max(userSeasonWins[prof.id] || 0, mockFallback.seasonRecord.wins)
        : (userSeasonWins[prof.id] || 0);
      const sLosses = mockFallback
        ? (userSeasonLosses[prof.id] !== undefined
            ? Math.max(userSeasonLosses[prof.id], mockFallback.seasonRecord.losses)
            : mockFallback.seasonRecord.losses)
        : (userSeasonLosses[prof.id] || 0);
      const sEval = sWins + sLosses;
      const sWinPct = sEval > 0 ? Math.round((sWins / sEval) * 1000) / 10 : 0;
      const sWeeksWon = mockFallback
        ? Math.max(userSeasonWeeksWon[prof.id] || 0, mockFallback.seasonWeeksWon)
        : (userSeasonWeeksWon[prof.id] || 0);
      const sPoints = mockFallback
        ? Math.max(userSeasonPoints[prof.id] || 0, mockFallback.totalPoints)
        : (userSeasonPoints[prof.id] || 0);

      const sClutchWins = mockFallback
        ? Math.max(userSeasonClutchWins[prof.id] || 0, mockFallback.clutchRecord?.wins ?? 0)
        : (userSeasonClutchWins[prof.id] || 0);
      const sClutchLosses = mockFallback
        ? (userSeasonClutchLosses[prof.id] !== undefined
            ? Math.max(userSeasonClutchLosses[prof.id], mockFallback.clutchRecord?.losses ?? 0)
            : (mockFallback.clutchRecord?.losses ?? 0))
        : (userSeasonClutchLosses[prof.id] || 0);
      const sClutchEval = sClutchWins + sClutchLosses;
      const sClutchPct = sClutchEval > 0 ? Math.round((sClutchWins / sClutchEval) * 1000) / 10 : 0;
      const sClutchFormatted = sClutchEval > 0 ? `${sClutchWins}-${sClutchLosses}` : "—";

      const sTbWins = mockFallback
        ? Math.max(userSeasonTbWins[prof.id] || 0, mockFallback.tiebreakRecord?.wins ?? 0)
        : (userSeasonTbWins[prof.id] || 0);
      const sTbLosses = mockFallback
        ? (userSeasonTbLosses[prof.id] !== undefined
            ? Math.max(userSeasonTbLosses[prof.id], mockFallback.tiebreakRecord?.losses ?? 0)
            : (mockFallback.tiebreakRecord?.losses ?? 0))
        : (userSeasonTbLosses[prof.id] || 0);
      const sTbEval = sTbWins + sTbLosses;
      const sTbPct = sTbEval > 0 ? Math.round((sTbWins / sTbEval) * 1000) / 10 : 0;
      const sTbFormatted = sTbEval > 0 ? `${sTbWins}-${sTbLosses}` : "—";

      const lWins = mockFallback?.lifetimeStats
        ? Math.max(userLifetimeWins[prof.id] || 0, mockFallback.lifetimeStats.record.wins)
        : (userLifetimeWins[prof.id] || sWins);
      const lLosses = mockFallback?.lifetimeStats
        ? (userLifetimeLosses[prof.id] !== undefined
            ? Math.max(userLifetimeLosses[prof.id], mockFallback.lifetimeStats.record.losses)
            : mockFallback.lifetimeStats.record.losses)
        : (userLifetimeLosses[prof.id] || sLosses);
      const lEval = lWins + lLosses;
      const lWinPct = lEval > 0 ? Math.round((lWins / lEval) * 1000) / 10 : 0;
      const lWeeksWon = mockFallback?.lifetimeStats
        ? Math.max(userLifetimeWeeksWon[prof.id] || 0, mockFallback.lifetimeStats.weeksWon)
        : (userLifetimeWeeksWon[prof.id] || sWeeksWon);
      const lPoints = mockFallback?.lifetimeStats
        ? Math.max(userLifetimePoints[prof.id] || 0, mockFallback.lifetimeStats.totalPoints)
        : (userLifetimePoints[prof.id] || sPoints);
      const seasonsCount = Math.max(userSeasons[prof.id]?.size ?? mockFallback?.lifetimeStats?.seasonsCount ?? 1, 1);

      const lClutchWins = mockFallback?.lifetimeStats?.clutchRecord
        ? Math.max(userLifetimeClutchWins[prof.id] || 0, mockFallback.lifetimeStats.clutchRecord.wins)
        : (userLifetimeClutchWins[prof.id] || sClutchWins);
      const lClutchLosses = mockFallback?.lifetimeStats?.clutchRecord
        ? (userLifetimeClutchLosses[prof.id] !== undefined
            ? Math.max(userLifetimeClutchLosses[prof.id], mockFallback.lifetimeStats.clutchRecord.losses)
            : mockFallback.lifetimeStats.clutchRecord.losses)
        : (userLifetimeClutchLosses[prof.id] || sClutchLosses);
      const lClutchEval = lClutchWins + lClutchLosses;
      const lClutchPct = lClutchEval > 0 ? Math.round((lClutchWins / lClutchEval) * 1000) / 10 : 0;
      const lClutchFormatted = lClutchEval > 0 ? `${lClutchWins}-${lClutchLosses}` : "—";

      const lTbWins = mockFallback?.lifetimeStats?.tiebreakRecord
        ? Math.max(userLifetimeTbWins[prof.id] || 0, mockFallback.lifetimeStats.tiebreakRecord.wins)
        : (userLifetimeTbWins[prof.id] || sTbWins);
      const lTbLosses = mockFallback?.lifetimeStats?.tiebreakRecord
        ? (userLifetimeTbLosses[prof.id] !== undefined
            ? Math.max(userLifetimeTbLosses[prof.id], mockFallback.lifetimeStats.tiebreakRecord.losses)
            : mockFallback.lifetimeStats.tiebreakRecord.losses)
        : (userLifetimeTbLosses[prof.id] || sTbLosses);
      const lTbEval = lTbWins + lTbLosses;
      const lTbPct = lTbEval > 0 ? Math.round((lTbWins / lTbEval) * 1000) / 10 : 0;
      const lTbFormatted = lTbEval > 0 ? `${lTbWins}-${lTbLosses}` : "—";

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
        tiebreakerDiff: userTargetWeekDiff[prof.id],
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
        clutchRecord: {
          wins: sClutchWins,
          losses: sClutchLosses,
          evaluatedPicks: sClutchEval,
          winPct: sClutchPct,
          formatted: sClutchFormatted,
        },
        tiebreakRecord: {
          wins: sTbWins,
          losses: sTbLosses,
          evaluatedPicks: sTbEval,
          winPct: sTbPct,
          formatted: sTbFormatted,
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
          clutchRecord: {
            wins: lClutchWins,
            losses: lClutchLosses,
            evaluatedPicks: lClutchEval,
            winPct: lClutchPct,
            formatted: lClutchFormatted,
          },
          tiebreakRecord: {
            wins: lTbWins,
            losses: lTbLosses,
            evaluatedPicks: lTbEval,
            winPct: lTbPct,
            formatted: lTbFormatted,
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

/**
 * Fetch and compute season-long standings across the entire season.
 * This represents season-long and lifetime stats and NEVER changes with week selection.
 */
export async function fetchSeasonStandings(): Promise<LeaderboardEntry[]> {
  const activeWeek = calculateFallbackWeek();
  return fetchLiveLeaderboard(activeWeek);
}

