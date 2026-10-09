// Verification Script: Check live Supabase database for saved picks per user
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.resolve(__dirname, "../.env.local");
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...values] = trimmed.split("=");
      const val = values.join("=").replace(/^["']|["']$/g, "").trim();
      if (key === "NEXT_PUBLIC_SUPABASE_URL") supabaseUrl = val;
      if (
        key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" ||
        key === "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      ) {
        if (!supabaseAnonKey) supabaseAnonKey = val;
      }
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verify() {
  console.log("\n==================================================");
  console.log("   🏈 SUPABASE PICKS VERIFICATION REPORT");
  console.log("==================================================");
  console.log("Connected to:", supabaseUrl);

  // 1. Check Weeks
  const { data: weeks, error: weeksErr } = await supabase.from("weeks").select("*");
  if (weeksErr) {
    console.error("❌ Weeks query failed:", weeksErr.message);
  } else {
    console.log(`\n📅 Weeks configured in DB: ${weeks.length}`);
    weeks.forEach((w) => console.log(`   - Week ${w.week_number}: ${w.title} (Locked: ${w.lock_date})`));
  }

  // 2. Check Games
  const { data: games, error: gamesErr } = await supabase.from("games").select("*");
  if (gamesErr) {
    console.error("❌ Games query failed:", gamesErr.message);
  } else {
    console.log(`🏈 Matchups loaded in DB: ${games.length}`);
  }

  // 3. Check Picks per User
  const { data: picks, error: picksErr } = await supabase.from("picks").select("*");
  if (picksErr) {
    console.error("❌ Picks query failed:", picksErr.message);
  } else {
    console.log(`\n📊 Total Picks saved in public.picks: ${picks.length}`);

    // Group picks by user_id
    const userPicks = {};
    for (const pick of picks) {
      if (!userPicks[pick.user_id]) userPicks[pick.user_id] = [];
      userPicks[pick.user_id].push(pick);
    }

    const userCount = Object.keys(userPicks).length;
    console.log(`👥 Unique users with saved picks: ${userCount}`);

    if (userCount === 0) {
      console.log("   ℹ️  No picks saved yet. Select picks in the web UI and click 'Save Picks'!");
    } else {
      for (const [userId, userPickList] of Object.entries(userPicks)) {
        console.log(`\n   👤 User: ${userId}`);
        console.log(`      Picks Count: ${userPickList.length}`);
        console.table(
          userPickList.map((p) => ({
            Game: p.game_id,
            Pick: p.selected_team,
            Updated: p.updated_at,
          }))
        );
      }
    }
  }

  // 4. Check Tiebreakers
  const { data: tiebreakers, error: tieErr } = await supabase.from("tiebreakers").select("*");
  if (!tieErr && tiebreakers) {
    console.log(`\n🎯 Tiebreakers saved: ${tiebreakers.length}`);
    tiebreakers.forEach((t) => {
      console.log(`   - User: ${t.user_id} | MNF Prediction: ${t.predicted_mnf_score} pts`);
    });
  }

  console.log("\n==================================================\n");
}

verify().catch(console.error);
