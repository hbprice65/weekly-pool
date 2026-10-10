"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar, NavTab } from "@/components/Navbar";
import { GameCard } from "@/components/GameCard";
import { WeeklyScoreboard } from "@/components/WeeklyScoreboard";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { RulesCard } from "@/components/RulesCard";
import { AuthModal } from "@/components/AuthModal";
import { createClient } from "@/lib/supabase/client";
import { MOCK_WEEK, MOCK_LEADERBOARD, MOCK_USER } from "@/lib/mock-data";
import {
  getCurrentUser,
  fetchUserPicksFromSupabase,
  saveUserPicksToSupabase,
  fetchLiveLeaderboard,
  fetchWeekGames,
} from "@/lib/supabase/picks-service";
import { fetchCurrentActiveNFLWeek } from "@/lib/api/nfl";
import { Game, LeaderboardEntry } from "@/types";
import {
  CheckCircle2,
  Save,
  Calendar,
  Trophy,
  Minus,
  Plus,
  CloudCheck,
  AlertCircle,
  Loader2,
  LogIn,
  Activity,
  RefreshCw,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("picks");
  const [selectedWeek, setSelectedWeek] = useState<number>(5);

  const [userPicks, setUserPicks] = useState<Record<string, string>>({});
  const [mnfPrediction, setMnfPrediction] = useState<string>("45");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [, setLastUpdated] = useState<string>("Just now");
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  // Authentication & Supabase state
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
    provider?: string;
  } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);
  const [weekGames, setWeekGames] = useState<Game[]>(MOCK_WEEK.games);

  // 1. Listen to Supabase Auth state changes (Google OAuth callbacks, logout, session refresh)
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const user = session.user;
        const metadata = user.user_metadata || {};
        const name =
          metadata.full_name ||
          metadata.name ||
          user.email?.split("@")[0] ||
          "Player";
        const avatarUrl = metadata.avatar_url || metadata.picture;
        const provider =
          user.app_metadata?.provider ||
          user.identities?.[0]?.provider ||
          "email";

        setCurrentUser({
          id: user.id,
          email: user.email,
          name,
          avatarUrl,
          provider,
        });

        // Background sync to public.profiles so Google users show on the leaderboard
        try {
          await supabase.from("profiles").upsert(
            {
              id: user.id,
              display_name: name,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        } catch {
          // Ignore if handled by trigger or policies
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Check for OAuth callback errors in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auth_error")) {
        queueMicrotask(() => {
          setIsAuthOpen(true);
        });
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("auth_error");
        window.history.replaceState(null, "", cleanUrl.toString());
      }
    }
  }, []);

  // 3. Sync tab with URL hash if present
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.replace("#", "");
        if (["picks", "scoreboard", "leaderboard", "rules"].includes(hash)) {
          setActiveTab(hash as NavTab);
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    queueMicrotask(() => {
      handleHashChange();
    });
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // 4. Detect live active NFL week on initial mount if not specified in URL
  useEffect(() => {
    let isMounted = true;
    fetchCurrentActiveNFLWeek().then(({ currentWeek }) => {
      if (isMounted && currentWeek) {
        setSelectedWeek((prev) => {
          if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            if (params.get("week")) return prev;
          }
          return currentWeek;
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tab}`);
    }
  };

  // Load schedule, live scores, user session, and live leaderboard for selected week
  const loadWeekData = useCallback(
    async (weekNum: number = selectedWeek, forceFresh: boolean = false) => {
      if (forceFresh) setIsRefreshing(true);

      // 1. Fetch live schedule and scores for the specified week
      const games = await fetchWeekGames(weekNum, 2026, forceFresh);
      if (games && games.length > 0) {
        setWeekGames(games);
      }

      // 2. Fetch live pool leaderboard with winner outcomes
      const liveBoard = await fetchLiveLeaderboard(weekNum, games);
      if (liveBoard && liveBoard.length > 0) {
        setLeaderboardEntries(liveBoard);
      }

      // 3. Fetch authenticated user & saved picks for this specific week
      const user = await getCurrentUser();
      if (user) {
        const metadata = user.user_metadata || {};
        const name =
          metadata.full_name ||
          metadata.name ||
          user.email?.split("@")[0] ||
          "Player";
        const avatarUrl = metadata.avatar_url || metadata.picture;
        const provider =
          user.app_metadata?.provider ||
          user.identities?.[0]?.provider ||
          "email";

        setCurrentUser({
          id: user.id,
          email: user.email,
          name,
          avatarUrl,
          provider,
        });

        const { picks, mnfScore } = await fetchUserPicksFromSupabase(user.id, weekNum);
        if (Object.keys(picks).length > 0) {
          setUserPicks(picks);
        } else {
          const local = localStorage.getItem(`nfl_picks_${user.id}_week_${weekNum}`);
          if (local) {
            try {
              setUserPicks(JSON.parse(local));
            } catch {
              setUserPicks({});
            }
          } else {
            setUserPicks({});
          }
        }

        if (mnfScore) {
          setMnfPrediction(mnfScore);
        } else {
          setMnfPrediction("45");
        }
      } else {
        setCurrentUser(null);
        // Fallback: load demo/guest picks from localStorage
        const saved = localStorage.getItem(`nfl_weekly_picks_week_${weekNum}`);
        if (saved) {
          try {
            setUserPicks(JSON.parse(saved));
          } catch {
            setUserPicks({});
          }
        } else {
          setUserPicks({});
        }

        const savedMnf = localStorage.getItem(`nfl_weekly_mnf_week_${weekNum}`);
        if (savedMnf) {
          setMnfPrediction(savedMnf);
        } else {
          setMnfPrediction("45");
        }
      }

      setLastUpdated(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      );
      if (forceFresh) setIsRefreshing(false);
    },
    [selectedWeek]
  );

  useEffect(() => {
    queueMicrotask(() => {
      loadWeekData(selectedWeek, false);
    });
  }, [loadWeekData, selectedWeek]);

  const handleSelectWeek = (newWeek: number) => {
    setSelectedWeek(newWeek);
    loadWeekData(newWeek, false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("week", String(newWeek));
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleRefresh = () => {
    loadWeekData(selectedWeek, true);
  };

  const handleSelectPick = (gameId: string, teamId: string) => {
    setUserPicks((prev) => {
      const updated = { ...prev, [gameId]: teamId };
      return updated;
    });
    setSaveStatus(null);
  };

  const handleSavePicks = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    // Save to browser cache for resilience
    const storageKey = currentUser
      ? `nfl_picks_${currentUser.id}_week_${selectedWeek}`
      : `nfl_weekly_picks_week_${selectedWeek}`;
    localStorage.setItem(storageKey, JSON.stringify(userPicks));
    localStorage.setItem(`nfl_weekly_mnf_week_${selectedWeek}`, mnfPrediction);

    // If user is authenticated with Supabase, persist to database
    if (currentUser) {
      const res = await saveUserPicksToSupabase(
        currentUser.id,
        userPicks,
        mnfPrediction,
        selectedWeek,
        weekGames
      );

      if (res.success) {
        setSaveStatus({
          type: "success",
          message: `Week ${selectedWeek} picks saved to Supabase for ${currentUser.name || currentUser.email || "user"}!`,
        });
        const updatedBoard = await fetchLiveLeaderboard(selectedWeek, weekGames);
        if (updatedBoard && updatedBoard.length > 0) {
          setLeaderboardEntries(updatedBoard);
        }
      } else {
        setSaveStatus({
          type: "error",
          message: `Saved locally. Database sync notice: ${res.error || "Check database games"}.`,
        });
      }
    } else {
      setSaveStatus({
        type: "info",
        message: `Week ${selectedWeek} picks saved locally! Sign in to sync across devices.`,
      });
    }

    setIsSaving(false);

    // Keep error visible longer (10s) so user has time to read troubleshooting steps
    setTimeout(() => {
      setSaveStatus(null);
    }, 10000);
  };

  const handleStepMnf = (delta: number) => {
    const current = parseInt(mnfPrediction, 10) || 45;
    const nextVal = Math.max(0, Math.min(120, current + delta));
    setMnfPrediction(String(nextVal));
    setSaveStatus(null);
  };

  const totalGames = weekGames.length;
  const pickedCount = Object.keys(userPicks).length;
  const allPicksMade = totalGames > 0 && pickedCount === totalGames;
  const progressPercent =
    totalGames > 0 ? Math.round((pickedCount / totalGames) * 100) : 0;

  const myEntry = currentUser
    ? leaderboardEntries.find((e) => e.userId === currentUser.id)
    : null;
  const myRank = myEntry ? myEntry.rank : (currentUser ? 1 : MOCK_USER.seasonRank);
  const myWeeklyRank = myEntry?.weeklyRank ?? (currentUser ? 1 : MOCK_USER.weeklyRank ?? 1);
  const myPoints = myEntry ? myEntry.totalPoints : (currentUser ? 0 : MOCK_USER.totalPoints);
  const myWeeklyPoints = myEntry ? myEntry.weeklyPoints : 0;

  const displayName =
    currentUser?.name ||
    (currentUser?.email ? currentUser.email.split("@")[0] : MOCK_USER.displayName);

  // Identify Monday Night Football tiebreaker game dynamically
  const mnfGame =
    weekGames.find((g) => g.isMondayNight) ||
    weekGames[weekGames.length - 1];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Navigation Bar with Week Stepper & Live Sync */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        selectedWeek={selectedWeek}
        onSelectWeek={handleSelectWeek}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        userName={displayName}
        userAvatar={currentUser?.avatarUrl}
        userPoints={currentUser ? myPoints : MOCK_USER.totalPoints}
        userRank={currentUser ? myRank : MOCK_USER.seasonRank}
        isAuthenticated={!!currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 sm:pb-12">
        {/* Supabase User Cloud Status Banner */}
        {currentUser ? (
          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center space-x-2">
              <CloudCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Connected to Supabase as{" "}
                <strong>{currentUser.name || currentUser.email}</strong> • Week{" "}
                {selectedWeek} picks auto-synced
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="text-[11px] text-emerald-400 hover:text-emerald-200 underline font-medium"
            >
              Manage Account
            </button>
          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-zinc-300">
            <div className="flex items-center space-x-2">
              <LogIn className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Playing in guest mode. <strong>Sign in</strong> to sync and verify your Week {selectedWeek} picks in Supabase!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-2.5 py-1 rounded-lg border border-zinc-700 transition"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Pool Summary Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Slate Details */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-3.5 shadow-sm">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-zinc-400 truncate">Current Slate</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                Week {selectedWeek} ({totalGames} Games)
              </div>
            </div>
          </div>

          {/* Card 2: Picks Made */}
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

          {/* Card 3: Week Standing */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-3.5 shadow-sm">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-zinc-400 truncate">Week {selectedWeek} Standing</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                #{myWeeklyRank} • {myWeeklyPoints} pts
              </div>
            </div>
          </div>

          {/* Card 4: Season Standing */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center space-x-2.5 sm:space-x-3.5 shadow-sm">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-zinc-400 truncate">Season Standing</div>
              <div className="text-sm sm:text-lg font-bold text-white truncate">
                #{myRank} • {myPoints} pts
              </div>
            </div>
          </div>
        </div>

        {/* Tab 1: Picks View */}
        {activeTab === "picks" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Top Action Bar */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Week {selectedWeek} Matchups
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
                    {pickedCount}/{totalGames} selected
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Official NFL schedule • Select outright winners before each game kicks off.
                </p>
              </div>

              {/* Desktop Save Button & Feedback */}
              <div className="hidden sm:flex items-center space-x-3">
                {saveStatus && (
                  <span
                    className={`text-xs flex items-center space-x-1.5 font-semibold ${
                      saveStatus.type === "success"
                        ? "text-emerald-400"
                        : saveStatus.type === "error"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}
                  >
                    {saveStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{saveStatus.message}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-3 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-emerald-400 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
                  />
                  <span>Sync Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePicks}
                  disabled={isSaving}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center space-x-2 active:scale-95 touch-manipulation ${
                    allPicksMade
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20"
                      : "bg-zinc-100 hover:bg-white text-zinc-950"
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {isSaving
                      ? "Saving..."
                      : allPicksMade
                      ? "Submit All Picks"
                      : "Save Current Picks"}
                  </span>
                </button>
              </div>
            </div>

            {/* Notification Toast for Mobile View */}
            {saveStatus && (
              <div
                className={`sm:hidden p-3 rounded-xl text-xs flex items-center space-x-2 border shadow-md ${
                  saveStatus.type === "success"
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                    : saveStatus.type === "error"
                    ? "bg-rose-950/60 text-rose-300 border-rose-800"
                    : "bg-amber-950/60 text-amber-300 border-amber-800"
                }`}
              >
                {saveStatus.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{saveStatus.message}</span>
              </div>
            )}

            {/* Games Matchup List */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {weekGames.map((game) => (
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
                    Predict total combined points in{" "}
                    <strong>
                      {mnfGame
                        ? `${mnfGame.awayTeam.fullName} vs ${mnfGame.homeTeam.fullName}`
                        : "the final weekly matchup"}
                    </strong>
                    . Predictions remain locked and hidden from other players until kickoff.
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
                      setSaveStatus(null);
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
                  disabled={isSaving}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-2 rounded-xl border border-zinc-700 transition active:scale-95 font-medium"
                >
                  Save Tiebreaker
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dedicated Weekly Scoreboard */}
        {activeTab === "scoreboard" && (
          <WeeklyScoreboard
            games={weekGames}
            entries={leaderboardEntries}
            currentUserId={currentUser?.id}
            selectedWeek={selectedWeek}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        )}

        {/* Tab 3: Dedicated Season Leaderboard */}
        {activeTab === "leaderboard" && (
          <LeaderboardTable
            entries={leaderboardEntries}
            currentUserId={currentUser?.id}
            onNavigateToScoreboard={() => handleTabChange("scoreboard")}
          />
        )}

        {/* Tab 4: Rules View */}
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
            disabled={isSaving}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center space-x-1.5 active:scale-95 touch-manipulation shrink-0 ${
              saveStatus?.type === "success"
                ? "bg-emerald-600 text-white"
                : allPicksMade
                ? "bg-emerald-400 text-zinc-950 shadow-emerald-400/20"
                : "bg-white text-zinc-950"
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
            ) : saveStatus?.type === "success" ? (
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onAuthStateChanged={() => loadWeekData(selectedWeek, false)}
      />

      {/* Sports App Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="text-zinc-400 font-medium">
            © 2026 NFL Weekly Picks Pool • All game times displayed in US/Eastern
          </p>
          <p className="text-[11px] text-zinc-400">
            Official NFL schedule & scores • Straight-up pick&apos;em scoring & Monday Night Football tiebreakers
          </p>
        </div>
      </footer>
    </div>
  );
}
