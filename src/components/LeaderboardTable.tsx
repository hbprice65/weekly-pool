"use client";

import React, { useState } from "react";
import { LeaderboardEntry } from "@/types";
import {
  Podium,
  Trophy,
  TrendingUp,
  Search,
  Calendar,
  Award,
  Sparkles,
  Info,
} from "lucide-react";

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
    const pts = scope === "season" ? entry.totalPoints : (entry.lifetimeStats?.totalPoints ?? entry.totalPoints);
    const wins = scope === "season" ? entry.seasonRecord.wins : (entry.lifetimeStats?.record.wins ?? entry.seasonRecord.wins);
    const key = `${pts}-${wins}`;
    pointsKeyCount.set(key, (pointsKeyCount.get(key) || 0) + 1);
  }

  // Assign competition ranks (1224 ranking) and tied status
  const rankedEntries = scopedSortedEntries.map((entry) => {
    const pts = scope === "season" ? entry.totalPoints : (entry.lifetimeStats?.totalPoints ?? entry.totalPoints);
    const wins = scope === "season" ? entry.seasonRecord.wins : (entry.lifetimeStats?.record.wins ?? entry.seasonRecord.wins);
    const record = scope === "season" ? entry.seasonRecord : (entry.lifetimeStats?.record ?? entry.seasonRecord);
    const weeksWon = scope === "season" ? entry.seasonWeeksWon : (entry.lifetimeStats?.weeksWon ?? entry.seasonWeeksWon);
    const seasonsCount = entry.lifetimeStats?.seasonsCount ?? 1;

    const rank =
      scopedSortedEntries.findIndex((other) => {
        const oPts = scope === "season" ? other.totalPoints : (other.lifetimeStats?.totalPoints ?? other.totalPoints);
        const oWins = scope === "season" ? other.seasonRecord.wins : (other.lifetimeStats?.record.wins ?? other.seasonRecord.wins);
        return oPts === pts && oWins === wins;
      }) + 1;

    const key = `${pts}-${wins}`;
    const isTied = (pointsKeyCount.get(key) || 0) > 1;

    return {
      ...entry,
      activePoints: pts,
      activeRecord: record,
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

  const currentUserEntry = rankedEntries.find((e) => e.userId === currentUserId);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Standings Header Banner with Season vs Lifetime Scope Switcher */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Podium className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
            <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
              {scope === "season" ? "2026 Season Standings" : "Lifetime Career Standings"}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              {scope === "season" ? "2026 NFL" : "All-Time"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {scope === "season"
              ? "Official 2026 pool leaderboard, overall picks record, and weekly slate wins."
              : "All-time cumulative points, career picks accuracy, and total weekly wins across all seasons."}
          </p>
        </div>

        {/* Segmented Scope Switcher */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setScope("season")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              scope === "season"
                ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>2026 Season</span>
          </button>
          <button
            type="button"
            onClick={() => setScope("lifetime")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              scope === "lifetime"
                ? "bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span>Lifetime</span>
          </button>
        </div>
      </div>

      {/* Authenticated Participant Personal Stats Snapshot Card */}
      {currentUserEntry && (
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900/90 border border-amber-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-amber-500/5 blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            {/* User identification */}
            <div className="flex items-center space-x-3">
              {currentUserEntry.avatarUrl ? (
                <img
                  src={currentUserEntry.avatarUrl}
                  alt={currentUserEntry.displayName}
                  className="w-11 h-11 rounded-full object-cover border-2 border-amber-400 shadow-md shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-extrabold flex items-center justify-center text-sm shrink-0">
                  {currentUserEntry.displayName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-base font-bold text-white">
                    {currentUserEntry.displayName}
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-extrabold border border-emerald-500/30">
                    YOU
                  </span>
                </div>
                <div className="text-xs text-zinc-400 flex items-center space-x-1.5 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {scope === "season" ? "Your 2026 Season Performance" : "Your All-Time Career Performance"}
                  </span>
                </div>
              </div>
            </div>

            {/* Snapshot metric chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 shrink-0">
              {/* Metric 1: Current Rank */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Rank
                </div>
                <div className="text-base sm:text-lg font-black text-amber-400 mt-0.5">
                  {currentUserEntry.rankDisplay}
                </div>
              </div>

              {/* Metric 2: Total Points */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Points
                </div>
                <div className="text-base sm:text-lg font-black text-white mt-0.5">
                  {currentUserEntry.activePoints}{" "}
                  <span className="text-xs font-normal text-zinc-400">pts</span>
                </div>
              </div>

              {/* Metric 3: Overall Picks Record */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Picks Record
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 font-mono">
                  {currentUserEntry.activeRecord.formatted}
                </div>
                <div className="text-[10px] text-zinc-400">
                  {currentUserEntry.activeRecord.winPct}% Win Rate
                </div>
              </div>

              {/* Metric 4: Weeks Won */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-2.5 sm:p-3 text-center">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold flex items-center justify-center space-x-1">
                  <span>Weeks Won</span>
                  <Trophy className="w-2.5 h-2.5 text-amber-400" />
                </div>
                <div className="text-base sm:text-lg font-black text-amber-300 mt-0.5">
                  {currentUserEntry.activeWeeksWon} 🏆
                </div>
                <div className="text-[10px] text-zinc-400">
                  Top Point Slates
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Standings Table Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
        {/* Table Search & Controls Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm sm:text-base font-bold text-white">
              {scope === "season" ? "Season Leaderboard" : "All-Time Lifetime Leaderboard"}
            </h3>
            <span className="text-xs text-zinc-400 font-medium">
              ({filteredEntries.length} {filteredEntries.length === 1 ? "participant" : "participants"})
            </span>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search participant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* MOBILE VIEW (< sm): Clean, touch-optimized card list */}
        <div className="sm:hidden divide-y divide-zinc-800/80">
          {filteredEntries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            const rank = entry.activeRank;
            const isTied = entry.isTied;
            const record = entry.activeRecord;
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
                  <div className="shrink-0 w-8 text-center font-bold text-xs">
                    {rank === 1 ? (
                      <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-black">
                        {isTied ? "T1" : "1"}
                      </span>
                    ) : rank === 2 ? (
                      <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 text-[11px] font-black">
                        {isTied ? "T2" : "2"}
                      </span>
                    ) : rank === 3 ? (
                      <span className="inline-flex items-center justify-center px-1.5 h-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40 text-[11px] font-black">
                        {isTied ? "T3" : "3"}
                      </span>
                    ) : (
                      <span className="text-zinc-500">{entry.rankDisplay}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex items-center space-x-2">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.displayName}
                        className="w-7 h-7 rounded-full object-cover border border-zinc-700 shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-bold text-white truncate max-w-[130px]">
                          {entry.displayName}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-extrabold border border-emerald-500/30 shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      {/* Metric Badges for Mobile */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] mt-1">
                        <span className="bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5 rounded font-mono text-[10px] border border-zinc-700/60">
                          {record.formatted} ({record.winPct}%)
                        </span>
                        <span className="bg-amber-950/60 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-800/60 flex items-center space-x-1">
                          <Trophy className="w-2.5 h-2.5 text-amber-400 inline" />
                          <span>{weeksWon} Wk {weeksWon === 1 ? "Win" : "Wins"}</span>
                        </span>
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
          })}
        </div>

        {/* TABLET & DESKTOP VIEW (>= sm): Full detailed data table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/60 text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th scope="col" className="px-4 py-3.5 text-center w-16">
                  Rank
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Participant
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Overall Picks Record
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Win %
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  <span className="inline-flex items-center space-x-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Weeks Won</span>
                  </span>
                </th>
                {scope === "lifetime" && (
                  <th scope="col" className="px-4 py-3.5 text-center">
                    Seasons
                  </th>
                )}
                <th scope="col" className="px-4 py-3.5 text-right font-bold text-white">
                  Total Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {filteredEntries.map((entry) => {
                const isCurrentUser = entry.userId === currentUserId;
                const rank = entry.activeRank;
                const isTied = entry.isTied;
                const record = entry.activeRecord;
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
                    <td className="px-4 py-4 text-center">
                      {rank === 1 ? (
                        <span className="inline-flex items-center justify-center px-2 h-7 rounded-full bg-amber-500/20 text-amber-400 font-black border border-amber-500/40 text-xs">
                          {isTied ? "T1" : "1"}
                        </span>
                      ) : rank === 2 ? (
                        <span className="inline-flex items-center justify-center px-2 h-7 rounded-full bg-slate-300/20 text-slate-200 font-black border border-slate-300/40 text-xs">
                          {isTied ? "T2" : "2"}
                        </span>
                      ) : rank === 3 ? (
                        <span className="inline-flex items-center justify-center px-2 h-7 rounded-full bg-amber-700/20 text-amber-600 font-black border border-amber-700/40 text-xs">
                          {isTied ? "T3" : "3"}
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-semibold">{isTied ? `T${rank}` : rank}</span>
                      )}
                    </td>

                    {/* Participant Name */}
                    <td className="px-4 py-4 font-medium text-white">
                      <div className="flex items-center space-x-2.5">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.displayName}
                            className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                            {entry.displayName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex items-center space-x-2 truncate">
                          <span className="truncate">{entry.displayName}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30 shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Overall Picks Record (Excludes blanks) */}
                    <td className="px-4 py-4 text-center font-mono text-xs text-zinc-300">
                      <span className="font-semibold text-white">{record.wins}</span>
                      <span className="text-zinc-500 mx-1">-</span>
                      <span className="text-zinc-400">{record.losses}</span>
                      {record.ties && record.ties > 0 ? (
                        <>
                          <span className="text-zinc-500 mx-1">-</span>
                          <span className="text-zinc-400">{record.ties}</span>
                        </>
                      ) : null}
                    </td>

                    {/* Win % */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center space-x-1 text-xs text-zinc-300">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-medium">{record.winPct}%</span>
                      </span>
                    </td>

                    {/* Weekly Wins */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center space-x-1.5 text-xs bg-amber-500/10 text-amber-300 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>{weeksWon}</span>
                      </span>
                    </td>

                    {/* Seasons Participated (Lifetime only) */}
                    {scope === "lifetime" && (
                      <td className="px-4 py-4 text-center text-xs text-zinc-400">
                        <span>{seasonsCount} {seasonsCount === 1 ? "Season" : "Seasons"}</span>
                      </td>
                    )}

                    {/* Total Points */}
                    <td className="px-4 py-4 text-right">
                      <span className="text-base font-black text-white">
                        {points}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">pts</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transparent Rules & Scoring Clarification Callout */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-xs text-zinc-400 space-y-2.5">
        <div className="flex items-center space-x-2 text-zinc-300 font-bold text-xs uppercase tracking-wider">
          <Info className="w-4 h-4 text-amber-400" />
          <span>How Standings & Records Are Tracked</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-zinc-400">
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            <span className="text-white font-semibold block mb-1">
              ✓ Overall Picks Record
            </span>
            <span>
              Your Win-Loss record evaluates all completed games where you submitted a pick. Games left blank are <strong>never penalized</strong> as losses against your record.
            </span>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            <span className="text-white font-semibold block mb-1">
              🏆 Weekly Wins
            </span>
            <span>
              A Weekly Win is awarded whenever a participant finishes a weekly slate with the most points in the pool (including co-winners if tied for first).
            </span>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3">
            <span className="text-white font-semibold block mb-1">
              ⭐ Season vs Lifetime
            </span>
            <span>
              Switch between the current 2026 NFL slate and Lifetime Career stats to view all-time points, career pick win rates, and total historical weekly titles.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
