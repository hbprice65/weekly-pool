# 🏈 NFL Weekly Pool

A web app for running an NFL weekly pick'em pool. Make straight-up picks each week, predict the Monday Night Football tiebreaker score, track live scores via ESPN, and see where everyone stands on the weekly scoreboard and season standings.

## Features

- **Make Picks**: Pick winners straight-up for every game on the slate and submit a Monday Night Football total points prediction for the tiebreaker. Picks lock automatically at game kickoff.
- **Weekly Scoreboard**: Live ESPN scores alongside a "Who Picked Who" matrix showing every participant's pick and live game status.
- **Standings & Stats**: Season-long and lifetime standings tracking total points, picks record, clutch record (performance in SNF and MNF games when within 2 points of the weekly lead at kickoff), and tiebreaker records.
- **Tiebreaker Scoring**: When members tie for first place at the end of the week, the participant closest to the final MNF total score earns an extra point to break the tie and win the week.
- **Authentication**: Sign in with Google OAuth or email via Supabase.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **UI & Styling**: React, Tailwind CSS, Lucide Icons
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Row-Level Security)
- **Scores & Schedules**: Live data from the ESPN Scoreboard API

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_NAME="NFL Weekly Pool"
NEXT_PUBLIC_SEASON_YEAR=2026
```

### 3. Database Setup

Run the SQL migration in your Supabase SQL Editor:
- [`supabase/schema_v2.sql`](file:///c:/Users/hbpri/weekly-pool/supabase/schema_v2.sql): sets up `profiles`, `pools`, `games`, `picks`, and `tiebreakers` tables along with Row-Level Security policies.

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` — Starts the local development server
- `npm run build` — Builds the application for production
- `npm run lint` — Runs ESLint checks
