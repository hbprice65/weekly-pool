"use client";

import React, { useState, useMemo } from "react";
import {
  PlayoffPlayer,
  PlayoffPosition,
  PlayoffRound,
  PlayoffRosterSlot,
  PlayoffUserLineupMap,
} from "@/types";
import {
  PLAYOFF_PLAYERS,
  PLAYOFF_TEAMS,
  calculateSlotMultiplier,
  isPlayerEliminatedInRound,
} from "@/lib/playoff-data";
import { NFL_TEAMS } from "@/lib/nfl-data";
import {
  X,
  Search,
  Check,
  Zap,
  Flame,
  Trophy,
  AlertTriangle,
  Info,
} from "lucide-react";

interface PlayoffPlayerSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: PlayoffRosterSlot;
  position: PlayoffPosition;
  round: PlayoffRound;
  currentLineup: PlayoffUserLineupMap;
  previousRoundLineup?: PlayoffUserLineupMap;
  onSelectPlayer: (player: PlayoffPlayer) => void;
}

export function PlayoffPlayerSelectorModal({
  isOpen,
  onClose,
  slot,
  position,
  round,
  currentLineup,
  previousRoundLineup,
  onSelectPlayer,
}: PlayoffPlayerSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");

  // Filter players matching position
  const availablePlayers = useMemo(() => {
    return PLAYOFF_PLAYERS.filter((player) => {
      // Must match position
      if (player.position !== position) return false;

      // Filter by team if selected
      if (selectedTeamFilter !== "ALL" && player.teamId !== selectedTeamFilter) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = player.name.toLowerCase().includes(q);
        const matchesTeam =
          player.teamName.toLowerCase().includes(q) ||
          player.teamId.toLowerCase().includes(q);
        if (!matchesName && !matchesTeam) return false;
      }

      return true;
    });
  }, [position, selectedTeamFilter, searchQuery]);

  if (!isOpen) return null;

  // Currently selected player in this slot
  const currentlySelectedPlayerId = currentLineup[slot]?.playerId;

  // Set of all players already selected in OTHER slots in the current round
  const alreadySelectedInOtherSlots = new Set<string>();
  for (const [s, pick] of Object.entries(currentLineup)) {
    if (s !== slot && pick?.playerId) {
      alreadySelectedInOtherSlots.add(pick.playerId);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {position}
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Select {slot} Player
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Choose an active playoff player. Keep players across consecutive rounds for up to 4x points!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Team Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950/30 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
            <input
              type="text"
              placeholder={`Search ${position}s by name or team...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Quick Team Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
            <button
              onClick={() => setSelectedTeamFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 ${
                selectedTeamFilter === "ALL"
                  ? "bg-zinc-100 text-zinc-950 font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              All Teams
            </button>
            {PLAYOFF_TEAMS.map((team) => {
              const teamInfo = NFL_TEAMS[team.teamId];
              const isSelected = selectedTeamFilter === team.teamId;
              return (
                <button
                  key={team.teamId}
                  onClick={() => setSelectedTeamFilter(team.teamId)}
                  className={`px-2 py-1 rounded-lg font-medium transition shrink-0 flex items-center gap-1.5 border ${
                    isSelected
                      ? "bg-emerald-950/80 text-emerald-300 border-emerald-500"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800"
                  }`}
                >
                  <span className="font-bold">{team.teamId}</span>
                  <span className="text-[10px] text-zinc-500">#{team.seed}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 divide-y divide-zinc-800/40">
          {availablePlayers.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <Info className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm">No {position}s found matching your search.</p>
            </div>
          ) : (
            availablePlayers.map((player) => {
              const teamInfo = NFL_TEAMS[player.teamId];
              const isCurrentlyChosen = player.id === currentlySelectedPlayerId;
              const isUsedElsewhere = alreadySelectedInOtherSlots.has(player.id);
              const isEliminated = isPlayerEliminatedInRound(player, round);

              // Projected Multiplier if chosen
              const prospectiveMultiplier = calculateSlotMultiplier(
                player.id,
                round,
                previousRoundLineup
              );

              return (
                <div
                  key={player.id}
                  className={`pt-2 first:pt-0 group flex items-center justify-between p-3 rounded-xl border transition ${
                    isCurrentlyChosen
                      ? "bg-emerald-950/30 border-emerald-500/50"
                      : isUsedElsewhere || isEliminated
                      ? "bg-zinc-950/40 border-zinc-800/50 opacity-60"
                      : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Headshot / Team Icon */}
                    <div className="relative w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {player.headshotUrl ? (
                        <img
                          src={player.headshotUrl}
                          alt={player.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <span className="text-xs font-black text-zinc-400">
                          {player.teamId}
                        </span>
                      )}
                      <span className="absolute bottom-0 right-0 text-[9px] font-bold px-1 rounded-tl bg-zinc-950/90 text-zinc-300 border-t border-l border-zinc-800">
                        #{player.seed}
                      </span>
                    </div>

                    {/* Player Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {player.name}
                        </span>
                        {isCurrentlyChosen && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            Current Pick
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span className="font-semibold text-zinc-300">
                          {player.teamId}
                        </span>
                        <span>•</span>
                        <span>{player.teamName}</span>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {round === 1 && player.isByeRound1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                            <Info className="w-3 h-3" />
                            Wild Card Bye (0 pts in R1, unlocks 2x in R2!)
                          </span>
                        )}

                        {isEliminated && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Eliminated in Round {player.eliminatedInRound}
                          </span>
                        )}

                        {isUsedElsewhere && (
                          <span className="text-[10px] text-zinc-500 italic">
                            Already placed in another slot
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Multiplier & Selection Button */}
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    {/* Multiplier Preview Badge */}
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        Multiplier
                      </div>
                      <div className="flex items-center justify-end gap-1 font-bold text-xs">
                        {prospectiveMultiplier === 4 ? (
                          <span className="text-amber-400 inline-flex items-center gap-0.5">
                            <Trophy className="w-3.5 h-3.5" /> 4x Max
                          </span>
                        ) : prospectiveMultiplier === 3 ? (
                          <span className="text-purple-400 inline-flex items-center gap-0.5">
                            <Zap className="w-3.5 h-3.5" /> 3x Boost
                          </span>
                        ) : prospectiveMultiplier === 2 ? (
                          <span className="text-sky-400 inline-flex items-center gap-0.5">
                            <Flame className="w-3.5 h-3.5" /> 2x Streak
                          </span>
                        ) : (
                          <span className="text-zinc-400">1x Base</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isUsedElsewhere || isEliminated}
                      onClick={() => {
                        onSelectPlayer(player);
                        onClose();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isCurrentlyChosen
                          ? "bg-emerald-500 text-zinc-950 cursor-default"
                          : isUsedElsewhere || isEliminated
                          ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                          : "bg-zinc-800 hover:bg-emerald-500 hover:text-zinc-950 text-white cursor-pointer"
                      }`}
                    >
                      {isCurrentlyChosen ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Selected
                        </>
                      ) : (
                        "Select"
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-500">
          <span>
            {availablePlayers.length} {position}s available for selection
          </span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
