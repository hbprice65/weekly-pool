"use client";

import React, { useState, useEffect } from "react";
import { Game, LeaderboardEntry } from "@/types";
import {
  Check,
  X,
  Search,
  Lock,
} from "lucide-react";
import { SevenSegmentIcon } from "@/components/SevenSegmentIcon";
import { NFL_TEAMS } from "@/lib/nfl-data";

interface WeeklyScoreboardProps {
  games: Game[];
  entries: LeaderboardEntry[];
  currentUserId?: string;
  currentUserPicks?: Record<string, string>;
}

export function WeeklyScoreboard({
  games,
  entries,
  currentUserId,
  currentUserPicks,
}: WeeklyScoreboardProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Track client-side time for kickoff calculations (prevents hydration mismatch)
  const [nowTime, setNowTime] = useState<number>(0);
  useEffect(() => {
    queueMicrotask(() => {
      setNowTime(Date.now());
    });
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Identify Monday Night Football tiebreaker game dynamically
  const mnfGame = games.find((g) => g.isMondayNight) || games[games.length - 1];

  // A game has started if its status is IN_PROGRESS or FINAL, or if scheduled kickoff has passed
  const isMnfKickoffPassed = Boolean(
    mnfGame && nowTime > 0 && new Date(mnfGame.kickoffTime).getTime() <= nowTime
  );
  const isMnfStarted = Boolean(
    mnfGame &&
      (mnfGame.status === "IN_PROGRESS" ||
        mnfGame.status === "FINAL" ||
        isMnfKickoffPassed)
  );
  const isMnfFinal = Boolean(
    mnfGame &&
      mnfGame.status === "FINAL" &&
      mnfGame.awayScore !== undefined &&
      mnfGame.homeScore !== undefined
  );
  const actualMnfScore = isMnfFinal && mnfGame
    ? (mnfGame.awayScore ?? 0) + (mnfGame.homeScore ?? 0)
    : null;

  // Sort entries for this week by weeklyPoints descending, then alphabetically
  const weeklySortedEntries = [...entries].sort((a, b) => {
    if (b.weeklyPoints !== a.weeklyPoints) {
      return b.weeklyPoints - a.weeklyPoints;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  // Calculate tie frequencies across the pool
  const weeklyPointsCount = new Map<number, number>();
  for (const entry of weeklySortedEntries) {
    weeklyPointsCount.set(
      entry.weeklyPoints,
      (weeklyPointsCount.get(entry.weeklyPoints) || 0) + 1
    );
  }

  // Assign competition ranks (1224 ranking) and tied status
  const rankedEntries = weeklySortedEntries.map((entry) => {
    const rank =
      weeklySortedEntries.findIndex(
        (other) => other.weeklyPoints === entry.weeklyPoints
      ) + 1;
    const isTied = (weeklyPointsCount.get(entry.weeklyPoints) || 0) > 1;
    return {
      ...entry,
      rank,
      isTied,
      rankDisplay: isTied ? `T${rank}` : `#${rank}`,
    };
  });

  // Filter participants based on search query
  const filteredEntries = rankedEntries.filter((entry) =>
    entry.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const finalGamesCount = games.filter((g) => g.status === "FINAL").length;
  const inProgressCount = games.filter((g) => g.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Scoreboard Header */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-base sm:text-xl font-bold text-white flex items-center space-x-2">
            <SevenSegmentIcon className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Scoreboard</span>
          </h2>
        </div>

        {/* Status Badge & Search */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1.5 rounded-lg border border-zinc-700/80 font-medium shrink-0">
            {finalGamesCount}/{games.length} final{inProgressCount > 0 ? ` ${inProgressCount} live` : ""}
          </span>

          {/* Participant Search */}
          <div className="relative w-36 xs:w-44 sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs pl-8 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Scoreboard Table Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
        {/* Table with Sticky Column for Player Names */}
        <div className="overflow-x-auto max-w-full">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-semibold uppercase tracking-wider text-[11px]">
                  {/* Sticky Player Column */}
                  <th
                    scope="col"
                    className="sticky left-0 z-30 bg-zinc-950 px-3.5 py-3 text-left w-36 sm:w-44 border-r border-zinc-800 shadow-sm"
                  >
                    Participant
                  </th>
                  <th scope="col" className="px-3 py-3 text-center whitespace-nowrap w-16">
                    Wk Pts
                  </th>
                  {/* Games Columns */}
                  {games.map((g) => (
                    <th
                      key={g.id}
                      scope="col"
                      className="px-2.5 py-3 text-center whitespace-nowrap min-w-[80px] sm:min-w-[90px] border-r border-zinc-800/60"
                    >
                      <div className="text-[11px] font-bold text-zinc-200">
                        {g.awayTeam.id} @ {g.homeTeam.id}
                      </div>
                      <div className="text-[9px] text-zinc-400 font-mono mt-0.5">
                        {g.status === "FINAL" && g.awayScore !== undefined && g.homeScore !== undefined ? (
                          <span className="text-zinc-300 font-bold">
                            {g.awayScore}-{g.homeScore}
                          </span>
                        ) : g.status === "IN_PROGRESS" ? (
                          <span className="text-emerald-400 font-bold">
                            {g.awayScore ?? 0}-{g.homeScore ?? 0}
                          </span>
                        ) : (
                          <span className="text-purple-300 font-semibold">
                            {g.isMondayNight ? "MNF" : "Pre"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th scope="col" className="px-3 py-3 text-center whitespace-nowrap w-24">
                    <div className="inline-flex items-center justify-center space-x-1">
                      <span>MNF Tie</span>
                      {!isMnfStarted && (
                        <Lock className="w-3 h-3 text-purple-400 shrink-0" />
                      )}
                    </div>
                    {isMnfFinal && actualMnfScore !== null && (
                      <div className="text-[9px] text-zinc-400 font-mono mt-0.5 font-normal">
                        Total {actualMnfScore}
                      </div>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredEntries.map((entry) => {
                  const isCurrent = entry.userId === currentUserId;

                  return (
                    <tr
                      key={entry.userId}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isCurrent ? "bg-emerald-950/25" : ""
                      }`}
                    >
                      {/* Sticky Participant Column */}
                      <td
                        className={`sticky left-0 z-20 px-3.5 py-3 text-left border-r border-zinc-800 font-medium ${
                          isCurrent ? "bg-zinc-900" : "bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span
                            className="text-zinc-400 text-[10px] font-bold min-w-[1.5rem] text-center shrink-0"
                            title={entry.isTied ? `Tied for #${entry.rank}` : `Rank #${entry.rank}`}
                          >
                            {entry.rankDisplay}
                          </span>
                          {entry.avatarUrl && (
                            <img
                              src={entry.avatarUrl}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover shrink-0 border border-zinc-700"
                            />
                          )}
                          <span className="text-white text-xs font-bold truncate max-w-[85px] sm:max-w-[110px]">
                            {entry.displayName}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Weekly Points Column */}
                      <td className="px-3 py-3 text-center font-black text-white text-xs whitespace-nowrap">
                        <span className="bg-zinc-800 px-2 py-0.5 rounded-md text-emerald-400 font-bold border border-zinc-700/60">
                          {entry.weeklyPoints}
                        </span>
                      </td>

                      {/* Pick Cells for Each Game */}
                      {games.map((g) => {
                        const pickedTeam =
                          (isCurrent && currentUserPicks?.[g.id]) ||
                          (entry.picks ? entry.picks[g.id] : undefined);

                        const isGameKickoffPassed = Boolean(
                          nowTime > 0
                            ? new Date(g.kickoffTime).getTime() <= nowTime
                            : typeof window !== "undefined"
                            ? new Date(g.kickoffTime).getTime() <= Date.now()
                            : false
                        );
                        const isGameStarted =
                          g.status === "IN_PROGRESS" ||
                          g.status === "FINAL" ||
                          isGameKickoffPassed;

                        // Privacy check: Opponents cannot view picks until the game kicks off
                        if (!isGameStarted && !isCurrent) {
                          return (
                            <td
                              key={g.id}
                              className="px-2 py-2 text-center whitespace-nowrap border-r border-zinc-800/60"
                            >
                              {pickedTeam ? (
                                <div className="inline-flex items-center justify-center space-x-1 px-1.5 py-1 rounded-md text-[10px] font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-400">
                                  <Lock className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                                  <span>Hidden</span>
                                </div>
                              ) : (
                                <span className="text-zinc-600 font-mono text-[10px]">—</span>
                              )}
                            </td>
                          );
                        }

                        if (!pickedTeam) {
                          return (
                            <td
                              key={g.id}
                              className="px-2 py-2 text-center whitespace-nowrap border-r border-zinc-800/60"
                            >
                              <span className="text-zinc-600 font-mono text-[10px]">—</span>
                            </td>
                          );
                        }

                        // Resolve team details (logo, color, full name)
                        const teamObj =
                          g.awayTeam?.id === pickedTeam
                            ? g.awayTeam
                            : g.homeTeam?.id === pickedTeam
                            ? g.homeTeam
                            : NFL_TEAMS[pickedTeam];
                        const teamLogo =
                          teamObj?.logoUrl ||
                          `https://a.espncdn.com/i/teamlogos/nfl/500/${pickedTeam.toLowerCase()}.png`;
                        const teamColor = teamObj?.primaryColor || "#3f3f46";
                        const teamFullName = teamObj?.fullName || pickedTeam;

                        const isFinal = g.status === "FINAL";
                        const isLive = g.status === "IN_PROGRESS";
                        const isWinner = isFinal && g.winnerTeamId === pickedTeam;
                        const isLoser =
                          isFinal &&
                          g.winnerTeamId &&
                          pickedTeam &&
                          g.winnerTeamId !== pickedTeam;

                        return (
                          <td
                            key={g.id}
                            className="px-2 py-2 text-center whitespace-nowrap border-r border-zinc-800/60"
                          >
                            <div
                              className={`inline-flex items-center justify-center space-x-1.5 px-2 py-1 rounded-md text-[11px] font-bold border transition-all ${
                                isWinner
                                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/70 shadow-sm"
                                  : isLoser
                                  ? "bg-rose-950/40 text-rose-300 border-rose-800/60 opacity-75"
                                  : isLive
                                  ? "bg-zinc-850 text-white border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/20"
                                  : "bg-zinc-800/80 text-zinc-200 border-zinc-700/80"
                              }`}
                              title={`${entry.displayName} picked ${teamFullName}${
                                isWinner
                                  ? " (Final - Correct +1 pt)"
                                  : isLoser
                                  ? " (Final - Incorrect)"
                                  : isLive
                                  ? " (Live)"
                                  : " (Scheduled)"
                              }`}
                            >
                              {/* Team Icon Box: Shows team logo when live/scheduled; covered by checkmark/X when final */}
                              <div
                                className="relative w-5 h-5 rounded bg-zinc-950 p-0.5 flex items-center justify-center shrink-0 border border-zinc-800 overflow-hidden isolate"
                                style={{ borderColor: teamColor ? `${teamColor}40` : undefined }}
                              >
                                {/* Fallback abbreviation if logo fails or loads slowly */}
                                <span
                                  className="absolute text-[8px] font-black uppercase select-none opacity-80"
                                  style={{ color: teamColor || "#a1a1aa" }}
                                >
                                  {pickedTeam}
                                </span>

                                {teamLogo && (
                                  <img
                                    src={teamLogo}
                                    alt={pickedTeam}
                                    loading="lazy"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                )}

                                {/* When game goes final, the icon is covered by the correct or incorrect symbol */}
                                {isWinner && (
                                  <div
                                    className="absolute inset-0 bg-emerald-600 flex items-center justify-center rounded shadow"
                                    title="Correct Pick"
                                  >
                                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                  </div>
                                )}
                                {isLoser && (
                                  <div
                                    className="absolute inset-0 bg-rose-600 flex items-center justify-center rounded shadow"
                                    title="Incorrect Pick"
                                  >
                                    <X className="w-3.5 h-3.5 text-white stroke-[3]" />
                                  </div>
                                )}
                              </div>

                              {/* Team Abbreviation Text */}
                              <span className="font-bold tracking-tight">{pickedTeam}</span>
                            </div>
                          </td>
                        );
                      })}

                      {/* MNF Tiebreaker */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-bold text-xs">
                        {entry.predictedMnfScore !== undefined ? (
                          isMnfStarted ? (
                            <span className="text-purple-300 font-bold">
                              {entry.predictedMnfScore}
                              {entry.tiebreakerDiff !== undefined && (
                                <span className="text-[10px] text-zinc-400 font-mono font-normal ml-1">
                                  (&plusmn;{entry.tiebreakerDiff})
                                </span>
                              )}
                            </span>
                          ) : isCurrent ? (
                            <div className="inline-flex items-center justify-center space-x-1 text-purple-300 font-bold">
                              <span>{entry.predictedMnfScore}</span>
                              <span className="text-[9px] text-purple-400/80 font-normal">
                                (You)
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 text-[10px] font-medium">
                              <Lock className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                              <span>Hidden</span>
                            </div>
                          )
                        ) : (
                          <span className="text-zinc-600 font-mono text-[10px]">—</span>
                        )}
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
