"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Pool } from "@/types";
import { SiteLogoIcon } from "@/components/Navbar";
import {
  fetchDirectoryPools,
  joinPoolByCodeOrSlug,
} from "@/lib/supabase/picks-service";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserPlus,
  Plus,
  ChevronRight,
  LogIn,
  User,
} from "lucide-react";

interface LandingPageProps {
  currentUser: {
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  } | null;
  activePool: Pool | null;
  incomingInvite?: {
    poolSlug: string;
    inviter?: string;
    recipient?: string;
  } | null;
  currentActiveWeek: number;
  onSelectPool: (pool: Pool) => void;
  onOpenAuth: () => void;
}

export function LandingPage({
  currentUser,
  activePool,
  incomingInvite,
  onSelectPool,
  onOpenAuth,
}: LandingPageProps) {
  const [myPools, setMyPools] = useState<Pool[]>([]);
  const [joinInput, setJoinInput] = useState<string>(incomingInvite?.poolSlug || "");
  const [isJoiningCode, setIsJoiningCode] = useState<boolean>(false);
  const [joinFeedback, setJoinFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (incomingInvite?.poolSlug) {
      queueMicrotask(() => {
        setJoinInput(incomingInvite.poolSlug);
      });
    }
  }, [incomingInvite]);

  const loadMyPools = useCallback(async () => {
    try {
      const res = await fetchDirectoryPools(currentUser?.id);
      setMyPools(res.myPools);
    } catch {
      // Ignore directory load errors
    }
  }, [currentUser]);

  useEffect(() => {
    queueMicrotask(() => {
      loadMyPools();
    });
  }, [loadMyPools]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput.trim()) {
      setJoinFeedback({
        type: "error",
        message: "Please enter a pool code or invite link.",
      });
      return;
    }

    setIsJoiningCode(true);
    setJoinFeedback(null);

    const res = await joinPoolByCodeOrSlug(joinInput, currentUser?.id);
    setIsJoiningCode(false);

    if (res.success && res.pool) {
      onSelectPool(res.pool);
    } else {
      setJoinFeedback({
        type: "error",
        message: res.error || "Invalid pool code.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0 select-none">
              <SiteLogoIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white">
              Weekly Pool
            </span>
          </div>

          <div className="flex items-center space-x-2.5">
            {activePool && (
              <button
                type="button"
                onClick={() => onSelectPool(activePool)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <span className="truncate max-w-[140px]">{activePool.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAuth}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentUser
                  ? "bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white"
                  : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
              }`}
            >
              {currentUser ? (
                <>
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[110px]">
                    {currentUser.name || currentUser.email?.split("@")[0]}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-14 flex flex-col justify-center space-y-8">
        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            NFL Weekly Pool
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Pick winners each week, join private contests with your friends, or create your own pool league.
          </p>
        </div>

        {/* 3 Core Action Cards: Sign In, Join a Pool, Create a Pool */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Card 1: Sign In */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5 shadow-sm hover:border-zinc-700 transition">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {currentUser ? "Signed In" : "Sign In"}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {currentUser ? "Connected account" : "Google or Email"}
                  </p>
                </div>
              </div>

              {currentUser ? (
                <div className="space-y-2 pt-1">
                  <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs space-y-1">
                    <div className="font-semibold text-white truncate">
                      {currentUser.name || "Player"}
                    </div>
                    {currentUser.email && (
                      <div className="text-zinc-400 truncate text-[11px]">
                        {currentUser.email}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400">
                    Your picks and pool memberships sync automatically across all devices.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                  Sign in with your Google account or email to submit weekly picks, track stats, and climb the standings.
                </p>
              )}
            </div>

            {currentUser ? (
              <div className="space-y-2">
                {activePool && (
                  <button
                    type="button"
                    onClick={() => onSelectPool(activePool)}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    <span>Go to Picks</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
                <Link
                  href="/account"
                  className="w-full py-2 px-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>My Account & Pools</span>
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Play</span>
              </button>
            )}
          </div>

          {/* Card 2: Join a Pool */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5 shadow-sm hover:border-zinc-700 transition">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Join a Pool
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Enter code or invite link
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                Have an invite code from your pool commissioner? Enter it below to join the league.
              </p>

              <form onSubmit={handleJoinSubmit} className="space-y-2.5 pt-1">
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => {
                    setJoinInput(e.target.value);
                    setJoinFeedback(null);
                  }}
                  placeholder="e.g. NFL-2026 or pool link"
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none transition"
                />

                {joinFeedback && (
                  <div
                    className={`p-2 rounded-xl text-xs flex items-center space-x-2 border ${
                      joinFeedback.type === "success"
                        ? "bg-emerald-950/50 text-emerald-300 border-emerald-800/70"
                        : "bg-rose-950/50 text-rose-300 border-rose-800/70"
                    }`}
                  >
                    {joinFeedback.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="truncate">{joinFeedback.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isJoiningCode}
                  className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60 active:scale-95"
                >
                  {isJoiningCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Join Pool</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Card 3: Create a New Pool */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5 shadow-sm hover:border-zinc-700 transition">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Create a Pool
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Host a private contest
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                Start a private league for your friends, office, or family with custom scoring, Straight Up, Spreads, or Playoff formats.
              </p>
            </div>

            <Link
              href="/create-pool"
              className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center space-x-1.5 shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create a Pool</span>
            </Link>
          </div>
        </div>

        {/* Existing Pools Directory (if user belongs to any pools) */}
        {myPools.length > 0 && (
          <div className="pt-4 border-t border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Your Pools ({myPools.length})
              </span>
              <Link
                href="/account"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Manage &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {myPools.map((pool) => (
                <button
                  key={pool.id}
                  type="button"
                  onClick={() => onSelectPool(pool)}
                  className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left transition cursor-pointer group"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs sm:text-sm font-bold text-white truncate block group-hover:text-emerald-300 transition-colors">
                      {pool.name}
                    </span>
                    <span className="text-[11px] text-zinc-500 capitalize">
                      {pool.format?.replace("_", " ") || "Pick'em"}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-white shrink-0 transition" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Guest View Shortcut: Explore Active Pool without signing in */}
        {activePool && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => onSelectPool(activePool)}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition underline underline-offset-4"
            >
              Or preview current schedule &amp; picks for {activePool.name} &rarr;
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
