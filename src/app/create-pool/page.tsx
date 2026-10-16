"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  POOL_DESIGN_PRESETS,
  PoolDesignPreset,
  createPoolQuickSetup,
  generateJoinCode,
  getCurrentUser,
  setActivePoolId,
  setSavedActivePool,
} from "@/lib/supabase/picks-service";
import {
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";

export default function CreatePoolPage() {
  const router = useRouter();

  const [poolName, setPoolName] = useState<string>("");
  const [selectedPresetId, setSelectedPresetId] =
    useState<PoolDesignPreset["id"]>("classic_straight_up");
  const [customJoinCode, setCustomJoinCode] = useState<string>("");
  const [previewJoinCode, setPreviewJoinCode] = useState<string>("NFL-2026");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setPreviewJoinCode(generateJoinCode("NFL"));
    });
    getCurrentUser()
      .then((user) => {
        if (user?.id) setUserId(user.id);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolName.trim() || poolName.trim().length < 3) {
      setErrorMsg("Pool name must be at least 3 characters.");
      return;
    }

    setIsCreating(true);
    setErrorMsg(null);

    const res = await createPoolQuickSetup({
      name: poolName,
      isPublic: false,
      presetId: selectedPresetId,
      customJoinCode: customJoinCode.trim() || previewJoinCode,
      userId,
    });

    setIsCreating(false);

    if (res.success && res.pool) {
      setActivePoolId(res.pool.id);
      setSavedActivePool(res.pool);
      router.push(`/?pool=${encodeURIComponent(res.pool.id)}#picks`);
    } else {
      setErrorMsg(res.error || "Could not create pool.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/#home"
            className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>
          <span className="text-xs font-bold text-zinc-300">Create a Pool</span>
        </div>
      </header>

      {/* Form Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Create a New Pool
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Set up a private pool for your friends.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Pool Name */}
            <div className="space-y-2">
              <label
                htmlFor="pool-name"
                className="text-xs font-bold uppercase tracking-wider text-zinc-300 block"
              >
                Pool Name
              </label>
              <input
                id="pool-name"
                type="text"
                required
                minLength={3}
                maxLength={50}
                value={poolName}
                onChange={(e) => {
                  setPoolName(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="e.g. Sunday Friends League"
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none transition"
              />
            </div>

            {/* Preset Pool Designs */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
                Pool Design Preset
              </label>

              <div className="space-y-2.5">
                {POOL_DESIGN_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`w-full text-left p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-emerald-950/30 border-emerald-500/60"
                          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {preset.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              preset.isPlaceholder
                                ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            }`}
                          >
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {preset.summary}
                        </p>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-500 text-zinc-950"
                            : "border-zinc-700 bg-zinc-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Invite Code */}
            <div className="space-y-2">
              <label
                htmlFor="join-code"
                className="text-xs font-bold uppercase tracking-wider text-zinc-300 block"
              >
                Invite Code
              </label>
              <input
                id="join-code"
                type="text"
                maxLength={12}
                value={customJoinCode}
                onChange={(e) =>
                  setCustomJoinCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "")
                  )
                }
                placeholder={previewJoinCode}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-sm font-mono font-bold text-emerald-400 placeholder:text-emerald-400/60 focus:outline-none transition"
              />
              <p className="text-[11px] text-zinc-500">
                Share this code with your friends so they can join.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl text-xs flex items-center space-x-2 border bg-rose-950/50 text-rose-300 border-rose-800/70">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create Pool</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
