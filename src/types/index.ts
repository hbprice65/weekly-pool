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
export type PoolFormat =
  | "straight_up"
  | "against_spread"
  | "survivor"
  | "confidence"
  | "playoff_challenge";

/** Default featured public pool ID (seeded in schema_v2.sql) */
export const DEFAULT_POOL_ID = "00000000-0000-0000-0000-000000000001";

/** Default featured playoff challenge pool ID */
export const PLAYOFF_POOL_ID = "00000000-0000-0000-0000-000000000005";

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
  /** Supabase Auth user ID of the designated pool leader */
  leaderId?: string;
  /** Flexible JSON configuration (tiebreakers, deadline rules, drop lowest weeks) */
  settings?: Record<string, unknown>;
  /** Timestamp when the pool was provisioned */
  createdAt?: string;
}

/** Privilege roles within a pool */
export type PoolRole = "leader" | "admin" | "member";

/**
 * Association linking users to the pools they belong to.
 */
export interface PoolMember {
  /** Target pool UUID */
  poolId: string;
  /** Participant Supabase Auth UUID */
  userId: string;
  /** Membership privilege level */
  role: PoolRole;
  /** Whether this member is hidden from public standings/scoreboards */
  isHidden?: boolean;
  /** Timestamp when user enrolled in pool */
  joinedAt: string;
  /** Optional user profile details for admin and display tables */
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

/**
 * Summary of a pool where the current user is a member, shown on the Account page.
 */
export interface UserPoolMembership {
  /** Pool details */
  pool: Pool;
  /** User's role in this pool */
  role: PoolRole;
  /** Whether the user is the leader/commissioner of this pool */
  isLeader: boolean;
  /** ISO timestamp when the user joined the pool */
  joinedAt: string;
  /** Total active members in the pool */
  memberCount: number;
  /** User's current season rank in this pool */
  userRank?: number;
  /** User's current season points in this pool */
  userPoints?: number;
  /** User's points in the current week in this pool */
  weeklyPoints?: number;
}

/**
 * Payload for commissioner/leader emergency pick override ("Doomsday Scenario")
 */
export interface DoomsdayPickPayload {
  poolId: string;
  targetUserId: string;
  weekNumber: number;
  picks: Record<string, string>;
  mnfScore?: number | string;
  reason?: string;
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
  /** Role within current pool */
  role?: PoolRole;
  /** Whether the user is the pool leader */
  isLeader?: boolean;
}

/**
 * Tracked win-loss pick record on completed games.
 * Note: Unpicked / blank games are intentionally NOT counted as losses.
 */
export interface PickRecord {
  /** Winning picks on completed games */
  wins: number;
  /** Losing picks on completed games (excludes unpicked / blank games) */
  losses: number;
  /** Tied picks on completed games */
  ties?: number;
  /** Total decided games evaluated (wins + losses + ties) */
  evaluatedPicks: number;
  /** Percentage of evaluated picks won (0 to 100) */
  winPct: number;
  /** Formatted record string, e.g. "45-13" */
  formatted: string;
}

/**
 * Lifetime / all-time participant career performance across all pool seasons.
 */
export interface LifetimeStats {
  /** Cumulative career points across all seasons */
  totalPoints: number;
  /** All-time pick record on completed games */
  record: PickRecord;
  /** All-time weekly slates won (had most points in week) */
  weeksWon: number;
  /** All-time career rank */
  rank?: number;
  /** Number of seasons participated */
  seasonsCount: number;
  /** Lifetime clutch record in SNF and MNF games when within 2 points of the weekly lead */
  clutchRecord?: PickRecord;
  /** Lifetime record in tiebreaker scenarios (tied for 1st place after MNF) */
  tiebreakRecord?: PickRecord;
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

  /** Number of weekly slates won (highest points in week) during current season */
  seasonWeeksWon: number;
  /** Overall picks record for current season (blank games not counted against) */
  seasonRecord: PickRecord;
  /** Clutch record in SNF and MNF games when within 2 points of the weekly lead */
  clutchRecord: PickRecord;
  /** Record in tiebreaker scenarios (tied for 1st place after MNF) */
  tiebreakRecord: PickRecord;
  /** Career lifetime statistics across all seasons */
  lifetimeStats?: LifetimeStats;
  /** Role in the pool */
  role?: PoolRole;
  /** Whether this participant is the designated pool leader */
  isLeader?: boolean;
  /** Whether this member has been hidden from public leaderboards by the pool leader */
  isHidden?: boolean;
}

// ==============================================================================
// 6. NFL PLAYOFFS FANTASY CHALLENGE TYPES
// ==============================================================================

/** The 4 playoff postseason rounds */
export type PlayoffRound = 1 | 2 | 3 | 4;

export const PLAYOFF_ROUNDS: {
  round: PlayoffRound;
  title: string;
  shortTitle: string;
  multiplierMax: number;
  datesText: string;
  gameCount: number;
}[] = [
  {
    round: 1,
    title: "Wild Card Weekend",
    shortTitle: "Wild Card",
    multiplierMax: 1,
    datesText: "Jan 10–12",
    gameCount: 6,
  },
  {
    round: 2,
    title: "Divisional Round",
    shortTitle: "Divisional",
    multiplierMax: 2,
    datesText: "Jan 17–18",
    gameCount: 4,
  },
  {
    round: 3,
    title: "Conference Championships",
    shortTitle: "Conf Finals",
    multiplierMax: 3,
    datesText: "Jan 25",
    gameCount: 2,
  },
  {
    round: 4,
    title: "Super Bowl",
    shortTitle: "Super Bowl",
    multiplierMax: 4,
    datesText: "Feb 8",
    gameCount: 1,
  },
];

/** The 8 designated roster positions */
export type PlayoffRosterSlot =
  | "QB"
  | "RB1"
  | "RB2"
  | "WR1"
  | "WR2"
  | "TE"
  | "K"
  | "DEF";

export const PLAYOFF_ROSTER_SLOTS: {
  slot: PlayoffRosterSlot;
  label: string;
  position: PlayoffPosition;
}[] = [
  { slot: "QB", label: "Quarterback", position: "QB" },
  { slot: "RB1", label: "Running Back 1", position: "RB" },
  { slot: "RB2", label: "Running Back 2", position: "RB" },
  { slot: "WR1", label: "Wide Receiver 1", position: "WR" },
  { slot: "WR2", label: "Wide Receiver 2", position: "WR" },
  { slot: "TE", label: "Tight End", position: "TE" },
  { slot: "K", label: "Kicker", position: "K" },
  { slot: "DEF", label: "Defense / ST", position: "DEF" },
];

/** Position types in the playoff tournament */
export type PlayoffPosition = "QB" | "RB" | "WR" | "TE" | "K" | "DEF";

/** A player available for selection during the NFL playoffs */
export interface PlayoffPlayer {
  id: string;
  name: string;
  position: PlayoffPosition;
  teamId: string;
  teamName: string;
  conference: "AFC" | "NFC";
  seed: number;
  isByeRound1?: boolean;
  isEliminated?: boolean;
  eliminatedInRound?: PlayoffRound;
  headshotUrl?: string;
  opponent?: string;
  gameDate?: string;
  projectedPoints?: number;
}

/** A single slot pick in a user's playoff lineup */
export interface PlayoffLineupPick {
  slot: PlayoffRosterSlot;
  playerId: string;
  playerName: string;
  teamId: string;
  position: PlayoffPosition;
  multiplier: 1 | 2 | 3 | 4;
  basePoints: number;
  totalPoints: number;
  statsSummary?: string;
  isBye?: boolean;
  isEliminated?: boolean;
}

/** Complete map of 8 slots for a user's lineup in a given round */
export type PlayoffUserLineupMap = Record<PlayoffRosterSlot, PlayoffLineupPick | null>;

/** Leaderboard participant row in the Playoff Challenge */
export interface PlayoffLeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  rank: number;
  totalPoints: number;
  roundPoints: Record<PlayoffRound, number>;
  lineup?: PlayoffUserLineupMap;
  isLeader?: boolean;
}
