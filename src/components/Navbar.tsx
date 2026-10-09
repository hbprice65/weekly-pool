"use client";

import React from "react";
import { Trophy, Calendar, ShieldCheck, Activity, User, LogIn } from "lucide-react";

export type NavTab = "picks" | "scoreboard" | "leaderboard" | "rules";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedWeek: number;
  userName?: string;
  userPoints?: number;
  userRank?: number;
  isAuthenticated?: boolean;
  onOpenAuth: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  selectedWeek,
  userName = "GridironGuru",
  userPoints = 58,
  userRank = 2,
  isAuthenticated = false,
  onOpenAuth,
}: NavbarProps) {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black tracking-wider text-xs sm:text-base shrink-0 select-none">
              NFL
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  Weekly Pool
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20 whitespace-nowrap hidden xs:inline-block">
                  2026
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden md:block truncate">
                Pick weekly winners & track live pool scores
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation (4 Tabs) */}
          <nav className="hidden sm:flex items-center space-x-1 md:space-x-1.5 lg:space-x-2">
            {/* 1. Make Picks */}
            <button
              type="button"
              onClick={() => setActiveTab("picks")}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center space-x-1.5 md:space-x-2 ${
                activeTab === "picks"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 shrink-0" />
              <span>Week {selectedWeek} Picks</span>
            </button>

            {/* 2. Weekly Scoreboard (New dedicated page) */}
            <button
              type="button"
              onClick={() => setActiveTab("scoreboard")}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center space-x-1.5 md:space-x-2 ${
                activeTab === "scoreboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 shrink-0" />
              <span>Scoreboard</span>
            </button>

            {/* 3. Season Leaderboard */}
            <button
              type="button"
              onClick={() => setActiveTab("leaderboard")}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center space-x-1.5 md:space-x-2 ${
                activeTab === "leaderboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 shrink-0" />
              <span>Leaderboard</span>
            </button>

            {/* 4. Rules */}
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 text-xs md:text-sm font-medium rounded-lg transition-all flex items-center space-x-1.5 md:space-x-2 ${
                activeTab === "rules"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400 shrink-0" />
              <span>Rules</span>
            </button>
          </nav>

          {/* Participant Profile Pill or Sign In Button */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center space-x-2 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl transition text-left active:scale-95 touch-manipulation group"
              title="Click to manage account or switch user"
            >
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg font-bold flex items-center justify-center text-xs shrink-0 border ${
                  isAuthenticated
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700"
                }`}
              >
                {isAuthenticated ? (
                  <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                ) : (
                  <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400" />
                )}
              </div>
              <div className="text-left">
                <div className="text-[11px] sm:text-xs font-semibold text-white leading-tight max-w-[85px] sm:max-w-[130px] truncate group-hover:text-emerald-300 transition-colors">
                  {isAuthenticated ? userName : "Sign In"}
                </div>
                <div className="text-[9px] sm:text-[10px] text-zinc-400 leading-tight">
                  {isAuthenticated ? (
                    <>
                      <span className="font-medium text-emerald-400">{userPoints} pts</span>
                      <span className="text-zinc-500"> • </span>
                      <span>#{userRank}</span>
                    </>
                  ) : (
                    <span className="text-emerald-400/90 font-medium">Supabase Sync</span>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Tab Segmented Bar (4 Tabs visible on phones < sm, tap-friendly) */}
        <div className="sm:hidden pb-2.5 pt-1">
          <div className="grid grid-cols-4 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-center">
            {/* 1. Picks */}
            <button
              type="button"
              onClick={() => setActiveTab("picks")}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all flex flex-col xs:flex-row items-center justify-center space-y-0.5 xs:space-y-0 xs:space-x-1 ${
                activeTab === "picks"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Picks</span>
            </button>

            {/* 2. Scoreboard */}
            <button
              type="button"
              onClick={() => setActiveTab("scoreboard")}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all flex flex-col xs:flex-row items-center justify-center space-y-0.5 xs:space-y-0 xs:space-x-1 ${
                activeTab === "scoreboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Scores</span>
            </button>

            {/* 3. Leaderboard */}
            <button
              type="button"
              onClick={() => setActiveTab("leaderboard")}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all flex flex-col xs:flex-row items-center justify-center space-y-0.5 xs:space-y-0 xs:space-x-1 ${
                activeTab === "leaderboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Standings</span>
            </button>

            {/* 4. Rules */}
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`py-2 text-[11px] font-semibold rounded-lg transition-all flex flex-col xs:flex-row items-center justify-center space-y-0.5 xs:space-y-0 xs:space-x-1 ${
                activeTab === "rules"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">Rules</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
