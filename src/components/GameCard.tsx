"use client";

import React, { useState, useEffect } from "react";
import { Game } from "@/types";
import { CheckCircle2, Clock, Tv, XCircle } from "lucide-react";

interface GameCardProps {
  game: Game;
  selectedTeamId?: string;
  onSelectPick: (gameId: string, teamId: string) => void;
  isLocked?: boolean;
}

export function GameCard({
  game,
  selectedTeamId,
  onSelectPick,
  isLocked = false,
}: GameCardProps) {
  const [awayImgError, setAwayImgError] = useState(false);
  const [homeImgError, setHomeImgError] = useState(false);

  const kickoffDate = new Date(game.kickoffTime);
  const formattedDate = kickoffDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const formattedTime = kickoffDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const isAwaySelected = selectedTeamId === game.awayTeam.id;
  const isHomeSelected = selectedTeamId === game.homeTeam.id;

  const [isPastKickoff, setIsPastKickoff] = useState<boolean>(false);
  useEffect(() => {
    queueMicrotask(() => {
      setIsPastKickoff(new Date(game.kickoffTime).getTime() <= Date.now());
    });
  }, [game.kickoffTime]);

  const isFinal = game.status === "FINAL";
  const isLive = game.status === "IN_PROGRESS";
  // Game is locked if explicitly locked, completed, in progress, or past scheduled kickoff time
  const effectivelyLocked = isLocked || isFinal || isLive || isPastKickoff;

  const awayWon = isFinal && game.winnerTeamId === game.awayTeam.id;
  const homeWon = isFinal && game.winnerTeamId === game.homeTeam.id;

  const isAwayCorrect = isAwaySelected && awayWon;
  const isAwayWrong = isAwaySelected && isFinal && !awayWon && game.winnerTeamId;
  const isHomeCorrect = isHomeSelected && homeWon;
  const isHomeWrong = isHomeSelected && isFinal && !homeWon && game.winnerTeamId;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm hover:border-zinc-700/80 transition-all">
      {/* Game Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 sm:pb-3 mb-3 border-b border-zinc-800 text-[11px] sm:text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Status indicator */}
          {isFinal ? (
            <span className="bg-zinc-800 text-zinc-300 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
              FINAL
            </span>
          ) : isLive ? (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center space-x-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>LIVE • {game.statusDetail || "In Progress"}</span>
            </span>
          ) : isPastKickoff ? (
            <span className="bg-amber-950/80 text-amber-300 border border-amber-800/80 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>LOCKED • Kickoff Passed</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 font-medium text-zinc-300">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400 shrink-0" />
              <span>
                {formattedDate} • {formattedTime}
              </span>
            </span>
          )}

          {game.isMondayNight && (
            <span className="bg-purple-950/90 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
              MNF • Tiebreaker
            </span>
          )}
        </div>

        {game.tvNetwork && (
          <div className="flex items-center space-x-1 font-medium text-zinc-400 bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-700/50">
            <Tv className="w-3 h-3 text-zinc-400 shrink-0" />
            <span>{game.tvNetwork}</span>
          </div>
        )}
      </div>

      {/* Matchup Team Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Away Team Option */}
        <button
          type="button"
          disabled={effectivelyLocked}
          onClick={() => onSelectPick(game.id, game.awayTeam.id)}
          className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all text-left min-h-[64px] active:scale-[0.99] touch-manipulation group ${
            isAwaySelected
              ? isAwayCorrect
                ? "bg-emerald-950/50 border-emerald-500 shadow-md ring-1 ring-emerald-500/30"
                : isAwayWrong
                ? "bg-rose-950/30 border-rose-600/60 shadow-sm"
                : "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/30"
              : "bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700"
          } ${effectivelyLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
            {/* Team Logo or Colored Chip */}
            {game.awayTeam.logoUrl && !awayImgError ? (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-950/60 p-1 flex items-center justify-center shrink-0 border border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={game.awayTeam.logoUrl}
                  alt={game.awayTeam.fullName}
                  className="w-full h-full object-contain"
                  onError={() => setAwayImgError(true)}
                />
              </div>
            ) : (
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-extrabold text-xs sm:text-sm text-white shadow shrink-0"
                style={{ backgroundColor: game.awayTeam.primaryColor }}
              >
                {game.awayTeam.id}
              </div>
            )}

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate flex items-center space-x-1.5">
                <span className="truncate">{game.awayTeam.fullName}</span>
                {awayWon && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold">
                    W
                  </span>
                )}
              </div>
              <div className="text-[10px] sm:text-xs text-zinc-400 flex items-center space-x-1.5">
                <span>Away</span>
                {game.awayTeam.record && (
                  <span className="text-zinc-400 font-mono">({game.awayTeam.record})</span>
                )}
                {game.spread && game.spread > 0 && (
                  <span className="text-zinc-300 font-mono font-medium">
                    (+{game.spread})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Score if available, and selection indicator */}
          <div className="flex items-center space-x-2 shrink-0 pl-1">
            {game.awayScore !== undefined && (
              <span
                className={`text-base font-black ${
                  awayWon ? "text-white" : "text-zinc-400"
                }`}
              >
                {game.awayScore}
              </span>
            )}

            <div>
              {isAwaySelected ? (
                isAwayCorrect ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                ) : isAwayWrong ? (
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/40">
                    <XCircle className="w-4 h-4 text-rose-400" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                )
              ) : (
                <div className="w-6 h-6 rounded-full border border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center transition-colors" />
              )}
            </div>
          </div>
        </button>

        {/* Home Team Option */}
        <button
          type="button"
          disabled={effectivelyLocked}
          onClick={() => onSelectPick(game.id, game.homeTeam.id)}
          className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all text-left min-h-[64px] active:scale-[0.99] touch-manipulation group ${
            isHomeSelected
              ? isHomeCorrect
                ? "bg-emerald-950/50 border-emerald-500 shadow-md ring-1 ring-emerald-500/30"
                : isHomeWrong
                ? "bg-rose-950/30 border-rose-600/60 shadow-sm"
                : "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/30"
              : "bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700"
          } ${effectivelyLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
            {/* Team Logo or Colored Chip */}
            {game.homeTeam.logoUrl && !homeImgError ? (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-950/60 p-1 flex items-center justify-center shrink-0 border border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={game.homeTeam.logoUrl}
                  alt={game.homeTeam.fullName}
                  className="w-full h-full object-contain"
                  onError={() => setHomeImgError(true)}
                />
              </div>
            ) : (
              <div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-extrabold text-xs sm:text-sm text-white shadow shrink-0"
                style={{ backgroundColor: game.homeTeam.primaryColor }}
              >
                {game.homeTeam.id}
              </div>
            )}

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate flex items-center space-x-1.5">
                <span className="truncate">{game.homeTeam.fullName}</span>
                {homeWon && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-bold">
                    W
                  </span>
                )}
              </div>
              <div className="text-[10px] sm:text-xs text-zinc-400 flex items-center space-x-1.5">
                <span>Home</span>
                {game.homeTeam.record && (
                  <span className="text-zinc-400 font-mono">({game.homeTeam.record})</span>
                )}
                {game.spread && game.spread < 0 && (
                  <span className="text-zinc-300 font-mono font-medium">
                    ({game.spread})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Score if available, and selection indicator */}
          <div className="flex items-center space-x-2 shrink-0 pl-1">
            {game.homeScore !== undefined && (
              <span
                className={`text-base font-black ${
                  homeWon ? "text-white" : "text-zinc-400"
                }`}
              >
                {game.homeScore}
              </span>
            )}

            <div>
              {isHomeSelected ? (
                isHomeCorrect ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                ) : isHomeWrong ? (
                  <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 border border-rose-500/40">
                    <XCircle className="w-4 h-4 text-rose-400" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                )
              ) : (
                <div className="w-6 h-6 rounded-full border border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center transition-colors" />
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
