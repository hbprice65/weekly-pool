# NFL Weekly Picks Pool

A modern, full-stack NFL Weekly Picks Pool web application built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS**, and architected for **Supabase** and **Vercel**.

---

## 🏈 Features (Phase 1 MVP)

- **Interactive Matchup Picker**: Select weekly game winners with visual feedback, kickoff timestamps, network broadcasts, and spreads.
- **Monday Night Football Tiebreaker**: Submit total score predictions to break standings ties.
- **Leaderboard & Standings**: Real-time pool rankings tracking weekly points, season totals, and pick accuracy.
- **Official Rules & Guidelines**: Clear documentation for straight-up scoring, lock times, and fair play.
- **Local Persistence & Demo Mode**: Test and make picks immediately without needing backend credentials.
- **Supabase Ready**:
  - Full PostgreSQL database schema in `supabase/schema.sql` with Row Level Security (RLS) policies.
  - Browser and Server Supabase clients configured with `@supabase/ssr`.
- **Vercel Ready**: Optimized for zero-configuration deployment to Vercel.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the pool in your browser.

---

## 🗄️ Connecting Supabase (When Ready)

1. Create a project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase project dashboard and execute the script in:
   ```bash
   supabase/schema.sql
   ```
3. Copy your project URL and anon public key from **Project Settings > API**.
4. Create a `.env.local` file from the example:
   ```bash
   cp .env.local.example .env.local
   ```
5. Add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## ☁️ Deploying to Vercel

1. Push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Complete Phase 1: NFL Weekly Picks Pool foundation"
   git push origin main
   ```
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import `hbprice65/weekly-pool`.
4. (Optional) Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables.
5. Click **Deploy**.
