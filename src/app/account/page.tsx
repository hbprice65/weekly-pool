"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPoolMembership, DEFAULT_POOL_ID } from "@/types";
import { MOCK_USER } from "@/lib/mock-data";
import { getPoolAbbreviation } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getCurrentUser,
  fetchUserPools,
  getActivePoolId,
  setActivePoolId,
  joinPoolByCodeOrSlug,
  leavePool,
} from "@/lib/supabase/picks-service";
import { AuthModal, AuthUser } from "@/components/AuthModal";
import {
  ArrowLeft,
  Crown,
  LogIn,
  LogOut,
  User,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";

/**
 * Account & Pool Management Page
 * Displays the authenticated user or demo profile and a clean table of pools where the user is an active member.
 * - Clicking anywhere on a pool row activates that pool and routes directly to its dashboard.
 * - Clicking "Leave" removes the membership.
 * - Users can enter a pool join code to join an additional pool.
 */
export default function AccountPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [userPools, setUserPools] = useState<UserPoolMembership[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState<boolean>(true);
  const [activePoolId, setActivePoolIdState] = useState<string>(() =>
    typeof window !== "undefined" ? getActivePoolId() : DEFAULT_POOL_ID
  );

  // Inline Join Pool state
  const [isJoinOpen, setIsJoinOpen] = useState<boolean>(false);
  const [joinCodeInput, setJoinCodeInput] = useState<string>("");
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [leavingPoolId, setLeavingPoolId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Account & My Pools - NFL Weekly Pool";
    setActivePoolIdState(getActivePoolId());
  }, []);

  const loadAccountAndPools = useCallback(async () => {
    setIsLoadingPools(true);
    try {
      const user = await getCurrentUser();
      let resolvedUserId: string | undefined = undefined;

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
        resolvedUserId = user.id;
      } else {
        setCurrentUser(null);
      }

      const pools = await fetchUserPools(resolvedUserId);
      setUserPools(pools);

      // Verify active pool is valid among pools the user belongs to
      const currentActive = getActivePoolId();
      if (pools.length > 0 && !pools.some((m) => m.pool.id === currentActive)) {
        const fallbackId = pools[0].pool.id;
        setActivePoolId(fallbackId);
        setActivePoolIdState(fallbackId);
      } else {
        setActivePoolIdState(currentActive);
      }
    } catch (err) {
      console.error("Error loading account and pools:", err);
    } finally {
      setIsLoadingPools(false);
    }
  }, []);

  useEffect(() => {
    loadAccountAndPools();
  }, [loadAccountAndPools]);

  // Listen to pool-changed events
  useEffect(() => {
    const handlePoolChanged = () => {
      setActivePoolIdState(getActivePoolId());
    };
    window.addEventListener("pool-changed", handlePoolChanged);
    return () => window.removeEventListener("pool-changed", handlePoolChanged);
  }, []);

  const handleSelectPool = (poolId: string) => {
    setActivePoolId(poolId);
    setActivePoolIdState(poolId);
    router.push(`/?pool=${encodeURIComponent(poolId)}`);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    await loadAccountAndPools();
  };

  const handleJoinPool = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinCodeInput.trim();
    if (!trimmed) return;

    setIsJoining(true);
    setFeedbackNotice(null);

    try {
      const res = await joinPoolByCodeOrSlug(trimmed, currentUser?.id);
      if (res.success && res.pool) {
        setFeedbackNotice({
          type: "success",
          text: `Successfully joined "${res.pool.name}"!`,
        });
        setJoinCodeInput("");
        setIsJoinOpen(false);
        await loadAccountAndPools();
      } else {
        setFeedbackNotice({
          type: "error",
          text: res.error || "No pool found matching this code.",
        });
      }
    } catch {
      setFeedbackNotice({
        type: "error",
        text: "Could not join pool. Please try again.",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeavePool = async (poolId: string, poolName: string) => {
    if (!confirm(`Are you sure you want to leave "${poolName}"?`)) {
      return;
    }
    setLeavingPoolId(poolId);
    setFeedbackNotice(null);
    try {
      await leavePool(poolId, currentUser?.id);
      setFeedbackNotice({
        type: "success",
        text: `You have left "${poolName}".`,
      });
      await loadAccountAndPools();
    } catch {
      setFeedbackNotice({
        type: "error",
        text: "Failed to leave pool. Please try again.",
      });
    } finally {
      setLeavingPoolId(null);
    }
  };

  const activePoolObj =
    userPools.find((m) => m.pool.id === activePoolId)?.pool ||
    userPools[0]?.pool;

  const displayName = currentUser?.name || MOCK_USER.displayName;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition flex items-center space-x-1.5 text-xs font-semibold shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Pool</span>
            </Link>

            <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              Account
            </h1>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            {/* Active Pool Indicator */}
            {activePoolObj && (
              <Link
                href="/"
                className="flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs hover:bg-emerald-500/15 transition"
                title={`Active Pool: ${activePoolObj.name}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-zinc-400 hidden sm:inline">Active Pool:</span>
                <span className="font-bold text-emerald-400 sm:hidden">
                  {getPoolAbbreviation(activePoolObj.name)}
                </span>
                <span className="font-bold text-emerald-400 truncate max-w-[140px] sm:max-w-[220px] hidden sm:inline">
                  {activePoolObj.name}
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Compact Account Row */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl px-4 py-3.5 sm:px-5 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover border border-emerald-500/40 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white truncate">
                  {displayName}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {currentUser ? "Signed In" : "Demo Mode"}
                </span>
              </div>
              {currentUser?.email && (
                <p className="text-xs text-zinc-400 truncate">{currentUser.email}</p>
              )}
            </div>
          </div>

          {currentUser ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Feedback Alert Notice */}
        {feedbackNotice && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              feedbackNotice.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : "bg-red-950/40 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedbackNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackNotice(null)}
              className="text-zinc-400 hover:text-white"
            >
              &times;
            </button>
          </div>
        )}

        {/* Pools Table Card */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-4 py-4 sm:px-6 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Your Pools
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Pools where you are currently a member
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {userPools.length} {userPools.length === 1 ? "Pool" : "Pools"}
              </span>

              {/* Join with Code Toggle */}
              {!isJoinOpen && (
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(true)}
                  className="px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Join Pool</span>
                </button>
              )}

              {/* Create a Pool Button */}
              <Link
                href="/create-pool"
                className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create a Pool</span>
              </Link>
            </div>
          </div>

          {/* Inline Join Pool Input Form */}
          {isJoinOpen && (
            <div className="px-4 py-3 sm:px-6 bg-zinc-950/70 border-b border-zinc-800/80">
              <form onSubmit={handleJoinPool} className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-300 font-medium">
                  Enter Join Code:
                </span>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value)}
                  placeholder="e.g. BLITZ26, TDCLUB26"
                  className="px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono uppercase focus:border-emerald-500 focus:outline-none placeholder:normal-case placeholder:font-sans"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isJoining || !joinCodeInput.trim()}
                  className="px-3.5 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-lg transition cursor-pointer flex items-center space-x-1"
                >
                  {isJoining && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{isJoining ? "Joining..." : "Join"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsJoinOpen(false);
                    setFeedbackNotice(null);
                  }}
                  className="px-2.5 py-1.5 text-xs text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="py-3 px-4 sm:px-6">Pool</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center hidden sm:table-cell">Members</th>
                  <th className="py-3 px-3 text-center">Rank</th>
                  <th className="py-3 px-3 text-center">Points</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {isLoadingPools ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      <div className="flex items-center justify-center space-x-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Loading your pools...</span>
                      </div>
                    </td>
                  </tr>
                ) : userPools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center">
                      <p className="text-sm font-bold text-white mb-1">
                        You are not a member of any pools yet
                      </p>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                        Join a pool using an invite code from your commissioner, or enter a join code above.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsJoinOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Join a Pool</span>
                        </button>
                        <Link
                          href="/create-pool"
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Create a Pool</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  userPools.map((membership) => {
                    const {
                      pool,
                      isLeader,
                      memberCount,
                      userRank,
                      userPoints,
                    } = membership;
                    const isActive = pool.id === activePoolId;

                    return (
                      <tr
                        key={pool.id}
                        onClick={() => handleSelectPool(pool.id)}
                        className={`group transition-colors cursor-pointer ${
                          isActive
                            ? "bg-emerald-950/25 hover:bg-emerald-950/40"
                            : "hover:bg-zinc-800/40"
                        }`}
                      >
                        {/* Pool Name */}
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isActive ? "bg-emerald-400" : "bg-zinc-700"
                              }`}
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span
                                  className={`font-bold ${
                                    isActive ? "text-emerald-300" : "text-white"
                                  }`}
                                >
                                  {pool.name}
                                </span>
                                {pool.format === "playoff_challenge" && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Playoffs (1x–4x)
                                  </span>
                                )}
                                {isActive && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    Active
                                  </span>
                                )}
                              </div>
                              {pool.description && (
                                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                                  {pool.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {isLeader ? (
                            <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25">
                              <Crown className="w-3 h-3 text-amber-400" />
                              <span>Leader</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                              Member
                            </span>
                          )}
                        </td>

                        {/* Members Count */}
                        <td className="py-3.5 px-3 text-center text-zinc-300 font-medium hidden sm:table-cell whitespace-nowrap">
                          {memberCount}
                        </td>

                        {/* User Rank */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className="font-bold text-white">
                            {userRank ? `#${userRank}` : "—"}
                          </span>
                        </td>

                        {/* User Points */}
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span className="font-bold text-emerald-400">
                            {userPoints !== undefined ? userPoints : 0}
                          </span>
                        </td>

                        {/* Action: Leave Pool */}
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeavePool(pool.id, pool.name);
                            }}
                            disabled={leavingPoolId === pool.id}
                            className="px-2.5 py-1 rounded-lg bg-zinc-850 hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 text-xs font-medium transition cursor-pointer"
                            title={`Leave ${pool.name}`}
                          >
                            {leavingPoolId === pool.id ? "Leaving..." : "Leave"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthStateChanged={() => loadAccountAndPools()}
      />
    </div>
  );
}
