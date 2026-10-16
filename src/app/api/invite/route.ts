import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface InviteRequestBody {
  email?: string;
  name?: string;
  inviterName?: string;
  poolSlug?: string;
  poolName?: string;
  customNote?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: InviteRequestBody = await request.json();
    const {
      email,
      name = "",
      inviterName = "Pool Leader",
      poolSlug = "nfl-2026-weekly",
      poolName = "2026 NFL Weekly Pick'em",
      customNote = "",
    } = body;

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "A valid recipient email address is required." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Determine host origin for the invite link
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "weekly-pool-iota.vercel.app";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const origin = `${proto}://${host}`;

    // Construct the direct join URL
    const params = new URLSearchParams({
      join: poolSlug,
      invited_by: inviterName,
    });
    if (name) {
      params.set("recipient", name);
    }
    const inviteUrl = `${origin}/?${params.toString()}`;

    // Construct formatted email body and subject for mailto fallback or client email
    const subject = `🏈 You're invited to join ${poolName}!`;
    const emailBody = [
      `Hey${name ? ` ${name}` : ""},`,
      ``,
      `${inviterName} has invited you to join the ${poolName}!`,
      ``,
      `Click the link below to join the pool and make your picks:`,
      `${inviteUrl}`,
      ``,
      customNote ? `Message from ${inviterName}:\n"${customNote}"\n` : ``,
      `Rules & Format:`,
      `• Straight-up winners (1 pt per correct pick)`,
      `• Monday Night Football score tiebreaker`,
      `• Free to play with live weekly scoreboard & season standings`,
      ``,
      `See you on the leaderboard!`,
    ]
      .filter((line) => line !== undefined)
      .join("\n");

    const mailtoUrl = `mailto:${encodeURIComponent(trimmedEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(emailBody)}`;

    // If Supabase Service Role Key is configured, attempt admin user invite
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let authInviteTriggered = false;

    if (supabaseUrl && serviceRoleKey) {
      try {
        const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
          trimmedEmail,
          {
            redirectTo: inviteUrl,
            data: {
              invited_to_pool: poolSlug,
              invited_by: inviterName,
            },
          }
        );

        if (!inviteError) {
          authInviteTriggered = true;
        } else {
          console.warn("Supabase Auth admin invite note:", inviteError.message);
        }
      } catch (err) {
        console.warn("Supabase admin invite could not be triggered:", err);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: authInviteTriggered
          ? `Invite email successfully dispatched to ${trimmedEmail} via Supabase Auth!`
          : `Invite link generated successfully for ${trimmedEmail}!`,
        authInviteTriggered,
        inviteUrl,
        mailtoUrl,
        recipientEmail: trimmedEmail,
        recipientName: name,
        poolSlug,
        poolName,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Invite API route error:", message);
    return NextResponse.json(
      { error: "Failed to generate invite.", details: message },
      { status: 500 }
    );
  }
}
