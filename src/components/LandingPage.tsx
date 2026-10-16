"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Pool } from "@/types";
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
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-black text-xs sm:text-sm select-none">
              NFL
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
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col justify-center space-y-8">
        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            NFL Weekly Pool
          </h1>
          <p className="text-sm text-zinc-400">
            Compete against your friends each week. Join with an invite code or start a new pool.
          </p>
        </div>

        {/* Join or Create Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* Card 1: Join an Existing Pool */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Join a Pool
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Enter the invite code or link from your pool leader
                  </p>
                </div>
              </div>

              <form onSubmit={handleJoinSubmit} className="space-y-3">
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => {
                    setJoinInput(e.target.value);
                    setJoinFeedback(null);
                  }}
                  placeholder="Enter pool code or invite link"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none transition"
                />

                {joinFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 border ${
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
                    <span>{joinFeedback.message}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isJoiningCode}
                  className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-60"
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

            {myPools.length > 0 && (
              <div className="pt-4 border-t border-zinc-800/80 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                  Your Pools
                </span>
                <div className="space-y-1.5">
                  {myPools.map((pool) => (
                    <button
                      key={pool.id}
                      type="button"
                      onClick={() => onSelectPool(pool)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800/80 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <span className="text-xs font-semibold text-white truncate">
                        {pool.name}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Create a New Pool */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Start a New Pool
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Create a private pool and invite your friends
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                Pick a pool name, choose a format preset, and get a private invite code to share with your group.
              </p>
            </div>

            <Link
              href="/create-pool"
              className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create a Pool</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
