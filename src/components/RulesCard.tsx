"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Clock, Ruler, ShieldAlert } from "lucide-react";

export function RulesCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Ruler className="w-5 h-5 text-sky-400" />
          <span>Pool Rules</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scoring */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>1. Scoring Format (Straight Up)</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Select outright winners for each regular season matchup. Each correct pick earns <strong>1 point</strong>.
          </p>
        </div>

        {/* Deadlines */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>2. Kickoff Locks</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Each matchup locks automatically at its scheduled kickoff time. Picks for future weeks unlock once that week begins.
          </p>
        </div>

        {/* Tiebreaker */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-purple-400" />
            <span>3. Monday Night Football Tiebreaker</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            For weekly point ties, the participant whose predicted Monday Night Football combined total score is closest to actual wins.
          </p>
        </div>

        {/* Fair Play */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4 space-y-2">
          <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-sky-400" />
            <span>4. Pick Visibility</span>
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Picks remain private until each game kicks off, after which all selections become visible on the scoreboard.
          </p>
        </div>
      </div>
    </div>
  );
}

