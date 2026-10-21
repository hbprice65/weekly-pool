"use client";

import React, { useState } from "react";
import {
  PlayoffRound,
  PlayoffRosterSlot,
  PlayoffUserLineupMap,
  PLAYOFF_ROSTER_SLOTS,
  PLAYOFF_ROUNDS,
  PlayoffPlayer,
} from "@/types";
import { PlayoffPlayerSelectorModal } from "@/components/PlayoffPlayerSelectorModal";
import {
  calculateSlotMultiplier,
  getPlayerRoundScore,
} from "@/lib/playoff-data";
import { NFL_TEAMS } from "@/lib/nfl-data";
import {
  Zap,
  Flame,
  Trophy,
  Save,
  Check,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";

interface PlayoffLineupCardProps {
  currentRound: PlayoffRound;
  onSelectRound: (round: PlayoffRound) => void;
  lineup: PlayoffUserLineupMap;
  previousRoundLineup?: PlayoffUserLineupMap;
  onUpdateLineup: (updated: PlayoffUserLineupMap) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  saveMessage?: string | null;
}

export function PlayoffLineupCard({
  currentRound,
  onSelectRound,
  lineup,
  previousRoundLineup,
  onUpdateLineup,
  onSave,
  isSaving,
  saveMessage,
}: PlayoffLineupCardProps) {
  // Modal state for player picking
  const [activeSlotModal, setActiveSlotModal] = useState<{
    slot: PlayoffRosterSlot;
    position: (typeof PLAYOFF_ROSTER_SLOTS)[number]["position"];
  } | null>(null);

  // Calculate total points for this round
  const totalRoundPoints = Object.values(lineup).reduce(
    (sum, pick) => sum + (pick?.totalPoints || 0),
    0
  );

  const roundedRoundPoints = Math.round(totalRoundPoints * 10) / 10;

  // Count active multipliers in current lineup
  const multiplierCounts = Object.values(lineup).reduce(
    (acc, pick) => {
      if (pick) {
        acc[pick.multiplier] = (acc[pick.multiplier] || 0) + 1;
      }
      return acc;
    },
    { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>
  );

  const handleSelectPlayerForSlot = (
    slot: PlayoffRosterSlot,
    player: PlayoffPlayer
  ) => {
    const score = getPlayerRoundScore(player.id, currentRound);
    const multiplier = calculateSlotMultiplier(
      player.id,
      currentRound,
      previousRoundLineup
    );

    const updatedLineup: PlayoffUserLineupMap = {
      ...lineup,
      [slot]: {
        slot,
        playerId: player.id,
        playerName: player.name,
        teamId: player.teamId,
        position: player.position,
        multiplier,
        basePoints: score.basePoints,
        totalPoints: Math.round(score.basePoints * multiplier * 10) / 10,
        statsSummary: score.summary,
        isBye: currentRound === 1 && Boolean(player.isByeRound1),
        isEliminated: Boolean(
          player.eliminatedInRound && currentRound > player.eliminatedInRound
        ),
      },
    };

    onUpdateLineup(updatedLineup);
  };

  const currentRoundMeta = PLAYOFF_ROUNDS.find((r) => r.round === currentRound);

  return (
    <div className="space-y-6">
      {/* Playoff Round Navigation Tabs */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-2 sm:p-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {PLAYOFF_ROUNDS.map((r) => {
            const isSelected = r.round === currentRound;
            return (
              <button
                key={r.round}
                type="button"
                onClick={() => onSelectRound(r.round)}
                className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-xl border transition cursor-pointer text-center ${
                  isSelected
                    ? "bg-emerald-950/40 border-emerald-500/60 text-white shadow-lg shadow-emerald-950/20"
                    : "bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/60 text-zinc-400 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold">
                    {r.shortTitle}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                      isSelected
                        ? "bg-emerald-500 text-zinc-950"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {r.multiplierMax}x max
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 mt-0.5">
                  {r.datesText} • {r.gameCount} {r.gameCount === 1 ? "game" : "games"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Round Header & Multipliers Bar */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-white">
              {currentRoundMeta?.title || `Round ${currentRound}`} Lineup
            </h2>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Full PPR
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Keep players on your roster across consecutive rounds to build up to a{" "}
            <span className="text-amber-400 font-bold">4x multiplier</span>.
            Players on first-round byes earn 0 pts in Wild Card but unlock 2x in Divisional!
          </p>

          {/* Multiplier Streak Indicators */}
          <div className="flex items-center gap-2 mt-3 flex-wrap text-xs">
            {multiplierCounts[4] > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold shadow-sm shadow-amber-500/10">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                {multiplierCounts[4]} at 4x Max
              </span>
            )}
            {multiplierCounts[3] > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-300 font-bold shadow-sm shadow-purple-500/10">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                {multiplierCounts[3]} at 3x Boost
              </span>
            )}
            {multiplierCounts[2] > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-300 font-bold shadow-sm shadow-sky-500/10">
                <Flame className="w-3.5 h-3.5 text-sky-400" />
                {multiplierCounts[2]} at 2x Streak
              </span>
            )}
            <span className="text-xs text-zinc-500">
              {multiplierCounts[1]} at 1x Base
            </span>
          </div>
        </div>

        {/* Round Points & Save Actions */}
        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-800">
          <div className="text-left md:text-right">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
              Round {currentRound} Points
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {roundedRoundPoints}{" "}
              <span className="text-xs font-bold text-zinc-400">PTS</span>
            </div>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : saveMessage ? (
              <>
                <Check className="w-4 h-4" /> Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Lineup
              </>
            )}
          </button>
        </div>
      </div>

      {/* 8-Slot Roster Grid */}
      <div className="space-y-3">
        {PLAYOFF_ROSTER_SLOTS.map((slotMeta) => {
          const pick = lineup[slotMeta.slot];
          const hasPlayer = Boolean(pick && pick.playerId);
          const team = pick ? NFL_TEAMS[pick.teamId] : null;

          return (
            <div
              key={slotMeta.slot}
              className={`p-3.5 sm:p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                hasPlayer
                  ? pick?.isEliminated
                    ? "bg-red-950/20 border-red-500/40"
                    : pick?.multiplier === 4
                    ? "bg-amber-950/15 border-amber-500/40"
                    : pick?.multiplier === 3
                    ? "bg-purple-950/15 border-purple-500/30"
                    : pick?.multiplier === 2
                    ? "bg-sky-950/15 border-sky-500/30"
                    : "bg-zinc-900/90 border-zinc-800 hover:border-zinc-700"
                  : "bg-zinc-900/40 border-dashed border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {/* Left: Slot label + Player info */}
              <div className="flex items-center gap-3 min-w-0">
                {/* Position Badge */}
                <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    {slotMeta.slot}
                  </span>
                  <span className="text-xs font-black text-white">
                    {slotMeta.position}
                  </span>
                </div>

                {hasPlayer && pick ? (
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-white truncate">
                        {pick.playerName}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {pick.teamId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                      <span>{slotMeta.label}</span>
                      <span>•</span>
                      <span className="text-zinc-500">
                        {pick.statsSummary || "Projected"}
                      </span>
                    </div>

                    {/* Alerts for Bye or Eliminated */}
                    {pick.isBye && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                        <AlertCircle className="w-3 h-3" />
                        First-Round Bye: 0 pts in Wild Card, qualifies for 2x in Divisional!
                      </div>
                    )}

                    {pick.isEliminated && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/30">
                        <ShieldAlert className="w-3 h-3" />
                        Team Eliminated — Swap out before kickoff to restart at 1x
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-zinc-500 italic">
                      Empty Slot ({slotMeta.label})
                    </span>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Select any eligible {slotMeta.position} from active playoff teams
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Multiplier Badge, Score & Action Button */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                {hasPlayer && pick && (
                  <>
                    {/* Multiplier Badge */}
                    <div className="flex flex-col items-center sm:items-end">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                        Streak
                      </span>
                      <div className="mt-0.5">
                        {pick.multiplier === 4 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/50 font-black text-xs inline-flex items-center gap-1 shadow-sm shadow-amber-500/20">
                            <Trophy className="w-3 h-3 text-amber-400" /> 4x MAX
                          </span>
                        ) : pick.multiplier === 3 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 font-black text-xs inline-flex items-center gap-1">
                            <Zap className="w-3 h-3 text-purple-400" /> 3x Boost
                          </span>
                        ) : pick.multiplier === 2 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 font-black text-xs inline-flex items-center gap-1">
                            <Flame className="w-3 h-3 text-sky-400" /> 2x Streak
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-bold text-xs">
                            1x Base
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Points Calculation */}
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                        Round Points
                      </div>
                      <div className="text-sm sm:text-base font-black text-white">
                        {pick.totalPoints}{" "}
                        <span className="text-[10px] font-bold text-zinc-500">
                          ({pick.basePoints} × {pick.multiplier}x)
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Change / Select Button */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveSlotModal({
                      slot: slotMeta.slot,
                      position: slotMeta.position,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    hasPlayer
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                      : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/10"
                  }`}
                >
                  {hasPlayer ? "Swap" : "Pick Player"}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Player Selector Modal */}
      {activeSlotModal && (
        <PlayoffPlayerSelectorModal
          isOpen={Boolean(activeSlotModal)}
          onClose={() => setActiveSlotModal(null)}
          slot={activeSlotModal.slot}
          position={activeSlotModal.position}
          round={currentRound}
          currentLineup={lineup}
          previousRoundLineup={previousRoundLineup}
          onSelectPlayer={(player) =>
            handleSelectPlayerForSlot(activeSlotModal.slot, player)
          }
        />
      )}
    </div>
  );
}
