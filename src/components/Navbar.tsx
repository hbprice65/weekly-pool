"use client";

import React from "react";
import { Trophy, Calendar, Database, ShieldCheck } from "lucide-react";

interface NavbarProps {
  activeTab: "picks" | "leaderboard" | "rules";
  setActiveTab: (tab: "picks" | "leaderboard" | "rules") => void;
  isSupabaseConfigured: boolean;
  selectedWeek: number;
}

export function Navbar({
  activeTab,
  setActiveTab,
  isSupabaseConfigured,
  selectedWeek,
}: NavbarProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black tracking-wider">
              NFL
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-white">
                  Weekly Picks Pool
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  2026 Season
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Select winners each week & compete on the leaderboard
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab("picks")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "picks"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Week {selectedWeek} Picks</span>
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "leaderboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => setActiveTab("rules")}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium rounded-lg transition-all flex items-center space-x-2 ${
                activeTab === "rules"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Rules</span>
            </button>
          </nav>

          {/* Database / Environment Status */}
          <div className="hidden md:flex items-center space-x-3">
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isSupabaseConfigured
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/80"
                  : "bg-amber-950/40 text-amber-300 border-amber-800/60"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                {isSupabaseConfigured ? "Supabase Connected" : "Local Demo Mode"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
