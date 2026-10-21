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
  Trophy,
  CheckCircle2,
  Scale,
  ShieldAlert,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Zap,
} from "lucide-react";

export default function CreatePoolPage() {
  const router = useRouter();

  const [poolName, setPoolName] = useState<string>("");
  const [selectedPresetId, setSelectedPresetId] =
    useState<PoolDesignPreset["id"]>("classic_straight_up");
  const [formatFilter, setFormatFilter] = useState<"all" | "postseason" | "regular_season">("all");
  const [customJoinCode, setCustomJoinCode] = useState<string>("");
  const [previewJoinCode, setPreviewJoinCode] = useState<string>("NFL-2026");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check URL query parameters for pre-selected format (e.g. /create-pool?format=playoff_challenge)
  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const fmt = params.get("format");
        if (fmt === "playoff_challenge" || fmt === "playoffs") {
          setSelectedPresetId("playoff_challenge");
          setPreviewJoinCode(generateJoinCode("PLAYOFF"));
          return;
        }
      }
      setPreviewJoinCode(generateJoinCode("NFL"));
    });

    getCurrentUser()
      .then((user) => {
        if (user?.id) setUserId(user.id);
      })
      .catch(() => {});
  }, []);

  const handleSelectFormat = (presetId: PoolDesignPreset["id"]) => {
    setSelectedPresetId(presetId);
    if (!customJoinCode.trim()) {
      const prefix = presetId === "playoff_challenge" ? "PLAYOFF" : "NFL";
      setPreviewJoinCode(generateJoinCode(prefix));
    }
  };

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

  const filteredPresets = POOL_DESIGN_PRESETS.filter((p) => {
    if (formatFilter === "all") return true;
    return p.category === formatFilter;
  });

  const selectedPreset = POOL_DESIGN_PRESETS.find((p) => p.id === selectedPresetId);

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
              Select your contest format and set up a private league for your friends.
            </p>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* 1. Pool Format Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
                  Select Contest Format
                </label>

                {/* Category Filter Chips */}
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFormatFilter("all")}
                    className={`px-2 py-0.5 rounded-md transition font-medium ${
                      formatFilter === "all"
                        ? "bg-zinc-700 text-white font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormatFilter("postseason")}
                    className={`px-2 py-0.5 rounded-md transition font-medium ${
                      formatFilter === "postseason"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Playoffs
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormatFilter("regular_season")}
                    className={`px-2 py-0.5 rounded-md transition font-medium ${
                      formatFilter === "regular_season"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Regular Season
                  </button>
                </div>
              </div>

              {/* Format Cards */}
              <div className="space-y-2.5">
                {filteredPresets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  const isPlayoffs = preset.format === "playoff_challenge";

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectFormat(preset.id)}
                      className={`w-full text-left p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? isPlayoffs
                            ? "bg-amber-950/25 border-amber-500/60 shadow-lg shadow-amber-950/20"
                            : "bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/20"
                          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950/80"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Format Icon */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5 ${
                            isSelected
                              ? isPlayoffs
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : "bg-zinc-900 text-zinc-500 border-zinc-800"
                          }`}
                        >
                          {preset.format === "playoff_challenge" ? (
                            <Trophy className="w-5 h-5" />
                          ) : preset.format === "straight_up" ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : preset.format === "against_spread" ? (
                            <Scale className="w-5 h-5" />
                          ) : (
                            <ShieldAlert className="w-5 h-5" />
                          )}
                        </div>

                        {/* Title & Summary */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">
                              {preset.title}
                            </span>

                            {/* Postseason / Regular Season Tag */}
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                                isPlayoffs
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
                              }`}
                            >
                              {preset.category === "postseason"
                                ? "Postseason"
                                : "Regular Season"}
                            </span>

                            {/* Badge */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                preset.isPlaceholder
                                  ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                  : isPlayoffs
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              }`}
                            >
                              {preset.badge}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-400">
                            {preset.summary}
                          </p>

                          {/* Rule Pills */}
                          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            {preset.rulesPreview.slice(0, 3).map((rule, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded-md"
                              >
                                {rule}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Selection Radio Circle */}
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                          isSelected
                            ? isPlayoffs
                              ? "border-amber-400 bg-amber-500 text-zinc-950"
                              : "border-emerald-400 bg-emerald-500 text-zinc-950"
                            : "border-zinc-700 bg-zinc-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Format-Specific Configuration Preview */}
              {selectedPresetId === "playoff_challenge" && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/20 via-zinc-900 to-zinc-950 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Playoff Challenge Rules Summary
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Active Format
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                        Roster Composition
                      </span>
                      <span className="text-white font-bold">
                        1 QB, 2 RB, 2 WR, 1 TE, 1 K, 1 DEF
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                        Consecutive Multipliers
                      </span>
                      <span className="text-amber-300 font-bold">
                        1x → 2x → 3x → 4x Points Streak
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                        Scoring Format
                      </span>
                      <span className="text-emerald-300 font-bold">
                        Full PPR (1.0 point per reception)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                        Wild Card Bye Strategy
                      </span>
                      <span className="text-sky-300 font-bold">
                        #1 Seeds Active for 2x Divisional Boost
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Pool Name */}
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
                placeholder={
                  selectedPresetId === "playoff_challenge"
                    ? "e.g. 2026 Playoff Fantasy Challenge"
                    : "e.g. Sunday Friends League"
                }
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none transition"
              />
            </div>

            {/* 3. Invite Code */}
            <div className="space-y-2">
              <label
                htmlFor="join-code"
                className="text-xs font-bold uppercase tracking-wider text-zinc-300 block"
              >
                Custom Invite Code
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
                Share this passcode with your friends so they can join your pool.
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
              className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 shadow-lg shadow-emerald-500/20"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>
                    Create{" "}
                    {selectedPresetId === "playoff_challenge"
                      ? "Playoff Challenge Pool"
                      : "Pool"}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
