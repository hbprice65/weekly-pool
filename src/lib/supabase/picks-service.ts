import { createClient } from "./client";
import {
  Game,
  GameStatus,
  LeaderboardEntry,
  DEFAULT_POOL_ID,
  Pool,
  PoolMember,
  PoolRole,
  UserPoolMembership,
  DoomsdayPickPayload,
} from "@/types";
import {
  MOCK_LEADERBOARD,
  MOCK_GAMES,
  MOCK_POOL_MEMBERS,
  MOCK_POOLS,
  MOCK_USER_POOLS,
  MOCK_POOL_OVERRIDES,
} from "@/lib/mock-data";
import { NFL_TEAMS } from "@/lib/nfl-data";
import {
  fetchNFLWeekSchedule,
  syncScheduleToSupabase,
  calculateFallbackWeek,
  fetchCurrentActiveNFLWeek,
} from "@/lib/api/nfl";

const ACTIVE_POOL_STORAGE_KEY = "weekly_pool_active_pool_id";
const LOCAL_POOLS_STORAGE_KEY = "weekly_pool_custom_pools";
const LOCAL_MEMBERSHIPS_STORAGE_KEY = "weekly_pool_user_memberships";

/**
 * Retrieve the currently active Pool ID from browser storage (defaults to DEFAULT_POOL_ID)
 */
export function getActivePoolId(): string {
  if (typeof window === "undefined") return DEFAULT_POOL_ID;
  try {
    return localStorage.getItem(ACTIVE_POOL_STORAGE_KEY) || DEFAULT_POOL_ID;
  } catch {
    return DEFAULT_POOL_ID;
  }
}

/**
 * Set the active Pool ID in browser storage and notify listeners
 */
export function setActivePoolId(poolId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_POOL_STORAGE_KEY, poolId);
    // Keep saved pool object in sync if it matches a known pool
    const matched = MOCK_POOLS.find((p) => p.id === poolId);
    if (matched) {
      localStorage.setItem("nfl_weekly_active_pool_v1", JSON.stringify(matched));
    } else {
      localStorage.removeItem("nfl_weekly_active_pool_v1");
    }
    window.dispatchEvent(new CustomEvent("pool-changed", { detail: { poolId } }));
  } catch {
    // Ignore storage errors
  }
}

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
 * Deterministic 32-bit hash returning a uniform float in [0, 1)
 */
function seededHash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Generate deterministic random picks and MNF score for a dummy pool member for Weeks 1-5
 */
export function generateDummyPoolMemberWeekPicks(
  poolId: string,
  canonicalUserId: string,
  weekNumber: number,
  games: Array<{
    id: string;
    homeTeamId: string;
    awayTeamId: string;
    winnerTeamId?: string | null;
    isFinal?: boolean;
    isTie?: boolean;
  }>,
  winRateBias: number = 0.62
): { picks: Record<string, string>; mnfScore: number } {
  const picks: Record<string, string> = {};

  for (const g of games) {
    const r = seededHash(`${poolId}::${canonicalUserId}::w${weekNumber}::game_${g.id}`);
    if (g.isFinal && g.winnerTeamId && g.winnerTeamId !== "TIE" && !g.isTie) {
      const loserTeamId =
        g.winnerTeamId === g.homeTeamId ? g.awayTeamId : g.homeTeamId;
      picks[g.id] = r < winRateBias ? g.winnerTeamId : loserTeamId;
    } else {
      picks[g.id] = r < 0.5 ? g.homeTeamId : g.awayTeamId;
    }
  }

  const rMnf = seededHash(`${poolId}::${canonicalUserId}::w${weekNumber}::mnf_score`);
  const mnfScore = 34 + Math.floor(rMnf * 25); // 34..58

  return { picks, mnfScore };
}

/**
 * Resolve a user's picks for a dummy pool in a specific week (checks localStorage overrides first, then Weeks 1-5 random picks)
 */
export function getDummyPoolUserPicksForWeek(
  poolId: string,
  userId: string,
  weekNumber: number,
  games?: Game[]
): { picks: Record<string, string>; mnfScore?: string } {
  const poolOverrides = MOCK_POOL_OVERRIDES[poolId];
  const poolKeySuffix = poolId === DEFAULT_POOL_ID ? "" : `_${poolId}`;

  // 1. Check localStorage overrides for this user + pool + week
  if (typeof window !== "undefined") {
    try {
      const localRaw =
        localStorage.getItem(`nfl_picks_${userId}${poolKeySuffix}_week_${weekNumber}`) ||
        (userId === "user-demo-01"
          ? localStorage.getItem(`nfl_weekly_picks${poolKeySuffix}_week_${weekNumber}`)
          : null);
      const localMnf =
        localStorage.getItem(`nfl_mnf_${userId}${poolKeySuffix}_week_${weekNumber}`) ||
        localStorage.getItem(`nfl_weekly_mnf${poolKeySuffix}_week_${weekNumber}`);

      if (localRaw) {
        const parsed = JSON.parse(localRaw) as Record<string, string>;
        if (Object.keys(parsed).length > 0) {
          return { picks: parsed, mnfScore: localMnf || "45" };
        }
      }
    } catch {}
  }

  // 2. For Weeks 1-5 in dummy pools, generate deterministic random picks
  if (poolOverrides && weekNumber >= 1 && weekNumber <= 5 && games && games.length > 0) {
    const localJoined = getLocalJoinedPoolIds();
    const isJoined = localJoined.has(poolId);
    const matchedMember =
      poolOverrides.find((m) => m.userId === userId) ||
      (isJoined ? { userId, winRateBias: 0.62 } : null);

    if (!matchedMember) {
      return { picks: {}, mnfScore: undefined };
    }

    const canonicalUserId = matchedMember.userId;
    const bias = matchedMember.winRateBias || 0.62;

    const mappedGames = games.map((g) => {
      const isFinal = g.status === "FINAL";
      const isTie =
        isFinal &&
        g.awayScore !== undefined &&
        g.homeScore !== undefined &&
        g.awayScore === g.homeScore;
      let winnerTeamId = g.winnerTeamId || null;
      if (isFinal && !winnerTeamId && g.awayScore !== undefined && g.homeScore !== undefined) {
        winnerTeamId = isTie
          ? "TIE"
          : g.homeScore > g.awayScore
          ? g.homeTeam.id
          : g.awayTeam.id;
      }
      return {
        id: g.id,
        homeTeamId: g.homeTeam.id,
        awayTeamId: g.awayTeam.id,
        winnerTeamId,
        isFinal,
        isTie,
      };
    });

    const generated = generateDummyPoolMemberWeekPicks(
      poolId,
      canonicalUserId,
      weekNumber,
      mappedGames,
      bias
    );
    return {
      picks: generated.picks,
      mnfScore: String(generated.mnfScore),
    };
  }

  return { picks: {} };
}

/**
 * Fetch user's saved picks from Supabase for a specific week and pool
 */
export async function fetchUserPicksFromSupabase(
  userId: string,
  weekNumber?: number,
  games?: Game[],
  poolId: string = getActivePoolId()
): Promise<{ picks: Record<string, string>; mnfScore?: string }> {
  const targetWeek = weekNumber ?? calculateFallbackWeek();

  // If this is one of the dummy pools, check local overrides or return Weeks 1-5 random picks
  if (poolId !== DEFAULT_POOL_ID && MOCK_POOL_OVERRIDES[poolId]) {
    const dummyPicks = getDummyPoolUserPicksForWeek(poolId, userId, targetWeek, games);
    if (Object.keys(dummyPicks.picks).length > 0) {
      return dummyPicks;
    }
  }

  const supabase = createClient();
  if (!supabase || !userId) return { picks: {} };

  try {
    // 1. Fetch picks for this user for the target week and pool
    let { data: initialPicks, error: picksError } = await supabase
      .from("picks")
      .select("game_id, selected_team, week_number, pool_id")
      .eq("user_id", userId)
      .eq("week_number", targetWeek)
      .eq("pool_id", poolId);

    // Fallback if pool_id column doesn't exist yet or legacy rows without pool_id on default pool
    if (
      picksError ||
      ((!initialPicks || initialPicks.length === 0) && poolId === DEFAULT_POOL_ID)
    ) {
      const { data: v1Picks } = await supabase
        .from("picks")
        .select("game_id, selected_team, week_number")
        .eq("user_id", userId)
        .eq("week_number", targetWeek);
      if (v1Picks && v1Picks.length > 0) {
        initialPicks = v1Picks as typeof initialPicks;
      }
    }

    let picksData = initialPicks;

    // Fallback for legacy rows where week_number was null: query by game IDs of this week's slate
    if ((!picksData || picksData.length === 0) && games && games.length > 0 && poolId === DEFAULT_POOL_ID) {
      const slateGameIds = games.map((g) => g.id);
      const { data: legacyPicks } = await supabase
        .from("picks")
        .select("game_id, selected_team, week_number")
        .eq("user_id", userId)
        .in("game_id", slateGameIds);

      if (legacyPicks && legacyPicks.length > 0) {
        picksData = legacyPicks as typeof initialPicks;
      }
    }

    if (picksError && !picksData) {
      console.warn("Notice querying user picks:", picksError.message);
    }

    const picks: Record<string, string> = {};
    if (picksData) {
      const allowedGameIds = games && games.length > 0 ? new Set(games.map((g) => g.id)) : null;
      for (const row of picksData) {
        if (!allowedGameIds || allowedGameIds.has(row.game_id)) {
          picks[row.game_id] = row.selected_team;
        }
      }
    }

    // 2. Fetch tiebreaker prediction for the selected week and pool
    let { data: tieData, error: tieError } = await supabase
      .from("tiebreakers")
      .select("predicted_score, predicted_mnf_score")
      .eq("user_id", userId)
      .eq("week_number", targetWeek)
      .eq("pool_id", poolId)
      .maybeSingle();

    if ((tieError || !tieData) && poolId === DEFAULT_POOL_ID) {
      const resV1Tie = await supabase
        .from("tiebreakers")
        .select("predicted_score, predicted_mnf_score")
        .eq("user_id", userId)
        .eq("week_number", targetWeek)
        .maybeSingle();
      if (resV1Tie.data) {
        tieData = resV1Tie.data;
        tieError = null;
      }
    }

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
 * Save / Upsert user picks and tiebreaker score to Supabase for the current week and pool
 */
export async function saveUserPicksToSupabase(
  userId: string,
  picks: Record<string, string>,
  mnfScore?: string | number,
  weekNumber?: number,
  games?: Game[],
  poolId: string = getActivePoolId()
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
    // Validate target week using live ESPN active week
    const { currentWeek: activeWeek } = await fetchCurrentActiveNFLWeek();
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
    // Validate on the client that we ONLY attempt to save picks for games belonging to THIS week that have not kicked off
    const pickEntriesToSave = pickEntries.filter(([gameId]) => {
      const g = games?.find((game) => game.id === gameId);
      // Strictly ignore picks from other weeks
      if (!g) return false;
      const isPastKickoff = new Date(g.kickoffTime).getTime() <= now;
      const isLiveOrFinal = g.status === "IN_PROGRESS" || g.status === "FINAL";
      return !isPastKickoff && !isLiveOrFinal;
    });

    if (pickEntriesToSave.length === 0 && (!mnfScore || mnfScore === "")) {
      return { success: true, savedCount: 0, userId };
    }

    // Background sync this week's games to Supabase so games exist and have kickoff times
    if (games && games.length > 0) {
      syncScheduleToSupabase(games, targetWeek, 2026).catch(() => {});
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
        pool_id: poolId,
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
            pool_id: poolId,
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

function getLocalHiddenUserIds(poolId: string = DEFAULT_POOL_ID): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`pool_hidden_members_${poolId}`);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function getLocalRemovedUserIds(poolId: string = DEFAULT_POOL_ID): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`pool_removed_members_${poolId}`);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function getLocalLeaderUserId(poolId: string = DEFAULT_POOL_ID): string {
  const mockPool = MOCK_POOLS.find((p) => p.id === poolId);
  const defaultLeader = mockPool?.leaderId || "user-demo-01";
  if (typeof window === "undefined") return defaultLeader;
  try {
    return localStorage.getItem(`pool_leader_id_${poolId}`) || defaultLeader;
  } catch {
    return defaultLeader;
  }
}

function getLocalCustomPools(): Pool[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_POOLS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Pool[]) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomPools(pools: Pool[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_POOLS_STORAGE_KEY, JSON.stringify(pools));
  } catch {
    // Ignore storage errors
  }
}

function getLocalLeftPoolIds(userId: string = "user-demo-01"): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`${LOCAL_MEMBERSHIPS_STORAGE_KEY}_left_${userId}`);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function buildMockPoolLeaderboard(
  poolId: string = DEFAULT_POOL_ID,
  includeHidden: boolean = false,
  currentUserId?: string,
  currentUserName?: string
): LeaderboardEntry[] {
  const removedIds = getLocalRemovedUserIds(poolId);
  const hiddenIds = getLocalHiddenUserIds(poolId);
  const leaderId = getLocalLeaderUserId(poolId);
  const mockUserPool = MOCK_USER_POOLS.find((m) => m.pool.id === poolId);
  const poolOverrides = MOCK_POOL_OVERRIDES[poolId];

  const sourceEntries: LeaderboardEntry[] = poolOverrides
    ? poolOverrides.map((ov, idx) => {
        const template =
          MOCK_LEADERBOARD.find((e) => e.userId === ov.userId) ||
          MOCK_LEADERBOARD[idx % MOCK_LEADERBOARD.length];
        const isDemoUser = ov.userId === "user-demo-01";
        const resolvedUserId = isDemoUser && currentUserId ? currentUserId : ov.userId;
        const resolvedName =
          isDemoUser && currentUserName ? currentUserName : ov.displayName;
        const evalPicks = ov.wins + ov.losses;
        const winPct = evalPicks > 0 ? Math.round((ov.wins / evalPicks) * 1000) / 10 : 0;

        return {
          ...template,
          userId: resolvedUserId,
          displayName: resolvedName,
          totalPoints: ov.totalPoints,
          weeklyPoints: ov.weeklyPoints,
          seasonWeeksWon: ov.weeksWon,
          predictedMnfScore: ov.predictedMnfScore,
          seasonRecord: {
            wins: ov.wins,
            losses: ov.losses,
            evaluatedPicks: evalPicks,
            winPct,
            formatted: `${ov.wins}-${ov.losses}`,
          },
        };
      })
    : MOCK_LEADERBOARD.map((e) => {
        const isDemoUser = e.userId === "user-demo-01";
        return {
          ...e,
          userId: isDemoUser && currentUserId ? currentUserId : e.userId,
          displayName: isDemoUser && currentUserName ? currentUserName : e.displayName,
        };
      });

  const adjusted = sourceEntries
    .filter((e) => !removedIds.has(e.userId))
    .map((e) => {
      const isCurrentUser =
        e.userId === "user-demo-01" || (Boolean(currentUserId) && e.userId === currentUserId);
      const totalPoints =
        !poolOverrides && isCurrentUser && mockUserPool?.userPoints !== undefined
          ? mockUserPool.userPoints
          : e.totalPoints;
      const weeklyPoints =
        !poolOverrides && isCurrentUser && mockUserPool?.weeklyPoints !== undefined
          ? mockUserPool.weeklyPoints
          : e.weeklyPoints;
      const isLeader =
        e.userId === leaderId || (isCurrentUser && leaderId === "user-demo-01");
      const isHidden = hiddenIds.has(e.userId) || Boolean(e.isHidden);

      return {
        ...e,
        totalPoints,
        weeklyPoints,
        isLeader,
        role: (isLeader ? "leader" : "member") as PoolRole,
        isHidden,
      };
    });

  const visible = includeHidden ? adjusted : adjusted.filter((e) => !e.isHidden);
  visible.sort((a, b) => b.totalPoints - a.totalPoints);
  visible.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  const weeklySorted = [...visible].sort((a, b) => b.weeklyPoints - a.weeklyPoints);
  weeklySorted.forEach((entry, idx) => {
    entry.weeklyRank = idx + 1;
  });

  return visible;
}

/**
 * Fetch and compute live pool leaderboard adapting to actual games and season-wide picks
 */
export async function fetchLiveLeaderboard(
  weekNumber?: number,
  liveGames?: Game[],
  includeHidden: boolean = false,
  poolId: string = getActivePoolId()
): Promise<LeaderboardEntry[]> {
  const targetWeek = weekNumber ?? calculateFallbackWeek();
  const supabase = createClient();
  const isDummyOverridePool =
    poolId !== DEFAULT_POOL_ID && Boolean(MOCK_POOL_OVERRIDES[poolId]);

  if (!supabase && !isDummyOverridePool) {
    return buildMockPoolLeaderboard(poolId, includeHidden);
  }

  try {
    // Get current user so dummy pools map the signed-in user's row properly
    let authUserId: string | undefined = undefined;
    let authUserName: string | undefined = undefined;
    if (supabase) {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      authUserId = authUser?.id;
      authUserName =
        authUser?.user_metadata?.full_name ||
        authUser?.user_metadata?.name ||
        authUser?.email?.split("@")[0];
    }

    let poolData: { id: string; leader_id?: string | null; creator_id?: string | null } | null = null;
    let poolMembers: Array<{ user_id: string; role: string; is_hidden: boolean }> | null = null;
    let profiles: Array<{ id: string; display_name: string | null; avatar_url?: string | null }> | null = null;
    let allPicks: Array<{
      user_id: string;
      game_id: string;
      selected_team: string;
      is_correct?: boolean | null;
      points?: number | null;
      week_number?: number | null;
      pool_id?: string | null;
    }> | null = [];
    let allTiebreakers: Array<{
      user_id: string;
      predicted_score?: number | null;
      predicted_mnf_score?: number | null;
      week_number?: number | null;
    }> | null = [];

    if (isDummyOverridePool) {
      const overrides = MOCK_POOL_OVERRIDES[poolId];
      const removedIds = getLocalRemovedUserIds(poolId);
      const hiddenIds = getLocalHiddenUserIds(poolId);
      const leaderId = getLocalLeaderUserId(poolId);

      poolData = {
        id: poolId,
        leader_id: leaderId === "user-demo-01" && authUserId ? authUserId : leaderId,
        creator_id: leaderId === "user-demo-01" && authUserId ? authUserId : leaderId,
      };

      poolMembers = overrides
        .filter((ov) => {
          const uid = ov.userId === "user-demo-01" && authUserId ? authUserId : ov.userId;
          return !removedIds.has(uid) && !removedIds.has(ov.userId);
        })
        .map((ov) => {
          const uid = ov.userId === "user-demo-01" && authUserId ? authUserId : ov.userId;
          const isLeader = ov.userId === leaderId || uid === leaderId;
          return {
            user_id: uid,
            role: isLeader ? "leader" : "member",
            is_hidden: hiddenIds.has(uid) || hiddenIds.has(ov.userId),
          };
        });

      profiles = overrides
        .filter((ov) => {
          const uid = ov.userId === "user-demo-01" && authUserId ? authUserId : ov.userId;
          return !removedIds.has(uid) && !removedIds.has(ov.userId);
        })
        .map((ov) => {
          const isDemoUser = ov.userId === "user-demo-01";
          return {
            id: isDemoUser && authUserId ? authUserId : ov.userId,
            display_name: isDemoUser && authUserName ? authUserName : ov.displayName,
            avatar_url: null,
          };
        });
    } else if (supabase) {
      // 1. Fetch pool info and members to identify leader, roles, and hidden flags
      const { data: dbPoolData } = await supabase
        .from("pools")
        .select("id, leader_id, creator_id")
        .eq("id", poolId)
        .maybeSingle();
      poolData = dbPoolData;

      const { data: dbPoolMembers } = await supabase
        .from("pool_members")
        .select("user_id, role, is_hidden")
        .eq("pool_id", poolId);
      poolMembers = dbPoolMembers;

      // If this is a mock/local demo pool not in Supabase, return its mock leaderboard
      if (!poolData && (!poolMembers || poolMembers.length === 0) && poolId !== DEFAULT_POOL_ID) {
        return buildMockPoolLeaderboard(poolId, includeHidden, authUserId, authUserName);
      }

      // 2. Fetch registered pool profiles (scoped to poolMembers if non-default pool has members)
      const { data: allProfiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url");

      const memberIdsSet =
        poolMembers && poolMembers.length > 0
          ? new Set(poolMembers.map((m) => m.user_id))
          : null;

      profiles =
        allProfiles && memberIdsSet && poolId !== DEFAULT_POOL_ID
          ? allProfiles.filter((p) => memberIdsSet.has(p.id))
          : allProfiles;

      if (profErr || !profiles || profiles.length === 0) {
        return buildMockPoolLeaderboard(poolId, includeHidden);
      }

      // 3. Fetch picks across all weeks for this pool (with fallback for V1 schema on default pool)
      let { data: dbPicks, error: picksErr } = await supabase
        .from("picks")
        .select("user_id, game_id, selected_team, is_correct, points, week_number, pool_id")
        .eq("pool_id", poolId);

      if ((picksErr || !dbPicks || dbPicks.length === 0) && poolId === DEFAULT_POOL_ID) {
        const resV1Picks = await supabase
          .from("picks")
          .select("user_id, game_id, selected_team, is_correct, points, week_number");
        if (resV1Picks.data) {
          dbPicks = resV1Picks.data as typeof dbPicks;
          picksErr = null;
        }
      }

      if (picksErr) {
        console.warn("Notice: could not fetch picks from Supabase:", picksErr.message);
      }
      allPicks = dbPicks || [];

      // 4. Fetch tiebreakers across all weeks for this pool
      let { data: dbTiebreakers } = await supabase
        .from("tiebreakers")
        .select("user_id, predicted_score, predicted_mnf_score, week_number")
        .eq("pool_id", poolId);

      if ((!dbTiebreakers || dbTiebreakers.length === 0) && poolId === DEFAULT_POOL_ID) {
        const resV1Tie = await supabase
          .from("tiebreakers")
          .select("user_id, predicted_score, predicted_mnf_score, week_number");
        if (resV1Tie.data) {
          dbTiebreakers = resV1Tie.data;
        }
      }
      allTiebreakers = dbTiebreakers || [];
    }

    if (!profiles || profiles.length === 0) {
      return buildMockPoolLeaderboard(poolId, includeHidden, authUserId, authUserName);
    }

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
      id: string;
      week_number: number;
      season_year: number;
      home_team: string;
      away_team: string;
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
        id: g.id,
        week_number: g.weekNumber,
        season_year: g.seasonYear || 2026,
        home_team: g.homeTeam.id,
        away_team: g.awayTeam.id,
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

    // Fetch all games in database if supabase is available
    const { data: allGames } = supabase
      ? await supabase
          .from("games")
          .select(
            "id, week_number, winner_team, status, season_year, home_score, away_score, home_team, away_team, kickoff_time, is_monday_night"
          )
      : { data: null };

    // Identify all weeks that need game scores to evaluate picks accurately
    const weeksToFetch = new Set<number>();
    if (targetWeek && !isNaN(targetWeek)) weeksToFetch.add(targetWeek);
    const fallbackW = calculateFallbackWeek();
    if (fallbackW && !isNaN(fallbackW)) weeksToFetch.add(fallbackW);

    // For dummy pools, always fetch Weeks 1-5 so random picks for Weeks 1-5 are evaluated
    if (isDummyOverridePool) {
      for (let w = 1; w <= 5; w++) {
        weeksToFetch.add(w);
      }
    }

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
            id: g.id,
            week_number: g.week_number,
            season_year: g.season_year || 2026,
            home_team: g.home_team,
            away_team: g.away_team,
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

    // For dummy pools, synthesize random picks & MNF tiebreakers for Weeks 1-5 (and local overrides)
    if (isDummyOverridePool) {
      const overrides = MOCK_POOL_OVERRIDES[poolId];
      const poolKeySuffix = `_${poolId}`;
      const evalGamesByWeek: Record<number, GameEvaluation[]> = {};
      for (const g of Object.values(gamesMap)) {
        if (!evalGamesByWeek[g.week_number]) evalGamesByWeek[g.week_number] = [];
        evalGamesByWeek[g.week_number].push(g);
      }

      const synthesizedPicks: NonNullable<typeof allPicks> = [];
      const synthesizedTiebreakers: NonNullable<typeof allTiebreakers> = [];
      const weeksToSynthesize = new Set<number>([1, 2, 3, 4, 5, targetWeek]);

      for (const ov of overrides) {
        const resolvedUserId =
          ov.userId === "user-demo-01" && authUserId ? authUserId : ov.userId;

        for (const w of weeksToSynthesize) {
          const weekGamesList = evalGamesByWeek[w] || [];
          if (weekGamesList.length === 0) continue;

          let weekPicks: Record<string, string> = {};
          let weekMnf: number | undefined = undefined;

          // 1. Base random picks for Weeks 1-5
          if (w >= 1 && w <= 5) {
            const gen = generateDummyPoolMemberWeekPicks(
              poolId,
              ov.userId,
              w,
              weekGamesList.map((g) => ({
                id: g.id,
                homeTeamId: g.home_team,
                awayTeamId: g.away_team,
                winnerTeamId: g.winner_team,
                isFinal: g.isFinal,
                isTie: g.isTie,
              })),
              ov.winRateBias
            );
            weekPicks = { ...gen.picks };
            weekMnf = gen.mnfScore;
          }

          // 2. Merge any localStorage overrides saved for this user/pool/week
          if (typeof window !== "undefined") {
            try {
              const localRaw =
                localStorage.getItem(`nfl_picks_${resolvedUserId}${poolKeySuffix}_week_${w}`) ||
                localStorage.getItem(`nfl_picks_${ov.userId}${poolKeySuffix}_week_${w}`) ||
                (ov.userId === "user-demo-01"
                  ? localStorage.getItem(`nfl_weekly_picks${poolKeySuffix}_week_${w}`)
                  : null);
              if (localRaw) {
                const parsed = JSON.parse(localRaw) as Record<string, string>;
                weekPicks = { ...weekPicks, ...parsed };
              }
              const localMnf =
                localStorage.getItem(`nfl_mnf_${resolvedUserId}${poolKeySuffix}_week_${w}`) ||
                localStorage.getItem(`nfl_mnf_${ov.userId}${poolKeySuffix}_week_${w}`) ||
                (ov.userId === "user-demo-01"
                  ? localStorage.getItem(`nfl_weekly_mnf${poolKeySuffix}_week_${w}`)
                  : null);
              if (localMnf && !isNaN(parseInt(localMnf, 10))) {
                weekMnf = parseInt(localMnf, 10);
              }
            } catch {}
          }

          for (const [gameId, selectedTeam] of Object.entries(weekPicks)) {
            synthesizedPicks.push({
              user_id: resolvedUserId,
              game_id: gameId,
              selected_team: selectedTeam,
              week_number: w,
              pool_id: poolId,
            });
          }

          if (weekMnf !== undefined) {
            synthesizedTiebreakers.push({
              user_id: resolvedUserId,
              predicted_score: weekMnf,
              predicted_mnf_score: weekMnf,
              week_number: w,
            });
          }
        }
      }

      allPicks = synthesizedPicks;
      allTiebreakers = synthesizedTiebreakers;
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
      const mockFallback =
        poolId === DEFAULT_POOL_ID
          ? MOCK_LEADERBOARD.find((m) => m.userId === prof.id)
          : undefined;

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

      const memberInfo = poolMembers?.find((m) => m.user_id === prof.id);
      const isLeader =
        poolData?.leader_id === prof.id ||
        poolData?.creator_id === prof.id ||
        memberInfo?.role === "leader" ||
        Boolean(mockFallback?.isLeader) ||
        (poolId === DEFAULT_POOL_ID && prof.id === "user-demo-01");
      const isHidden = Boolean(memberInfo?.is_hidden ?? mockFallback?.isHidden);
      const role: PoolRole = (memberInfo?.role as PoolRole) || (isLeader ? "leader" : "member");

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
        isLeader,
        role,
        isHidden,
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

    // Filter out hidden members unless includeHidden is true (e.g. for pool leader management)
    const activeEntries = includeHidden ? entries : entries.filter((e) => !e.isHidden);

    // 1. Calculate Season Ranks (sorted by totalPoints descending, then wins)
    activeEntries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.seasonRecord.wins !== a.seasonRecord.wins) {
        return b.seasonRecord.wins - a.seasonRecord.wins;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    let currentSeasonRank = 1;
    for (let i = 0; i < activeEntries.length; i++) {
      if (i > 0 && activeEntries[i].totalPoints < activeEntries[i - 1].totalPoints) {
        currentSeasonRank = i + 1;
      }
      activeEntries[i].rank = currentSeasonRank;
    }

    // 2. Calculate Weekly Ranks (sorted by weeklyPoints descending)
    const weeklySorted = [...activeEntries].sort((a, b) => {
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

    return activeEntries;
  } catch (err) {
    console.error("Error computing live leaderboard:", err);
    return MOCK_LEADERBOARD;
  }
}

/**
 * Fetch and compute season-long standings across the entire season.
 * This represents season-long and lifetime stats and NEVER changes with week selection.
 */
export async function fetchSeasonStandings(
  includeHidden: boolean = false,
  poolId: string = getActivePoolId()
): Promise<LeaderboardEntry[]> {
  const activeWeek = calculateFallbackWeek();
  return fetchLiveLeaderboard(activeWeek, undefined, includeHidden, poolId);
}

// ==============================================================================
// 5. POOL LEADER & ADMINISTRATIVE TOOLS
// ==============================================================================

/**
 * Check if the given user is a pool leader or administrator.
 * In local/demo mode, check mock/local pool leadership.
 */
export async function checkIsPoolLeader(
  userId?: string,
  poolId: string = getActivePoolId()
): Promise<boolean> {
  const effectiveUserId = userId || "user-demo-01";
  const localLeader = getLocalLeaderUserId(poolId);
  if (localLeader === effectiveUserId) {
    return true;
  }

  // Check custom locally created pools
  const customPool = getLocalCustomPools().find((p) => p.id === poolId);
  if (customPool && (customPool.leaderId === effectiveUserId || customPool.creatorId === effectiveUserId)) {
    return true;
  }

  // If demo user or guest, check MOCK_POOLS leadership
  if (!userId || userId === "user-demo-01") {
    const mockPool = MOCK_POOLS.find((p) => p.id === poolId);
    if (mockPool) {
      return mockPool.leaderId === "user-demo-01" || mockPool.creatorId === "user-demo-01";
    }
    return true;
  }

  const supabase = createClient();
  if (!supabase) return false;

  try {
    // 1. Check pools table
    const { data: pool } = await supabase
      .from("pools")
      .select("leader_id, creator_id")
      .eq("id", poolId)
      .maybeSingle();

    if (pool && (pool.leader_id === userId || pool.creator_id === userId)) {
      return true;
    }

    // 2. Check pool_members table
    const { data: member } = await supabase
      .from("pool_members")
      .select("role")
      .eq("pool_id", poolId)
      .eq("user_id", userId)
      .maybeSingle();

    if (member && (member.role === "leader" || member.role === "admin")) {
      return true;
    }

    return false;
  } catch (err) {
    console.error("Error checking pool leader status:", err);
    return false;
  }
}

/**
 * Fetch detailed pool information
 */
export async function fetchPoolDetails(
  poolId: string = getActivePoolId()
): Promise<Pool | null> {
  // Check locally created pools first
  const localCustom = getLocalCustomPools().find((p) => p.id === poolId || p.slug === poolId);
  if (localCustom) {
    return {
      ...localCustom,
      leaderId: getLocalLeaderUserId(localCustom.id),
    };
  }

  const mockMatch = MOCK_POOLS.find((p) => p.id === poolId || p.slug === poolId);

  const supabase = createClient();
  if (!supabase) {
    if (mockMatch) {
      return {
        ...mockMatch,
        leaderId: getLocalLeaderUserId(mockMatch.id),
      };
    }
    return {
      ...MOCK_POOLS[0],
      id: poolId,
      leaderId: getLocalLeaderUserId(poolId),
    };
  }

  try {
    const { data, error } = await supabase
      .from("pools")
      .select("*")
      .eq("id", poolId)
      .maybeSingle();

    if (error || !data) {
      if (mockMatch) {
        return {
          ...mockMatch,
          leaderId: getLocalLeaderUserId(mockMatch.id),
        };
      }
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      sport: data.sport,
      league: data.league,
      format: data.format,
      seasonYear: data.season_year,
      isPublic: data.is_public,
      joinCode: data.join_code,
      creatorId: data.creator_id,
      leaderId: data.leader_id,
      settings: data.settings,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error("Error fetching pool details:", err);
    return mockMatch || null;
  }
}

/**
 * Fetch all pools where the current user is a member (with fallback to mock/demo pools)
 */
export async function fetchUserPools(
  userId?: string
): Promise<UserPoolMembership[]> {
  const effectiveUserId = userId || "user-demo-01";
  const leftPoolIds = getLocalLeftPoolIds(effectiveUserId);
  const customPools = getLocalCustomPools();
  const localJoined = getLocalJoinedPoolIds();

  // Build local/demo memberships for unauthenticated/demo mode
  const buildFallbackMemberships = (): UserPoolMembership[] => {
    // Start strictly with pools the demo user is actually a member of
    const base: UserPoolMembership[] = MOCK_USER_POOLS.filter((m) => !leftPoolIds.has(m.pool.id)).map((m) => {
      const leaderId = getLocalLeaderUserId(m.pool.id);
      const isLeader = leaderId === effectiveUserId;
      return {
        ...m,
        role: (isLeader ? "leader" : "member") as PoolRole,
        isLeader,
        pool: {
          ...m.pool,
          leaderId,
        },
      };
    });

    const existingIds = new Set(base.map((b) => b.pool.id));

    // If the demo user explicitly joined any other pool via join code (e.g. BLITZ26 or TDCLUB26)
    for (const jid of localJoined) {
      if (!existingIds.has(jid) && !leftPoolIds.has(jid)) {
        const pool = MOCK_POOLS.find((p) => p.id === jid);
        if (pool) {
          const leaderId = getLocalLeaderUserId(pool.id);
          const isLeader = leaderId === effectiveUserId || pool.creatorId === effectiveUserId;
          base.push({
            pool: {
              ...pool,
              leaderId,
            },
            role: (isLeader ? "leader" : "member") as PoolRole,
            isLeader,
            joinedAt: new Date().toISOString(),
            memberCount: (MOCK_POOL_OVERRIDES[pool.id]?.length || 6) + 1,
            userRank: 1,
            userPoints: 0,
            weeklyPoints: 0,
          });
          existingIds.add(jid);
        }
      }
    }

    // Merge any locally created pools
    for (const cp of customPools) {
      if (!existingIds.has(cp.id) && !leftPoolIds.has(cp.id)) {
        const isLeader = cp.leaderId === effectiveUserId || cp.creatorId === effectiveUserId;
        base.push({
          pool: cp,
          role: isLeader ? "leader" : "member",
          isLeader,
          joinedAt: cp.createdAt || new Date().toISOString(),
          memberCount: 1,
          userRank: 1,
          userPoints: 0,
          weeklyPoints: 0,
        });
        existingIds.add(cp.id);
      }
    }

    return base;
  };

  const supabase = createClient();
  if (!supabase || !userId || userId === "user-demo-01") {
    return buildFallbackMemberships();
  }

  try {
    // 1. Fetch user's pool_members rows from Supabase
    const { data: memberships } = await supabase
      .from("pool_members")
      .select("pool_id, user_id, role, joined_at")
      .eq("user_id", userId);

    const memberPoolIds = new Set<string>();
    if (memberships) {
      for (const m of memberships) {
        memberPoolIds.add(m.pool_id);
      }
    }

    // 2. Also check pools where user is creator or leader
    const { data: ownedPools } = await supabase
      .from("pools")
      .select("id")
      .or(`creator_id.eq.${userId},leader_id.eq.${userId}`);

    if (ownedPools) {
      for (const op of ownedPools) {
        memberPoolIds.add(op.id);
      }
    }

    // 3. Include any pools the user joined via code in this browser session
    for (const jid of localJoined) {
      memberPoolIds.add(jid);
    }

    // Filter out pools the user explicitly left
    for (const lid of leftPoolIds) {
      memberPoolIds.delete(lid);
    }

    if (memberPoolIds.size === 0) {
      return [];
    }

    const poolIdList = Array.from(memberPoolIds);
    const { data: poolsData } = await supabase
      .from("pools")
      .select("*")
      .in("id", poolIdList);

    const results: UserPoolMembership[] = [];
    const seenIds = new Set<string>();

    if (poolsData && poolsData.length > 0) {
      // Count members per pool
      const { data: allPoolMembers } = await supabase
        .from("pool_members")
        .select("pool_id, user_id")
        .in("pool_id", poolIdList);

      const countByPool: Record<string, number> = {};
      if (allPoolMembers) {
        for (const row of allPoolMembers) {
          countByPool[row.pool_id] = (countByPool[row.pool_id] || 0) + 1;
        }
      }

      for (const p of poolsData) {
        seenIds.add(p.id);
        const memRow = memberships?.find((m) => m.pool_id === p.id);
        const isLeader =
          p.leader_id === userId ||
          p.creator_id === userId ||
          memRow?.role === "leader" ||
          memRow?.role === "admin";
        const role: PoolRole = isLeader
          ? "leader"
          : ((memRow?.role as PoolRole) || "member");

        const mockRef = MOCK_USER_POOLS.find((m) => m.pool.id === p.id);

        results.push({
          pool: {
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            sport: p.sport,
            league: p.league,
            format: p.format,
            seasonYear: p.season_year,
            isPublic: p.is_public,
            joinCode: p.join_code,
            creatorId: p.creator_id,
            leaderId: p.leader_id,
            settings: p.settings,
            createdAt: p.created_at,
          },
          role,
          isLeader,
          joinedAt: memRow?.joined_at || p.created_at || new Date().toISOString(),
          memberCount: countByPool[p.id] || mockRef?.memberCount || 6,
          userRank: mockRef?.userRank,
          userPoints: mockRef?.userPoints,
          weeklyPoints: mockRef?.weeklyPoints,
        });
      }
    }

    // Also include any pool in memberPoolIds that was a mock/local pool the user joined
    for (const pid of poolIdList) {
      if (!seenIds.has(pid)) {
        const mockP = MOCK_POOLS.find((p) => p.id === pid) || customPools.find((p) => p.id === pid);
        if (mockP) {
          seenIds.add(pid);
          const leaderId = getLocalLeaderUserId(pid);
          const isLeader = leaderId === userId || mockP.creatorId === userId;
          results.push({
            pool: {
              ...mockP,
              leaderId,
            },
            role: (isLeader ? "leader" : "member") as PoolRole,
            isLeader,
            joinedAt: new Date().toISOString(),
            memberCount: (MOCK_POOL_OVERRIDES[pid]?.length || 6) + 1,
            userRank: 1,
            userPoints: 0,
            weeklyPoints: 0,
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.error("Error fetching user pools:", err);
    return [];
  }
}

/**
 * Create a new pool and enroll the creator as Pool Leader
 */
export async function createNewPool(
  params: {
    name: string;
    description?: string;
    isPublic?: boolean;
    joinCode?: string;
  },
  userId?: string
): Promise<{ success: boolean; pool?: Pool; error?: string }> {
  const trimmedName = params.name.trim();
  if (!trimmedName) {
    return { success: false, error: "Pool name is required." };
  }

  const effectiveUserId = userId || "user-demo-01";
  const baseSlug = trimmedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${baseSlug || "pool"}-${Math.floor(100 + Math.random() * 900)}`;
  const joinCode =
    params.joinCode?.trim().toUpperCase() ||
    slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);

  const newPool: Pool = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `pool-${Date.now()}`,
    name: trimmedName,
    slug,
    description:
      params.description?.trim() ||
      "Weekly straight-up NFL pick'em pool with Monday Night Football tiebreaker.",
    sport: "football",
    league: "nfl",
    format: "straight_up",
    seasonYear: 2026,
    isPublic: params.isPublic ?? false,
    joinCode,
    creatorId: effectiveUserId,
    leaderId: effectiveUserId,
    createdAt: new Date().toISOString(),
  };

  // Persist to local custom pools for instant responsiveness
  const custom = getLocalCustomPools();
  saveLocalCustomPools([newPool, ...custom]);

  const supabase = createClient();
  if (supabase && userId && userId !== "user-demo-01") {
    try {
      const { data, error } = await supabase
        .from("pools")
        .insert({
          id: newPool.id,
          name: newPool.name,
          slug: newPool.slug,
          description: newPool.description,
          sport: newPool.sport,
          league: newPool.league,
          format: newPool.format,
          season_year: newPool.seasonYear,
          is_public: newPool.isPublic,
          join_code: newPool.joinCode,
          creator_id: userId,
          leader_id: userId,
        })
        .select("*")
        .single();

      if (!error && data) {
        await supabase.from("pool_members").upsert(
          {
            pool_id: data.id,
            user_id: userId,
            role: "leader",
          },
          { onConflict: "pool_id,user_id" }
        );
      }
    } catch (err) {
      console.warn("Notice creating pool in Supabase (saved locally):", err);
    }
  }

  return { success: true, pool: newPool };
}

/**
 * Leave a pool
 */
export async function leavePool(
  poolId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const effectiveUserId = userId || "user-demo-01";
  if (typeof window !== "undefined") {
    try {
      const left = getLocalLeftPoolIds(effectiveUserId);
      left.add(poolId);
      localStorage.setItem(
        `${LOCAL_MEMBERSHIPS_STORAGE_KEY}_left_${effectiveUserId}`,
        JSON.stringify([...left])
      );
      const joinedSet = getLocalJoinedPoolIds();
      if (joinedSet.has(poolId)) {
        joinedSet.delete(poolId);
        localStorage.setItem(LOCAL_JOINED_POOLS_KEY, JSON.stringify([...joinedSet]));
      }
    } catch {}
  }

  const supabase = createClient();
  if (supabase && userId && userId !== "user-demo-01") {
    try {
      await supabase
        .from("pool_members")
        .delete()
        .eq("pool_id", poolId)
        .eq("user_id", userId);
    } catch (err) {
      console.warn("Notice leaving pool in Supabase:", err);
    }
  }

  // If leaving the currently active pool, find a remaining pool to switch to
  if (getActivePoolId() === poolId) {
    const remainingPools = await fetchUserPools(userId);
    const nextActive = remainingPools.find((p) => p.pool.id !== poolId)?.pool.id || DEFAULT_POOL_ID;
    setActivePoolId(nextActive);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pool-changed", { detail: { poolId } }));
  }

  return { success: true };
}

/**
 * Fetch all members of a pool with profile information and leader status
 */
export async function fetchPoolMembers(
  poolId: string = DEFAULT_POOL_ID
): Promise<PoolMember[]> {
  const buildLocalPoolMembers = (): PoolMember[] => {
    const removedIds = getLocalRemovedUserIds(poolId);
    const hiddenIds = getLocalHiddenUserIds(poolId);
    const leaderId = getLocalLeaderUserId(poolId);
    const overrides = MOCK_POOL_OVERRIDES[poolId];

    const baseMembers: PoolMember[] = overrides
      ? overrides.map((ov) => ({
          poolId,
          userId: ov.userId,
          role: (ov.userId === leaderId ? "leader" : "member") as PoolRole,
          isHidden: false,
          joinedAt: "2026-08-15T12:00:00Z",
          displayName: ov.displayName,
        }))
      : MOCK_POOL_MEMBERS.map((m) => ({ ...m, poolId }));

    return baseMembers
      .filter((m) => !removedIds.has(m.userId))
      .map((m) => ({
        ...m,
        role: m.userId === leaderId ? "leader" : m.role,
        isHidden: hiddenIds.has(m.userId) || Boolean(m.isHidden),
      }));
  };

  const supabase = createClient();

  // If no Supabase connection or if this is a dummy pool with mock overrides, use mock data with local overrides
  if (!supabase || (poolId !== DEFAULT_POOL_ID && MOCK_POOL_OVERRIDES[poolId])) {
    return buildLocalPoolMembers();
  }

  try {
    // 1. Fetch pool to identify current leader
    const { data: pool } = await supabase
      .from("pools")
      .select("leader_id, creator_id")
      .eq("id", poolId)
      .maybeSingle();

    // 2. Fetch all pool members
    const { data: members, error: memErr } = await supabase
      .from("pool_members")
      .select("pool_id, user_id, role, is_hidden, joined_at")
      .eq("pool_id", poolId);

    if (memErr || !members || members.length === 0) {
      if (poolId !== DEFAULT_POOL_ID) {
        return buildLocalPoolMembers();
      }
      // Fallback to profiles if pool_members not yet populated on default pool
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url");

      if (!profiles || profiles.length === 0) {
        return buildLocalPoolMembers();
      }

      return profiles.map((p, index) => {
        const isLeader = pool?.leader_id === p.id || pool?.creator_id === p.id || index === 0;
        return {
          poolId,
          userId: p.id,
          role: isLeader ? "leader" : "member",
          isHidden: false,
          joinedAt: new Date().toISOString(),
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
        };
      });
    }

    // 3. Fetch user profiles for these members
    const userIds = members.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]));

    return members.map((m) => {
      const prof = profileMap.get(m.user_id);
      const isLeader = pool?.leader_id === m.user_id || m.role === "leader";
      return {
        poolId: m.pool_id,
        userId: m.user_id,
        role: (isLeader ? "leader" : m.role) as PoolRole,
        isHidden: Boolean(m.is_hidden),
        joinedAt: m.joined_at,
        displayName: prof?.display_name || "Pool Player",
        avatarUrl: prof?.avatar_url,
      };
    });
  } catch (err) {
    console.error("Error fetching pool members:", err);
    return MOCK_POOL_MEMBERS;
  }
}

/**
 * Toggle member visibility (Show / Hide from public scoreboards/leaderboards)
 */
export async function toggleMemberVisibility(
  targetUserId: string,
  isHidden: boolean,
  poolId: string = DEFAULT_POOL_ID
): Promise<{ success: boolean; error?: string }> {
  // Sync to local fallback storage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`pool_hidden_members_${poolId}`);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      if (isHidden) {
        set.add(targetUserId);
      } else {
        set.delete(targetUserId);
      }
      localStorage.setItem(`pool_hidden_members_${poolId}`, JSON.stringify([...set]));
    } catch {}
  }

  const supabase = createClient();
  if (!supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from("pool_members")
      .update({ is_hidden: isHidden })
      .eq("pool_id", poolId)
      .eq("user_id", targetUserId);

    if (error) {
      console.warn("Notice updating member visibility in Supabase:", error.message);
      // Fallback handled locally
    }

    return { success: true };
  } catch (err) {
    console.error("Error in toggleMemberVisibility:", err);
    return { success: true };
  }
}

/**
 * Remove a member from the pool
 */
export async function removePoolMember(
  targetUserId: string,
  poolId: string = DEFAULT_POOL_ID
): Promise<{ success: boolean; error?: string }> {
  // Sync to local fallback storage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(`pool_removed_members_${poolId}`);
      const set = new Set<string>(raw ? JSON.parse(raw) : []);
      set.add(targetUserId);
      localStorage.setItem(`pool_removed_members_${poolId}`, JSON.stringify([...set]));
    } catch {}
  }

  const supabase = createClient();
  if (!supabase) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from("pool_members")
      .delete()
      .eq("pool_id", poolId)
      .eq("user_id", targetUserId);

    if (error) {
      console.error("Error removing member from pool:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error in removePoolMember:", err);
    return { success: false, error: "Failed to remove member" };
  }
}

/**
 * Transfer pool leadership to another member
 */
export async function transferPoolLeadership(
  newLeaderUserId: string,
  poolId: string = DEFAULT_POOL_ID
): Promise<{ success: boolean; error?: string }> {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`pool_leader_id_${poolId}`, newLeaderUserId);
    } catch {}
  }

  const supabase = createClient();
  if (!supabase) {
    return { success: true };
  }

  try {
    // 1. Update pools table leader_id
    const { error: poolErr } = await supabase
      .from("pools")
      .update({ leader_id: newLeaderUserId })
      .eq("id", poolId);

    if (poolErr) {
      console.warn("Notice: could not update pools leader_id:", poolErr.message);
    }

    // 2. Promote user to leader in pool_members
    await supabase
      .from("pool_members")
      .update({ role: "leader" })
      .eq("pool_id", poolId)
      .eq("user_id", newLeaderUserId);

    return { success: true };
  } catch (err) {
    console.error("Error transferring leadership:", err);
    return { success: false, error: "Failed to transfer leadership" };
  }
}

/**
 * Fetch existing picks for a specific user and week so the leader can inspect & edit
 */
export async function fetchMemberPicksForLeader(
  targetUserId: string,
  weekNumber: number,
  poolId: string = DEFAULT_POOL_ID
): Promise<{ picks: Record<string, string>; mnfScore?: string }> {
  const poolKeySuffix = poolId === DEFAULT_POOL_ID ? "" : `_${poolId}`;

  // Check local override picks first
  if (typeof window !== "undefined") {
    try {
      const local =
        localStorage.getItem(`nfl_picks_${targetUserId}${poolKeySuffix}_week_${weekNumber}`) ||
        (poolId === DEFAULT_POOL_ID
          ? localStorage.getItem(`nfl_picks_${targetUserId}_week_${weekNumber}`)
          : null);
      if (local) {
        const parsed = JSON.parse(local);
        const mnfLocal =
          localStorage.getItem(`nfl_mnf_${targetUserId}${poolKeySuffix}_week_${weekNumber}`) ||
          (poolId === DEFAULT_POOL_ID
            ? localStorage.getItem(`nfl_mnf_${targetUserId}_week_${weekNumber}`)
            : null);
        return { picks: parsed, mnfScore: mnfLocal || undefined };
      }
    } catch {}
  }

  // If this is one of the dummy pools, get their Weeks 1-5 random picks
  if (poolId !== DEFAULT_POOL_ID && MOCK_POOL_OVERRIDES[poolId]) {
    const games = await fetchWeekGames(weekNumber, 2026);
    return getDummyPoolUserPicksForWeek(poolId, targetUserId, weekNumber, games);
  }

  const supabase = createClient();
  if (!supabase) {
    const mockEntry = MOCK_LEADERBOARD.find((e) => e.userId === targetUserId);
    return {
      picks: mockEntry?.picks || {},
      mnfScore: mockEntry?.predictedMnfScore ? String(mockEntry.predictedMnfScore) : undefined,
    };
  }

  try {
    const { data: picksData } = await supabase
      .from("picks")
      .select("game_id, selected_team")
      .eq("user_id", targetUserId)
      .eq("week_number", weekNumber)
      .eq("pool_id", poolId);

    const picks: Record<string, string> = {};
    if (picksData) {
      for (const p of picksData) {
        if (p.game_id && p.selected_team) {
          picks[p.game_id] = p.selected_team;
        }
      }
    }

    const { data: tieData } = await supabase
      .from("tiebreakers")
      .select("predicted_score, predicted_mnf_score")
      .eq("user_id", targetUserId)
      .eq("week_number", weekNumber)
      .eq("pool_id", poolId)
      .maybeSingle();

    const mnfScore =
      tieData?.predicted_score !== undefined
        ? String(tieData.predicted_score)
        : tieData?.predicted_mnf_score !== undefined
        ? String(tieData.predicted_mnf_score)
        : undefined;

    return { picks, mnfScore };
  } catch (err) {
    console.error("Error fetching member picks for leader:", err);
    return { picks: {} };
  }
}

/**
 * DOOMSDAY SCENARIO: Save emergency pick overrides on behalf of any pool member.
 * Pool leader bypasses game kickoff restrictions.
 */
export async function saveDoomsdayOverridePicks(
  payload: DoomsdayPickPayload
): Promise<{ success: boolean; error?: string; count?: number }> {
  const { poolId, targetUserId, weekNumber, picks, mnfScore } = payload;
  const poolKeySuffix = poolId === DEFAULT_POOL_ID ? "" : `_${poolId}`;

  // Persist locally for immediate UI reflection and demo mode
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`nfl_picks_${targetUserId}${poolKeySuffix}_week_${weekNumber}`, JSON.stringify(picks));
      if (mnfScore !== undefined && mnfScore !== "") {
        localStorage.setItem(`nfl_mnf_${targetUserId}${poolKeySuffix}_week_${weekNumber}`, String(mnfScore));
      }
    } catch {}
  }

  const supabase = createClient();
  if (!supabase) {
    return { success: true, count: Object.keys(picks).length };
  }

  try {
    const pickEntries = Object.entries(picks);
    let count = 0;

    if (pickEntries.length > 0) {
      const rows = pickEntries.map(([gameId, selectedTeam]) => ({
        pool_id: poolId,
        user_id: targetUserId,
        game_id: gameId,
        week_number: weekNumber,
        selected_team: selectedTeam,
        updated_at: new Date().toISOString(),
      }));

      // Upsert picks directly (allowed under Leader RLS policies)
      let { error: picksErr } = await supabase
        .from("picks")
        .upsert(rows, { onConflict: "pool_id,user_id,game_id" });

      if (picksErr && (picksErr.message.includes("pool_id") || picksErr.code === "PGRST204")) {
        // Fallback to V1 constraint if pool_id column is omitted
        const rowsV1 = pickEntries.map(([gameId, selectedTeam]) => ({
          user_id: targetUserId,
          game_id: gameId,
          week_number: weekNumber,
          selected_team: selectedTeam,
          updated_at: new Date().toISOString(),
        }));
        const resV1 = await supabase
          .from("picks")
          .upsert(rowsV1, { onConflict: "user_id,game_id" });
        picksErr = resV1.error;
      }

      if (picksErr) {
        console.error("Error during doomsday pick override:", picksErr);
        return { success: false, error: picksErr.message };
      }

      count = pickEntries.length;
    }

    // Upsert tiebreaker if provided
    if (mnfScore !== undefined && mnfScore !== "") {
      const parsedScore = typeof mnfScore === "number" ? mnfScore : parseInt(mnfScore, 10);
      if (!isNaN(parsedScore)) {
        await supabase.from("tiebreakers").upsert(
          {
            pool_id: poolId,
            user_id: targetUserId,
            week_number: weekNumber,
            predicted_score: parsedScore,
            predicted_mnf_score: parsedScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "pool_id,user_id,week_number" }
        );
      }
    }

    return { success: true, count };
  } catch (err) {
    console.error("Error in saveDoomsdayOverridePicks:", err);
    return { success: false, error: "Failed to save emergency pick override" };
  }
}

// ==============================================================================
// 6. POOL DISCOVERY, JOINING & CREATION (HOME / LANDING PAGE)
// ==============================================================================

export interface PoolDesignPreset {
  id: "classic_straight_up" | "spread_showdown" | "survivor_knockout";
  title: string;
  badge: string;
  format: Pool["format"];
  summary: string;
  rulesPreview: string[];
  isPlaceholder?: boolean;
}

export const POOL_DESIGN_PRESETS: PoolDesignPreset[] = [
  {
    id: "classic_straight_up",
    title: "Classic Straight-Up",
    badge: "Active Format",
    format: "straight_up",
    summary: "Pick outright winners for every weekly NFL matchup. 1 point per win with MNF score tiebreaker.",
    rulesPreview: ["1 pt per correct winner", "Locks at each game's kickoff", "MNF total points tiebreaker"],
    isPlaceholder: false,
  },
  {
    id: "spread_showdown",
    title: "Spread Showdown (ATS)",
    badge: "Preset Placeholder",
    format: "against_spread",
    summary: "Pick teams to cover the weekly Las Vegas point spread. Ideal for competitive leagues.",
    rulesPreview: ["Pick against the spread", "1 pt per ATS cover", "Custom spread locks (Coming soon)"],
    isPlaceholder: true,
  },
  {
    id: "survivor_knockout",
    title: "Survivor Knockout",
    badge: "Preset Placeholder",
    format: "survivor",
    summary: "Pick one team to win each week. You cannot reuse a team all season—lose once and you're out.",
    rulesPreview: ["1 pick per week", "No repeating NFL teams", "Last player standing wins (Coming soon)"],
    isPlaceholder: true,
  },
];

export const DEFAULT_FEATURED_POOLS: (Pool & { memberCount?: number })[] = [
  {
    id: DEFAULT_POOL_ID,
    name: "2026 NFL Weekly Pick'em",
    slug: "nfl-2026-weekly",
    description: "Season-long straight-up NFL pick'em with weekly scoreboard and MNF tiebreakers.",
    sport: "football",
    league: "nfl",
    format: "straight_up",
    seasonYear: 2026,
    isPublic: false,
    joinCode: "NFL2026",
    memberCount: 6,
    settings: {
      presetId: "classic_straight_up",
      tiebreaker: "mnf_total_points",
    },
  },
];

const LOCAL_CREATED_POOLS_KEY = "nfl_weekly_created_pools_v1";
const LOCAL_JOINED_POOLS_KEY = "nfl_weekly_joined_pool_ids_v1";
const SAVED_ACTIVE_POOL_OBJ_KEY = "nfl_weekly_active_pool_v1";

export function getLocalCreatedPools(): Pool[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CREATED_POOLS_KEY);
    const list1 = raw ? (JSON.parse(raw) as Pool[]) : [];
    const list2 = getLocalCustomPools();
    const map = new Map<string, Pool>();
    for (const p of [...list1, ...list2]) {
      map.set(p.id, p);
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function saveLocalCreatedPool(pool: Pool) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalCreatedPools().filter((p) => p.id !== pool.id && p.slug !== pool.slug);
    const updated = [pool, ...existing];
    localStorage.setItem(LOCAL_CREATED_POOLS_KEY, JSON.stringify(updated));
    saveLocalCustomPools(updated);
  } catch {}
}

export function getLocalJoinedPoolIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_JOINED_POOLS_KEY);
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
  } catch {
    return new Set();
  }
}

export function markPoolJoinedLocally(poolId: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getLocalJoinedPoolIds();
    set.add(poolId);
    localStorage.setItem(LOCAL_JOINED_POOLS_KEY, JSON.stringify([...set]));
  } catch {}
}

export function getSavedActivePool(): Pool | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_ACTIVE_POOL_OBJ_KEY);
    return raw ? (JSON.parse(raw) as Pool) : null;
  } catch {
    return null;
  }
}

export function setSavedActivePool(pool: Pool | null) {
  if (typeof window === "undefined") return;
  try {
    if (!pool) {
      localStorage.removeItem(SAVED_ACTIVE_POOL_OBJ_KEY);
    } else {
      localStorage.setItem(SAVED_ACTIVE_POOL_OBJ_KEY, JSON.stringify(pool));
      setActivePoolId(pool.id);
      markPoolJoinedLocally(pool.id);
    }
  } catch {}
}

export function generateJoinCode(prefix?: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (prefix) {
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 3);
    if (cleanPrefix.length >= 2) {
      return `${cleanPrefix}-${code.slice(0, 4)}`;
    }
  }
  return code;
}

/**
 * Fetch pools for lookup and the user's joined/created pools
 */
export async function fetchDirectoryPools(userId?: string): Promise<{
  allPools: (Pool & { memberCount?: number; isJoined?: boolean })[];
  myPools: (Pool & { memberCount?: number; isJoined?: boolean })[];
}> {
  const localCreated = getLocalCreatedPools();
  const localJoinedIds = getLocalJoinedPoolIds();
  const supabase = createClient();

  const poolMap = new Map<string, Pool & { memberCount?: number; isJoined?: boolean }>();

  // 1. Seed default pools and MOCK_POOLS for code lookup
  for (const fp of DEFAULT_FEATURED_POOLS) {
    poolMap.set(fp.id, {
      ...fp,
      isJoined: localJoinedIds.has(fp.id),
    });
  }

  for (const mp of MOCK_POOLS) {
    if (!poolMap.has(mp.id)) {
      poolMap.set(mp.id, {
        ...mp,
        memberCount: 8,
        isJoined: localJoinedIds.has(mp.id),
      });
    }
  }

  // 2. Merge locally created pools
  for (const lp of localCreated) {
    poolMap.set(lp.id, {
      ...lp,
      memberCount: 1,
      isJoined: true,
    });
  }

  // 3. Query Supabase pools & memberships if available
  if (supabase) {
    try {
      const { data: dbPools } = await supabase
        .from("pools")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: memberCounts } = await supabase
        .from("pool_members")
        .select("pool_id, user_id");

      const countByPool = new Map<string, number>();
      const userJoinedInDb = new Set<string>();

      if (memberCounts) {
        for (const row of memberCounts) {
          countByPool.set(row.pool_id, (countByPool.get(row.pool_id) || 0) + 1);
          if (userId && row.user_id === userId) {
            userJoinedInDb.add(row.pool_id);
          }
        }
      }

      if (dbPools) {
        for (const row of dbPools) {
          const existing = poolMap.get(row.id);
          const isJoined =
            localJoinedIds.has(row.id) ||
            userJoinedInDb.has(row.id) ||
            (Boolean(userId) && (row.creator_id === userId || row.leader_id === userId));

          poolMap.set(row.id, {
            id: row.id,
            name: row.name,
            slug: row.slug,
            description: row.description || existing?.description,
            sport: row.sport || "football",
            league: row.league || "nfl",
            format: row.format || "straight_up",
            seasonYear: row.season_year || 2026,
            isPublic: false,
            joinCode: row.join_code || existing?.joinCode || row.slug.toUpperCase().slice(0, 8),
            creatorId: row.creator_id,
            leaderId: row.leader_id,
            settings: row.settings || existing?.settings,
            createdAt: row.created_at,
            memberCount: countByPool.get(row.id) || existing?.memberCount || 1,
            isJoined,
          });
        }
      }
    } catch (err) {
      console.warn("Notice fetching pools from Supabase:", err);
    }
  }

  const allPools = Array.from(poolMap.values());
  const myPools = allPools.filter((p) => p.isJoined);

  return { allPools, myPools };
}

/**
 * Join an existing pool using a Join Code, Pool Slug, Pool ID, or full Invite Link URL.
 */
export async function joinPoolByCodeOrSlug(
  rawInput: string,
  userId?: string
): Promise<{ success: boolean; pool?: Pool; error?: string }> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { success: false, error: "Please enter a pool code or invite link." };
  }

  // Extract ?join=... parameter if the user pasted a full invite URL
  let normalizedQuery = trimmed;
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.includes("?join=")) {
      const urlObj = new URL(trimmed.startsWith("http") ? trimmed : `https://example.com/${trimmed}`);
      const joinParam = urlObj.searchParams.get("join");
      if (joinParam) {
        normalizedQuery = joinParam.trim();
      }
    }
  } catch {
    // Keep trimmed string
  }

  const lowerQuery = normalizedQuery.toLowerCase();
  const { allPools } = await fetchDirectoryPools(userId);

  // 1. Check in loaded pools (matches id, slug, or joinCode case-insensitively)
  let matchedPool = allPools.find(
    (p) =>
      p.id.toLowerCase() === lowerQuery ||
      p.slug.toLowerCase() === lowerQuery ||
      (p.joinCode && p.joinCode.toLowerCase() === lowerQuery)
  );

  const supabase = createClient();

  // 2. If not found in initial list, query Supabase directly for private pools by join_code or slug
  if (!matchedPool && supabase) {
    try {
      const { data: foundRows } = await supabase
        .from("pools")
        .select("*")
        .or(`slug.ilike.${normalizedQuery},join_code.ilike.${normalizedQuery}`)
        .limit(1);

      if (foundRows && foundRows.length > 0) {
        const row = foundRows[0];
        matchedPool = {
          id: row.id,
          name: row.name,
          slug: row.slug,
          description: row.description,
          sport: row.sport || "football",
          league: row.league || "nfl",
          format: row.format || "straight_up",
          seasonYear: row.season_year || 2026,
          isPublic: false,
          joinCode: row.join_code,
          creatorId: row.creator_id,
          leaderId: row.leader_id,
          settings: row.settings,
          createdAt: row.created_at,
        };
      }
    } catch (err) {
      console.warn("Could not query private pool by code:", err);
    }
  }

  if (!matchedPool) {
    return {
      success: false,
      error: `No pool found matching "${normalizedQuery}". Check your invite code and try again.`,
    };
  }

  // Enroll user in Supabase pool_members if authenticated
  if (supabase && userId) {
    try {
      await supabase.from("pool_members").upsert(
        {
          pool_id: matchedPool.id,
          user_id: userId,
          role: "member",
          is_hidden: false,
        },
        { onConflict: "pool_id,user_id" }
      );
    } catch {
      // Non-blocking fallback
    }
  }

  // Clear from leftPoolIds if the user previously left it
  const effectiveUserId = userId || "user-demo-01";
  if (typeof window !== "undefined") {
    try {
      const leftKey = `${LOCAL_MEMBERSHIPS_STORAGE_KEY}_left_${effectiveUserId}`;
      const raw = localStorage.getItem(leftKey);
      if (raw) {
        const leftSet = new Set<string>(JSON.parse(raw));
        leftSet.delete(matchedPool.id);
        localStorage.setItem(leftKey, JSON.stringify([...leftSet]));
      }
    } catch {}
  }

  markPoolJoinedLocally(matchedPool.id);
  setSavedActivePool(matchedPool);
  setActivePoolId(matchedPool.id);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pool-changed", { detail: { poolId: matchedPool.id } }));
  }

  return { success: true, pool: matchedPool };
}

/**
 * Quick-create a new pool with a chosen preset design
 */
export async function createPoolQuickSetup(params: {
  name: string;
  description?: string;
  isPublic: boolean;
  presetId: PoolDesignPreset["id"];
  customJoinCode?: string;
  userId?: string;
}): Promise<{ success: boolean; pool?: Pool; error?: string }> {
  const cleanName = params.name.trim();
  if (!cleanName || cleanName.length < 3) {
    return { success: false, error: "Pool name must be at least 3 characters." };
  }

  const preset =
    POOL_DESIGN_PRESETS.find((p) => p.id === params.presetId) || POOL_DESIGN_PRESETS[0];

  const baseSlug = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const slug = `${baseSlug || "pool"}-${randomSuffix}`;
  const joinCode =
    params.customJoinCode?.trim().toUpperCase() || generateJoinCode(cleanName);

  const newPoolId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `pool-${Date.now()}-${randomSuffix}`;

  const newPool: Pool = {
    id: newPoolId,
    name: cleanName,
    slug,
    description:
      params.description?.trim() ||
      `${preset.title} pool for the 2026 NFL season.`,
    sport: "football",
    league: "nfl",
    format: preset.format,
    seasonYear: 2026,
    isPublic: params.isPublic,
    joinCode,
    creatorId: params.userId || "user-demo-01",
    leaderId: params.userId || "user-demo-01",
    settings: {
      presetId: preset.id,
      presetTitle: preset.title,
      tiebreaker: "mnf_total_points",
      lock_rule: "kickoff",
    },
    createdAt: new Date().toISOString(),
  };

  const supabase = createClient();
  if (supabase && params.userId) {
    try {
      const { data: inserted, error: insertError } = await supabase
        .from("pools")
        .insert({
          id: newPool.id,
          name: newPool.name,
          slug: newPool.slug,
          description: newPool.description,
          sport: newPool.sport,
          league: newPool.league,
          format: newPool.format,
          season_year: newPool.seasonYear,
          is_public: newPool.isPublic,
          join_code: newPool.joinCode,
          creator_id: params.userId,
          leader_id: params.userId,
          settings: newPool.settings,
        })
        .select("*")
        .maybeSingle();

      if (!insertError && inserted) {
        newPool.id = inserted.id;
        await supabase.from("pool_members").upsert(
          {
            pool_id: inserted.id,
            user_id: params.userId,
            role: "leader",
            is_hidden: false,
          },
          { onConflict: "pool_id,user_id" }
        );
      }
    } catch (err) {
      console.warn("Notice saving pool to Supabase (using local persistence):", err);
    }
  }

  saveLocalCreatedPool(newPool);
  markPoolJoinedLocally(newPool.id);
  setSavedActivePool(newPool);

  return { success: true, pool: newPool };
}



