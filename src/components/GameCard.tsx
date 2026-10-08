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
    timeZoneName: "short",
  });

  const isAwaySelected = selectedTeamId === game.awayTeam.id;
  const isHomeSelected = selectedTeamId === game.homeTeam.id;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm hover:border-zinc-700 transition-all">
      {/* Game Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 text-xs text-zinc-400">
        <div className="flex items-center space-x-2">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>
            {formattedDate} • {formattedTime}
          </span>
          {game.isMondayNight && (
            <span className="bg-purple-950 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
              MNF • Tiebreaker
            </span>
          )}
        </div>
        {game.tvNetwork && (
          <div className="flex items-center space-x-1.5 font-medium text-zinc-300">
            <Tv className="w-3.5 h-3.5 text-zinc-400" />
            <span>{game.tvNetwork}</span>
          </div>
        )}
      </div>

      {/* Matchup Team Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Away Team Option */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectPick(game.id, game.awayTeam.id)}
          className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all text-left group ${
            isAwaySelected
              ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/20"
              : "bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-600"
          } ${isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
        >
          <div className="flex items-center space-x-3">
            {/* Color accent chip */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow"
              style={{ backgroundColor: game.awayTeam.primaryColor }}
            >
              {game.awayTeam.id}
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {game.awayTeam.fullName}
              </div>
              <div className="text-xs text-zinc-400">
                Away
                {game.spread && game.spread > 0 && (
                  <span className="ml-1.5 text-zinc-300 font-mono">
                    +{game.spread}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAwaySelected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <div className="w-5 h-5 rounded-full border border-zinc-600 group-hover:border-zinc-400" />
            )}
          </div>
        </button>

        {/* Home Team Option */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => onSelectPick(game.id, game.homeTeam.id)}
          className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all text-left group ${
            isHomeSelected
              ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/20"
              : "bg-zinc-800/60 border-zinc-700/60 hover:bg-zinc-800 hover:border-zinc-600"
          } ${isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
        >
          <div className="flex items-center space-x-3">
            {/* Color accent chip */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow"
              style={{ backgroundColor: game.homeTeam.primaryColor }}
            >
              {game.homeTeam.id}
            </div>
            <div>
              <div className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {game.homeTeam.fullName}
              </div>
              <div className="text-xs text-zinc-400">
                Home
                {game.spread && game.spread < 0 && (
                  <span className="ml-1.5 text-zinc-300 font-mono">
                    {game.spread}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isHomeSelected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <div className="w-5 h-5 rounded-full border border-zinc-600 group-hover:border-zinc-400" />
            )}
          </div>
        </button>
      </div>
    </div>
  );
}
