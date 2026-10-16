"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  LogIn,
  UserPlus,
  LogOut,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onAuthStateChanged: () => void;
}

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setMessage({ type: "error", text: "Service temporarily unavailable." });
      return;
    }

    setGoogleLoading(true);
    setMessage(null);

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://weekly-pool-iota.vercel.app";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setMessage({
          type: "error",
          text: error.message || "Google sign-in failed. Please try with email.",
        });
        setGoogleLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: msg });
      setGoogleLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMessage({ type: "error", text: "Service temporarily unavailable." });
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
          setMessage({
            type: "error",
            text: error.message,
          });
        } else if (data.session) {
          setMessage({ type: "success", text: "Account created and signed in!" });
          setTimeout(() => {
            onAuthStateChanged();
            onClose();
          }, 800);
        } else {
          setMessage({
            type: "warning",
            text: "Account registered! Check your email to confirm your account.",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
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
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {currentUser
                ? "User Profile & Account"
                : "Sign In to Weekly Pool"}
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            {currentUser
              ? "Signed in profile and account settings."
              : "Sign in to save your picks and join the live leaderboard."}
          </p>
        </div>

        {/* Current User Logged In State */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-3 text-xs">
              <div className="flex items-center space-x-3 pb-2 border-b border-zinc-800/60">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name || "User Avatar"}
                    className="w-10 h-10 rounded-full object-cover border border-emerald-500/40 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-500/30">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white text-sm truncate">
                    {currentUser.name || currentUser.email?.split("@")[0] || "Pool Member"}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {currentUser.email || "Authenticated User"}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 font-medium capitalize shrink-0">
                  {currentUser.provider === "google" ? "Google" : "Email"}
                </span>
              </div>

              <div className="flex items-center space-x-1.5 pt-1 text-emerald-400 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Picks synced to this account</span>
              </div>
            </div>

            <a
              href="/account"
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition active:scale-98"
            >
              <User className="w-4 h-4" />
              <span>My Pools &amp; Account Settings</span>
            </a>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 border border-zinc-700 transition active:scale-98"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>Sign Out / Switch User</span>
            </button>
          </div>
        ) : (
          /* Logged Out: Google OAuth + Email Form */
          <div className="space-y-4">
            {/* 1-Click Google Sign In */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2.5 transition shadow-sm active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                ) : (
                  <GoogleIcon className="w-4 h-4" />
                )}
                <span>Continue with Google</span>
              </button>
              <p className="text-[10px] text-center text-zinc-500 mt-1.5">
                Instant 1-click login • No passwords • No email rate limits
              </p>
            </div>

            {/* Separator */}
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                Or with email
              </span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

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

            {/* Form for Email / Password */}
            <form onSubmit={handleAuth} className="space-y-3">
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
                      : message.type === "warning"
                      ? "bg-amber-950/40 text-amber-300 border-amber-800/60"
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
                disabled={loading || googleLoading}
                className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition shadow-md shadow-emerald-500/20 active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === "signin" ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>
                  {loading ? "Processing..." : mode === "signin" ? "Sign In with Email" : "Create Pool Account"}
                </span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
