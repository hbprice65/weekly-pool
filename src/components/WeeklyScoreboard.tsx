"use client";

import React, { useState } from "react";
import { Game, LeaderboardEntry } from "@/types";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Trophy,
  RefreshCw,
} from "lucide-react";

interface WeeklyScoreboardProps {
  games: Game[];
  entries: LeaderboardEntry[];
  currentUserId?: string;
  selectedWeek?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function WeeklyScoreboard({
  games,
  entries,
  currentUserId,
  selectedWeek,
  onRefresh,
  isRefreshing = false,
}: WeeklyScoreboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGameStatus, setFilterGameStatus] = useState<"ALL" | "FINAL" | "SCHEDULED">("ALL");
  const [activeSubView, setActiveSubView] = useState<"matrix" | "games" | "standings">("matrix");

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

  // Filter games based on status filter
  const displayedGames = games.filter((game) => {
    if (filterGameStatus === "FINAL") return game.status === "FINAL";
    if (filterGameStatus === "SCHEDULED") return game.status === "SCHEDULED" || game.status === "IN_PROGRESS";
    return true;
  });

  const finalGamesCount = games.filter((g) => g.status === "FINAL").length;
  const inProgressCount = games.filter((g) => g.status === "IN_PROGRESS").length;
  const scheduledGamesCount = games.filter((g) => g.status === "SCHEDULED").length;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Week Scoreboard Header */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <h2 className="text-base sm:text-xl font-bold text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Week {selectedWeek} Live NFL Scoreboard</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              ESPN Official Data
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real NFL scores, weekly winner results, and pool-wide participant pick matrix.
          </p>
        </div>

        {/* Status Pills & Refresh Button */}
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

      {/* Sub-view Navigation Segmented Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 gap-2">
        <div className="flex items-center space-x-1 sm:space-x-2 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveSubView("matrix")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeSubView === "matrix"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/70"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>Who Picked Who (Matrix)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView("games")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeSubView === "games"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/70"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>Matchup Scores ({games.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView("standings")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeSubView === "standings"
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/70"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>Week {selectedWeek} Standings</span>
          </button>
        </div>

        {/* Participant Search */}
        {activeSubView !== "games" && (
          <div className="relative max-w-[200px] w-full hidden sm:block">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-white text-xs pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* VIEW 1: WHO PICKED WHO MATRIX */}
      {activeSubView === "matrix" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
          {/* Matrix Header / Controls */}
          <div className="p-3.5 sm:p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm font-bold text-white">
                Week {selectedWeek} Picks Matrix
              </span>
              <span className="text-[11px] text-zinc-400 hidden xs:inline">
                • Scroll horizontally to view all matchups
              </span>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center space-x-1 text-emerald-400 text-[11px] font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3" />
                <span>Correct</span>
              </span>
              <span className="flex items-center space-x-1 text-rose-400 text-[11px] font-medium bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                <XCircle className="w-3 h-3" />
                <span>Incorrect</span>
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
                  <th scope="col" className="px-3 py-3 text-center whitespace-nowrap w-20">
                    MNF Tie
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
                          <span className="text-white text-xs font-bold truncate max-w-[90px] sm:max-w-[120px]">
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
                        const pickedTeam = entry.picks ? entry.picks[g.id] : undefined;
                        const isWinner = g.status === "FINAL" && g.winnerTeamId === pickedTeam;
                        const isLoser =
                          g.status === "FINAL" &&
                          g.winnerTeamId &&
                          pickedTeam &&
                          g.winnerTeamId !== pickedTeam;

                        return (
                          <td
                            key={g.id}
                            className="px-2 py-2 text-center whitespace-nowrap border-r border-zinc-800/60"
                          >
                            {pickedTeam ? (
                              <div
                                className={`inline-flex items-center justify-center space-x-1 px-2 py-1 rounded-md text-[11px] font-bold border ${
                                  isWinner
                                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-600/60 shadow-sm"
                                    : isLoser
                                    ? "bg-rose-950/40 text-rose-300 border-rose-800/40 opacity-70"
                                    : "bg-zinc-800/80 text-zinc-200 border-zinc-700"
                                }`}
                              >
                                <span>{pickedTeam}</span>
                                {isWinner && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
                                {isLoser && <XCircle className="w-3 h-3 text-rose-400 shrink-0" />}
                              </div>
                            ) : (
                              <span className="text-zinc-600 font-mono text-[10px]">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* MNF Tiebreaker */}
                      <td className="px-3 py-3 text-center whitespace-nowrap text-purple-300 font-bold text-xs">
                        {entry.predictedMnfScore !== undefined ? `${entry.predictedMnfScore}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: MATCHUP SCORECARDS */}
      {activeSubView === "games" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Showing {displayedGames.length} of {games.length} Week {selectedWeek} Matchups
            </span>
            <div className="flex items-center space-x-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterGameStatus("ALL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterGameStatus === "ALL"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterGameStatus("FINAL")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterGameStatus === "FINAL"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Final ({finalGamesCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterGameStatus("SCHEDULED")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  filterGameStatus === "SCHEDULED"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Upcoming ({scheduledGamesCount + inProgressCount})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {displayedGames.map((game) => {
              const isFinal = game.status === "FINAL";
              const isLive = game.status === "IN_PROGRESS";
              const awayWon = isFinal && game.winnerTeamId === game.awayTeam.id;
              const homeWon = isFinal && game.winnerTeamId === game.homeTeam.id;

              // Calculate pool pick count for each team
              let awayPicks = 0;
              let homePicks = 0;
              entries.forEach((e) => {
                if (e.picks?.[game.id] === game.awayTeam.id) awayPicks++;
                if (e.picks?.[game.id] === game.homeTeam.id) homePicks++;
              });
              const totalGamePicks = awayPicks + homePicks;
              const awayPct = totalGamePicks > 0 ? Math.round((awayPicks / totalGamePicks) * 100) : 50;
              const homePct = totalGamePicks > 0 ? 100 - awayPct : 50;

              const kickoffFormatted = new Date(game.kickoffTime).toLocaleDateString("en-US", {
                weekday: "short",
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={game.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3"
                >
                  {/* Game Status Header */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2 border-b border-zinc-800/80">
                    <div className="flex items-center space-x-1.5">
                      {isFinal ? (
                        <span className="font-bold text-zinc-300 uppercase tracking-wider bg-zinc-800 px-2 py-0.5 rounded text-[10px]">
                          FINAL
                        </span>
                      ) : isLive ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded text-[10px] border border-emerald-800/80 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>LIVE • {game.statusDetail || "In Progress"}</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-zinc-300 font-semibold bg-zinc-800/80 px-2 py-0.5 rounded text-[10px] border border-zinc-700/80">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>{game.statusDetail || kickoffFormatted}</span>
                        </span>
                      )}
                      {game.isMondayNight && (
                        <span className="text-[10px] text-amber-400 font-semibold">
                          • MNF Tiebreaker
                        </span>
                      )}
                    </div>
                    {game.tvNetwork && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        {game.tvNetwork}
                      </span>
                    )}
                  </div>

                  {/* Teams & Scores */}
                  <div className="space-y-2">
                    {/* Away Team */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                        awayWon ? "bg-emerald-950/30 border border-emerald-800/40" : "bg-zinc-950/40"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        {game.awayTeam.logoUrl ? (
                          <div className="w-7 h-7 rounded-md bg-zinc-900 p-0.5 flex items-center justify-center shrink-0 border border-zinc-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={game.awayTeam.logoUrl}
                              alt={game.awayTeam.fullName}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center font-black text-xs text-white shadow-sm shrink-0"
                            style={{ backgroundColor: game.awayTeam.primaryColor }}
                          >
                            {game.awayTeam.id}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${awayWon ? "text-emerald-300" : "text-white"}`}>
                            {game.awayTeam.fullName}
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center space-x-1">
                            <span>Away</span>
                            {game.awayTeam.record && <span>• {game.awayTeam.record}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {game.awayScore !== undefined ? (
                          <span
                            className={`text-lg font-black ${
                              awayWon ? "text-white" : "text-zinc-400"
                            }`}
                          >
                            {game.awayScore}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500 font-mono">
                            {game.spread && game.spread > 0 ? `+${game.spread}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Home Team */}
                    <div
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                        homeWon ? "bg-emerald-950/30 border border-emerald-800/40" : "bg-zinc-950/40"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        {game.homeTeam.logoUrl ? (
                          <div className="w-7 h-7 rounded-md bg-zinc-900 p-0.5 flex items-center justify-center shrink-0 border border-zinc-800">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={game.homeTeam.logoUrl}
                              alt={game.homeTeam.fullName}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center font-black text-xs text-white shadow-sm shrink-0"
                            style={{ backgroundColor: game.homeTeam.primaryColor }}
                          >
                            {game.homeTeam.id}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className={`text-xs font-bold truncate ${homeWon ? "text-emerald-300" : "text-white"}`}>
                            {game.homeTeam.fullName}
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center space-x-1">
                            <span>Home</span>
                            {game.homeTeam.record && <span>• {game.homeTeam.record}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {game.homeScore !== undefined ? (
                          <span
                            className={`text-lg font-black ${
                              homeWon ? "text-white" : "text-zinc-400"
                            }`}
                          >
                            {game.homeScore}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500 font-mono">
                            {game.spread && game.spread < 0 ? `${game.spread}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pool Pick Distribution Bar */}
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Pool Picks:</span>
                      <span>
                        {game.awayTeam.id} {awayPct}% • {game.homeTeam.id} {homePct}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${awayPct}%` }}
                      />
                      <div
                        className="bg-teal-600 h-full"
                        style={{ width: `${homePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: WEEK STANDINGS ONLY */}
      {activeSubView === "standings" && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-zinc-800">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>Week {selectedWeek} Matchup Standings</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Standings determined strictly by correct picks made during Week {selectedWeek}.
            </p>
          </div>

          <div className="divide-y divide-zinc-800">
            {filteredEntries.map((entry, idx) => {
              const isCurrent = entry.userId === currentUserId;
              const rank = idx + 1;

              return (
                <div
                  key={entry.userId}
                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 ${
                    isCurrent ? "bg-emerald-950/20" : ""
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 text-center font-bold text-sm">
                      {rank === 1 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 inline-flex items-center justify-center text-xs border border-amber-500/40">
                          1
                        </span>
                      ) : rank === 2 ? (
                        <span className="w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 inline-flex items-center justify-center text-xs border border-slate-300/40">
                          2
                        </span>
                      ) : rank === 3 ? (
                        <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 inline-flex items-center justify-center text-xs border border-amber-700/40">
                          3
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-xs">#{rank}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">
                          {entry.displayName}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-extrabold border border-emerald-500/30">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center space-x-2 mt-0.5">
                        <span>{entry.weeklyPoints} of {finalGamesCount} correct</span>
                        {entry.predictedMnfScore !== undefined && (
                          <>
                            <span>•</span>
                            <span className="text-purple-300">
                              MNF Pred: {entry.predictedMnfScore} pts
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-emerald-400">
                      {entry.weeklyPoints} pts
                    </div>
                    <div className="text-[10px] text-zinc-400">Week {selectedWeek}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
