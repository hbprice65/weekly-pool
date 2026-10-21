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
  getActivePoolId,
  getSavedActivePool,
  setActivePoolId,
  setSavedActivePool,
} from "@/lib/supabase/picks-service";
import {
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  Trophy,
  CheckCircle2,
  Scale,
  ShieldAlert,
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

  // Active pool for header reference
  const [activePoolName, setActivePoolName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = getSavedActivePool();
      if (saved?.name) {
        setActivePoolName(saved.name);
      }
      const params = new URLSearchParams(window.location.search);
      const fmt = params.get("format");
      if (fmt === "playoff_challenge" || fmt === "playoffs") {
        setSelectedPresetId("playoff_challenge");
        setPreviewJoinCode(generateJoinCode("PLAYOFF"));
        return;
      }
      setPreviewJoinCode(generateJoinCode("NFL"));
    }

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

  const selectedPreset =
    POOL_DESIGN_PRESETS.find((p) => p.id === selectedPresetId) ||
    POOL_DESIGN_PRESETS[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header Bar — Matching site-wide container width and styling */}
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
              Create a Pool
            </h1>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            {activePoolName && (
              <Link
                href="/"
                className="flex items-center space-x-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs hover:bg-emerald-500/15 transition"
                title={`Active Pool: ${activePoolName}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-zinc-400 hidden sm:inline">Active:</span>
                <span className="font-bold text-emerald-400 truncate max-w-[140px] sm:max-w-[200px]">
                  {activePoolName}
                </span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area — Consistent max-w-5xl width with account & subpages */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Create a New Pool
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Choose your game format and configure your private league.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Format Selection & Rules */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Select Contest Format
              </label>

              {/* Format Cards Grid — Clean typography, no filters, no bubbly text pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {POOL_DESIGN_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  const isPlaceholder = preset.isPlaceholder;

                  if (isPlaceholder) {
                    return (
                      <div
                        key={preset.id}
                        className="p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/30 opacity-60 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700/50 flex items-center justify-center">
                              {preset.format === "against_spread" ? (
                                <Scale className="w-4 h-4" />
                              ) : (
                                <ShieldAlert className="w-4 h-4" />
                              )}
                            </div>
                            <span className="text-xs text-zinc-500">Coming soon</span>
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-zinc-300 block">
                              {preset.title}
                            </span>
                            <span className="text-xs text-zinc-500 block">
                              {preset.format === "against_spread"
                                ? "Against the Spread"
                                : "Survivor Elimination"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 leading-relaxed">
                            {preset.summary}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  const isPlayoffs = preset.format === "playoff_challenge";

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectFormat(preset.id)}
                      className={`w-full text-left p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? isPlayoffs
                            ? "border-amber-500/80 bg-zinc-900 ring-1 ring-amber-500/40"
                            : "border-emerald-500/80 bg-zinc-900 ring-1 ring-emerald-500/40"
                          : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="space-y-2.5 w-full">
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                              isSelected
                                ? isPlayoffs
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700/60"
                            }`}
                          >
                            {isPlayoffs ? (
                              <Trophy className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </div>

                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                              isSelected
                                ? isPlayoffs
                                  ? "border-amber-400 bg-amber-500 text-zinc-950"
                                  : "border-emerald-400 bg-emerald-500 text-zinc-950"
                                : "border-zinc-700 bg-zinc-850"
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </div>
                        </div>

                        <div>
                          <span className="text-sm font-semibold text-white block">
                            {preset.title}
                          </span>
                          <span className="text-xs text-zinc-400 block mt-0.5">
                            {isPlayoffs
                              ? "Postseason Fantasy Roster"
                              : "Weekly Straight-Up Pick'em"}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {preset.summary}
                        </p>

                        <ul className="pt-1.5 space-y-1 text-xs text-zinc-400">
                          {preset.rulesPreview.slice(0, 3).map((rule, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-zinc-500 leading-tight">•</span>
                              <span className="leading-tight">{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Format Rules & Specs Details */}
            {selectedPresetId === "playoff_challenge" ? (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400/90 block">
                  Playoff Challenge Rules Summary
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-0.5">
                      Roster Composition
                    </span>
                    <span className="text-white font-medium">
                      1 QB, 2 RB, 2 WR, 1 TE, 1 K, 1 DEF
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-0.5">
                      Consecutive Multipliers
                    </span>
                    <span className="text-amber-300 font-medium">
                      1x → 2x → 3x → 4x Weekly Streak
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-0.5">
                      Scoring Format
                    </span>
                    <span className="text-emerald-300 font-medium">
                      Full PPR (1.0 pt per reception)
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-0.5">
                      Wild Card Bye Strategy
                    </span>
                    <span className="text-sky-300 font-medium">
                      #1 Seeds Eligible for 2x Divisional Boost
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400/90 block">
                  Straight-Up Pick&apos;em Rules Summary
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-0.5">
                      Scoring
                    </span>
                    <span className="text-white font-medium">
                      1 point per correct game winner
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-0.5">
                      Pick Lock Time
                    </span>
                    <span className="text-white font-medium">
                      Individual kickoff for each game
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80">
                    <span className="text-zinc-500 block mb-0.5">
                      Tiebreaker
                    </span>
                    <span className="text-emerald-300 font-medium">
                      Monday Night Football total points
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pool Setup Details Form */}
          <div className="lg:col-span-5">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
              <div>
                <h2 className="text-base font-bold text-white">
                  Pool Details
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Set league name and invite passcode.
                </p>
              </div>

              {/* Selected Format Summary Bar */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-500 block">Format</span>
                  <span className="text-white font-semibold">
                    {selectedPreset.title}
                  </span>
                </div>
                <span className="text-zinc-400 text-xs">
                  {selectedPreset.category === "postseason"
                    ? "Postseason"
                    : "Regular Season"}
                </span>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Pool Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="pool-name"
                    className="text-xs font-semibold text-zinc-300 block"
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
                        : "e.g. Sunday Pick'em League"
                    }
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none transition"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Must be at least 3 characters.
                  </p>
                </div>

                {/* Invite Code */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="join-code"
                    className="text-xs font-semibold text-zinc-300 block"
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
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-sm font-mono font-bold text-emerald-400 placeholder:text-zinc-600 focus:outline-none transition"
                  />
                  <p className="text-[11px] text-zinc-500">
                    Friends will use this code to join. Leave blank to auto-generate.
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
                  className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 shadow-md shadow-emerald-500/10"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>
                      Create{" "}
                      {selectedPresetId === "playoff_challenge"
                        ? "Playoff Challenge Pool"
                        : "Pool"}
                    </span>
                  )}
                </button>

                <p className="text-[11px] text-zinc-500 text-center">
                  You will automatically become the commissioner of this pool.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
