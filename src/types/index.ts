export type SportType = "football" | "basketball" | "baseball" | "soccer" | "hockey";
export type LeagueType = "nfl" | "ncaaf" | "nba" | "mlb" | "epl";
export type PoolFormat = "straight_up" | "against_spread" | "survivor" | "confidence";

export const DEFAULT_POOL_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_POOL_SLUG = "nfl-2026-weekly";

export interface Pool {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sport: SportType;
  league: LeagueType;
  format: PoolFormat;
  seasonYear: number;
  isPublic: boolean;
  joinCode?: string;
  creatorId?: string;
  settings?: Record<string, unknown>;
  createdAt?: string;
}

export interface PoolMember {
  poolId: string;
  userId: string;
  role: "admin" | "member";
  joinedAt: string;
}

export type NFLConference = "AFC" | "NFC";
export type NFLDivision = "East" | "North" | "South" | "West";

export interface NFLTeam {
  id: string; // e.g. "KC"
  name: string; // "Chiefs"
  city: string; // "Kansas City"
  fullName: string; // "Kansas City Chiefs"
  conference: NFLConference;
  division: NFLDivision;
  primaryColor: string;
  secondaryColor: string;
  record?: string; // e.g. "4-1"
  logoUrl?: string;
}

export type GameStatus = "SCHEDULED" | "IN_PROGRESS" | "FINAL";

export interface Game {
  id: string;
  sport?: SportType;
  league?: LeagueType;
  weekNumber: number;
  seasonYear: number;
  homeTeam: NFLTeam;
  awayTeam: NFLTeam;
  kickoffTime: string; // ISO 8601
  status: GameStatus;
  spread?: number; // e.g. -3.5 (negative means home is favored)
  homeScore?: number;
  awayScore?: number;
  winnerTeamId?: string;
  tvNetwork?: string;
  isMondayNight?: boolean;
  statusDetail?: string; // e.g. "Final", "Final/OT", "1st Qtr 10:24", "Thu 8:15 PM"
  metadata?: Record<string, unknown>;
}

export interface Pick {
  id: string;
  poolId?: string;
  userId: string;
  gameId: string;
  weekNumber?: number;
  selectedTeamId: string;
  isCorrect?: boolean;
  pointsAwarded?: number;
  updatedAt: string;
}

export interface Week {
  weekNumber: number;
  seasonYear: number;
  title: string; // e.g. "Week 6"
  startDate: string;
  endDate: string;
  lockDate: string; // First kickoff of the week
  isCurrent: boolean;
  isCompleted: boolean;
  games: Game[];
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  totalPoints: number;
  weeklyRank?: number;
  seasonRank?: number;
  isAdmin?: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  weeklyPoints: number;
  totalPoints: number;
  correctPicks: number;
  totalPicks: number;
  rank: number;
  weeklyRank?: number;
  tiebreakerDiff?: number;
  predictedMnfScore?: number;
  picks?: Record<string, string>;
}
