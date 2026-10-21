"use client";

import React, { useState } from "react";
import {
  PlayoffLeaderboardEntry,
  PlayoffRound,
  PLAYOFF_ROUNDS,
  PLAYOFF_ROSTER_SLOTS,
} from "@/types";
import {
  Trophy,
  Crown,
  ChevronDown,
  ChevronUp,
  Zap,
  Flame,
  Award,
} from "lucide-react";

interface PlayoffLeaderboardTableProps {
  entries: PlayoffLeaderboardEntry[];
  currentRound: PlayoffRound;
  currentUserId?: string;
}

export function PlayoffLeaderboardTable({
  entries,
  currentRound,
  currentUserId,
}: PlayoffLeaderboardTableProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const toggleExpand = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  return (
    <div className="space-y-4">
      {/* Table Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Playoff Challenge Standings</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cumulative Full PPR fantasy points multiplied across all 4 playoff rounds.
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-400">
            {entries.length} {entries.length === 1 ? "participant" : "participants"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-950/40">
                <th className="py-3 px-3 sm:px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-3 sm:px-4">Player</th>
                <th className="py-3 px-2 text-right hidden sm:table-cell">R1 (Wild Card)</th>
                <th className="py-3 px-2 text-right hidden sm:table-cell">R2 (Divisional)</th>
                <th className="py-3 px-2 text-right hidden md:table-cell">R3 (Conf)</th>
                <th className="py-3 px-2 text-right hidden md:table-cell">R4 (SB)</th>
                <th className="py-3 px-3 sm:px-4 text-right">Total Points</th>
                <th className="py-3 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-xs sm:text-sm">
              {entries.map((entry) => {
                const isExpanded = expandedUserId === entry.userId;
                const isCurrentUser =
                  entry.userId === currentUserId ||
                  entry.userId === "demo_user" ||
                  entry.displayName === "You";

                return (
                  <React.Fragment key={entry.userId}>
                    <tr
                      onClick={() => toggleExpand(entry.userId)}
                      className={`cursor-pointer transition hover:bg-zinc-800/40 ${
                        isCurrentUser ? "bg-emerald-950/20" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 sm:px-4 text-center font-black">
                        {entry.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs">
                            1
                          </span>
                        ) : entry.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-400/20 text-zinc-300 border border-zinc-400/40 text-xs">
                            2
                          </span>
                        ) : entry.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-zinc-500">{entry.rank}</span>
                        )}
                      </td>

                      {/* Participant Profile */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center gap-2.5">
                          {entry.avatarUrl ? (
                            <img
                              src={entry.avatarUrl}
                              alt={entry.displayName}
                              className="w-7 h-7 rounded-full object-cover border border-zinc-800"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center text-xs">
                              {entry.displayName.slice(0, 1)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-bold truncate ${
                                  isCurrentUser ? "text-emerald-400" : "text-white"
                                }`}
                              >
                                {entry.displayName}
                              </span>
                              {entry.isLeader && (
                                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              {isCurrentUser && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">
                                  You
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Round Scores */}
                      <td className="py-3 px-2 text-right text-zinc-400 font-medium hidden sm:table-cell">
                        {entry.roundPoints[1]}
                      </td>
                      <td className="py-3 px-2 text-right text-zinc-400 font-medium hidden sm:table-cell">
                        {entry.roundPoints[2]}
                      </td>
                      <td className="py-3 px-2 text-right text-zinc-400 font-medium hidden md:table-cell">
                        {entry.roundPoints[3]}
                      </td>
                      <td className="py-3 px-2 text-right text-zinc-400 font-medium hidden md:table-cell">
                        {entry.roundPoints[4]}
                      </td>

                      {/* Total Points */}
                      <td className="py-3 px-3 sm:px-4 text-right">
                        <span className="font-black text-sm sm:text-base text-white">
                          {entry.totalPoints}
                        </span>
                        <span className="text-[10px] text-zinc-500 ml-1">pts</span>
                      </td>

                      {/* Expand icon */}
                      <td className="py-3 px-3 text-center text-zinc-500">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </td>
                    </tr>

                    {/* Expanded Lineup Row */}
                    {isExpanded && entry.lineup && (
                      <tr className="bg-zinc-950/70">
                        <td colSpan={8} className="p-4 sm:p-5">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                {entry.displayName}&apos;s Round {currentRound} Lineup
                              </h4>
                              <span className="text-xs text-zinc-500">
                                Multipliers active for this round
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {PLAYOFF_ROSTER_SLOTS.map((slotItem) => {
                                const pick = entry.lineup?.[slotItem.slot];
                                if (!pick) return null;

                                return (
                                  <div
                                    key={slotItem.slot}
                                    className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="font-bold text-zinc-500">
                                        {slotItem.slot}
                                      </span>
                                      {pick.multiplier === 4 ? (
                                        <span className="text-amber-400 font-extrabold flex items-center gap-0.5">
                                          <Trophy className="w-2.5 h-2.5" /> 4x
                                        </span>
                                      ) : pick.multiplier === 3 ? (
                                        <span className="text-purple-400 font-extrabold flex items-center gap-0.5">
                                          <Zap className="w-2.5 h-2.5" /> 3x
                                        </span>
                                      ) : pick.multiplier === 2 ? (
                                        <span className="text-sky-400 font-extrabold flex items-center gap-0.5">
                                          <Flame className="w-2.5 h-2.5" /> 2x
                                        </span>
                                      ) : (
                                        <span className="text-zinc-500">1x</span>
                                      )}
                                    </div>

                                    <div className="font-bold text-xs text-white truncate">
                                      {pick.playerName}
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                      <span>{pick.teamId}</span>
                                      <span className="font-black text-zinc-200">
                                        {pick.totalPoints} pts
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
