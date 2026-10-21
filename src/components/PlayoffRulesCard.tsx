"use client";

import React from "react";
import {
  Trophy,
  Flame,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
} from "lucide-react";

export function PlayoffRulesCard() {
  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Rules & Strategy
          </span>
          <span className="text-xs font-bold text-zinc-500">•</span>
          <span className="text-xs text-zinc-400">Full PPR Scoring</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white">
          NFL Playoff Fantasy Challenge Rules
        </h2>

        <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
          The NFL Playoff Challenge tests your ability to predict both individual player performance and team postseason longevity. Pick an 8-player roster each week and earn consecutive-week multipliers up to <strong className="text-amber-400">4x</strong>!
        </p>
      </div>

      {/* Roster & Multipliers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Roster Requirements */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>8-Player Roster Requirements</span>
          </div>

          <p className="text-xs text-zinc-400">
            Every round, your starting lineup consists of exactly eight players:
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
              <span className="font-bold text-white">1 Quarterback</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">QB</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
              <span className="font-bold text-white">2 Running Backs</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">RB</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
              <span className="font-bold text-white">2 Wide Receivers</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">WR</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
              <span className="font-bold text-white">1 Tight End</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">TE</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
              <span className="font-bold text-white">1 Kicker</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">K</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
              <span className="font-bold text-white">1 Team Defense / ST</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">DEF</span>
            </div>
          </div>
        </div>

        {/* Multiplier Mechanic */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Consecutive Week Multipliers</span>
          </div>

          <p className="text-xs text-zinc-400">
            Points earned each round are multiplied based on how many consecutive weeks that player has been in your lineup:
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white">1st Consecutive Week</span>
                <p className="text-[11px] text-zinc-500">Player newly added to your lineup</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold">1x Points</span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-sky-500/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-sky-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-sky-400" /> 2nd Consecutive Week
                </span>
                <p className="text-[11px] text-zinc-500">Kept consecutively from previous round</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40">2x Points</span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-purple-500/30 flex items-center justify-between">
              <div>
                <span className="font-bold text-purple-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400" /> 3rd Consecutive Week
                </span>
                <p className="text-[11px] text-zinc-500">Kept consecutively through 3 rounds</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">3x Points</span>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-amber-500/40 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> 4th Consecutive Week (Super Bowl)
                </span>
                <p className="text-[11px] text-zinc-500">Held from Wild Card all the way to Super Bowl!</p>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black border border-amber-500/50">4x MAXIMUM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Special Strategic Rules */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400" />
          <span>Strategic Rules & Edge Cases</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400">
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <span>Wild Card Bye-Week Gambit</span>
            </h4>
            <p>
              The #1 seeds in the AFC and NFC have first-round byes. You <strong className="text-zinc-200">CAN</strong> select their players in Round 1. They score 0 points during Wild Card weekend, but start the Divisional Round at a <strong className="text-sky-300">2x multiplier</strong>, Conference Championship at <strong className="text-purple-300">3x</strong>, and the Super Bowl at <strong className="text-amber-300">4x</strong>!
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <span>Eliminations & Substitutions</span>
            </h4>
            <p>
              When an NFL team loses, their players are eliminated from the playoffs. You must swap them out before the next round begins. Any newly added replacement player starts at a fresh <strong className="text-zinc-200">1x multiplier</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <span>Position Flexibility</span>
            </h4>
            <p>
              Multipliers are tied to the <strong className="text-zinc-200">player</strong>, not the specific slot. For example, moving a Running Back between RB1 and RB2 maintains their consecutive streak.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <span>Full PPR Fantasy Scoring</span>
            </h4>
            <p>
              Scoring includes 1.0 point per reception, 1 pt per 25 passing yards, 4 pts per passing TD, 1 pt per 10 rushing/receiving yards, 6 pts per rush/rec TD, and standard kicking and defense scoring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
