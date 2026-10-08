"use client";

import React from "react";
import { LeaderboardEntry } from "@/types";
import { Trophy, Award, TrendingUp } from "lucide-react";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

export function LeaderboardTable({
  entries,
  currentUserId,
}: LeaderboardTableProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Pool Standings & Leaderboard</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ranked by overall season points with weekly performance tracking
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>1 pt per correct pick</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
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
                Week 6 Pts
              </th>
              <th scope="col" className="px-4 py-3.5 text-center">
                Record
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
              const winPct =
                entry.totalPicks > 0
                  ? Math.round((entry.correctPicks / entry.totalPicks) * 100)
                  : 0;

              return (
                <tr
                  key={entry.userId}
                  className={`transition-colors ${
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
                      <span className="text-zinc-400 font-medium">{entry.rank}</span>
                    )}
                  </td>

                  {/* Name */}
                  <td className="px-4 py-4 font-medium text-white flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-emerald-400">
                      {entry.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span>{entry.displayName}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Weekly Points */}
                  <td className="px-4 py-4 text-center font-semibold text-emerald-400">
                    +{entry.weeklyPoints}
                  </td>

                  {/* Record */}
                  <td className="px-4 py-4 text-center text-zinc-300 font-mono text-xs">
                    {entry.correctPicks}-{entry.totalPicks - entry.correctPicks}
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
  );
}
