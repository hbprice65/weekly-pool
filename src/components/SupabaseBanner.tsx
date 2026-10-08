"use client";

import React, { useState } from "react";
import { Database, ChevronDown, ChevronUp, Copy, Check, Sparkles } from "lucide-react";

interface SupabaseBannerProps {
  isConfigured: boolean;
}

export function SupabaseBanner({ isConfigured }: SupabaseBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isConfigured) {
    return (
      <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-300">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>
            Connected to <strong>Supabase</strong>. Live database and authentication are active.
          </span>
        </div>
      </div>
    );
  }

  const copyEnvSnippet = () => {
    navigator.clipboard.writeText(
      `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-white">
                Phase 1 MVP Ready • Local Interactive Demo Mode
              </h4>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                Vercel & Supabase Ready
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Picks and standings work locally now. Connect Supabase anytime to enable multi-user sync and authentication.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700/80 px-3 py-1.5 rounded-lg border border-zinc-700 transition flex items-center justify-center space-x-1 self-start sm:self-auto"
        >
          <span>{isExpanded ? "Hide Setup Guide" : "Supabase & Vercel Guide"}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3 text-xs text-zinc-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 space-y-2">
              <span className="font-semibold text-emerald-400 block">
                1. Supabase Database Schema
              </span>
              <p className="text-zinc-400">
                A complete PostgreSQL migration schema with Row Level Security is already generated in:
              </p>
              <code className="block bg-zinc-900 px-2 py-1.5 rounded text-[11px] font-mono text-zinc-200 border border-zinc-800">
                supabase/schema.sql
              </code>
              <p className="text-zinc-500 text-[11px]">
                Paste this schema into your Supabase SQL Editor to initialize the tables, triggers, and security rules.
              </p>
            </div>

            <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400">
                  2. Environment Variables (.env.local)
                </span>
                <button
                  onClick={copyEnvSnippet}
                  className="flex items-center space-x-1 text-[11px] text-zinc-400 hover:text-white"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-zinc-400">
                Add your Supabase project keys to <code className="text-zinc-200 font-mono">.env.local</code>:
              </p>
              <pre className="bg-zinc-900 p-2 rounded text-[11px] font-mono text-zinc-300 overflow-x-auto border border-zinc-800">
                NEXT_PUBLIC_SUPABASE_URL=...{"\n"}
                NEXT_PUBLIC_SUPABASE_ANON_KEY=...
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
