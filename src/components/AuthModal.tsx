"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, LogIn, UserPlus, LogOut, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; email?: string } | null;
  onAuthStateChanged: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onAuthStateChanged,
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isOpen) return null;

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase client is not configured." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage({ type: "error", text: error.message });
        } else {
          setMessage({ type: "success", text: "Successfully signed in!" });
          setTimeout(() => {
            onAuthStateChanged();
            onClose();
          }, 800);
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setMessage({ type: "error", text: error.message });
        } else if (data.session) {
          setMessage({ type: "success", text: "Account created and signed in!" });
          setTimeout(() => {
            onAuthStateChanged();
            onClose();
          }, 800);
        } else {
          setMessage({
            type: "success",
            text: "Account registered! If email confirmation is required in your project, check your inbox or sign in.",
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    setMessage({ type: "success", text: "Signed out successfully." });
    setTimeout(() => {
      onAuthStateChanged();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {currentUser ? "User Profile & Account" : mode === "signin" ? "Sign In to Save Picks" : "Create Pool Account"}
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            {currentUser
              ? "Your picks are tied directly to this user ID in Supabase."
              : "Sign in with your email to persist and verify your weekly picks in Supabase."}
          </p>
        </div>

        {/* Current User Logged In State */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Account Email:</span>
                <span className="font-semibold text-white">{currentUser.email || "Authenticated User"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Supabase User ID:</span>
                <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 max-w-[210px] truncate">
                  {currentUser.id}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 pt-1 text-emerald-400 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Picks will sync to public.picks for this user ID</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 border border-zinc-700 transition"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              <span>Sign Out / Switch User</span>
            </button>
          </div>
        ) : (
          /* Form for Signing In or Signing Up */
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setMessage(null);
                }}
                className={`py-1.5 rounded-lg transition ${
                  mode === "signin"
                    ? "bg-zinc-800 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage(null);
                }}
                className={`py-1.5 rounded-lg transition ${
                  mode === "signup"
                    ? "bg-zinc-800 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label htmlFor="auth-email" className="text-xs font-medium text-zinc-300">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label htmlFor="auth-password" className="text-xs font-medium text-zinc-300">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 placeholder:text-zinc-600"
              />
            </div>

            {/* Message alert */}
            {message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start space-x-2 border ${
                  message.type === "success"
                    ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/60"
                    : "bg-rose-950/40 text-rose-300 border-rose-800/60"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition shadow-md shadow-emerald-500/20 active:scale-98"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "signin" ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>{loading ? "Processing..." : mode === "signin" ? "Sign In" : "Sign Up"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
