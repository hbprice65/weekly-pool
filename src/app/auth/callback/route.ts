import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next") ?? "/";
  // Enforce safe relative redirect path (must start with single '/', never '//' or external scheme)
  const safeNext =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(safeNext, origin));
      }
      console.error("Supabase OAuth code exchange error:", error.message);
    }
  }

  // Fallback to home with error parameter if code exchange fails
  return NextResponse.redirect(new URL("/?auth_error=oauth_exchange_failed", origin));
}
