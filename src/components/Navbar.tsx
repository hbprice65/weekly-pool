"use client";

import React from "react";
import Link from "next/link";
import {
  Check,
  Podium,
  Ruler,
  User,
  LogIn,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Crown,
  UserPlus,
} from "lucide-react";
import { SevenSegmentIcon } from "@/components/SevenSegmentIcon";

export type NavTab = "picks" | "scoreboard" | "leaderboard" | "rules" | "invite";

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
  isLeader?: boolean;
  poolName?: string;
  poolCode?: string;
  onSwitchPool?: () => void;
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
  isLeader = false,
  poolName = "2026 NFL Weekly Pick'em",
  poolCode,
  onSwitchPool,
}: NavbarProps) {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Brand Logo & Active Pool Indicator */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0 min-w-0">
            <Link
              href="/account"
              title="Switch Pool on Account Page"
              className="flex items-center space-x-2.5 text-left group cursor-pointer focus:outline-none min-w-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black tracking-wider text-xs sm:text-sm shrink-0 select-none group-hover:scale-105 transition-transform">
                NFL
              </div>
              <div className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs hover:bg-emerald-500/15 transition min-w-0">
                <span className="text-zinc-400 shrink-0">Active Pool:</span>
                <span className="font-bold text-emerald-400 truncate max-w-[110px] sm:max-w-[190px]">
                  {poolName}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop & Tablet Navigation (5 Tabs) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {/* 1. Picks */}
            <button
              type="button"
              onClick={() => setActiveTab("picks")}
              className={`px-3 py-1.5 lg:px-3.5 lg:py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "picks"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2.5} />
              <span>Picks</span>
            </button>

            {/* 2. Scoreboard */}
            <button
              type="button"
              onClick={() => setActiveTab("scoreboard")}
              className={`px-3 py-1.5 lg:px-3.5 lg:py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "scoreboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <SevenSegmentIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Scoreboard</span>
            </button>

            {/* 3. Standings */}
            <button
              type="button"
              onClick={() => setActiveTab("leaderboard")}
              className={`px-3 py-1.5 lg:px-3.5 lg:py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "leaderboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Podium className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Standings</span>
            </button>

            {/* 4. Rules */}
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`px-3 py-1.5 lg:px-3.5 lg:py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "rules"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Rules</span>
            </button>

            {/* 5. Invite */}
            <button
              type="button"
              onClick={() => setActiveTab("invite")}
              className={`px-3 py-1.5 lg:px-3.5 lg:py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === "invite"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Invite</span>
            </button>
          </nav>

          {/* Right Action Cluster: Week Stepper + Refresh + Auth */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Week Stepper / Dropdown: only applicable for week-specific tabs (Picks & Scoreboard) */}
            {onSelectWeek && (activeTab === "picks" || activeTab === "scoreboard") && (
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

            {/* Admin Tools Navigation Link */}
            {isLeader && (
              <Link
                href="/admin"
                title="Admin Tools"
                className="flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 rounded-lg sm:rounded-xl text-amber-300 font-bold text-xs transition active:scale-95"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Admin Tools</span>
              </Link>
            )}

            {/* Account & My Pools Navigation Link */}
            <Link
              href="/account"
              className="flex items-center space-x-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl transition-all active:scale-95 touch-manipulation group text-left shrink-0 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 min-w-[90px] sm:min-w-[125px]"
              title="Account & My Pools — Switch between pools where you are a member"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg object-cover border border-emerald-500/40 shrink-0"
                />
              ) : (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg font-bold flex items-center justify-center text-xs shrink-0 border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="text-left min-w-0">
                <div className="text-[11px] sm:text-xs font-bold text-white leading-tight max-w-[75px] sm:max-w-[115px] truncate group-hover:text-emerald-300 transition-colors">
                  {userName}
                </div>
                <div className="text-[9px] sm:text-[10px] text-zinc-400 leading-tight flex items-center space-x-1">
                  <span className="font-semibold text-emerald-400">{userPoints} pts</span>
                  <span>(#{userRank})</span>
                </div>
              </div>
            </Link>

            {/* Sign In Button (shown when playing as Guest) */}
            {!isAuthenticated && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold border border-emerald-400 shadow-md shadow-emerald-500/20 transition-all active:scale-95 shrink-0 cursor-pointer"
                title="Sign in to save and sync your picks"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                <span className="text-xs font-black text-zinc-950 hidden sm:inline">
                  Sign In
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Segmented Bar */}
        <div className="md:hidden pb-2.5 pt-1">
          <div className="grid grid-cols-5 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-center">
            {/* 1. Picks */}
            <button
              type="button"
              onClick={() => setActiveTab("picks")}
              className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 ${
                activeTab === "picks"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2.5} />
              <span className="truncate">Picks</span>
            </button>

            {/* 2. Scoreboard */}
            <button
              type="button"
              onClick={() => setActiveTab("scoreboard")}
              className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 ${
                activeTab === "scoreboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <SevenSegmentIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Scores</span>
            </button>

            {/* 3. Standings */}
            <button
              type="button"
              onClick={() => setActiveTab("leaderboard")}
              className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 ${
                activeTab === "leaderboard"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Podium className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Ranks</span>
            </button>

            {/* 4. Rules */}
            <button
              type="button"
              onClick={() => setActiveTab("rules")}
              className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 ${
                activeTab === "rules"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">Rules</span>
            </button>

            {/* 5. Invite */}
            <button
              type="button"
              onClick={() => setActiveTab("invite")}
              className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 ${
                activeTab === "invite"
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="truncate">Invite</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
