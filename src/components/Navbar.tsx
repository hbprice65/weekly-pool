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
import { getPoolAbbreviation } from "@/lib/utils";

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
  isPlayoff?: boolean;
}

/**
 * Site branding football icon (clean SVG with no text).
 */
export function SiteLogoIcon({
  className = "w-4 h-4 sm:w-4.5 sm:h-4.5",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M15.34 2.14A15 15 0 0 0 2.14 15.34c-.36 2.94 0 4.92.8 5.72.8.8 2.78 1.16 5.72.8A15 15 0 0 0 21.86 8.66c.36-2.94 0-4.92-.8-5.72-.8-.8-2.78-1.16-5.72-.8z" />
      <line x1="7" y1="17" x2="17" y2="7" />
      <line x1="10" y1="10" x2="14" y2="14" />
      <line x1="13" y1="7" x2="17" y2="11" />
      <line x1="7" y1="13" x2="11" y2="17" />
    </svg>
  );
}

export function Navbar({
  activeTab,
  setActiveTab,
  selectedWeek,
  onSelectWeek,
  onRefresh,
  isRefreshing = false,
  userName = "Player",
  userAvatar,
  userPoints = 0,
  userRank = 0,
  isAuthenticated = false,
  onOpenAuth,
  isLeader = false,
  poolName = "2026 NFL Weekly Pick'em",
  poolCode: _poolCode,
  onSwitchPool: _onSwitchPool,
  isPlayoff = false,
}: NavbarProps) {
  const poolAbbr = getPoolAbbreviation(poolName);

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-40 transition-colors shadow-sm">
      {/* ========================================================= */}
      {/* 1. PRIMARY TOP NAVIGATION BAR                             */}
      {/* ========================================================= */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-13 sm:h-14 gap-2">
          {/* Top Left: Site Branding Icon & Compact Active Pool Indicator */}
          <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0 min-w-0">
            {/* Site Branding Icon: links to Home / Landing */}
            <Link
              href="/"
              title="Home"
              aria-label="Home"
              className="group flex items-center justify-center shrink-0 focus:outline-none"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white shrink-0 select-none group-hover:scale-105 group-hover:shadow-emerald-500/35 transition-all">
                <SiteLogoIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
              </div>
            </Link>

            {/* Active Pool Indicator: compact badge with abbreviation */}
            <Link
              href="/account"
              title={`Active Pool: ${poolName} — Click to switch or manage pools`}
              aria-label={`Active Pool: ${poolName}`}
              className="flex items-center space-x-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 transition-all shrink-0 group focus:outline-none"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[10px] uppercase font-semibold text-emerald-500/80 hidden md:inline">
                Pool:
              </span>
              <span className="font-bold text-xs tracking-tight text-emerald-300 group-hover:text-emerald-200">
                {poolAbbr}
              </span>
            </Link>
          </div>

          {/* Right Action Cluster: Refresh + Account Profile + Guest Sign In */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Quick Live Refresh Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh schedule & live scores"
                className="p-1.5 sm:p-2 bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 rounded-lg sm:rounded-xl transition text-zinc-300 hover:text-white active:scale-95 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-emerald-400 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
              </button>
            )}

            {/* Account Profile (when authenticated) or Sign In Button (when Guest) */}
            {isAuthenticated ? (
              <Link
                href="/account"
                className="flex items-center space-x-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl transition-all active:scale-95 touch-manipulation group text-left shrink-0 bg-zinc-900/90 hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 min-w-[85px] sm:min-w-[115px]"
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
                  <div className="text-[11px] sm:text-xs font-bold text-white leading-tight max-w-[70px] sm:max-w-[105px] truncate group-hover:text-emerald-300 transition-colors">
                    {userName}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-zinc-400 leading-tight flex items-center space-x-1">
                    <span className="font-semibold text-emerald-400">{userPoints} pts</span>
                    {userRank > 0 && <span>(#{userRank})</span>}
                  </div>
                </div>
              </Link>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold border border-emerald-400 shadow-md shadow-emerald-500/20 transition-all active:scale-95 shrink-0 cursor-pointer text-xs"
                title="Sign in to save and sync your picks"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SECONDARY SUB-NAV BAR (Tabs + Week Select + Admin)     */}
      {/* ========================================================= */}
      <div className="border-t border-zinc-800/70 bg-zinc-950/70">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          {/* Tablet & Desktop Single Row (sm: and above) */}
          <div className="hidden sm:flex items-center justify-between h-11 gap-3">
            {/* The 5 Navigation Tabs */}
            <nav className="flex items-center space-x-1 lg:space-x-1.5">
              {/* 1. Picks */}
              <button
                type="button"
                onClick={() => setActiveTab("picks")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === "picks"
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2.5} />
                <span>Picks</span>
              </button>

              {/* 2. Scoreboard / Scores */}
              <button
                type="button"
                onClick={() => setActiveTab("scoreboard")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === "scoreboard"
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <SevenSegmentIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Scores</span>
              </button>

              {/* 3. Standings */}
              <button
                type="button"
                onClick={() => setActiveTab("leaderboard")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === "invite"
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>Invite</span>
              </button>
            </nav>

            {/* Right Controls: Week Stepper & Admin Tools */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* Week Stepper Dropdown */}
              {onSelectWeek && (
                <div className="flex items-center space-x-0.5 bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => onSelectWeek(Math.max(1, selectedWeek - 1))}
                    disabled={selectedWeek <= 1}
                    className="p-1 rounded-md text-zinc-400 hover:text-white disabled:opacity-25 transition cursor-pointer"
                    title={isPlayoff ? "Previous Playoff Round" : "Previous Week"}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <select
                    value={selectedWeek}
                    onChange={(e) => onSelectWeek(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer py-0.5 px-1 sm:px-1.5 border-none"
                    aria-label={isPlayoff ? "Select Playoff Round" : "Select NFL Week"}
                  >
                    {isPlayoff ? (
                      <>
                        <option value={1} className="bg-zinc-900 text-white font-sans">
                          Wild Card
                        </option>
                        <option value={2} className="bg-zinc-900 text-white font-sans">
                          Divisional
                        </option>
                        <option value={3} className="bg-zinc-900 text-white font-sans">
                          Conf Finals
                        </option>
                        <option value={4} className="bg-zinc-900 text-white font-sans">
                          Super Bowl
                        </option>
                      </>
                    ) : (
                      Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w} className="bg-zinc-900 text-white font-sans">
                          Wk {w}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => onSelectWeek(Math.min(isPlayoff ? 4 : 18, selectedWeek + 1))}
                    disabled={selectedWeek >= (isPlayoff ? 4 : 18)}
                    className="p-1 rounded-md text-zinc-400 hover:text-white disabled:opacity-25 transition cursor-pointer"
                    title={isPlayoff ? "Next Playoff Round" : "Next Week"}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Admin Tools Navigation Link */}
              {isLeader && (
                <Link
                  href="/admin"
                  title="Admin Tools"
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 rounded-lg text-amber-300 font-bold text-xs transition active:scale-95"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Admin Tools</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Layout (< sm): 2 Clean Rows */}
          <div className="sm:hidden py-1.5 space-y-1.5">
            {/* Row 1: The 5 Navigation Tabs in a Segmented Grid */}
            <div className="grid grid-cols-5 gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800 text-center">
              {/* 1. Picks */}
              <button
                type="button"
                onClick={() => setActiveTab("picks")}
                className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                  activeTab === "picks"
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2.5} />
                <span className="truncate">Picks</span>
              </button>

              {/* 2. Scores */}
              <button
                type="button"
                onClick={() => setActiveTab("scoreboard")}
                className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
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
                className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                  activeTab === "leaderboard"
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Podium className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Standings</span>
              </button>

              {/* 4. Rules */}
              <button
                type="button"
                onClick={() => setActiveTab("rules")}
                className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
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
                className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all flex flex-col items-center justify-center space-y-0.5 cursor-pointer ${
                  activeTab === "invite"
                    ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/80"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="truncate">Invite</span>
              </button>
            </div>

            {/* Row 2: Week Selection Stepper & Admin Tools Link */}
            <div className="flex items-center justify-between px-0.5 gap-2">
              {/* Week Stepper Dropdown */}
              {onSelectWeek && (
                <div className="flex items-center space-x-0.5 bg-zinc-900/90 border border-zinc-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => onSelectWeek(Math.max(1, selectedWeek - 1))}
                    disabled={selectedWeek <= 1}
                    className="p-1 rounded-md text-zinc-400 hover:text-white disabled:opacity-25 transition cursor-pointer"
                    title={isPlayoff ? "Previous Playoff Round" : "Previous Week"}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <select
                    value={selectedWeek}
                    onChange={(e) => onSelectWeek(Number(e.target.value))}
                    className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer py-0.5 px-1 border-none"
                    aria-label={isPlayoff ? "Select Playoff Round" : "Select NFL Week"}
                  >
                    {isPlayoff ? (
                      <>
                        <option value={1} className="bg-zinc-900 text-white font-sans">
                          Wild Card
                        </option>
                        <option value={2} className="bg-zinc-900 text-white font-sans">
                          Divisional
                        </option>
                        <option value={3} className="bg-zinc-900 text-white font-sans">
                          Conf Finals
                        </option>
                        <option value={4} className="bg-zinc-900 text-white font-sans">
                          Super Bowl
                        </option>
                      </>
                    ) : (
                      Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w} className="bg-zinc-900 text-white font-sans">
                          Wk {w}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => onSelectWeek(Math.min(isPlayoff ? 4 : 18, selectedWeek + 1))}
                    disabled={selectedWeek >= (isPlayoff ? 4 : 18)}
                    className="p-1 rounded-md text-zinc-400 hover:text-white disabled:opacity-25 transition cursor-pointer"
                    title={isPlayoff ? "Next Playoff Round" : "Next Week"}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Admin Tools Navigation Link (shown if pool leader) */}
              {isLeader && (
                <Link
                  href="/admin"
                  title="Admin Tools"
                  className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 font-bold text-xs transition active:scale-95"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Admin Tools</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
