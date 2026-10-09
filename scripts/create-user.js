// Script to create auto-confirmed Supabase users directly (bypasses email confirmation & rate limits)
// Usage: node scripts/create-user.js <email> <password>
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...values] = trimmed.split("=");
      const val = values.join("=").replace(/^["']|["']$/g, "").trim();
      if (key === "NEXT_PUBLIC_SUPABASE_URL") supabaseUrl = val;
      if (key === "SUPABASE_SERVICE_ROLE_KEY") serviceRoleKey = val;
    }
  }
}

const email = process.argv[2] || "player1@gmail.com";
const password = process.argv[3] || "PoolPassword123!";

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
  process.exit(1);
}

if (!serviceRoleKey || serviceRoleKey === "your-service-role-key") {
  console.log("\n⚠️  SUPABASE_SERVICE_ROLE_KEY is not set in .env.local.");
  console.log("To create auto-confirmed test users via terminal:");
  console.log("1. Get your service_role secret from: Supabase Dashboard > Project Settings > API");
  console.log("2. Add it to .env.local: SUPABASE_SERVICE_ROLE_KEY=your-key");
  console.log("\nAlternatively, you can simply turn OFF 'Confirm email' in the Supabase Dashboard:");
  console.log("   Authentication > Providers > Email > Confirm email [Toggle OFF]\n");
  process.exit(0);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createUser() {
  console.log(`\nCreating pre-confirmed user: ${email}...`);
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error("❌ Error creating user:", error.message);
  } else {
    console.log("✅ User created successfully!");
    console.log(`   Email: ${data.user.email}`);
    console.log(`   User ID: ${data.user.id}`);
    console.log("   Email Confirmed: TRUE");
    console.log("\nYou can now sign in immediately with this email & password in the web app!\n");
  }
}

createUser().catch(console.error);
