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
}

export interface Pick {
  id: string;
  userId: string;
  gameId: string;
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

