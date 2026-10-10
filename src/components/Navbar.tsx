"use client";

import React from "react";
import {
  Trophy,
  Calendar,
  ShieldCheck,
  Activity,
  User,
  LogIn,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

export type NavTab = "picks" | "scoreboard" | "leaderboard" | "rules";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedWeek: number;
  onSelectWeek?: (week: number) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  userName?: string;
  userAvatar?: string;
  userPoints?: number;
  userRank?: number;
  isAuthenticated?: boolean;
  onOpenAuth: () => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  selectedWeek,
  onSelectWeek,
  onRefresh,
  isRefreshing = false,
  userName = "GridironGuru",
  userAvatar,
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
              <p className="text-[11px] text-zinc-400 hidden lg:block truncate">
                Pick weekly winners & track live pool scores
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation (4 Tabs) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {/* 1. Make Picks */}
            <button
              type="button"
              onClick={() => setActiveTab("picks")}
              className={`px-2.5 py-1.5 lg:px-3 lg:py-2 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "picks"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Week {selectedWeek} Picks</span>
            </button>

            {/* 2. Weekly Scoreboard */}
            <button
              type="button"
              onClick={() => setActiveTab("scoreboard")}
              className={`px-2.5 py-1.5 lg:px-3 lg:py-2 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "scoreboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Scoreboard</span>
            </button>

            {/* 3. Season Leaderboard */}
            <button
              type="button"
              onClick={() => setActiveTab("leaderboard")}
              className={`px-2.5 py-1.5 lg:px-3 lg:py-2 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "leaderboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Leaderboard</span>
            </button>

            {/* 4. Rules */}
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`px-2.5 py-1.5 lg:px-3 lg:py-2 text-xs font-medium rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "rules"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Rules</span>
            </button>
          </nav>

          {/* Right Action Cluster: Week Stepper + Refresh + Auth */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Week Stepper / Dropdown */}
            {onSelectWeek && (
              <div className="flex items-center space-x-0.5 bg-zinc-900/90 border border-zinc-800 rounded-lg sm:rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => onSelectWeek(Math.max(1, selectedWeek - 1))}
                  disabled={selectedWeek <= 1}
                  className="p-1 sm:p-1.5 rounded-md text-zinc-400 hover:text-white disabled:opacity-25 transition"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <select
                  value={selectedWeek}
                  onChange={(e) => onSelectWeek(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer py-1 px-1 sm:px-1.5 border-none"
                  aria-label="Select NFL Week"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w} className="bg-zinc-900 text-white font-sans">
                      Wk {w}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onSelectWeek(Math.min(18, selectedWeek + 1))}
                  disabled={selectedWeek >= 18}
                  className="p-1 sm:p-1.5 rounded-md text-zinc-400 hover:text-white disabled:opacity-25 transition"
                  title="Next Week"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Live Refresh Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh schedule & live scores"
                className="p-2 sm:px-2.5 sm:py-2 bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 rounded-lg sm:rounded-xl transition text-zinc-300 hover:text-white active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-emerald-400 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
              </button>
            )}

            {/* User Profile Pill */}
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center space-x-2 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl transition text-left active:scale-95 touch-manipulation group"
              title="Click to manage account or switch user"
            >
              {userAvatar && isAuthenticated ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg object-cover border border-emerald-500/40 shrink-0"
                />
              ) : (
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
              )}
              <div className="text-left hidden xs:block">
                <div className="text-[11px] sm:text-xs font-semibold text-white leading-tight max-w-[80px] sm:max-w-[120px] truncate group-hover:text-emerald-300 transition-colors">
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
                    <span className="text-emerald-400/90 font-medium">Sync</span>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Tab Segmented Bar */}
        <div className="md:hidden pb-2.5 pt-1">
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
              <span className="truncate">Wk {selectedWeek}</span>
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
