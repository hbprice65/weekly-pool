"use client";

import React from "react";
import { Trophy, Calendar, ShieldCheck, User } from "lucide-react";

interface NavbarProps {
  activeTab: "picks" | "leaderboard" | "rules";
  setActiveTab: (tab: "picks" | "leaderboard" | "rules") => void;
  selectedWeek: number;
  userName?: string;
  userPoints?: number;
  userRank?: number;
}

export function Navbar({
  activeTab,
  setActiveTab,
  selectedWeek,
  userName = "GridironGuru",
  userPoints = 58,
  userRank = 2,
}: NavbarProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black tracking-wider text-base">
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
                Pick weekly winners & climb the standings
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

          {/* Participant Profile Pill */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl shadow-inner">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight">
                  {userName}
                </div>
                <div className="text-[10px] text-zinc-400 leading-tight">
                  {userPoints} pts • #{userRank} in Pool
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
