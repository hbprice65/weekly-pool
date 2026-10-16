"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Navbar, NavTab } from "@/components/Navbar";
import { GameCard } from "@/components/GameCard";
import { WeeklyScoreboard } from "@/components/WeeklyScoreboard";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { RulesCard } from "@/components/RulesCard";
import { InviteMemberCard } from "@/components/InviteMemberCard";
import { AuthModal } from "@/components/AuthModal";
import { LandingPage } from "@/components/LandingPage";
import { createClient } from "@/lib/supabase/client";
import { MOCK_WEEK, MOCK_LEADERBOARD, MOCK_USER, MOCK_POOLS, MOCK_POOL_OVERRIDES } from "@/lib/mock-data";
import {
  getCurrentUser,
  fetchUserPicksFromSupabase,
  saveUserPicksToSupabase,
  fetchLiveLeaderboard,
  fetchSeasonStandings,
  fetchWeekGames,
  checkIsPoolLeader,
  getActivePoolId,
  setActivePoolId,
  fetchPoolDetails,
  joinPoolByCodeOrSlug,
  getSavedActivePool,
  setSavedActivePool,
  getDummyPoolUserPicksForWeek,
} from "@/lib/supabase/picks-service";
import { fetchCurrentActiveNFLWeek, calculateFallbackWeek } from "@/lib/api/nfl";
import { Game, LeaderboardEntry, Pool, DEFAULT_POOL_ID } from "@/types";
import {
  Check,
  CheckCircle2,
  Save,
  Minus,
  Plus,
  AlertCircle,
  Loader2,
  Lock,
  UserPlus,
  X,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>("picks");
  const [selectedWeek, setSelectedWeek] = useState<number>(MOCK_WEEK.weekNumber);
  const [currentActiveWeek, setCurrentActiveWeek] = useState<number>(MOCK_WEEK.weekNumber);

  // Active Pool & Landing Page state
  const [activePoolId, setActivePoolIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("pool") || getActivePoolId();
    }
    return DEFAULT_POOL_ID;
  });
  const [activePool, setActivePool] = useState<Pool>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("pool") || getActivePoolId();
      return MOCK_POOLS.find((p) => p.id === id) || MOCK_POOLS[0];
    }
    return MOCK_POOLS[0];
  });
  const [showLanding, setShowLanding] = useState<boolean>(false);

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
  const [standingsEntries, setStandingsEntries] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);
  const [scoreboardEntries, setScoreboardEntries] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);
  const [weekGames, setWeekGames] = useState<Game[]>(MOCK_WEEK.games);

  // Pool Leader privilege flag
  const [isPoolLeader, setIsPoolLeader] = useState<boolean>(true);
  const [inviteBanner, setInviteBanner] = useState<{
    poolSlug: string;
    inviter?: string;
    recipient?: string;
  } | null>(null);

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

        checkIsPoolLeader(user.id, getActivePoolId()).then(setIsPoolLeader).catch(() => {});

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
        checkIsPoolLeader(undefined, getActivePoolId()).then(setIsPoolLeader).catch(() => {});
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Check for OAuth callback errors, incoming invite params, and saved active pool
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

      const poolParam = params.get("pool");
      const hash = window.location.hash.replace("#", "");
      const resolvedPoolId = poolParam || getActivePoolId();

      queueMicrotask(() => {
        if (poolParam) {
          setActivePoolId(poolParam);
        }
        setActivePoolIdState(resolvedPoolId);
        const matched = MOCK_POOLS.find((p) => p.id === resolvedPoolId);
        if (matched) {
          setActivePool(matched);
        }
        if (hash === "home" || params.get("view") === "landing") {
          setShowLanding(true);
        } else {
          setShowLanding(false);
        }
      });

      // Check if user followed an invite link (e.g. ?join=nfl-2026-weekly)
      const joinParam = params.get("join");
      if (joinParam) {
        queueMicrotask(() => {
          setInviteBanner({
            poolSlug: joinParam,
            inviter: params.get("invited_by") || undefined,
            recipient: params.get("recipient") || undefined,
          });
        });
        joinPoolByCodeOrSlug(joinParam).then((res) => {
          if (res.success && res.pool) {
            setActivePoolId(res.pool.id);
            setActivePoolIdState(res.pool.id);
            setActivePool(res.pool);
          }
        });
      }
    }
  }, []);

  // Listen to pool-changed events
  useEffect(() => {
    const handlePoolChanged = () => {
      const nextPoolId = getActivePoolId();
      setActivePoolIdState(nextPoolId);
      const matched = MOCK_POOLS.find((p) => p.id === nextPoolId);
      if (matched) {
        setActivePool(matched);
      }
    };
    window.addEventListener("pool-changed", handlePoolChanged);
    return () => window.removeEventListener("pool-changed", handlePoolChanged);
  }, []);

  // Load active pool metadata whenever activePoolId changes
  useEffect(() => {
    let cancelled = false;
    fetchPoolDetails(activePoolId).then((details) => {
      if (!cancelled && details) {
        setActivePool(details);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activePoolId]);

  // 3. Sync tab with URL hash if present
  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== "undefined") {
        const hash = window.location.hash.replace("#", "");
        if (hash === "home") {
          setShowLanding(true);
        } else if (["picks", "scoreboard", "leaderboard", "standings", "rules", "invite"].includes(hash)) {
          setActiveTab(hash === "standings" ? "leaderboard" : (hash as NavTab));
          setShowLanding(false);
        }
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    queueMicrotask(() => {
      handleHashChange();
    });
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // 4. Detect live active NFL week on initial mount
  useEffect(() => {
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) return;
      const fallback = calculateFallbackWeek();
      setCurrentActiveWeek(fallback);

      let hasUrlParam = false;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const weekParam = params.get("week");
        if (weekParam) {
          const parsed = parseInt(weekParam, 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 22) {
            hasUrlParam = true;
            setSelectedWeek(parsed);
          }
        }
      }

      if (!hasUrlParam) {
        setSelectedWeek(fallback);
      }
    });

    fetchCurrentActiveNFLWeek().then(({ currentWeek }) => {
      if (isMounted && currentWeek) {
        setCurrentActiveWeek(currentWeek);
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
    setShowLanding(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tab}`);
    }
  };

  const handleSelectPool = (pool: Pool) => {
    setActivePool(pool);
    setActivePoolId(pool.id);
    setActivePoolIdState(pool.id);
    setSavedActivePool(pool);
    setShowLanding(false);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      url.hash = activeTab;
      window.history.replaceState(null, "", url.toString());
    }
  };

  const handleSwitchPool = () => {
    setShowLanding(true);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "#home");
    }
  };

  // Load season-long standings across the whole season for the active pool
  const loadSeasonStandings = useCallback(async () => {
    try {
      const seasonBoard = await fetchSeasonStandings(false, activePoolId);
      if (seasonBoard && seasonBoard.length > 0) {
        setStandingsEntries(seasonBoard);
      }
    } catch (err) {
      console.warn("Could not load season standings:", err);
    }
  }, [activePoolId]);

  // Load schedule, live scores, user session, and weekly scoreboard for selected week and active pool
  const loadWeekData = useCallback(
    async (weekNum: number = selectedWeek, forceFresh: boolean = false) => {
      if (forceFresh) setIsRefreshing(true);

      // 1. Fetch live schedule and scores for the specified week
      const games = await fetchWeekGames(weekNum, 2026, forceFresh);
      if (games && games.length > 0) {
        setWeekGames(games);
      }

      // 2. Fetch weekly scoreboard entries for this specific week and pool
      const weeklyBoard = await fetchLiveLeaderboard(weekNum, games, false, activePoolId);
      if (weeklyBoard && weeklyBoard.length > 0) {
        setScoreboardEntries(weeklyBoard);
      }

      // 3. Fetch authenticated user & saved picks for this specific week and pool
      const user = await getCurrentUser();
      const poolKeySuffix = activePoolId === DEFAULT_POOL_ID ? "" : `_${activePoolId}`;

      if (user) {
        const metadata = user.user_metadata || {};
        const savedLocalName =
          typeof window !== "undefined"
            ? localStorage.getItem(`profile_display_name_${user.id}`)
            : null;
        const name =
          savedLocalName ||
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

        const isLeader = await checkIsPoolLeader(user.id, activePoolId);
        setIsPoolLeader(isLeader);

        const { picks, mnfScore } = await fetchUserPicksFromSupabase(
          user.id,
          weekNum,
          games,
          activePoolId
        );
        if (Object.keys(picks).length > 0) {
          setUserPicks(picks);
        } else {
          const local =
            localStorage.getItem(`nfl_picks_${user.id}${poolKeySuffix}_week_${weekNum}`) ||
            (activePoolId === DEFAULT_POOL_ID
              ? localStorage.getItem(`nfl_picks_${user.id}_week_${weekNum}`)
              : null);
          if (local) {
            try {
              const parsed = JSON.parse(local);
              const allowedIds = new Set(games.map((g) => g.id));
              const filtered: Record<string, string> = {};
              for (const [gid, team] of Object.entries(parsed)) {
                if (allowedIds.has(gid)) filtered[gid] = team as string;
              }
              setUserPicks(filtered);
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
        const isLeader = await checkIsPoolLeader(undefined, activePoolId);
        setIsPoolLeader(isLeader);

        let initialPicks: Record<string, string> = {};
        let initialMnf = "45";

        // Load dummy pool random picks for Weeks 1-5 if available
        if (activePoolId !== DEFAULT_POOL_ID && MOCK_POOL_OVERRIDES[activePoolId]) {
          const dummy = getDummyPoolUserPicksForWeek(activePoolId, "user-demo-01", weekNum, games);
          initialPicks = dummy.picks;
          if (dummy.mnfScore) initialMnf = dummy.mnfScore;
        }

        // Fallback: load demo/guest picks from localStorage scoped to active pool
        const saved =
          localStorage.getItem(`nfl_weekly_picks${poolKeySuffix}_week_${weekNum}`) ||
          (activePoolId === DEFAULT_POOL_ID
            ? localStorage.getItem(`nfl_weekly_picks_week_${weekNum}`)
            : null);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const allowedIds = new Set(games.map((g) => g.id));
            const filtered: Record<string, string> = {};
            for (const [gid, team] of Object.entries(parsed)) {
              if (allowedIds.has(gid)) filtered[gid] = team as string;
            }
            initialPicks = filtered;
          } catch {}
        }

        setUserPicks(initialPicks);

        const savedMnf =
          localStorage.getItem(`nfl_weekly_mnf${poolKeySuffix}_week_${weekNum}`) ||
          (activePoolId === DEFAULT_POOL_ID
            ? localStorage.getItem(`nfl_weekly_mnf_week_${weekNum}`)
            : null);
        if (savedMnf) {
          setMnfPrediction(savedMnf);
        } else {
          setMnfPrediction(initialMnf);
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
    [selectedWeek, activePoolId]
  );

  useEffect(() => {
    queueMicrotask(() => {
      loadSeasonStandings();
    });
  }, [loadSeasonStandings]);

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
    loadSeasonStandings();
  };

  const isFutureWeek = selectedWeek > currentActiveWeek;

  const handleSelectPick = (gameId: string, teamId: string) => {
    if (isFutureWeek) return;
    setUserPicks((prev) => {
      const updated = { ...prev, [gameId]: teamId };
      return updated;
    });
    setSaveStatus(null);
  };

  const handleSavePicks = async () => {
    if (isFutureWeek) {
      setSaveStatus({
        type: "info",
        message: `Picks for Week ${selectedWeek} are locked until this week officially begins.`,
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    // Strictly isolate picks for games belonging to this specific week's slate
    const slateGameIds = new Set(weekGames.map((g) => g.id));
    const currentSlatePicks: Record<string, string> = {};
    for (const [gid, team] of Object.entries(userPicks)) {
      if (slateGameIds.has(gid)) {
        currentSlatePicks[gid] = team;
      }
    }

    // Save to browser cache for resilience (scoped to active pool)
    const poolKeySuffix = activePoolId === DEFAULT_POOL_ID ? "" : `_${activePoolId}`;
    const storageKey = currentUser
      ? `nfl_picks_${currentUser.id}${poolKeySuffix}_week_${selectedWeek}`
      : `nfl_weekly_picks${poolKeySuffix}_week_${selectedWeek}`;
    localStorage.setItem(storageKey, JSON.stringify(currentSlatePicks));
    localStorage.setItem(`nfl_weekly_mnf${poolKeySuffix}_week_${selectedWeek}`, mnfPrediction);

    // If user is authenticated with Supabase, persist to database
    if (currentUser) {
      const res = await saveUserPicksToSupabase(
        currentUser.id,
        currentSlatePicks,
        mnfPrediction,
        selectedWeek,
        weekGames,
        activePoolId
      );

      if (res.success) {
        setSaveStatus({
          type: "success",
          message: "Picks saved.",
        });
        const updatedBoard = await fetchLiveLeaderboard(selectedWeek, weekGames, false, activePoolId);
        if (updatedBoard && updatedBoard.length > 0) {
          setScoreboardEntries(updatedBoard);
        }
        loadSeasonStandings();
      } else {
        setSaveStatus({
          type: "error",
          message: `Saved locally. Cloud sync: ${res.error || "unavailable"}.`,
        });
      }
    } else {
      setSaveStatus({
        type: "info",
        message: "Picks saved in browser. Sign in to join the leaderboard.",
      });
    }

    setIsSaving(false);

    setTimeout(() => {
      setSaveStatus(null);
    }, 4000);
  };

  const handleStepMnf = (delta: number) => {
    if (isFutureWeek) return;
    const current = parseInt(mnfPrediction, 10) || 45;
    const nextVal = Math.max(0, Math.min(120, current + delta));
    setMnfPrediction(String(nextVal));
    setSaveStatus(null);
  };

  const totalGames = weekGames.length;
  // Strictly count picks made on the games in the current active slate
  const pickedCount = weekGames.filter((g) => Boolean(userPicks[g.id])).length;
  const allPicksMade = totalGames > 0 && pickedCount === totalGames;
  const progressPercent =
    totalGames > 0 ? Math.round((pickedCount / totalGames) * 100) : 0;

  const myEntry = standingsEntries.find(
    (e) => e.userId === (currentUser?.id || "user-demo-01")
  );
  const myRank = myEntry ? myEntry.rank : (currentUser ? 1 : MOCK_USER.seasonRank);
  const myPoints = myEntry ? myEntry.totalPoints : (currentUser ? 0 : MOCK_USER.totalPoints);

  const displayName =
    currentUser?.name ||
    (currentUser?.email ? currentUser.email.split("@")[0] : MOCK_USER.displayName);

  // Identify Monday Night Football tiebreaker game dynamically
  const mnfGame =
    weekGames.find((g) => g.isMondayNight) ||
    weekGames[weekGames.length - 1];

  // Show Home / Landing Page for new users or when switching pools
  if (showLanding) {
    return (
      <>
        <LandingPage
          currentUser={currentUser}
          activePool={activePool}
          incomingInvite={inviteBanner}
          currentActiveWeek={currentActiveWeek}
          onSelectPool={handleSelectPool}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          currentUser={currentUser}
          onAuthStateChanged={() => loadWeekData(selectedWeek, false)}
        />
      </>
    );
  }

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
        userPoints={myPoints}
        userRank={myRank}
        isAuthenticated={!!currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        isLeader={isPoolLeader}
        poolName={activePool?.name || "2026 NFL Weekly Pick'em"}
        poolCode={activePool?.joinCode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-24 sm:pb-12">
        {/* Incoming Pool Invite Welcome Banner */}
        {inviteBanner && (
          <div className="bg-gradient-to-r from-emerald-950/70 via-zinc-900 to-teal-950/70 border border-emerald-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {inviteBanner.recipient ? `Welcome ${inviteBanner.recipient}! ` : "You've been invited! "}
                    Join the 2026 NFL Weekly Pick&apos;em
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap hidden sm:inline-block">
                    Free Entry
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5">
                  {inviteBanner.inviter ? (
                    <>
                      Invited by <strong className="text-emerald-400 font-semibold">{inviteBanner.inviter}</strong>. Make your weekly picks and compete for 1st place!
                    </>
                  ) : (
                    "Make your weekly picks and compete with other pool members on the live scoreboard!"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
              {!currentUser && (
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Join Pool
                </button>
              )}
              <button
                type="button"
                onClick={() => setInviteBanner(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Guest Status Banner */}
        {!currentUser && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-zinc-300">
            <div className="flex items-center space-x-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Playing as Guest &mdash; picks saved in browser. Sign in to join the leaderboard.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs shrink-0 ml-3"
            >
              Sign In
            </button>
          </div>
        )}

        {/* Tab 1: Picks View */}
        {activeTab === "picks" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Top Action Bar */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" strokeWidth={2.5} />
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Week {selectedWeek} Picks
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
                  {pickedCount}/{totalGames} selected
                </span>
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
                  onClick={handleSavePicks}
                  disabled={isSaving || isFutureWeek}
                  className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-md flex items-center space-x-2 active:scale-95 touch-manipulation ${
                    isFutureWeek
                      ? "bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700/60"
                      : allPicksMade
                      ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20"
                      : "bg-zinc-100 hover:bg-white text-zinc-950"
                  }`}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isFutureWeek ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {isSaving
                      ? "Saving..."
                      : isFutureWeek
                      ? "Picks Locked"
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

            {/* Future Week Notice Banner */}
            {isFutureWeek && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center space-x-2.5 text-xs text-amber-300">
                <Lock className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Week {selectedWeek} schedule preview &mdash; picks unlock once the week begins.</span>
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
                  isLocked={isFutureWeek}
                />
              ))}
            </div>

            {/* Tiebreaker Section (Monday Night Football Total Score) */}
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Monday Night Football Tiebreaker
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Predicted total points for{" "}
                  <strong className="text-zinc-200">
                    {mnfGame
                      ? `${mnfGame.awayTeam.fullName} vs ${mnfGame.homeTeam.fullName}`
                      : "Monday Night Football"}
                  </strong>
                </p>
              </div>

              {/* Touch Stepper + Input */}
              <div className="flex items-center gap-2.5 pt-1">
                <div className={`flex items-center space-x-1.5 bg-zinc-950 border border-zinc-800 rounded-xl p-1 ${isFutureWeek ? "opacity-60" : ""}`}>
                  <button
                    type="button"
                    onClick={() => handleStepMnf(-1)}
                    disabled={isFutureWeek}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={isFutureWeek}
                    onChange={(e) => {
                      setMnfPrediction(e.target.value);
                      setSaveStatus(null);
                    }}
                    className="w-16 text-center py-1 bg-transparent text-sm font-bold text-white focus:outline-none disabled:text-zinc-500 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => handleStepMnf(1)}
                    disabled={isFutureWeek}
                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center justify-center transition active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase score prediction"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-xs text-zinc-400">total points</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dedicated Weekly Scoreboard */}
        {activeTab === "scoreboard" && (
          <WeeklyScoreboard
            games={weekGames}
            entries={scoreboardEntries}
            currentUserId={currentUser?.id}
            currentUserPicks={userPicks}
          />
        )}

        {/* Tab 3: Dedicated Season Leaderboard */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Invite CTA Banner */}
            <div className="bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-zinc-900 border border-emerald-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Know someone who thinks they know football?
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Invite friends or colleagues to join the pool and battle for the top spot.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange("invite")}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-xl transition shadow-md shadow-emerald-500/10 active:scale-95 shrink-0 self-start sm:self-center cursor-pointer flex items-center space-x-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite New Member</span>
              </button>
            </div>

            <LeaderboardTable
              entries={standingsEntries}
              currentUserId={currentUser?.id}
              onNavigateToScoreboard={() => handleTabChange("scoreboard")}
            />
          </div>
        )}

        {/* Tab 4: Rules View */}
        {activeTab === "rules" && <RulesCard />}

        {/* Tab 5: Dedicated Invite View */}
        {activeTab === "invite" && (
          <InviteMemberCard
            poolName={activePool?.name || "2026 NFL Weekly Pick'em"}
            poolSlug={activePool?.joinCode || activePool?.slug || "nfl-2026-weekly"}
            inviterName={currentUser?.name || "GridironGuru"}
          />
        )}
      </main>

      {/* MOBILE FLOATING ACTION BAR: Stays pinned within thumb reach on phones (< sm) */}
      {activeTab === "picks" && (
        <div className="sm:hidden fixed bottom-3 left-3 right-3 z-30 bg-zinc-900/95 border border-zinc-700/80 backdrop-blur-lg p-3 rounded-2xl shadow-2xl shadow-black/80 flex items-center justify-between gap-3">
          {isFutureWeek ? (
            <div className="w-full flex items-center justify-between py-1 px-1">
              <div className="flex items-center space-x-2 text-amber-300">
                <Lock className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">Week {selectedWeek} Locked</span>
              </div>
              <span className="text-[11px] text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full border border-zinc-700 font-medium">
                Schedule Preview
              </span>
            </div>
          ) : (
            <>
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
            </>
          )}
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
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-4 text-center text-xs text-zinc-500">
        <p>© 2026 NFL Weekly Picks Pool • Times US/Eastern</p>
      </footer>
    </div>
  );
}
