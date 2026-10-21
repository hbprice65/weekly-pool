"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Game, PoolMember, DoomsdayPickPayload, DEFAULT_POOL_ID } from "@/types";
import { getPoolAbbreviation } from "@/lib/utils";
import {
  fetchPoolMembers,
  toggleMemberVisibility,
  removePoolMember,
  fetchMemberPicksForLeader,
  saveDoomsdayOverridePicks,
  fetchWeekGames,
  getCurrentUser,
  checkIsPoolLeader,
  getActivePoolId,
  fetchPoolDetails,
} from "@/lib/supabase/picks-service";
import {
  ArrowLeft,
  Crown,
  Eye,
  EyeOff,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ShieldAlert,
  Users,
  Search,
} from "lucide-react";

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<"members" | "picks">("members");
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [, setIsLeader] = useState<boolean>(true);
  const [, setIsLoadingAuth] = useState<boolean>(true);
  const [activePoolId, setActivePoolIdState] = useState<string>(DEFAULT_POOL_ID);
  const [activePoolName, setActivePoolName] = useState<string>("2026 NFL Weekly Pick'em");

  // Members state
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(true);
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [memberNotice, setMemberNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Pick override (Doomsday) state
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<number>(6);
  const [games, setGames] = useState<Game[]>([]);
  const [isLoadingGames, setIsLoadingGames] = useState<boolean>(false);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [mnfScore, setMnfScore] = useState<string>("");
  const [isSavingPicks, setIsSavingPicks] = useState<boolean>(false);
  const [pickNotice, setPickNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Set document title & verify user / leader status
  useEffect(() => {
    document.title = "Admin Tools - NFL Weekly Pool";
    const syncActivePool = () => {
      const poolId = getActivePoolId();
      setActivePoolIdState(poolId);
      fetchPoolDetails(poolId).then((details) => {
        if (details?.name) setActivePoolName(details.name);
      });
    };
    syncActivePool();
    window.addEventListener("pool-changed", syncActivePool);
    return () => window.removeEventListener("pool-changed", syncActivePool);
  }, []);

  useEffect(() => {
    async function initAuth() {
      setIsLoadingAuth(true);
      const poolId = getActivePoolId();
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser({ id: user.id, email: user.email });
          const leader = await checkIsPoolLeader(user.id, poolId);
          setIsLeader(leader);
        } else {
          // Demo / guest fallback
          const leader = await checkIsPoolLeader(undefined, poolId);
          setIsLeader(leader);
        }
      } catch {
        setIsLeader(true);
      } finally {
        setIsLoadingAuth(false);
      }
    }
    initAuth();
  }, []);

  // 2. Load members for active pool
  const loadMembers = useCallback(async (poolId: string) => {
    setIsLoadingMembers(true);
    try {
      const data = await fetchPoolMembers(poolId);
      setMembers(data);
      if (data.length > 0) {
        setTargetUserId((prev) => prev || data[0].userId);
      }
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    loadMembers(activePoolId);
  }, [activePoolId, loadMembers]);

  // 3. Load games for selected week
  useEffect(() => {
    let cancelled = false;
    async function loadGames() {
      setIsLoadingGames(true);
      try {
        const weekGames = await fetchWeekGames(selectedWeek);
        if (!cancelled) {
          setGames(weekGames);
        }
      } catch (err) {
        console.error("Error loading games:", err);
      } finally {
        if (!cancelled) setIsLoadingGames(false);
      }
    }
    loadGames();
    return () => {
      cancelled = true;
    };
  }, [selectedWeek]);

  // 4. Load member's picks when member or week changes
  useEffect(() => {
    let cancelled = false;
    async function loadMemberPicks() {
      if (!targetUserId) return;
      try {
        const data = await fetchMemberPicksForLeader(targetUserId, selectedWeek, activePoolId);
        if (!cancelled) {
          setPicks(data.picks || {});
          setMnfScore(data.mnfScore || "");
          setPickNotice(null);
        }
      } catch (err) {
        console.error("Error loading picks:", err);
      }
    }
    loadMemberPicks();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, selectedWeek, activePoolId]);

  // Handle visibility toggle
  const handleToggleHide = async (member: PoolMember) => {
    const nextHidden = !member.isHidden;
    const res = await toggleMemberVisibility(member.userId, nextHidden, activePoolId);
    if (res.success) {
      setMembers((prev) =>
        prev.map((m) => (m.userId === member.userId ? { ...m, isHidden: nextHidden } : m))
      );
      setMemberNotice({
        type: "success",
        text: `${member.displayName || "Member"} is now ${nextHidden ? "hidden" : "visible"} on the leaderboard.`,
      });
    } else {
      setMemberNotice({
        type: "error",
        text: res.error || "Failed to update member visibility.",
      });
    }
  };

  // Handle member removal
  const handleRemoveMember = async (member: PoolMember) => {
    const res = await removePoolMember(member.userId, activePoolId);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
      setConfirmDeleteId(null);
      setMemberNotice({
        type: "success",
        text: `Removed ${member.displayName || "Member"} from the pool.`,
      });
    } else {
      setMemberNotice({
        type: "error",
        text: res.error || "Failed to remove member.",
      });
    }
  };

  // Toggle pick selection
  const handleSelectTeam = (gameId: string, teamId: string) => {
    setPicks((prev) => {
      if (prev[gameId] === teamId) {
        const next = { ...prev };
        delete next[gameId];
        return next;
      }
      return { ...prev, [gameId]: teamId };
    });
  };

  // Save emergency pick overrides
  const handleSavePicks = async () => {
    if (!targetUserId) return;
    setIsSavingPicks(true);
    setPickNotice(null);

    const payload: DoomsdayPickPayload = {
      poolId: activePoolId,
      targetUserId,
      weekNumber: selectedWeek,
      picks,
      mnfScore,
      reason: "Admin Tools override",
    };

    const res = await saveDoomsdayOverridePicks(payload);
    setIsSavingPicks(false);

    if (res.success) {
      const targetMember = members.find((m) => m.userId === targetUserId);
      setPickNotice({
        type: "success",
        text: `Picks saved for ${targetMember?.displayName || "member"} (Week ${selectedWeek}).`,
      });
    } else {
      setPickNotice({
        type: "error",
        text: res.error || "Failed to save picks.",
      });
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!memberSearch) return true;
    const term = memberSearch.toLowerCase();
    return (
      (m.displayName || "").toLowerCase().includes(term) ||
      (m.email || "").toLowerCase().includes(term)
    );
  });

  const selectedMemberObj = members.find((m) => m.userId === targetUserId);
  const mnfGame = games.find((g) => g.isMondayNight) || games[games.length - 1];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition flex items-center space-x-1.5 text-xs font-semibold shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Pool</span>
            </Link>

            <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

            <div className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-amber-400 truncate">
              <Crown className="w-4 h-4 shrink-0" />
              <span>Admin Tools</span>
            </div>
          </div>

          <Link
            href="/account"
            className="flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs hover:bg-emerald-500/15 transition shrink-0"
            title={`Active Pool: ${activePoolName}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-zinc-400 hidden sm:inline">Active Pool:</span>
            <span className="font-bold text-emerald-400 sm:hidden">
              {getPoolAbbreviation(activePoolName)}
            </span>
            <span className="font-bold text-emerald-400 truncate max-w-[140px] sm:max-w-[220px] hidden sm:inline">
              {activePoolName}
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Page Title & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Admin Tools &mdash; {activePoolName}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage member visibility, remove participants, or edit picks in emergency scenarios.
            </p>
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveSection("members")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition ${
                activeSection === "members"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members ({members.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("picks")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition ${
                activeSection === "picks"
                  ? "bg-zinc-800 text-amber-400 shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Edit Picks (Override)</span>
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SECTION 1: MEMBERS MANAGEMENT */}
        {/* ===================================================================== */}
        {activeSection === "members" && (
          <div className="space-y-4">
            {/* Feedback alert */}
            {memberNotice && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                  memberNotice.type === "success"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/80"
                    : "bg-red-950/60 text-red-300 border border-red-800/80"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{memberNotice.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMemberNotice(null)}
                  className="text-xs hover:underline ml-4"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Search filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search member by name..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition"
              />
            </div>

            {/* Members Table */}
            {isLoadingMembers ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">Loading members...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 border border-zinc-800 rounded-xl bg-zinc-900/40">
                No pool members found.
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3 text-center">Role</th>
                      <th className="px-4 py-3 text-center">Leaderboard Visibility</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredMembers.map((m) => {
                      const isLeaderRow = m.role === "leader";
                      const isSelf = m.userId === currentUser?.id || m.userId === "user-demo-01";

                      return (
                        <tr key={m.userId} className="hover:bg-zinc-900/60 transition-colors">
                          {/* Member info */}
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 border border-zinc-700 shrink-0 overflow-hidden">
                                {m.avatarUrl ? (
                                  <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (m.displayName || "P").substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-white truncate">
                                    {m.displayName || "Player"}
                                  </span>
                                  {isSelf && (
                                    <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1 rounded">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-zinc-500 block truncate">
                                  Joined {new Date(m.joinedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3 text-center">
                            {isLeaderRow ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Crown className="w-3 h-3 text-amber-400" />
                                <span>Leader</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded-full border border-zinc-700/50">
                                Member
                              </span>
                            )}
                          </td>

                          {/* Visibility status */}
                          <td className="px-4 py-3 text-center">
                            {m.isHidden ? (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-900/50">
                                <EyeOff className="w-3 h-3" />
                                <span>Hidden from Standings</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/50">
                                <Eye className="w-3 h-3" />
                                <span>Visible</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Toggle Show / Hide */}
                              <button
                                type="button"
                                onClick={() => handleToggleHide(m)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition ${
                                  m.isHidden
                                    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                                    : "bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700/60"
                                }`}
                              >
                                {m.isHidden ? "Unhide" : "Hide"}
                              </button>

                              {/* Edit Picks shortcut */}
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetUserId(m.userId);
                                  setActiveSection("picks");
                                }}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition"
                              >
                                Edit Picks
                              </button>

                              {/* Remove button */}
                              {(!isLeaderRow || members.length > 1) && (
                                <>
                                  {confirmDeleteId === m.userId ? (
                                    <div className="flex items-center space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMember(m)}
                                        className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold"
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2 py-1 bg-zinc-800 text-zinc-400 hover:text-white rounded text-xs"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(m.userId)}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                                      title="Remove member"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* SECTION 2: DOOMSDAY PICK OVERRIDE */}
        {/* ===================================================================== */}
        {activeSection === "picks" && (
          <div className="space-y-4">
            {/* Control Bar: Select Member & Week */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Member:
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName || "Player"} {m.role === "leader" ? "(Leader)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  NFL Week:
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Feedback alert */}
            {pickNotice && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                  pickNotice.type === "success"
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/80"
                    : "bg-red-950/60 text-red-300 border border-red-800/80"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{pickNotice.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPickNotice(null)}
                  className="text-xs hover:underline ml-4"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Matchup Pick List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>
                  Matchups for Week {selectedWeek} ({games.length} games)
                </span>
                <span>
                  Picks selected: <strong className="text-white">{Object.keys(picks).length}</strong>
                </span>
              </div>

              {isLoadingGames ? (
                <div className="py-12 flex items-center justify-center space-x-2 text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Loading games...</span>
                </div>
              ) : games.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 border border-zinc-800 rounded-xl bg-zinc-900/40">
                  No games scheduled for Week {selectedWeek}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {games.map((g) => {
                    const pickedTeam = picks[g.id];
                    const awaySelected = pickedTeam === g.awayTeam.id;
                    const homeSelected = pickedTeam === g.homeTeam.id;

                    return (
                      <div
                        key={g.id}
                        className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl flex flex-col space-y-2"
                      >
                        <div className="flex items-center justify-between text-[10px] text-zinc-500">
                          <span>
                            {new Date(g.kickoffTime).toLocaleDateString([], {
                              weekday: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="uppercase font-semibold text-zinc-400">
                            {g.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectTeam(g.id, g.awayTeam.id)}
                            className={`p-2 rounded-lg border text-left text-xs transition ${
                              awaySelected
                                ? "bg-amber-500/20 border-amber-500 text-white font-bold"
                                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            <span className="block font-bold">{g.awayTeam.id}</span>
                            <span className="text-[10px] text-zinc-400 block truncate">
                              {g.awayTeam.name}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectTeam(g.id, g.homeTeam.id)}
                            className={`p-2 rounded-lg border text-left text-xs transition ${
                              homeSelected
                                ? "bg-amber-500/20 border-amber-500 text-white font-bold"
                                : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            <span className="block font-bold">{g.homeTeam.id}</span>
                            <span className="text-[10px] text-zinc-400 block truncate">
                              {g.homeTeam.name}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tiebreaker Input & Save Bar */}
            <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="block text-xs font-bold text-white">
                  Monday Night Tiebreaker Score
                </span>
                <span className="text-[11px] text-zinc-500">
                  Predicted total points for MNF matchup
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={mnfScore}
                  onChange={(e) => setMnfScore(e.target.value)}
                  placeholder="45"
                  className="w-20 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-center text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                />

                <button
                  type="button"
                  onClick={handleSavePicks}
                  disabled={isSavingPicks}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSavingPicks ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Overrides</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
