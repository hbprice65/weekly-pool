"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Clock, Award, ShieldAlert } from "lucide-react";

export function RulesCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Award className="w-5 h-5 text-emerald-400" />
          <span>NFL Weekly Pool Rules & Scoring</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Official competition guidelines for weekly matchup selection and season standings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scoring */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>1. Scoring Format (Straight Up)</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Select the outright winner for each regular season NFL matchup. Each correct pick earns <strong>1 point</strong> toward your weekly and overall season total.
          </p>
        </div>

        {/* Deadlines */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>2. Kickoff Pick Locks</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Each individual game locks automatically at official kickoff time. You can edit your picks for upcoming games right up until kickoff.
          </p>
        </div>

        {/* Tiebreaker */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-purple-400" />
            <span>3. Monday Night Football Tiebreaker</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            In the event of a tie for top weekly points, the participant whose predicted Monday Night Football combined total score is closest to the actual game total wins the tiebreaker. To prevent tactical copying, all tiebreaker predictions remain private and hidden from other pool members until the MNF game officially kicks off.
          </p>
        </div>

        {/* Fair Play */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-sky-400" />
            <span>4. Transparency & Security</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Picks remain private until each game kicks off. Once a game begins, all participant picks for that matchup become visible to everyone in the pool via Supabase Row-Level Security.
          </p>
        </div>
      </div>
    </div>
  );
}

