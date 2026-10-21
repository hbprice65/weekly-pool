/**
 * @file playoff-challenge-service.ts
 * @description Service for managing NFL Playoffs Fantasy Challenge rosters,
 * consecutive week multiplier streak logic, and Full PPR fantasy scoring.
 */

import {
  PlayoffRound,
  PlayoffRosterSlot,
  PlayoffPosition,
  PlayoffLineupPick,
  PlayoffUserLineupMap,
  PlayoffLeaderboardEntry,
  PLAYOFF_ROSTER_SLOTS,
} from "@/types";
import {
  PLAYOFF_PLAYERS,
  calculateSlotMultiplier,
  getPlayerRoundScore,
} from "@/lib/playoff-data";
import { createClient } from "@/lib/supabase/client";

const LOCAL_PLAYOFF_LINEUPS_KEY = "nfl_playoff_challenge_lineups_v1";

export function getEmptyPlayoffLineup(): PlayoffUserLineupMap {
  return {
    QB: null,
    RB1: null,
    RB2: null,
    WR1: null,
    WR2: null,
    TE: null,
    K: null,
    DEF: null,
  };
}

/**
 * Storage schema for local fallback persistence:
 * {
 *   [poolId]: {
 *     [userId]: {
 *       [round]: { [slot]: PlayoffLineupPick }
 *     }
 *   }
 * }
 */
function getLocalLineupStore(): Record<
  string,
  Record<string, Record<number, Record<string, PlayoffLineupPick>>>
> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(LOCAL_PLAYOFF_LINEUPS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalLineupStore(
  store: Record<
    string,
    Record<string, Record<number, Record<string, PlayoffLineupPick>>>
  >
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_PLAYOFF_LINEUPS_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn("Error saving playoff lineup locally:", err);
  }
}

/**
 * Resolves a full user lineup for a specific round, applying multiplier streak logic
 * against the previous round's lineup.
 */
export async function fetchUserPlayoffLineup(
  poolId: string,
  userId: string,
  round: PlayoffRound
): Promise<PlayoffUserLineupMap> {
  const lineup: PlayoffUserLineupMap = getEmptyPlayoffLineup();

  // If round > 1, fetch previous round to calculate multipliers
  let previousRoundLineup: PlayoffUserLineupMap | undefined = undefined;
  if (round > 1) {
    previousRoundLineup = await fetchUserPlayoffLineup(
      poolId,
      userId,
      (round - 1) as PlayoffRound
    );
  }

  // 1. Try Supabase
  const supabase = createClient();
  let loadedFromSupabase = false;

  if (supabase && userId && !userId.startsWith("demo_") && !userId.startsWith("mock_")) {
    try {
      const { data, error } = await supabase
        .from("playoff_lineups")
        .select("*")
        .eq("pool_id", poolId)
        .eq("user_id", userId)
        .eq("round", round);

      if (!error && data && data.length > 0) {
        loadedFromSupabase = true;
        for (const row of data) {
          const slot = row.slot as PlayoffRosterSlot;
          const player = PLAYOFF_PLAYERS.find((p) => p.id === row.player_id);
          const score = getPlayerRoundScore(row.player_id, round);
          const multiplier = calculateSlotMultiplier(
            row.player_id,
            round,
            previousRoundLineup
          );

          lineup[slot] = {
            slot,
            playerId: row.player_id,
            playerName: row.player_name || player?.name || "Player",
            teamId: row.player_team || player?.teamId || "KC",
            position: (row.player_position as PlayoffPosition) || player?.position || "QB",
            multiplier,
            basePoints: score.basePoints,
            totalPoints: Math.round(score.basePoints * multiplier * 10) / 10,
            statsSummary: score.summary,
            isBye: round === 1 && Boolean(player?.isByeRound1),
            isEliminated: Boolean(player?.eliminatedInRound && round > player.eliminatedInRound),
          };
        }
      }
    } catch {
      // Fallback to local
    }
  }

  // 2. Local fallback if not found in Supabase
  if (!loadedFromSupabase) {
    const store = getLocalLineupStore();
    const userPoolRoundPicks = store[poolId]?.[userId]?.[round];

    if (userPoolRoundPicks) {
      for (const slotItem of PLAYOFF_ROSTER_SLOTS) {
        const pick = userPoolRoundPicks[slotItem.slot];
        if (pick && pick.playerId) {
          const player = PLAYOFF_PLAYERS.find((p) => p.id === pick.playerId);
          const score = getPlayerRoundScore(pick.playerId, round);
          const multiplier = calculateSlotMultiplier(
            pick.playerId,
            round,
            previousRoundLineup
          );

          lineup[slotItem.slot] = {
            slot: slotItem.slot,
            playerId: pick.playerId,
            playerName: pick.playerName || player?.name || "Player",
            teamId: pick.teamId || player?.teamId || "KC",
            position: pick.position || player?.position || slotItem.position,
            multiplier,
            basePoints: score.basePoints,
            totalPoints: Math.round(score.basePoints * multiplier * 10) / 10,
            statsSummary: score.summary,
            isBye: round === 1 && Boolean(player?.isByeRound1),
            isEliminated: Boolean(player?.eliminatedInRound && round > player.eliminatedInRound),
          };
        }
      }
    } else if (round === 1) {
      // For initial default state on brand new pool, prefill a fun starter lineup so user sees it working immediately!
      const defaultPicks: Partial<Record<PlayoffRosterSlot, string>> = {
        QB: "p_mahomes",
        RB1: "p_pacheco",
        RB2: "p_mccaffrey", // First round bye! Showcase the 0 pt + 2x multiplier rule!
        WR1: "p_rice_rashee",
        WR2: "p_st_brown",
        TE: "p_kelce",
        K: "p_butker",
        DEF: "p_def_kc",
      };

      for (const [slotStr, playerId] of Object.entries(defaultPicks)) {
        const slot = slotStr as PlayoffRosterSlot;
        const player = PLAYOFF_PLAYERS.find((p) => p.id === playerId);
        if (player) {
          const score = getPlayerRoundScore(player.id, 1);
          lineup[slot] = {
            slot,
            playerId: player.id,
            playerName: player.name,
            teamId: player.teamId,
            position: player.position,
            multiplier: 1,
            basePoints: score.basePoints,
            totalPoints: score.basePoints,
            statsSummary: score.summary,
            isBye: Boolean(player.isByeRound1),
            isEliminated: false,
          };
        }
      }
    }
  }

  return lineup;
}

/**
 * Saves a user's playoff lineup for a round and triggers cascading recalculation.
 */
export async function saveUserPlayoffLineup(
  poolId: string,
  userId: string,
  round: PlayoffRound,
  lineup: PlayoffUserLineupMap
): Promise<{ success: boolean; error?: string }> {
  // 1. Save locally
  const store = getLocalLineupStore();
  if (!store[poolId]) store[poolId] = {};
  if (!store[poolId][userId]) store[poolId][userId] = {};
  store[poolId][userId][round] = {};

  for (const slotKey of Object.keys(lineup) as PlayoffRosterSlot[]) {
    const pick = lineup[slotKey];
    if (pick) {
      store[poolId][userId][round][slotKey] = pick;
    }
  }
  saveLocalLineupStore(store);

  // 2. Save to Supabase if authenticated
  const supabase = createClient();
  if (supabase && userId && !userId.startsWith("demo_") && !userId.startsWith("mock_")) {
    try {
      const rowsToUpsert = Object.values(lineup)
        .filter((pick): pick is PlayoffLineupPick => pick !== null)
        .map((pick) => ({
          pool_id: poolId,
          user_id: userId,
          round,
          slot: pick.slot,
          player_id: pick.playerId,
          player_name: pick.playerName,
          player_team: pick.teamId,
          player_position: pick.position,
          multiplier: pick.multiplier,
          base_points: pick.basePoints,
          total_points: pick.totalPoints,
          stats_summary: pick.statsSummary || null,
          is_bye: Boolean(pick.isBye),
          is_eliminated: Boolean(pick.isEliminated),
          updated_at: new Date().toISOString(),
        }));

      if (rowsToUpsert.length > 0) {
        await supabase
          .from("playoff_lineups")
          .upsert(rowsToUpsert, { onConflict: "pool_id,user_id,round,slot" });
      }
    } catch (err) {
      console.warn("Supabase playoff lineup save warning (persisted locally):", err);
    }
  }

  return { success: true };
}

/**
 * Computes the total fantasy score for a lineup
 */
export function calculateLineupTotalPoints(lineup: PlayoffUserLineupMap): number {
  return Object.values(lineup).reduce((acc, pick) => {
    return acc + (pick?.totalPoints || 0);
  }, 0);
}

/**
 * Builds mock competitor lineups for the Playoff Challenge
 */
function getMockCompetitorsPlayoffLineup(
  competitorId: string,
  round: PlayoffRound
): PlayoffUserLineupMap {
  const lineup = getEmptyPlayoffLineup();

  const presets: Record<string, Record<PlayoffRosterSlot, string>> = {
    comp_1: {
      QB: "p_mahomes",
      RB1: "p_pacheco",
      RB2: "p_mccaffrey",
      WR1: "p_rice_rashee",
      WR2: "p_samuel_deebo",
      TE: "p_kelce",
      K: "p_butker",
      DEF: "p_def_kc",
    },
    comp_2: {
      QB: "p_purdy",
      RB1: "p_mccaffrey",
      RB2: "p_gibbs",
      WR1: "p_aiyuk",
      WR2: "p_st_brown",
      TE: "p_kittle",
      K: "p_moody",
      DEF: "p_def_sf",
    },
    comp_3: {
      QB: "p_jackson",
      RB1: "p_henry",
      RB2: "p_cook",
      WR1: "p_flowers_zay",
      WR2: "p_collins_nico",
      TE: "p_andrews",
      K: "p_tucker",
      DEF: "p_def_bal",
    },
    comp_4: {
      QB: "p_allen",
      RB1: "p_cook",
      RB2: "p_pacheco",
      WR1: "p_rice_rashee",
      WR2: "p_st_brown",
      TE: "p_kincaid",
      K: "p_bass",
      DEF: "p_def_buf",
    },
  };

  const selectedPreset = presets[competitorId] || presets.comp_1;

  for (const [slotStr, playerId] of Object.entries(selectedPreset)) {
    const slot = slotStr as PlayoffRosterSlot;
    const player = PLAYOFF_PLAYERS.find((p) => p.id === playerId);
    if (player) {
      const score = getPlayerRoundScore(playerId, round);
      // If competitor kept them consecutively:
      // Multiplier = round number (since they kept them from round 1)
      let multiplier: 1 | 2 | 3 | 4 = round;
      if (player.eliminatedInRound && round > player.eliminatedInRound) {
        multiplier = 1;
      }
      lineup[slot] = {
        slot,
        playerId: player.id,
        playerName: player.name,
        teamId: player.teamId,
        position: player.position,
        multiplier,
        basePoints: score.basePoints,
        totalPoints: Math.round(score.basePoints * multiplier * 10) / 10,
        statsSummary: score.summary,
        isBye: round === 1 && Boolean(player.isByeRound1),
        isEliminated: Boolean(player.eliminatedInRound && round > player.eliminatedInRound),
      };
    }
  }

  return lineup;
}

/**
 * Fetches the Playoff Challenge Leaderboard with round breakdowns
 */
export async function fetchPlayoffLeaderboard(
  poolId: string,
  currentUserId?: string,
  currentRound: PlayoffRound = 1
): Promise<PlayoffLeaderboardEntry[]> {
  const competitors = [
    {
      id: currentUserId || "demo_user",
      name: "You",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
      isCurrentUser: true,
    },
    {
      id: "comp_1",
      name: "Patrick Mahomes Fan (Dan M.)",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
    },
    {
      id: "comp_2",
      name: "Sarah's Niners Empire",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
    },
    {
      id: "comp_3",
      name: "Lamar MVP Express",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
    },
    {
      id: "comp_4",
      name: "Bills Mafia Gary",
      avatarUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=faces",
    },
  ];

  const entries: PlayoffLeaderboardEntry[] = [];

  for (const comp of competitors) {
    const roundScores: Record<PlayoffRound, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    let currentLineup: PlayoffUserLineupMap | undefined = undefined;

    if (comp.isCurrentUser) {
      // Load current user's actual stored lineups
      for (let r = 1; r <= 4; r++) {
        const rTyped = r as PlayoffRound;
        const lu = await fetchUserPlayoffLineup(poolId, comp.id, rTyped);
        const pts = calculateLineupTotalPoints(lu);
        roundScores[rTyped] = Math.round(pts * 10) / 10;
        if (rTyped === currentRound) {
          currentLineup = lu;
        }
      }
    } else {
      // Mock competitors lineups
      for (let r = 1; r <= 4; r++) {
        const rTyped = r as PlayoffRound;
        const lu = getMockCompetitorsPlayoffLineup(comp.id, rTyped);
        const pts = calculateLineupTotalPoints(lu);
        roundScores[rTyped] = Math.round(pts * 10) / 10;
        if (rTyped === currentRound) {
          currentLineup = lu;
        }
      }
    }

    const totalPoints =
      Math.round(
        (roundScores[1] + roundScores[2] + roundScores[3] + roundScores[4]) * 10
      ) / 10;

    entries.push({
      userId: comp.id,
      displayName: comp.name,
      avatarUrl: comp.avatarUrl,
      rank: 1,
      totalPoints,
      roundPoints: roundScores,
      lineup: currentLineup,
      isLeader: comp.id === "comp_1",
    });
  }

  // Sort descending by total points
  entries.sort((a, b) => b.totalPoints - a.totalPoints);
  entries.forEach((e, idx) => {
    e.rank = idx + 1;
  });

  return entries;
}
