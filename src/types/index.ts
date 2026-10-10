/**
/**
 * @file index.ts
 * @description Core domain models, enums, and types for the Weekly Sports Pool application.
 * Designed with a modular architecture to support multiple sports, leagues, and pool formats.
 */

// ==============================================================================
// 1. EXTENSIBILITY TYPES (Multi-Sport, Multi-League, Multi-Format)
// ==============================================================================

/** Supported sports across the platform */
export type SportType = "football" | "basketball" | "baseball" | "soccer" | "hockey";

/** Supported leagues across the platform */
export type LeagueType = "nfl" | "ncaaf" | "nba" | "mlb" | "epl";

/** Supported game formats / contest rules */
export type PoolFormat = "straight_up" | "against_spread" | "survivor" | "confidence";

/** Default featured public pool ID (seeded in schema_v2.sql) */
export const DEFAULT_POOL_ID = "00000000-0000-0000-0000-000000000001";

/** Default featured public pool URL slug */
export const DEFAULT_POOL_SLUG = "nfl-2026-weekly";

/**
 * Representation of a contest / tournament pool.
 * Supports public pools and private pools with join codes.
 */
export interface Pool {
  /** Unique UUID identifier */
  id: string;
  /** Display title, e.g. "2026 NFL Weekly Pick'em" */
  name: string;
  /** URL-friendly slug, e.g. "nfl-2026-weekly" */
  slug: string;
  /** Optional descriptive subtitle or summary */
  description?: string;
  /** Sport category */
  sport: SportType;
  /** League identifier */
  league: LeagueType;
  /** Scoring rules format */
  format: PoolFormat;
  /** Season calendar year */
  seasonYear: number;
  /** Whether anyone can view and join without a private code */
  isPublic: boolean;
  /** Optional private join passcode for private office leagues */
  joinCode?: string;
  /** Supabase Auth user ID of the pool administrator/creator */
  creatorId?: string;
  /** Flexible JSON configuration (tiebreakers, deadline rules, drop lowest weeks) */
  settings?: Record<string, unknown>;
  /** Timestamp when the pool was provisioned */
  createdAt?: string;
}

/**
 * Association linking users to the pools they belong to.
 */
export interface PoolMember {
  /** Target pool UUID */
  poolId: string;
  /** Participant Supabase Auth UUID */
  userId: string;
  /** Membership privilege level */
  role: "admin" | "member";
  /** Timestamp when user enrolled in pool */
  joinedAt: string;
}

// ==============================================================================
// 2. SPORTS & GAME DATA MODELS
// ==============================================================================

export type NFLConference = "AFC" | "NFC";
export type NFLDivision = "East" | "North" | "South" | "West";

/**
 * Normalized team profile with branding, records, and logos.
 */
export interface NFLTeam {
  /** Standard 2 or 3-letter team abbreviation code, e.g. "KC", "SF" */
  id: string;
  /** Team nickname, e.g. "Chiefs" */
  name: string;
  /** Home city or geographic region, e.g. "Kansas City" */
  city: string;
  /** Full formal name, e.g. "Kansas City Chiefs" */
  fullName: string;
  /** NFL Conference */
  conference: NFLConference;
  /** NFL Division */
  division: NFLDivision;
  /** Primary brand HEX color code */
  primaryColor: string;
  /** Secondary brand HEX color code */
  secondaryColor: string;
  /** Current season win-loss record, e.g. "5-1" */
  record?: string;
  /** High-resolution team shield/logo image URL */
  logoUrl?: string;
}

/** Lifecycle state of a scheduled game */
export type GameStatus = "SCHEDULED" | "IN_PROGRESS" | "FINAL";

/**
 * Individual matchup event.
 * Compatible with ESPN Scoreboard API and persisted in Supabase public.games.
 */
export interface Game {
  /** Event identifier (e.g. ESPN event ID "401671802" or internal ID) */
  id: string;
  /** Sport category (defaults to "football") */
  sport?: SportType;
  /** League identifier (defaults to "nfl") */
  league?: LeagueType;
  /** Scheduled season week number (1-18 for regular season, 19+ for playoffs) */
  weekNumber: number;
  /** Season calendar year */
  seasonYear: number;
  /** Home NFL team */
  homeTeam: NFLTeam;
  /** Away / visiting NFL team */
  awayTeam: NFLTeam;
  /** ISO 8601 kickoff timestamp (UTC) */
  kickoffTime: string;
  /** Current state of the game */
  status: GameStatus;
  /** Point spread (negative indicates home team is favored) */
  spread?: number;
  /** Total score achieved by the home team */
  homeScore?: number;
  /** Total score achieved by the visiting team */
  awayScore?: number;
  /** Winning team ID if game has concluded */
  winnerTeamId?: string;
  /** Broadcast network, e.g. "CBS", "FOX", "NBC", "ESPN", "Amazon" */
  tvNetwork?: string;
  /** Flag denoting Monday Night Football (used for default tiebreaker games) */
  isMondayNight?: boolean;
  /** User-friendly live status label, e.g. "Final", "3rd Qtr 04:12", "Thu 8:15 PM" */
  statusDetail?: string;
  /** Flexible metadata container for odds, weather, or stadium */
  metadata?: Record<string, unknown>;
}

// ==============================================================================
// 3. USER PICKS & SUBMISSIONS
// ==============================================================================

/**
 * Individual game pick submitted by a participant.
 */
export interface Pick {
  /** Pick record UUID */
  id: string;
  /** Pool contest UUID */
  poolId?: string;
  /** Participant Supabase Auth UUID */
  userId: string;
  /** Target game ID */
  gameId: string;
  /** Scheduled week number */
  weekNumber?: number;
  /** Abbreviation of the picked winner, e.g. "KC" */
  selectedTeamId: string;
  /** Evaluation flag denoting if the pick matched the game outcome */
  isCorrect?: boolean;
  /** Points awarded (defaults to 1 for straight-up pick'em) */
  pointsAwarded?: number;
  /** Timestamp when the pick was last modified */
  updatedAt: string;
}

/**
 * Schedule container representing an entire NFL week and its matchups.
 */
export interface Week {
  /** Scheduled week index */
  weekNumber: number;
  /** Calendar season year */
  seasonYear: number;
  /** Formatted title, e.g. "Week 6" */
  title: string;
  /** ISO 8601 timestamp of the first kickoff */
  startDate: string;
  /** ISO 8601 timestamp of the final game conclusion */
  endDate: string;
  /** Submission lock timestamp (first kickoff of the slate) */
  lockDate: string;
  /** Whether this week is the currently active NFL slate */
  isCurrent: boolean;
  /** Whether all games in this slate have completed */
  isCompleted: boolean;
  /** All matchups scheduled for this week */
  games: Game[];
}

// ==============================================================================
// 4. PARTICIPANT PROFILES & LEADERBOARDS
// ==============================================================================

/**
 * Public participant profile.
 */
export interface UserProfile {
  /** Supabase Auth UUID */
  id: string;
  /** Verified account email */
  email: string;
  /** Screen name or Google display name */
  displayName: string;
  /** Google or custom avatar image URL */
  avatarUrl?: string;
  /** Aggregate season-long score points */
  totalPoints: number;
  /** Rank in current week's contest */
  weeklyRank?: number;
  /** Rank in season-long cumulative standings */
  seasonRank?: number;
  /** Administrator privileges flag */
  isAdmin?: boolean;
}

/**
 * Computed standings record for leaderboards and scoreboards.
 */
export interface LeaderboardEntry {
  /** Participant user ID */
  userId: string;
  /** Display name */
  displayName: string;
  /** Avatar photo URL */
  avatarUrl?: string;
  /** Points scored in the selected week */
  weeklyPoints: number;
  /** Cumulative points scored across the entire season */
  totalPoints: number;
  /** Total number of winning picks */
  correctPicks: number;
  /** Total number of picks submitted */
  totalPicks: number;
  /** Season-long rank (1-indexed) */
  rank: number;
  /** Week-specific rank */
  weeklyRank?: number;
  /** Absolute difference between predicted and actual Monday Night score */
  tiebreakerDiff?: number;
  /** Predicted total points for Monday Night Football */
  predictedMnfScore?: number;
  /** Map of gameId -> selectedTeamId for the "Who Picked Who" matrix */
  picks?: Record<string, string>;
}
