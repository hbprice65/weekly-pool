"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { GameCard } from "@/components/GameCard";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { RulesCard } from "@/components/RulesCard";
import { MOCK_WEEK, MOCK_LEADERBOARD, MOCK_USER } from "@/lib/mock-data";
import { CheckCircle2, Save, Calendar, Clock, Trophy, Minus, Plus } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"picks" | "leaderboard" | "rules">("picks");
  const [userPicks, setUserPicks] = useState<Record<string, string>>({});
  const [mnfPrediction, setMnfPrediction] = useState<string>("47");
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Load saved picks from localStorage if available
  useEffect(() => {
    queueMicrotask(() => {
      const saved = localStorage.getItem("nfl_weekly_picks_week_6");
      if (saved) {
        try {
          setUserPicks(JSON.parse(saved));
        } catch {
          // Fallback to default
        }
      } else {
        // Default initial picks for demonstration
        setUserPicks({
          g1: "SF",
          g3: "BAL",
          g4: "HOU",
          g7: "DET",
        });
      }

      const savedMnf = localStorage.getItem("nfl_weekly_mnf_week_6");
      if (savedMnf) {
        setMnfPrediction(savedMnf);
      }
    });
  }, []);

  const handleSelectPick = (gameId: string, teamId: string) => {
    setUserPicks((prev) => {
      const updated = { ...prev, [gameId]: teamId };
      return updated;
    });
    setIsSaved(false);
  };

  const handleSavePicks = () => {
    localStorage.setItem("nfl_weekly_picks_week_6", JSON.stringify(userPicks));
    localStorage.setItem("nfl_weekly_mnf_week_6", mnfPrediction);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 4000);
  };

  const handleStepMnf = (delta: number) => {
    const current = parseInt(mnfPrediction, 10) || 45;
    const nextVal = Math.max(0, Math.min(120, current + delta));
    setMnfPrediction(String(nextVal));
    setIsSaved(false);
  };

  const totalGames = MOCK_WEEK.games.length;
  const pickedCount = Object.keys(userPicks).length;
  const allPicksMade = pickedCount === totalGames;
  const progressPercent = Math.round((pickedCount / totalGames) * 100);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedWeek={MOCK_WEEK.weekNumber}
        userName={MOCK_USER.displayName}
        userPoints={MOCK_USER.totalPoints}
        userRank={MOCK_USER.seasonRank}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 sm:pb-12">
        {/* Pool Summary Stats Bar - 2 cols on mobile, 4 on tablet/desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-zinc-900/90 border border-zinc-800/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-3.5 shadow-sm">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-zinc-400 truncate">Matchups</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                {MOCK_WEEK.title}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-3.5 shadow-sm">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-zinc-400 truncate">Picks Made</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                {pickedCount} / {totalGames}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-3.5 shadow-sm">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-zinc-400 truncate">Your Standing</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                #{MOCK_USER.seasonRank} in Pool
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-3.5 shadow-sm">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-zinc-400 truncate">Lock Time</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                Thu 8:15 PM ET
              </div>
            </div>
          </div>
        </div>

        {/* Tab 1: Picks View */}
        {activeTab === "picks" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Desktop / Tablet Top Action Bar */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Week {MOCK_WEEK.weekNumber} Matchups
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
                    {pickedCount}/{totalGames} selected
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tap any team to select the winner. Changes can be saved anytime before kickoff.
                </p>
              </div>

              {/* Desktop Save Button */}
              <div className="hidden sm:flex items-center space-x-3">
                {isSaved && (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1 font-semibold animate-pulse">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Picks Saved!</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSavePicks}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center space-x-2 active:scale-95 touch-manipulation ${
                    allPicksMade
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20"
                      : "bg-zinc-100 hover:bg-white text-zinc-950"
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {allPicksMade ? "Submit All Picks" : "Save Current Picks"}
                  </span>
                </button>
              </div>
            </div>

            {/* Games Matchup List */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {MOCK_WEEK.games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  selectedTeamId={userPicks[game.id]}
                  onSelectPick={handleSelectPick}
                />
              ))}
            </div>

            {/* Tiebreaker Section (Monday Night Football Total Score) */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block shrink-0" />
                    <span>Monday Night Football Tiebreaker</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Predict total combined points in <strong>Buffalo Bills vs New York Jets</strong>.
                  </p>
                </div>
              </div>

              {/* Touch Stepper + Input */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <span className="text-xs font-medium text-zinc-300">
                  Predicted Total Points:
                </span>
                <div className="flex items-center space-x-1.5 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => handleStepMnf(-1)}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition active:scale-90"
                    aria-label="Decrease score prediction"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    id="mnf-prediction"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="120"
                    value={mnfPrediction}
                    onChange={(e) => {
                      setMnfPrediction(e.target.value);
                      setIsSaved(false);
                    }}
                    className="w-16 text-center py-1 bg-transparent text-sm font-bold text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepMnf(1)}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition active:scale-90"
                    aria-label="Increase score prediction"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSavePicks}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-2 rounded-xl border border-zinc-700 transition active:scale-95 font-medium"
                >
                  Save Tiebreaker
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Leaderboard View */}
        {activeTab === "leaderboard" && (
          <LeaderboardTable
            entries={MOCK_LEADERBOARD}
            currentUserId={MOCK_USER.id}
          />
        )}

        {/* Tab 3: Rules View */}
        {activeTab === "rules" && <RulesCard />}
      </main>

      {/* MOBILE FLOATING ACTION BAR: Stays pinned within thumb reach on phones (< sm) */}
      {activeTab === "picks" && (
        <div className="sm:hidden fixed bottom-3 left-3 right-3 z-30 bg-zinc-900/95 border border-zinc-700/80 backdrop-blur-lg p-3 rounded-2xl shadow-2xl shadow-black/80 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-bold text-white">
                {pickedCount} of {totalGames} Picks
              </span>
              {allPicksMade && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold">
                  Complete
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="w-28 xs:w-36 bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSavePicks}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center space-x-1.5 active:scale-95 touch-manipulation shrink-0 ${
              isSaved
                ? "bg-emerald-600 text-white"
                : allPicksMade
                ? "bg-emerald-400 text-zinc-950 shadow-emerald-400/20"
                : "bg-white text-zinc-950"
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{allPicksMade ? "Submit" : "Save"}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Clean Sports App Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="text-zinc-400 font-medium">
            © 2026 NFL Weekly Picks Pool • All game times displayed in US/Eastern
          </p>
          <p className="text-[11px] text-zinc-400">
            Compete weekly with league members • Live standings & straight-up pick&apos;em scoring
          </p>
        </div>
      </footer>
    </div>
  );
}
