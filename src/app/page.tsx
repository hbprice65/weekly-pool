"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { GameCard } from "@/components/GameCard";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { RulesCard } from "@/components/RulesCard";
import { MOCK_WEEK, MOCK_LEADERBOARD, MOCK_USER } from "@/lib/mock-data";
import { CheckCircle2, Save, Calendar, Clock, Trophy } from "lucide-react";

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

  const totalGames = MOCK_WEEK.games.length;
  const pickedCount = Object.keys(userPicks).length;
  const allPicksMade = pickedCount === totalGames;

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Pool Summary Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Current Matchups</div>
              <div className="text-base sm:text-lg font-bold text-white">
                {MOCK_WEEK.title}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Picks Completed</div>
              <div className="text-base sm:text-lg font-bold text-white">
                {pickedCount} / {totalGames}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Your Standing</div>
              <div className="text-base sm:text-lg font-bold text-white">
                #{MOCK_USER.seasonRank} in Pool
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center space-x-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Lock Deadline</div>
              <div className="text-base sm:text-lg font-bold text-white">
                Thu 8:15 PM ET
              </div>
            </div>
          </div>
        </div>

        {/* Tab 1: Picks View */}
        {activeTab === "picks" && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Week {MOCK_WEEK.weekNumber} Matchups & Selections
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Click a team to lock in your pick for each game.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {isSaved && (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1 font-semibold animate-pulse">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Picks Saved!</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSavePicks}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md flex items-center space-x-2 ${
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

            {/* Games List */}
            <div className="grid grid-cols-1 gap-3.5">
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
                    <span>Monday Night Football Tiebreaker</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Predict the combined total points scored in Buffalo Bills vs New York Jets.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <label htmlFor="mnf-prediction" className="text-xs font-medium text-zinc-300">
                  Predicted Total Points:
                </label>
                <input
                  id="mnf-prediction"
                  type="number"
                  min="0"
                  max="120"
                  value={mnfPrediction}
                  onChange={(e) => {
                    setMnfPrediction(e.target.value);
                    setIsSaved(false);
                  }}
                  className="w-24 px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSavePicks}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-700 transition"
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

      {/* Clean Sports App Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-6 mt-12 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="text-zinc-400 font-medium">
            © 2026 NFL Weekly Picks Pool • All game times displayed in US/Eastern
          </p>
          <p>
            Compete weekly with league members • Live standings & straight-up pick&apos;em scoring
          </p>
        </div>
      </footer>
    </div>
  );
}
