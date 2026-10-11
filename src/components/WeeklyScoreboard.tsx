"use client";

import React, { useState, useEffect } from "react";
import { Game, LeaderboardEntry } from "@/types";
import {
  Check,
  X,
  Search,
  RefreshCw,
  Lock,
} from "lucide-react";
import { SevenSegmentIcon } from "@/components/SevenSegmentIcon";
import { NFL_TEAMS } from "@/lib/nfl-data";

interface WeeklyScoreboardProps {
  games: Game[];
  entries: LeaderboardEntry[];
  currentUserId?: string;
  currentUserPicks?: Record<string, string>;
  selectedWeek?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function WeeklyScoreboard({
  games,
  entries,
  currentUserId,
  currentUserPicks,
  selectedWeek,
  onRefresh,
  isRefreshing = false,
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

  // Sort entries for this week by weeklyPoints descending
  const weeklySortedEntries = [...entries].sort((a, b) => {
    if (b.weeklyPoints !== a.weeklyPoints) {
      return b.weeklyPoints - a.weeklyPoints;
    }
    return b.correctPicks - a.correctPicks;
  });

  // Filter participants based on search query
  const filteredEntries = weeklySortedEntries.filter((entry) =>
    entry.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const finalGamesCount = games.filter((g) => g.status === "FINAL").length;
  const inProgressCount = games.filter((g) => g.status === "IN_PROGRESS").length;
  const scheduledGamesCount = games.filter((g) => g.status === "SCHEDULED").length;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Week Scoreboard Header */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <h2 className="text-base sm:text-xl font-bold text-white flex items-center space-x-2">
              <SevenSegmentIcon className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Week {selectedWeek} Scoreboard</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              ESPN Official Data
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Live matchup scores, participant pick outcomes, and weekly standings matrix.
          </p>
        </div>

        {/* Status Pills, Search & Refresh Button */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="text-[11px] bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700/80 font-medium flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{finalGamesCount} Final</span>
          </span>

          {inProgressCount > 0 && (
            <span className="text-[11px] bg-emerald-950/80 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-700/80 font-bold flex items-center space-x-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{inProgressCount} Live Now</span>
            </span>
          )}

          <span className="text-[11px] bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-700/80 font-medium flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>{scheduledGamesCount} Upcoming</span>
          </span>

          {/* Participant Search */}
          <div className="relative max-w-[170px] w-full hidden sm:block">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs pl-8 pr-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 px-3 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 rounded-lg text-xs font-semibold text-zinc-200 hover:text-white transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-emerald-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>{isRefreshing ? "Refreshing..." : "Refresh Scores"}</span>
            </button>
          )}
        </div>
      </div>

      {/* WHO PICKED WHO MATRIX (Streamlined Main View) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
        {/* Matrix Header / Controls & Legend */}
        <div className="p-3.5 sm:p-4 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-white">
              Who Picked Who Matrix
            </span>
            <span className="text-[11px] text-zinc-400 hidden xs:inline">
              • Scroll horizontally to view all matchups
            </span>
            {!isMnfStarted && (
              <span className="text-[11px] text-purple-300/90 hidden md:inline-flex items-center space-x-1">
                • <Lock className="w-3 h-3 ml-1 text-purple-400 inline" />
                <span>Tiebreaker predictions hidden until MNF kickoff</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
            {/* Search input for mobile screens */}
            <div className="relative max-w-[160px] sm:hidden w-full">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search player..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs pl-8 pr-2.5 py-1 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center space-x-1.5 text-zinc-300 text-[11px] font-medium bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>Live: Team Icon</span>
              </span>
              <span className="flex items-center space-x-1.5 text-emerald-300 text-[11px] font-medium bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-700/60">
                <span className="w-3.5 h-3.5 rounded bg-emerald-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  ✓
                </span>
                <span>Final Correct</span>
              </span>
              <span className="flex items-center space-x-1.5 text-rose-300 text-[11px] font-medium bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800/60">
                <span className="w-3.5 h-3.5 rounded bg-rose-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                  ✕
                </span>
                <span>Final Incorrect</span>
              </span>
            </div>
          </div>

          {/* Matrix Table with Sticky Column for Player Names */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-semibold uppercase tracking-wider text-[11px]">
                  {/* Sticky Player Column */}
                  <th
                    scope="col"
                    className="sticky left-0 z-20 bg-zinc-950 px-3.5 py-3 text-left w-36 sm:w-44 border-r border-zinc-800 shadow-sm"
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
                        <span title="Tiebreaker predictions remain hidden until MNF kickoff">
                          <Lock className="w-3 h-3 text-purple-400 shrink-0" />
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredEntries.map((entry, idx) => {
                  const isCurrent = entry.userId === currentUserId;
                  const rank = idx + 1;

                  return (
                    <tr
                      key={entry.userId}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isCurrent ? "bg-emerald-950/25" : ""
                      }`}
                    >
                      {/* Sticky Participant Column */}
                      <td
                        className={`sticky left-0 z-10 px-3.5 py-3 text-left border-r border-zinc-800 font-medium ${
                          isCurrent ? "bg-zinc-900" : "bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="text-zinc-400 text-[10px] font-bold w-4 text-center shrink-0">
                            #{rank}
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
                                <div
                                  className="inline-flex items-center justify-center space-x-1 px-1.5 py-1 rounded-md text-[10px] font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-400"
                                  title="Pick hidden until kickoff"
                                >
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
                                  ? " (Final • Correct +1 pt)"
                                  : isLoser
                                  ? " (Final • Incorrect)"
                                  : isLive
                                  ? " (Game in Progress)"
                                  : " (Scheduled)"
                              }`}
                            >
                              {/* Team Icon Box: Shows team logo when live/scheduled; covered by checkmark/X when final */}
                              <div
                                className="relative w-5 h-5 rounded bg-zinc-950 p-0.5 flex items-center justify-center shrink-0 border border-zinc-800 overflow-hidden"
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
                                    className="relative z-0 w-full h-full object-contain"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                )}

                                {/* When game goes final, the icon is covered by the correct or incorrect symbol */}
                                {isWinner && (
                                  <div
                                    className="absolute inset-0 z-10 bg-emerald-600 flex items-center justify-center rounded shadow"
                                    title="Correct Pick"
                                  >
                                    <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                                  </div>
                                )}
                                {isLoser && (
                                  <div
                                    className="absolute inset-0 z-10 bg-rose-600 flex items-center justify-center rounded shadow"
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
                            </span>
                          ) : isCurrent ? (
                            <div className="inline-flex items-center justify-center space-x-1 text-purple-300 font-bold">
                              <span>{entry.predictedMnfScore}</span>
                              <span className="text-[9px] text-purple-400/80 font-normal">
                                (You)
                              </span>
                            </div>
                          ) : (
                            <div
                              className="inline-flex items-center justify-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 text-[10px] font-medium"
                              title="Hidden until Monday Night Football kicks off"
                            >
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
    </div>
  );
}
