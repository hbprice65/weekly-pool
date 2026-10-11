"use client";

import React, { useState } from "react";
import { LeaderboardEntry } from "@/types";
import { Podium, TrendingUp, Medal, Search, ArrowRight } from "lucide-react";
import { SevenSegmentIcon } from "@/components/SevenSegmentIcon";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  onNavigateToScoreboard?: () => void;
}

export function LeaderboardTable({
  entries,
  currentUserId,
  onNavigateToScoreboard,
}: LeaderboardTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Season standings are sorted by totalPoints descending
  const seasonEntries = [...entries].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return b.correctPicks - a.correctPicks;
  });

  const filteredEntries = seasonEntries.filter((e) =>
    e.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = seasonEntries.slice(0, 3);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Season Leaderboard Header Banner */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Podium className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
            <h2 className="text-base sm:text-xl font-bold text-white">
              Season Standings
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20">
              2026 Season
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Cumulative points across all NFL weeks. Overall standings and participant rank.
          </p>
        </div>

        {/* Link / Callout to Weekly Scoreboard */}
        {onNavigateToScoreboard && (
          <button
            type="button"
            onClick={onNavigateToScoreboard}
            className="flex items-center space-x-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/80 hover:border-zinc-600 px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-200 hover:text-white transition group self-start md:self-auto shrink-0 shadow-sm"
          >
            <SevenSegmentIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>View Scoreboard</span>
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Top 3 Season Podium Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {top3.map((entry, index) => {
          const isGold = index === 0;
          const isSilver = index === 1;
          const winPct =
            entry.totalPicks > 0
              ? Math.round((entry.correctPicks / entry.totalPicks) * 100)
              : 0;

          return (
            <div
              key={entry.userId}
              className={`p-4 rounded-xl sm:rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isGold
                  ? "bg-gradient-to-b from-amber-950/30 to-zinc-900 border-amber-500/40 shadow-md shadow-amber-500/5"
                  : isSilver
                  ? "bg-gradient-to-b from-slate-900/40 to-zinc-900 border-slate-400/30"
                  : "bg-gradient-to-b from-amber-950/20 to-zinc-900 border-amber-700/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.displayName}
                      className={`w-9 h-9 rounded-xl object-cover shrink-0 border ${
                        isGold
                          ? "border-amber-500/50"
                          : isSilver
                          ? "border-slate-300/50"
                          : "border-amber-700/50"
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        isGold
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : isSilver
                          ? "bg-slate-300/20 text-slate-200 border-slate-300/40"
                          : "bg-amber-700/20 text-amber-600 border-amber-700/40"
                      }`}
                    >
                      #{index + 1}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate max-w-[130px]">
                      {entry.displayName}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {isGold ? "1st Place Leader" : isSilver ? "2nd Place" : "3rd Place"}
                    </div>
                  </div>
                </div>

                <Medal
                  className={`w-5 h-5 shrink-0 ${
                    isGold
                      ? "text-amber-400"
                      : isSilver
                      ? "text-slate-300"
                      : "text-amber-600"
                  }`}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="text-zinc-400">
                  <span className="font-semibold text-zinc-200">{winPct}%</span> win rate
                </div>
                <div>
                  <span className="text-base font-black text-white">
                    {entry.totalPoints}
                  </span>
                  <span className="text-[10px] text-zinc-400 ml-1">pts</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Season Standings Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
        {/* Table Search & Controls */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center space-x-2">
              <span>Overall Season Leaderboard</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ranked strictly by cumulative season points
            </p>
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
          {filteredEntries.map((entry, idx) => {
            const isCurrentUser = entry.userId === currentUserId;
            const rank = idx + 1;
            const winPct =
              entry.totalPicks > 0
                ? Math.round((entry.correctPicks / entry.totalPicks) * 100)
                : 0;

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
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        1
                      </span>
                    ) : rank === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40">
                        2
                      </span>
                    ) : rank === 3 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 border border-amber-700/40">
                        3
                      </span>
                    ) : (
                      <span className="text-zinc-500">#{rank}</span>
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
                      <div className="text-[11px] text-zinc-400 flex items-center space-x-2 mt-0.5">
                        <span>{entry.correctPicks} correct</span>
                        <span>•</span>
                        <span>{winPct}% accuracy</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Total Season Points */}
                <div className="text-right shrink-0">
                  <div className="text-base font-black text-white leading-tight">
                    {entry.totalPoints}
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
                  Season Record
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Win %
                </th>
                <th scope="col" className="px-4 py-3.5 text-right font-bold text-white">
                  Total Points
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {filteredEntries.map((entry, idx) => {
                const isCurrentUser = entry.userId === currentUserId;
                const rank = idx + 1;
                const winPct =
                  entry.totalPicks > 0
                    ? Math.round((entry.correctPicks / entry.totalPicks) * 100)
                    : 0;

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
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40">
                          1
                        </span>
                      ) : rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 font-bold border border-slate-300/40">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 font-bold border border-amber-700/40">
                          3
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-semibold">{rank}</span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-4 font-medium text-white">
                      <div className="flex items-center space-x-2.5">
                        {entry.avatarUrl ? (
                          <img
                            src={entry.avatarUrl}
                            alt={entry.displayName}
                            className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
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

                    {/* Season Record */}
                    <td className="px-4 py-4 text-center font-mono text-xs text-zinc-300">
                      {entry.correctPicks} - {entry.totalPicks - entry.correctPicks}
                    </td>

                    {/* Win % */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center space-x-1 text-xs text-zinc-300">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{winPct}%</span>
                      </span>
                    </td>

                    {/* Total Points */}
                    <td className="px-4 py-4 text-right">
                      <span className="text-base font-black text-white">
                        {entry.totalPoints}
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
    </div>
  );
}
