"use client";

import React from "react";
import { Game } from "@/types";
import { CheckCircle2, Clock, Tv } from "lucide-react";

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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm hover:border-zinc-700/80 transition-all">
      {/* Game Header Bar - Responsive wrap */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 sm:pb-3 mb-3 border-b border-zinc-800 text-[11px] sm:text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="flex items-center space-x-1 font-medium text-zinc-300">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400 shrink-0" />
            <span>
              {formattedDate} • {formattedTime}
            </span>
          </span>
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

      {/* Matchup Team Selection Grid: 1 col on mobile portrait, 2 cols on tablet/desktop/landscape */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Away Team Option */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectPick(game.id, game.awayTeam.id)}
          className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all text-left min-h-[64px] active:scale-[0.99] touch-manipulation group ${
            isAwaySelected
              ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/30"
              : "bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700"
          } ${isLocked ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
        >
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
            {/* Color Accent Chip */}
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-extrabold text-xs sm:text-sm text-white shadow shrink-0"
              style={{ backgroundColor: game.awayTeam.primaryColor }}
            >
              {game.awayTeam.id}
            </div>

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                {game.awayTeam.fullName}
              </div>
              <div className="text-[10px] sm:text-xs text-zinc-400 flex items-center space-x-1">
                <span>Away</span>
                {game.spread && game.spread > 0 && (
                  <span className="text-zinc-300 font-mono font-medium">
                    (+{game.spread})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 pl-1">
            {isAwaySelected ? (
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center transition-colors" />
            )}
          </div>
        </button>

        {/* Home Team Option */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectPick(game.id, game.homeTeam.id)}
          className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all text-left min-h-[64px] active:scale-[0.99] touch-manipulation group ${
            isHomeSelected
              ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/30"
              : "bg-zinc-800/40 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700"
          } ${isLocked ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
        >
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
            {/* Color Accent Chip */}
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-extrabold text-xs sm:text-sm text-white shadow shrink-0"
              style={{ backgroundColor: game.homeTeam.primaryColor }}
            >
              {game.homeTeam.id}
            </div>

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                {game.homeTeam.fullName}
              </div>
              <div className="text-[10px] sm:text-xs text-zinc-400 flex items-center space-x-1">
                <span>Home</span>
                {game.spread && game.spread < 0 && (
                  <span className="text-zinc-300 font-mono font-medium">
                    ({game.spread})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 pl-1">
            {isHomeSelected ? (
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full border border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center transition-colors" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
