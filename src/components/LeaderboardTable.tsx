"use client";

import React, { useState } from "react";
import { LeaderboardEntry } from "@/types";
import { Trophy, TrendingUp, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardTable({
  entries,
  currentUserId,
}: LeaderboardTableProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const toggleExpand = (userId: string) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
      {/* Header section */}
      <div className="p-4 sm:p-5 md:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <span>Pool Standings & Leaderboard</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ranked by total points • Click any participant to view their picks
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-zinc-400">
          <span className="flex items-center space-x-1.5 bg-zinc-800/60 px-2.5 py-1 rounded-full border border-zinc-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0" />
            <span>1 pt per correct winner</span>
          </span>
        </div>
      </div>

      {/* MOBILE VIEW (< sm): Clean, touch-optimized card list */}
      <div className="sm:hidden divide-y divide-zinc-800/80">
        {entries.map((entry) => {
          const isCurrentUser = entry.userId === currentUserId;
          const isExpanded = expandedUserId === entry.userId;
          const winPct =
            entry.totalPicks > 0
              ? Math.round((entry.correctPicks / entry.totalPicks) * 100)
              : 0;
          const picksCount = entry.picks ? Object.keys(entry.picks).length : entry.totalPicks;

          return (
            <div
              key={entry.userId}
              className={`transition-colors ${
                isCurrentUser ? "bg-emerald-950/20" : "bg-transparent"
              }`}
            >
              <div
                onClick={() => toggleExpand(entry.userId)}
                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer active:bg-zinc-800/40"
              >
                {/* Left: Rank & User */}
                <div className="flex items-center space-x-2.5 min-w-0">
                  {/* Rank Badge */}
                  <div className="shrink-0 w-7 text-center">
                    {entry.rank === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs border border-amber-500/40">
                        1
                      </span>
                    ) : entry.rank === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-bold text-xs border border-slate-300/40">
                        2
                      </span>
                    ) : entry.rank === 3 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-600 font-bold text-xs border border-amber-700/40">
                        3
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-xs font-semibold">
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar & Display Name */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-bold text-white truncate max-w-[130px] xs:max-w-[170px]">
                        {entry.displayName}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-extrabold border border-emerald-500/30 shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center space-x-2 mt-0.5">
                      <span className="text-emerald-400 font-medium">
                        {picksCount} picks made
                      </span>
                      <span>•</span>
                      <span>{winPct}%</span>
                      {entry.predictedMnfScore !== undefined && (
                        <>
                          <span>•</span>
                          <span className="text-purple-300">
                            MNF: {entry.predictedMnfScore}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Total Points & Chevron */}
                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right">
                    <div className="text-base font-black text-white leading-tight">
                      {entry.totalPoints}
                    </div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                      pts
                    </div>
                  </div>
                  <div className="text-zinc-500">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Expanded Picks Breakdown */}
              {isExpanded && (
                <div className="px-4 pb-3.5 pt-1 bg-zinc-950/70 border-t border-zinc-800/60 text-xs space-y-2">
                  <div className="font-semibold text-zinc-300 flex items-center justify-between text-[11px]">
                    <span>Week 6 Picks Breakdown:</span>
                    <span className="text-zinc-400 font-mono">
                      {picksCount} / 9 submitted
                    </span>
                  </div>
                  {entry.picks && Object.keys(entry.picks).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(entry.picks).map(([gameId, team]) => (
                        <span
                          key={gameId}
                          className="px-2 py-1 bg-zinc-900 border border-zinc-700/80 rounded-lg text-emerald-400 font-bold text-[11px] flex items-center space-x-1"
                        >
                          <span className="text-zinc-400 font-normal uppercase text-[9px]">
                            {gameId}:
                          </span>
                          <span>{team}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-400 italic text-[11px]">
                      No picks submitted for this week yet.
                    </p>
                  )}
                  {entry.predictedMnfScore !== undefined && (
                    <div className="text-[11px] text-purple-300 flex items-center space-x-1 pt-1">
                      <span>Monday Night Football Predicted Score:</span>
                      <strong className="text-white">
                        {entry.predictedMnfScore} pts
                      </strong>
                    </div>
                  )}
                </div>
              )}
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
                Picks Made
              </th>
              <th scope="col" className="px-4 py-3.5 text-center">
                MNF Tiebreaker
              </th>
              <th scope="col" className="px-4 py-3.5 text-center">
                Accuracy
              </th>
              <th scope="col" className="px-4 py-3.5 text-right font-bold text-white">
                Total Points
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {entries.map((entry) => {
              const isCurrentUser = entry.userId === currentUserId;
              const isExpanded = expandedUserId === entry.userId;
              const winPct =
                entry.totalPicks > 0
                  ? Math.round((entry.correctPicks / entry.totalPicks) * 100)
                  : 0;
              const picksCount = entry.picks ? Object.keys(entry.picks).length : entry.totalPicks;

              return (
                <React.Fragment key={entry.userId}>
                  <tr
                    onClick={() => toggleExpand(entry.userId)}
                    className={`transition-colors cursor-pointer ${
                      isCurrentUser
                        ? "bg-emerald-950/30 hover:bg-emerald-950/50"
                        : "hover:bg-zinc-800/40"
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-4 py-4 text-center">
                      {entry.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/40">
                          1
                        </span>
                      ) : entry.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 font-bold border border-slate-300/40">
                          2
                        </span>
                      ) : entry.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 font-bold border border-amber-700/40">
                          3
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-semibold">{entry.rank}</span>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-4 font-medium text-white">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                          {entry.displayName.slice(0, 2).toUpperCase()}
                        </div>
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

                    {/* Picks Made */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center space-x-1.5 font-medium text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-800/40 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{picksCount} / 9</span>
                      </span>
                    </td>

                    {/* MNF Tiebreaker */}
                    <td className="px-4 py-4 text-center text-purple-300 font-medium text-xs">
                      {entry.predictedMnfScore !== undefined
                        ? `${entry.predictedMnfScore} pts`
                        : "—"}
                    </td>

                    {/* Accuracy */}
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center space-x-1 text-xs text-zinc-300">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{winPct}%</span>
                      </span>
                    </td>

                    {/* Total Points */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <div>
                          <span className="text-base font-black text-white">
                            {entry.totalPoints}
                          </span>
                          <span className="text-xs text-zinc-400 ml-1">pts</span>
                        </div>
                        <div className="text-zinc-500">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Desktop Expanded Row: Shows exact team picks */}
                  {isExpanded && (
                    <tr className="bg-zinc-950/80 border-b border-zinc-800">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span className="font-semibold text-zinc-200">
                              {entry.displayName}&apos;s Week 6 Picks Breakdown:
                            </span>
                            <span>Click row to collapse</span>
                          </div>

                          {entry.picks && Object.keys(entry.picks).length > 0 ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {Object.entries(entry.picks).map(([gameId, team]) => (
                                <div
                                  key={gameId}
                                  className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl shadow-sm"
                                >
                                  <span className="text-[10px] text-zinc-500 uppercase font-mono font-bold">
                                    {gameId}
                                  </span>
                                  <span className="text-xs font-black text-emerald-400">
                                    {team}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-500 italic">
                              No picks saved in database for this participant yet.
                            </p>
                          )}
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
  );
}
