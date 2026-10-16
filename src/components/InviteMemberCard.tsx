"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  Share2,
  Copy,
  Check,
  Mail,
  Smartphone,
  QrCode,
  MessageSquare,
  Download,
  X,
} from "lucide-react";

interface InviteMemberCardProps {
  poolName?: string;
  poolSlug?: string;
  inviterName?: string;
  variant?: "full" | "compact";
  className?: string;
}

export function InviteMemberCard({
  poolName = "2026 NFL Weekly Pick'em",
  poolSlug = "nfl-2026-weekly",
  inviterName = "Pool Leader",
  className = "",
}: InviteMemberCardProps) {
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);

  // Dynamically compute invite URL based on window.location.origin
  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      const params = new URLSearchParams({
        join: poolSlug,
        invited_by: inviterName,
      });
      const generated = `${origin}/?${params.toString()}`;
      setInviteUrl(generated);

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        setSupportsNativeShare(true);
      }
    }
  }, [poolSlug, inviterName]);

  // Generate crisp QR code whenever inviteUrl updates
  useEffect(() => {
    if (!inviteUrl) return;
    QRCode.toDataURL(inviteUrl, {
      width: 320,
      margin: 1.5,
      color: {
        dark: "#10b981", // Emerald 500
        light: "#09090b", // Zinc 950
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [inviteUrl]);

  // 1-Click Copy Link with visual feedback
  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2200);
    } catch {
      window.prompt("Copy invite link:", inviteUrl);
    }
  };

  // SMS Handler (formats correctly for both iOS and Android)
  const handleSmsShare = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inviteUrl) return;
    const text = `Hey, join our ${poolName}! Make your weekly NFL picks and compete on the leaderboard: ${inviteUrl}`;
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUrl = isIOS
      ? `sms:&body=${encodeURIComponent(text)}`
      : `sms:?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
  };

  // Pre-formatted Email link
  const getMailtoUrl = () => {
    if (!inviteUrl) return "#";
    const subject = `🏈 Join our ${poolName}!`;
    const body = `Hey,\n\nYou're invited to join our ${poolName}!\n\nSubmit your weekly straight-up picks and compete on the live scoreboard:\n${inviteUrl}\n\n• 100% free to play\n• Straight-up winners (1 pt each)\n• Monday Night Football tiebreaker\n\nSee you on the leaderboard!`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Native Share Sheet or WhatsApp Web fallback
  const handleShareSheet = async () => {
    if (!inviteUrl) return;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Join our ${poolName}!`,
          text: `Hey, make your weekly picks in our ${poolName}. Join here:`,
          url: inviteUrl,
        });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    // Fallback: Open WhatsApp with prefilled message
    const waUrl = `https://wa.me/?text=${encodeURIComponent(
      `Hey, join our ${poolName}! Make your weekly picks: ${inviteUrl}`
    )}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Download QR Code image
  const handleDownloadQr = () => {
    if (!qrCodeDataUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeDataUrl;
    link.download = `${poolSlug}-invite-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6 text-zinc-100 ${className}`}
    >
      {/* 1. Card Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 pb-5">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Invite to Pool
          </h2>
        </div>

        {/* Pool Code Pill */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3 py-1.5 flex items-center space-x-2 text-xs transition cursor-pointer"
          title="Click to copy pool code"
        >
          <span className="text-zinc-500 text-[11px] font-medium">Pool Code:</span>
          <code className="text-emerald-400 font-mono font-bold tracking-wider">{poolSlug}</code>
        </button>
      </div>

      {/* 2. Hero Action: Direct Link Copy Bar */}
      <div className="space-y-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
          Shareable Invitation Link
        </label>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            onClick={(e) => {
              (e.target as HTMLInputElement).select();
              handleCopyLink();
            }}
            placeholder="Generating invite link..."
            className="flex-1 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl py-3 px-3.5 text-xs sm:text-sm font-mono text-zinc-200 select-all focus:outline-none focus:border-emerald-500 transition cursor-pointer"
          />

          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 transition-all active:scale-95 shrink-0 cursor-pointer shadow-md ${
              copySuccess
                ? "bg-emerald-500 text-zinc-950 shadow-emerald-500/20"
                : "bg-zinc-100 hover:bg-white text-zinc-950"
            }`}
          >
            {copySuccess ? (
              <>
                <Check className="w-4 h-4 text-zinc-950" strokeWidth={2.5} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Instant Share Channels: Clean Icon + Label Buttons (No Subtitles) */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
          Instant Share Channels
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Email */}
          <a
            href={getMailtoUrl()}
            className="flex items-center justify-center space-x-2.5 py-3.5 px-4 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs sm:text-sm font-semibold text-white transition active:scale-95"
          >
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            <span>Email</span>
          </a>

          {/* Text / SMS */}
          <button
            type="button"
            onClick={handleSmsShare}
            className="flex items-center justify-center space-x-2.5 py-3.5 px-4 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs sm:text-sm font-semibold text-white transition active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 shrink-0" />
            <span>Text / SMS</span>
          </button>

          {/* Share Apps / WhatsApp */}
          <button
            type="button"
            onClick={handleShareSheet}
            className="flex items-center justify-center space-x-2.5 py-3.5 px-4 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs sm:text-sm font-semibold text-white transition active:scale-95 cursor-pointer"
          >
            {supportsNativeShare ? (
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
            ) : (
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            )}
            <span>{supportsNativeShare ? "Share Apps" : "WhatsApp"}</span>
          </button>

          {/* QR Code Toggle */}
          <button
            type="button"
            onClick={() => setShowQrCode(!showQrCode)}
            className={`flex items-center justify-center space-x-2.5 py-3.5 px-4 border rounded-xl text-xs sm:text-sm font-semibold text-white transition active:scale-95 cursor-pointer ${
              showQrCode
                ? "bg-purple-950/40 border-purple-500/50"
                : "bg-zinc-950 hover:bg-zinc-850 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 shrink-0" />
            <span>{showQrCode ? "Hide QR" : "Scan QR"}</span>
          </button>
        </div>
      </div>

      {/* 4. Expandable QR Code Drawer */}
      {showQrCode && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5">
              <QrCode className="w-4 h-4 text-purple-400" />
              <span>Scan with Camera to Join</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowQrCode(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
              title="Close QR Code"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            {/* High Contrast QR Code */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-lg shrink-0">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`QR code to join ${poolName}`}
                  className="w-48 h-48 rounded-xl"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-zinc-500">
                  Generating code...
                </div>
              )}
            </div>

            {/* QR Quick Details & Actions */}
            <div className="space-y-3 text-center sm:text-left max-w-xs">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold block">
                  Pool Contest
                </span>
                <span className="text-sm font-bold text-white">{poolName}</span>
              </div>

              <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Download Image</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{copySuccess ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
