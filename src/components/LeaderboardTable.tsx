"use client";

import React, { useState } from "react";
import { LeaderboardEntry } from "@/types";
import { Podium, Search, Crown, EyeOff } from "lucide-react";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  onNavigateToScoreboard?: () => void;
}

export function LeaderboardTable({
  entries,
  currentUserId,
}: LeaderboardTableProps) {
  const [scope, setScope] = useState<"season" | "lifetime">("season");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort and rank entries based on active scope (Season vs Lifetime)
  const scopedSortedEntries = [...entries].sort((a, b) => {
    if (scope === "season") {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.seasonRecord.wins !== a.seasonRecord.wins) {
        return b.seasonRecord.wins - a.seasonRecord.wins;
      }
      if (b.seasonWeeksWon !== a.seasonWeeksWon) {
        return b.seasonWeeksWon - a.seasonWeeksWon;
      }
      return a.displayName.localeCompare(b.displayName);
    } else {
      const bPoints = b.lifetimeStats?.totalPoints ?? b.totalPoints;
      const aPoints = a.lifetimeStats?.totalPoints ?? a.totalPoints;
      if (bPoints !== aPoints) {
        return bPoints - aPoints;
      }
      const bWins = b.lifetimeStats?.record.wins ?? b.seasonRecord.wins;
      const aWins = a.lifetimeStats?.record.wins ?? a.seasonRecord.wins;
      if (bWins !== aWins) {
        return bWins - aWins;
      }
      const bWeeksWon = b.lifetimeStats?.weeksWon ?? b.seasonWeeksWon;
      const aWeeksWon = a.lifetimeStats?.weeksWon ?? a.seasonWeeksWon;
      if (bWeeksWon !== aWeeksWon) {
        return bWeeksWon - aWeeksWon;
      }
      return a.displayName.localeCompare(b.displayName);
    }
  });

  // Calculate tie frequencies across standings
  const pointsKeyCount = new Map<string, number>();
  for (const entry of scopedSortedEntries) {
    const pts =
      scope === "season"
        ? entry.totalPoints
        : (entry.lifetimeStats?.totalPoints ?? entry.totalPoints);
    const wins =
      scope === "season"
        ? entry.seasonRecord.wins
        : (entry.lifetimeStats?.record.wins ?? entry.seasonRecord.wins);
    const key = `${pts}-${wins}`;
    pointsKeyCount.set(key, (pointsKeyCount.get(key) || 0) + 1);
  }

  // Assign competition ranks (1224 ranking) and tied status
  const rankedEntries = scopedSortedEntries.map((entry) => {
    const pts =
      scope === "season"
        ? entry.totalPoints
        : (entry.lifetimeStats?.totalPoints ?? entry.totalPoints);
    const wins =
      scope === "season"
        ? entry.seasonRecord.wins
        : (entry.lifetimeStats?.record.wins ?? entry.seasonRecord.wins);
    const record =
      scope === "season"
        ? entry.seasonRecord
        : (entry.lifetimeStats?.record ?? entry.seasonRecord);
    const clutch =
      scope === "season"
        ? entry.clutchRecord
        : (entry.lifetimeStats?.clutchRecord ?? entry.clutchRecord);
    const tiebreak =
      scope === "season"
        ? entry.tiebreakRecord
        : (entry.lifetimeStats?.tiebreakRecord ?? entry.tiebreakRecord);
    const weeksWon =
      scope === "season"
        ? entry.seasonWeeksWon
        : (entry.lifetimeStats?.weeksWon ?? entry.seasonWeeksWon);
    const seasonsCount = entry.lifetimeStats?.seasonsCount ?? 1;

    const rank =
      scopedSortedEntries.findIndex((other) => {
        const oPts =
          scope === "season"
            ? other.totalPoints
            : (other.lifetimeStats?.totalPoints ?? other.totalPoints);
        const oWins =
          scope === "season"
            ? other.seasonRecord.wins
            : (other.lifetimeStats?.record.wins ?? other.seasonRecord.wins);
        return oPts === pts && oWins === wins;
      }) + 1;

    const key = `${pts}-${wins}`;
    const isTied = (pointsKeyCount.get(key) || 0) > 1;

    return {
      ...entry,
      activePoints: pts,
      activeRecord: record,
      activeClutch: clutch,
      activeTiebreak: tiebreak,
      activeWeeksWon: weeksWon,
      activeSeasonsCount: seasonsCount,
      activeRank: rank,
      isTied,
      rankDisplay: isTied ? `T${rank}` : `#${rank}`,
    };
  });

  const filteredEntries = rankedEntries.filter((e) =>
    e.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Standings Header & Scope / Search Controls */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <h2 className="text-base sm:text-xl font-bold text-white flex items-center space-x-2">
            <Podium className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Standings</span>
          </h2>

          {/* Scope Toggle: Season vs Lifetime */}
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setScope("season")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                scope === "season"
                  ? "bg-amber-500 text-zinc-950"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Season
            </button>
            <button
              type="button"
              onClick={() => setScope("lifetime")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                scope === "lifetime"
                  ? "bg-amber-500 text-zinc-950"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Lifetime
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-48">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs pl-8 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Standings Table Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
        {/* MOBILE VIEW (< sm): Clean, compact player card list */}
        <div className="sm:hidden divide-y divide-zinc-800/80">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No participants found
            </div>
          ) : (
            filteredEntries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            const rank = entry.activeRank;
            const isTied = entry.isTied;
            const record = entry.activeRecord;
            const clutch = entry.activeClutch;
            const tiebreak = entry.activeTiebreak;
            const weeksWon = entry.activeWeeksWon;
            const points = entry.activePoints;

            return (
              <div
                key={entry.userId}
                className={`p-3.5 flex items-center justify-between gap-3 ${
                  isCurrentUser ? "bg-emerald-950/20" : ""
                }`}
              >
                {/* Left: Rank & User */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="shrink-0 w-7 text-center font-bold text-xs">
                    {rank === 1 ? (
                      <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-bold">
                        {isTied ? "T1" : "1"}
                      </span>
                    ) : rank === 2 ? (
                      <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-md bg-slate-300/20 text-slate-200 border border-slate-300/40 text-[11px] font-bold">
                        {isTied ? "T2" : "2"}
                      </span>
                    ) : rank === 3 ? (
                      <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-md bg-amber-700/20 text-amber-600 border border-amber-700/40 text-[11px] font-bold">
                        {isTied ? "T3" : "3"}
                      </span>
                    ) : (
                      <span className="text-zinc-500">{entry.rankDisplay}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex items-center space-x-2">
                    {entry.avatarUrl && (
                      <img
                        src={entry.avatarUrl}
                        alt=""
                        className="w-6 h-6 rounded-full object-cover border border-zinc-700 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="text-sm font-bold text-white truncate max-w-[130px]">
                          {entry.displayName}
                        </span>
                        {(entry.isLeader || entry.role === "leader") && (
                          <span
                            className="inline-flex items-center space-x-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0"
                            title="Pool Leader"
                          >
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            <span>Leader</span>
                          </span>
                        )}
                        {entry.isHidden && (
                          <span
                            className="inline-flex items-center space-x-1 text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800 shrink-0"
                            title="Hidden from public standings"
                          >
                            <EyeOff className="w-2.5 h-2.5" />
                            <span>Hidden</span>
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center space-x-2 mt-0.5">
                        <span className="font-mono">{record.formatted}</span>
                        {clutch?.formatted && clutch.formatted !== "—" && (
                          <span className="font-mono text-zinc-300">
                            Clutch {clutch.formatted}
                          </span>
                        )}
                        {tiebreak?.formatted && tiebreak.formatted !== "—" && (
                          <span className="font-mono text-zinc-300">
                            TB {tiebreak.formatted}
                          </span>
                        )}
                        {weeksWon > 0 && (
                          <span className="text-amber-400 font-medium">
                            ({weeksWon} {weeksWon === 1 ? "win" : "wins"})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Points */}
                <div className="text-right shrink-0">
                  <div className="text-base font-black text-white leading-tight">
                    {points}
                  </div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                    pts
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

        {/* TABLET & DESKTOP VIEW (>= sm): Full detailed data table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider border-b border-zinc-800 text-[11px]">
              <tr>
                <th scope="col" className="px-4 py-3 text-center w-16">
                  Rank
                </th>
                <th scope="col" className="px-4 py-3">
                  Participant
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Record
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Clutch
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Tiebreak
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Weeks Won
                </th>
                {scope === "lifetime" && (
                  <th scope="col" className="px-4 py-3 text-center">
                    Seasons
                  </th>
                )}
                <th scope="col" className="px-4 py-3 text-right font-bold text-white">
                  Total Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={scope === "lifetime" ? 8 : 7}
                    className="px-4 py-8 text-center text-zinc-500 text-xs"
                  >
                    No participants found
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                const isCurrentUser = entry.userId === currentUserId;
                const rank = entry.activeRank;
                const isTied = entry.isTied;
                const record = entry.activeRecord;
                const clutch = entry.activeClutch;
                const tiebreak = entry.activeTiebreak;
                const weeksWon = entry.activeWeeksWon;
                const points = entry.activePoints;
                const seasonsCount = entry.activeSeasonsCount;

                return (
                  <tr
                    key={entry.userId}
                    className={`transition-colors ${
                      isCurrentUser
                        ? "bg-emerald-950/25 hover:bg-emerald-950/40"
                        : "hover:bg-zinc-800/40"
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-3 text-center">
                      {rank === 1 ? (
                        <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-md bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40 text-[11px]">
                          {isTied ? "T1" : "1"}
                        </span>
                      ) : rank === 2 ? (
                        <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-md bg-slate-300/20 text-slate-200 font-bold border border-slate-300/40 text-[11px]">
                          {isTied ? "T2" : "2"}
                        </span>
                      ) : rank === 3 ? (
                        <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-md bg-amber-700/20 text-amber-600 font-bold border border-amber-700/40 text-[11px]">
                          {isTied ? "T3" : "3"}
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-semibold">{isTied ? `T${rank}` : rank}</span>
                      )}
                    </td>

                    {/* Participant Name */}
                    <td className="px-4 py-3 font-medium text-white">
                      <div className="flex items-center space-x-2.5">
                        {entry.avatarUrl && (
                          <img
                            src={entry.avatarUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-zinc-700 shrink-0"
                          />
                        )}
                        <span className="font-bold text-white truncate">{entry.displayName}</span>
                        {(entry.isLeader || entry.role === "leader") && (
                          <span
                            className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0"
                            title="Pool Leader"
                          >
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>Leader</span>
                          </span>
                        )}
                        {entry.isHidden && (
                          <span
                            className="inline-flex items-center space-x-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 border border-amber-800 shrink-0"
                            title="Hidden from public standings"
                          >
                            <EyeOff className="w-3 h-3" />
                            <span>Hidden</span>
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Record */}
                    <td className="px-4 py-3 text-center font-mono text-zinc-300">
                      {record.formatted}
                    </td>

                    {/* Clutch */}
                    <td className="px-4 py-3 text-center font-mono">
                      {clutch?.formatted && clutch.formatted !== "—" ? (
                        <span className="text-zinc-200">{clutch.formatted}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Tiebreak */}
                    <td className="px-4 py-3 text-center font-mono">
                      {tiebreak?.formatted && tiebreak.formatted !== "—" ? (
                        <span className="text-zinc-200">{tiebreak.formatted}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Weeks Won */}
                    <td className="px-4 py-3 text-center">
                      {weeksWon > 0 ? (
                        <span className="text-amber-400 font-bold">{weeksWon}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Seasons Participated (Lifetime only) */}
                    {scope === "lifetime" && (
                      <td className="px-4 py-3 text-center text-zinc-400">
                        {seasonsCount}
                      </td>
                    )}

                    {/* Total Points */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-black text-white">
                        {points}
                      </span>
                      <span className="text-[10px] text-zinc-400 ml-1">pts</span>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
