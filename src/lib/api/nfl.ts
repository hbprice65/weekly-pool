import { Game, GameStatus, NFLTeam, Week } from "@/types";
import { NFL_TEAMS } from "@/lib/nfl-data";
import { createClient } from "@/lib/supabase/client";

export interface NFLScoreboardResponse {
  week: Week;
  currentWeekNumber: number;
  seasonYear: number;
  lastUpdated: string;
}

// In-memory cache to prevent redundant external API hits
const cache: Record<string, { data: NFLScoreboardResponse; timestamp: number }> = {};
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

/**
 * Normalizes ESPN team abbreviation to our standard 3-letter codes
 */
export function normalizeTeamAbbreviation(abbr: string): string {
  const upper = (abbr || "").toUpperCase().trim();
  if (upper === "WSH") return "WAS";
  return upper;
}

/**
 * Resolves full NFLTeam object using our static database enriched with live ESPN logos and records
 */
function resolveTeam(
  rawTeam: {
    abbreviation?: string;
    displayName?: string;
    name?: string;
    location?: string;
    color?: string;
    alternateColor?: string;
    logo?: string;
  },
  recordSummary?: string
): NFLTeam {
  const code = normalizeTeamAbbreviation(rawTeam.abbreviation || "NFL");
  const base = NFL_TEAMS[code] || NFL_TEAMS.WAS;

  return {
    id: base.id,
    name: rawTeam.name || base.name,
    city: rawTeam.location || base.city,
    fullName: rawTeam.displayName || base.fullName,
    conference: base.conference,
    division: base.division,
    primaryColor: rawTeam.color ? `#${rawTeam.color}` : base.primaryColor,
    secondaryColor: rawTeam.alternateColor ? `#${rawTeam.alternateColor}` : base.secondaryColor,
    record: recordSummary || base.record,
    logoUrl: rawTeam.logo || `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${code.toLowerCase()}.png`,
  };
}

/**
 * Determines if a matchup is Monday Night Football
 */
function isMondayNightGame(isoDateStr: string, network?: string): boolean {
  if (network && (network.includes("ESPN") || network.includes("ABC"))) {
    // Check if day is Monday in Eastern Time
    try {
      const day = new Date(isoDateStr).toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "America/New_York",
      });
      if (day === "Mon") return true;
    } catch {
      // ignore
    }
  }

  try {
    const day = new Date(isoDateStr).toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "America/New_York",
    });
    return day === "Mon";
  } catch {
    return false;
  }
}

/**
 * Fetches accurate schedule and live/final scores for any specified NFL week
 * Uses ESPN's public real-time scoreboard API
 */
export async function fetchNFLWeekSchedule(
  weekNumber: number = 6,
  seasonYear: number = 2026,
  forceFresh: boolean = false
): Promise<NFLScoreboardResponse> {
  const cacheKey = `week_${weekNumber}_year_${seasonYear}`;
  const now = Date.now();

  if (!forceFresh && cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL_MS) {
    return cache[cacheKey].data;
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${weekNumber}&dates=${seasonYear}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      // Revalidate cache after 60 seconds
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`ESPN API returned status ${response.status}`);
    }

    const data = await response.json();
    const currentWeekNumber = data.week?.number || weekNumber;
    const actualYear = data.season?.year || seasonYear;

    const events = data.events || [];
    const parsedGames: Game[] = [];

    for (const event of events) {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const competitors = competition.competitors || [];
      const homeComp = competitors.find((c: { homeAway: string }) => c.homeAway === "home") || competitors[0];
      const awayComp = competitors.find((c: { homeAway: string }) => c.homeAway === "away") || competitors[1];

      if (!homeComp || !awayComp) continue;

      const homeRecord = homeComp.records?.find((r: { type?: string }) => r.type === "total")?.summary ||
        homeComp.records?.[0]?.summary;
      const awayRecord = awayComp.records?.find((r: { type?: string }) => r.type === "total")?.summary ||
        awayComp.records?.[0]?.summary;

      const homeTeam = resolveTeam(homeComp.team || {}, homeRecord);
      const awayTeam = resolveTeam(awayComp.team || {}, awayRecord);

      // Determine game status
      const statusState = event.status?.type?.state; // 'pre', 'in', 'post'
      const isCompleted = Boolean(event.status?.type?.completed);
      let status: GameStatus = "SCHEDULED";
      if (isCompleted || statusState === "post") {
        status = "FINAL";
      } else if (statusState === "in") {
        status = "IN_PROGRESS";
      }

      // Scores
      const homeScoreNum = homeComp.score !== undefined && homeComp.score !== "" ? parseInt(homeComp.score, 10) : undefined;
      const awayScoreNum = awayComp.score !== undefined && awayComp.score !== "" ? parseInt(awayComp.score, 10) : undefined;

      // Winner determination
      let winnerTeamId: string | undefined = undefined;
      if (status === "FINAL") {
        if (homeComp.winner) {
          winnerTeamId = homeTeam.id;
        } else if (awayComp.winner) {
          winnerTeamId = awayTeam.id;
        } else if (homeScoreNum !== undefined && awayScoreNum !== undefined) {
          if (homeScoreNum > awayScoreNum) winnerTeamId = homeTeam.id;
          else if (awayScoreNum > homeScoreNum) winnerTeamId = awayTeam.id;
        }
      }

      // Broadcast TV Network
      const tvNetwork =
        competition.broadcasts?.[0]?.names?.[0] ||
        competition.geoBroadcasts?.[0]?.media?.shortName ||
        competition.broadcast;

      // Status short detail (e.g. "Final", "1st Qtr 9:45", "Sun, 1:00 PM EDT")
      const statusDetail = event.status?.type?.shortDetail || event.status?.type?.detail || event.status?.type?.description;

      const isMnf = isMondayNightGame(event.date, tvNetwork);

      parsedGames.push({
        id: event.id,
        weekNumber,
        seasonYear: actualYear,
        homeTeam,
        awayTeam,
        kickoffTime: event.date,
        status,
        statusDetail,
        homeScore: !isNaN(Number(homeScoreNum)) ? homeScoreNum : undefined,
        awayScore: !isNaN(Number(awayScoreNum)) ? awayScoreNum : undefined,
        winnerTeamId,
        tvNetwork,
        isMondayNight: isMnf,
      });
    }

    // Sort games chronologically by kickoff time
    parsedGames.sort(
      (a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime()
    );

    const lockDate =
      parsedGames.length > 0 ? parsedGames[0].kickoffTime : new Date().toISOString();
    const lastGameDate =
      parsedGames.length > 0
        ? parsedGames[parsedGames.length - 1].kickoffTime
        : new Date().toISOString();

    const week: Week = {
      weekNumber,
      seasonYear: actualYear,
      title: `Week ${weekNumber}`,
      startDate: lockDate,
      endDate: lastGameDate,
      lockDate,
      isCurrent: weekNumber === currentWeekNumber,
      isCompleted: parsedGames.every((g) => g.status === "FINAL"),
      games: parsedGames,
    };

    const result: NFLScoreboardResponse = {
      week,
      currentWeekNumber,
      seasonYear: actualYear,
      lastUpdated: new Date().toISOString(),
    };

    cache[cacheKey] = {
      data: result,
      timestamp: now,
    };

    return result;
  } catch (error) {
    console.error(`Error fetching NFL schedule for week ${weekNumber}:`, error);
    throw error;
  }
}

/**
 * Queries current active NFL week from live ESPN endpoint
 */
export async function fetchCurrentActiveNFLWeek(): Promise<{
  currentWeek: number;
  seasonYear: number;
}> {
  try {
    const res = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      const currentWeek = data.week?.number || 6;
      const seasonYear = data.season?.year || 2026;
      return { currentWeek, seasonYear };
    }
  } catch (err) {
    console.warn("Could not determine current NFL week from ESPN:", err);
  }
  return { currentWeek: 6, seasonYear: 2026 };
}

/**
 * Syncs the fetched games and scores into Supabase public.games and public.weeks tables
 */
export async function syncScheduleToSupabase(
  games: Game[],
  weekNumber: number,
  seasonYear: number = 2026
): Promise<{ success: boolean; syncedCount: number; error?: string }> {
  const supabase = createClient();
  if (!supabase) {
    return { success: false, syncedCount: 0, error: "Supabase client not initialized" };
  }

  try {
    // 1. Upsert week record first
    const startDate = games[0]?.kickoffTime || new Date().toISOString();
    const endDate = games[games.length - 1]?.kickoffTime || new Date().toISOString();

    const { error: weekError } = await supabase.from("weeks").upsert(
      {
        week_number: weekNumber,
        season_year: seasonYear,
        title: `Week ${weekNumber}`,
        start_date: startDate,
        end_date: endDate,
        lock_date: startDate,
        is_current: true,
        is_completed: games.every((g) => g.status === "FINAL"),
      },
      { onConflict: "week_number" }
    );

    if (weekError) {
      console.warn("Notice: could not upsert week into Supabase:", weekError.message);
    }

    // 2. Prepare game rows
    const gameRows = games.map((g) => ({
      id: g.id,
      week_number: weekNumber,
      season_year: seasonYear,
      away_team: g.awayTeam.id,
      home_team: g.homeTeam.id,
      kickoff_time: g.kickoffTime,
      status: g.status,
      spread: g.spread || null,
      away_score: g.awayScore ?? null,
      home_score: g.homeScore ?? null,
      winner_team: g.winnerTeamId || null,
      tv_network: g.tvNetwork || null,
      is_monday_night: Boolean(g.isMondayNight),
    }));

    const { error: gamesError } = await supabase
      .from("games")
      .upsert(gameRows, { onConflict: "id" });

    if (gamesError) {
      console.warn("Notice: could not upsert games into Supabase:", gamesError.message);
      return { success: false, syncedCount: 0, error: gamesError.message };
    }

    return { success: true, syncedCount: gameRows.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("Unexpected error syncing to Supabase:", msg);
    return { success: false, syncedCount: 0, error: msg };
  }
}
