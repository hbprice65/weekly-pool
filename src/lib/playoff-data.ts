import {
  PlayoffPlayer,
  PlayoffPosition,
  PlayoffRound,
  PlayoffRosterSlot,
  PlayoffLineupPick,
  PlayoffUserLineupMap,
  PlayoffLeaderboardEntry,
} from "@/types";
import { NFL_TEAMS } from "@/lib/nfl-data";

/**
 * 14 NFL Playoff Teams (7 AFC, 7 NFC)
 * The #1 seed in each conference receives a first-round bye during Wild Card Weekend (Round 1).
 */
export interface PlayoffTeamSeed {
  teamId: string;
  seed: number;
  conference: "AFC" | "NFC";
  isByeRound1: boolean;
  eliminatedInRound?: PlayoffRound; // round in which they lost (undefined if still alive)
}

export const PLAYOFF_TEAMS: PlayoffTeamSeed[] = [
  // AFC Seeds
  { teamId: "BAL", seed: 1, conference: "AFC", isByeRound1: true, eliminatedInRound: 3 },
  { teamId: "KC", seed: 2, conference: "AFC", isByeRound1: false }, // Champion
  { teamId: "BUF", seed: 3, conference: "AFC", isByeRound1: false, eliminatedInRound: 2 },
  { teamId: "HOU", seed: 4, conference: "AFC", isByeRound1: false, eliminatedInRound: 2 },
  { teamId: "CLE", seed: 5, conference: "AFC", isByeRound1: false, eliminatedInRound: 1 },
  { teamId: "MIA", seed: 6, conference: "AFC", isByeRound1: false, eliminatedInRound: 1 },
  { teamId: "PIT", seed: 7, conference: "AFC", isByeRound1: false, eliminatedInRound: 1 },

  // NFC Seeds
  { teamId: "SF", seed: 1, conference: "NFC", isByeRound1: true }, // Super Bowl runner-up
  { teamId: "DAL", seed: 2, conference: "NFC", isByeRound1: false, eliminatedInRound: 1 },
  { teamId: "DET", seed: 3, conference: "NFC", isByeRound1: false, eliminatedInRound: 3 },
  { teamId: "TB", seed: 4, conference: "NFC", isByeRound1: false, eliminatedInRound: 2 },
  { teamId: "PHI", seed: 5, conference: "NFC", isByeRound1: false, eliminatedInRound: 1 },
  { teamId: "LAR", seed: 6, conference: "NFC", isByeRound1: false, eliminatedInRound: 1 },
  { teamId: "GB", seed: 7, conference: "NFC", isByeRound1: false, eliminatedInRound: 2 },
];

/**
 * Player Pool available during the NFL Postseason
 */
export const PLAYOFF_PLAYERS: PlayoffPlayer[] = [
  // ================= QUARTERBACKS (QB) =================
  {
    id: "p_mahomes",
    name: "Patrick Mahomes",
    position: "QB",
    teamId: "KC",
    teamName: "Kansas City Chiefs",
    conference: "AFC",
    seed: 2,
    isByeRound1: false,
    projectedPoints: 22.4,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3139477.png",
  },
  {
    id: "p_jackson",
    name: "Lamar Jackson",
    position: "QB",
    teamId: "BAL",
    teamName: "Baltimore Ravens",
    conference: "AFC",
    seed: 1,
    isByeRound1: true,
    eliminatedInRound: 3,
    projectedPoints: 24.1,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3916387.png",
  },
  {
    id: "p_allen",
    name: "Josh Allen",
    position: "QB",
    teamId: "BUF",
    teamName: "Buffalo Bills",
    conference: "AFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 23.8,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3918298.png",
  },
  {
    id: "p_purdy",
    name: "Brock Purdy",
    position: "QB",
    teamId: "SF",
    teamName: "San Francisco 49ers",
    conference: "NFC",
    seed: 1,
    isByeRound1: true,
    projectedPoints: 20.8,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4361741.png",
  },
  {
    id: "p_goff",
    name: "Jared Goff",
    position: "QB",
    teamId: "DET",
    teamName: "Detroit Lions",
    conference: "NFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 3,
    projectedPoints: 19.5,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3046779.png",
  },
  {
    id: "p_stroud",
    name: "C.J. Stroud",
    position: "QB",
    teamId: "HOU",
    teamName: "Houston Texans",
    conference: "AFC",
    seed: 4,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 18.9,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4432577.png",
  },
  {
    id: "p_prescott",
    name: "Dak Prescott",
    position: "QB",
    teamId: "DAL",
    teamName: "Dallas Cowboys",
    conference: "NFC",
    seed: 2,
    isByeRound1: false,
    eliminatedInRound: 1,
    projectedPoints: 21.2,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/2577417.png",
  },
  {
    id: "p_hurts",
    name: "Jalen Hurts",
    position: "QB",
    teamId: "PHI",
    teamName: "Philadelphia Eagles",
    conference: "NFC",
    seed: 5,
    isByeRound1: false,
    eliminatedInRound: 1,
    projectedPoints: 22.0,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4040715.png",
  },
  {
    id: "p_love",
    name: "Jordan Love",
    position: "QB",
    teamId: "GB",
    teamName: "Green Bay Packers",
    conference: "NFC",
    seed: 7,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 18.4,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4036378.png",
  },
  {
    id: "p_mayfield",
    name: "Baker Mayfield",
    position: "QB",
    teamId: "TB",
    teamName: "Tampa Bay Buccaneers",
    conference: "NFC",
    seed: 4,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 17.6,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3052587.png",
  },
  {
    id: "p_stafford",
    name: "Matthew Stafford",
    position: "QB",
    teamId: "LAR",
    teamName: "Los Angeles Rams",
    conference: "NFC",
    seed: 6,
    isByeRound1: false,
    eliminatedInRound: 1,
    projectedPoints: 18.2,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/12483.png",
  },
  {
    id: "p_tagovailoa",
    name: "Tua Tagovailoa",
    position: "QB",
    teamId: "MIA",
    teamName: "Miami Dolphins",
    conference: "AFC",
    seed: 6,
    isByeRound1: false,
    eliminatedInRound: 1,
    projectedPoints: 16.8,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4241479.png",
  },

  // ================= RUNNING BACKS (RB) =================
  {
    id: "p_mccaffrey",
    name: "Christian McCaffrey",
    position: "RB",
    teamId: "SF",
    teamName: "San Francisco 49ers",
    conference: "NFC",
    seed: 1,
    isByeRound1: true,
    projectedPoints: 24.5,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3117251.png",
  },
  {
    id: "p_pacheco",
    name: "Isiah Pacheco",
    position: "RB",
    teamId: "KC",
    teamName: "Kansas City Chiefs",
    conference: "AFC",
    seed: 2,
    isByeRound1: false,
    projectedPoints: 16.8,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4361529.png",
  },
  {
    id: "p_henry",
    name: "Derrick Henry",
    position: "RB",
    teamId: "BAL",
    teamName: "Baltimore Ravens",
    conference: "AFC",
    seed: 1,
    isByeRound1: true,
    eliminatedInRound: 3,
    projectedPoints: 18.5,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3043078.png",
  },
  {
    id: "p_gibbs",
    name: "Jahmyr Gibbs",
    position: "RB",
    teamId: "DET",
    teamName: "Detroit Lions",
    conference: "NFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 3,
    projectedPoints: 17.2,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4429013.png",
  },
  {
    id: "p_cook",
    name: "James Cook",
    position: "RB",
    teamId: "BUF",
    teamName: "Buffalo Bills",
    conference: "AFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 15.6,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4362082.png",
  },
  {
    id: "p_montgomery",
    name: "David Montgomery",
    position: "RB",
    teamId: "DET",
    teamName: "Detroit Lions",
    conference: "NFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 3,
    projectedPoints: 13.8,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4035538.png",
  },
  {
    id: "p_williams_kyren",
    name: "Kyren Williams",
    position: "RB",
    teamId: "LAR",
    teamName: "Los Angeles Rams",
    conference: "NFC",
    seed: 6,
    isByeRound1: false,
    eliminatedInRound: 1,
    projectedPoints: 18.1,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4430737.png",
  },
  {
    id: "p_jones_aaron",
    name: "Aaron Jones",
    position: "RB",
    teamId: "GB",
    teamName: "Green Bay Packers",
    conference: "NFC",
    seed: 7,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 16.4,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3042519.png",
  },
  {
    id: "p_mostert",
    name: "Raheem Mostert",
    position: "RB",
    teamId: "MIA",
    teamName: "Miami Dolphins",
    conference: "AFC",
    seed: 6,
    isByeRound1: false,
    eliminatedInRound: 1,
    projectedPoints: 14.2,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/2576414.png",
  },
  {
    id: "p_white_rachaad",
    name: "Rachaad White",
    position: "RB",
    teamId: "TB",
    teamName: "Tampa Bay Buccaneers",
    conference: "NFC",
    seed: 4,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 14.9,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4688379.png",
  },

  // ================= WIDE RECEIVERS (WR) =================
  {
    id: "p_rice_rashee",
    name: "Rashee Rice",
    position: "WR",
    teamId: "KC",
    teamName: "Kansas City Chiefs",
    conference: "AFC",
    seed: 2,
    isByeRound1: false,
    projectedPoints: 16.5,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4427334.png",
  },
  {
    id: "p_samuel_deebo",
    name: "Deebo Samuel",
    position: "WR",
    teamId: "SF",
    teamName: "San Francisco 49ers",
    conference: "NFC",
    seed: 1,
    isByeRound1: true,
    projectedPoints: 17.8,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3126486.png",
  },
  {
    id: "p_aiyuk",
    name: "Brandon Aiyuk",
    position: "WR",
    teamId: "SF",
    teamName: "San Francisco 49ers",
    conference: "NFC",
    seed: 1,
    isByeRound1: true,
    projectedPoints: 16.2,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4360438.png",
  },
  {
    id: "p_st_brown",
    name: "Amon-Ra St. Brown",
    position: "WR",
    teamId: "DET",
    teamName: "Detroit Lions",
    conference: "NFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 3,
    projectedPoints: 20.4,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4361579.png",
  },
  {
    id: "p_collins_nico",
    name: "Nico Collins",
    position: "WR",
    teamId: "HOU",
    teamName: "Houston Texans",
    conference: "AFC",
    seed: 4,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 17.0,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4240582.png",
  },
  {
    id: "p_lamb",
    name: "CeeDee Lamb",
    position: "WR",
    teamId: "DAL",
    teamName: "Dallas Cowboys",
    conference: "NFC",
    seed: 2,
    isByeRound1: false,
    eliminatedInRound: 1,
    projectedPoints: 22.8,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4241389.png",
  },
  {
    id: "p_hill_tyreek",
    name: "Tyreek Hill",
    position: "WR",
    teamId: "MIA",
    teamName: "Miami Dolphins",
    conference: "AFC",
    seed: 6,
    isByeRound1: false,
    eliminatedInRound: 1,
    projectedPoints: 21.0,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3116406.png",
  },
  {
    id: "p_evans_mike",
    name: "Mike Evans",
    position: "WR",
    teamId: "TB",
    teamName: "Tampa Bay Buccaneers",
    conference: "NFC",
    seed: 4,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 16.9,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/16737.png",
  },
  {
    id: "p_flowers_zay",
    name: "Zay Flowers",
    position: "WR",
    teamId: "BAL",
    teamName: "Baltimore Ravens",
    conference: "AFC",
    seed: 1,
    isByeRound1: true,
    eliminatedInRound: 3,
    projectedPoints: 15.2,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4426515.png",
  },
  {
    id: "p_nacua",
    name: "Puka Nacua",
    position: "WR",
    teamId: "LAR",
    teamName: "Los Angeles Rams",
    conference: "NFC",
    seed: 6,
    isByeRound1: false,
    eliminatedInRound: 1,
    projectedPoints: 19.1,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4426514.png",
  },

  // ================= TIGHT ENDS (TE) =================
  {
    id: "p_kelce",
    name: "Travis Kelce",
    position: "TE",
    teamId: "KC",
    teamName: "Kansas City Chiefs",
    conference: "AFC",
    seed: 2,
    isByeRound1: false,
    projectedPoints: 16.0,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/15847.png",
  },
  {
    id: "p_kittle",
    name: "George Kittle",
    position: "TE",
    teamId: "SF",
    teamName: "San Francisco 49ers",
    conference: "NFC",
    seed: 1,
    isByeRound1: true,
    projectedPoints: 15.4,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3040151.png",
  },
  {
    id: "p_laporta",
    name: "Sam LaPorta",
    position: "TE",
    teamId: "DET",
    teamName: "Detroit Lions",
    conference: "NFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 3,
    projectedPoints: 14.8,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4430027.png",
  },
  {
    id: "p_andrews",
    name: "Mark Andrews",
    position: "TE",
    teamId: "BAL",
    teamName: "Baltimore Ravens",
    conference: "AFC",
    seed: 1,
    isByeRound1: true,
    eliminatedInRound: 3,
    projectedPoints: 13.9,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3116365.png",
  },
  {
    id: "p_kincaid",
    name: "Dalton Kincaid",
    position: "TE",
    teamId: "BUF",
    teamName: "Buffalo Bills",
    conference: "AFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 12.5,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4372079.png",
  },
  {
    id: "p_schultz",
    name: "Dalton Schultz",
    position: "TE",
    teamId: "HOU",
    teamName: "Houston Texans",
    conference: "AFC",
    seed: 4,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 11.2,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3116164.png",
  },

  // ================= KICKERS (K) =================
  {
    id: "p_butker",
    name: "Harrison Butker",
    position: "K",
    teamId: "KC",
    teamName: "Kansas City Chiefs",
    conference: "AFC",
    seed: 2,
    isByeRound1: false,
    projectedPoints: 9.5,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3055899.png",
  },
  {
    id: "p_moody",
    name: "Jake Moody",
    position: "K",
    teamId: "SF",
    teamName: "San Francisco 49ers",
    conference: "NFC",
    seed: 1,
    isByeRound1: true,
    projectedPoints: 8.8,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4362079.png",
  },
  {
    id: "p_tucker",
    name: "Justin Tucker",
    position: "K",
    teamId: "BAL",
    teamName: "Baltimore Ravens",
    conference: "AFC",
    seed: 1,
    isByeRound1: true,
    eliminatedInRound: 3,
    projectedPoints: 9.2,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/15683.png",
  },
  {
    id: "p_bass",
    name: "Tyler Bass",
    position: "K",
    teamId: "BUF",
    teamName: "Buffalo Bills",
    conference: "AFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 8.5,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/4034947.png",
  },
  {
    id: "p_fairbairn",
    name: "Ka'imi Fairbairn",
    position: "K",
    teamId: "HOU",
    teamName: "Houston Texans",
    conference: "AFC",
    seed: 4,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 8.1,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/2971573.png",
  },
  {
    id: "p_badgley",
    name: "Michael Badgley",
    position: "K",
    teamId: "DET",
    teamName: "Detroit Lions",
    conference: "NFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 3,
    projectedPoints: 8.0,
    headshotUrl: "https://a.espncdn.com/i/headshots/nfl/players/full/3124874.png",
  },

  // ================= DEFENSE / SPECIAL TEAMS (DEF) =================
  {
    id: "p_def_sf",
    name: "San Francisco 49ers D/ST",
    position: "DEF",
    teamId: "SF",
    teamName: "San Francisco 49ers",
    conference: "NFC",
    seed: 1,
    isByeRound1: true,
    projectedPoints: 9.0,
  },
  {
    id: "p_def_bal",
    name: "Baltimore Ravens D/ST",
    position: "DEF",
    teamId: "BAL",
    teamName: "Baltimore Ravens",
    conference: "AFC",
    seed: 1,
    isByeRound1: true,
    eliminatedInRound: 3,
    projectedPoints: 10.2,
  },
  {
    id: "p_def_kc",
    name: "Kansas City Chiefs D/ST",
    position: "DEF",
    teamId: "KC",
    teamName: "Kansas City Chiefs",
    conference: "AFC",
    seed: 2,
    isByeRound1: false,
    projectedPoints: 8.5,
  },
  {
    id: "p_def_buf",
    name: "Buffalo Bills D/ST",
    position: "DEF",
    teamId: "BUF",
    teamName: "Buffalo Bills",
    conference: "AFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 7.8,
  },
  {
    id: "p_def_hou",
    name: "Houston Texans D/ST",
    position: "DEF",
    teamId: "HOU",
    teamName: "Houston Texans",
    conference: "AFC",
    seed: 4,
    isByeRound1: false,
    eliminatedInRound: 2,
    projectedPoints: 7.5,
  },
  {
    id: "p_def_det",
    name: "Detroit Lions D/ST",
    position: "DEF",
    teamId: "DET",
    teamName: "Detroit Lions",
    conference: "NFC",
    seed: 3,
    isByeRound1: false,
    eliminatedInRound: 3,
    projectedPoints: 7.0,
  },
];

/**
 * Historical/Simulated boxscore performance per round (Full PPR)
 * Round 1: Wild Card, Round 2: Divisional, Round 3: Conf Championships, Round 4: Super Bowl
 */
export const PLAYOFF_PLAYER_ROUND_STATS: Record<
  string,
  Record<PlayoffRound, { basePoints: number; summary: string }>
> = {
  p_mahomes: {
    1: { basePoints: 18.48, summary: "262 pass yds, 1 TD, 41 rush yds" },
    2: { basePoints: 21.90, summary: "215 pass yds, 2 TD, 19 rush yds" },
    3: { basePoints: 21.64, summary: "241 pass yds, 1 TD, 15 rush yds" },
    4: { basePoints: 28.52, summary: "333 pass yds, 2 TD, 1 INT, 66 rush yds (SB MVP)" },
  },
  p_jackson: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 27.08, summary: "152 pass yds, 2 TD, 100 rush yds, 2 rush TD" },
    3: { basePoints: 18.88, summary: "272 pass yds, 1 TD, 1 INT, 54 rush yds" },
    4: { basePoints: 0.0, summary: "Eliminated in Conf Championship" },
  },
  p_purdy: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 15.08, summary: "252 pass yds, 1 TD, 14 rush yds" },
    3: { basePoints: 19.38, summary: "267 pass yds, 1 TD, 1 INT, 48 rush yds" },
    4: { basePoints: 17.20, summary: "255 pass yds, 1 TD, 12 rush yds" },
  },
  p_allen: {
    1: { basePoints: 31.42, summary: "203 pass yds, 3 TD, 74 rush yds, 1 rush TD" },
    2: { basePoints: 26.14, summary: "186 pass yds, 1 TD, 72 rush yds, 2 rush TD" },
    3: { basePoints: 0.0, summary: "Eliminated in Divisional" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },
  p_goff: {
    1: { basePoints: 18.28, summary: "277 pass yds, 1 TD, 0 INT" },
    2: { basePoints: 22.88, summary: "287 pass yds, 2 TD, 0 INT" },
    3: { basePoints: 18.92, summary: "273 pass yds, 1 TD, 0 INT" },
    4: { basePoints: 0.0, summary: "Eliminated in Conf Championship" },
  },
  p_stroud: {
    1: { basePoints: 23.96, summary: "274 pass yds, 3 TD, 0 INT" },
    2: { basePoints: 8.50, summary: "175 pass yds, 0 TD, 0 INT" },
    3: { basePoints: 0.0, summary: "Eliminated in Divisional" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },

  // RBs
  p_mccaffrey: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 28.8, summary: "98 rush yds, 2 rush TD, 7 rec, 30 rec yds" },
    3: { basePoints: 27.2, summary: "90 rush yds, 2 rush TD, 4 rec, 42 rec yds" },
    4: { basePoints: 24.0, summary: "80 rush yds, 8 rec, 80 rec yds, 1 rec TD" },
  },
  p_pacheco: {
    1: { basePoints: 17.3, summary: "89 rush yds, 1 TD, 1 rec, -1 rec yds" },
    2: { basePoints: 18.1, summary: "97 rush yds, 1 TD, 1 rec, 14 rec yds" },
    3: { basePoints: 17.2, summary: "68 rush yds, 1 TD, 4 rec, 14 rec yds" },
    4: { basePoints: 15.2, summary: "59 rush yds, 6 rec, 33 rec yds" },
  },
  p_henry: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 16.4, summary: "84 rush yds, 1 TD, 2 rec, 20 rec yds" },
    3: { basePoints: 12.8, summary: "68 rush yds, 1 TD, 0 rec" },
    4: { basePoints: 0.0, summary: "Eliminated in Conf Championship" },
  },
  p_gibbs: {
    1: { basePoints: 18.8, summary: "25 rush yds, 1 TD, 4 rec, 43 rec yds" },
    2: { basePoints: 21.4, summary: "74 rush yds, 1 TD, 4 rec, 40 rec yds" },
    3: { basePoints: 13.6, summary: "45 rush yds, 1 TD, 3 rec, 11 rec yds" },
    4: { basePoints: 0.0, summary: "Eliminated in Conf Championship" },
  },
  p_cook: {
    1: { basePoints: 10.6, summary: "61 rush yds, 1 rec, 5 rec yds" },
    2: { basePoints: 12.6, summary: "61 rush yds, 4 rec, 25 rec yds" },
    3: { basePoints: 0.0, summary: "Eliminated" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },

  // WRs
  p_rice_rashee: {
    1: { basePoints: 26.0, summary: "8 rec, 130 rec yds, 1 TD" },
    2: { basePoints: 8.7, summary: "4 rec, 47 rec yds" },
    3: { basePoints: 16.6, summary: "8 rec, 46 rec yds" },
    4: { basePoints: 9.9, summary: "6 rec, 39 rec yds" },
  },
  p_samuel_deebo: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 4.4, summary: "2 rec, 24 rec yds, 7 rush yds" },
    3: { basePoints: 17.6, summary: "8 rec, 89 rec yds, 7 rush yds" },
    4: { basePoints: 12.2, summary: "3 rec, 33 rec yds, 9 rush yds" },
  },
  p_aiyuk: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 6.2, summary: "3 rec, 32 rec yds" },
    3: { basePoints: 16.8, summary: "3 rec, 68 rec yds, 1 TD" },
    4: { basePoints: 7.9, summary: "3 rec, 49 rec yds" },
  },
  p_st_brown: {
    1: { basePoints: 18.0, summary: "7 rec, 110 rec yds" },
    2: { basePoints: 21.7, summary: "8 rec, 77 rec yds, 1 TD" },
    3: { basePoints: 18.7, summary: "7 rec, 87 rec yds" },
    4: { basePoints: 0.0, summary: "Eliminated in Conf Championship" },
  },
  p_collins_nico: {
    1: { basePoints: 21.6, summary: "6 rec, 96 rec yds, 1 TD" },
    2: { basePoints: 13.8, summary: "5 rec, 88 rec yds" },
    3: { basePoints: 0.0, summary: "Eliminated" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },

  // TEs
  p_kelce: {
    1: { basePoints: 14.1, summary: "7 rec, 71 rec yds" },
    2: { basePoints: 24.5, summary: "5 rec, 75 rec yds, 2 TD" },
    3: { basePoints: 27.6, summary: "11 rec, 116 rec yds, 1 TD" },
    4: { basePoints: 18.3, summary: "9 rec, 93 rec yds" },
  },
  p_kittle: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 18.1, summary: "4 rec, 81 rec yds, 1 TD" },
    3: { basePoints: 4.7, summary: "2 rec, 27 rec yds" },
    4: { basePoints: 2.4, summary: "2 rec, 4 rec yds" },
  },
  p_laporta: {
    1: { basePoints: 15.5, summary: "3 rec, 65 rec yds, 1 TD" },
    2: { basePoints: 15.5, summary: "9 rec, 65 rec yds" },
    3: { basePoints: 18.7, summary: "9 rec, 97 rec yds" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },
  p_andrews: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 0.0, summary: "Out (injured)" },
    3: { basePoints: 3.5, summary: "2 rec, 15 rec yds" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },

  // Kickers
  p_butker: {
    1: { basePoints: 12.0, summary: "4/4 FG, 2/2 XP" },
    2: { basePoints: 9.0, summary: "2/2 FG, 3/3 XP" },
    3: { basePoints: 5.0, summary: "1/1 FG, 2/2 XP" },
    4: { basePoints: 13.0, summary: "4/4 FG, 1/1 XP (57-yd FG)" },
  },
  p_moody: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 6.0, summary: "1/2 FG, 3/3 XP" },
    3: { basePoints: 10.0, summary: "2/3 FG, 4/4 XP" },
    4: { basePoints: 11.0, summary: "3/3 FG, 2/2 XP" },
  },
  p_tucker: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 10.0, summary: "2/2 FG, 4/4 XP" },
    3: { basePoints: 6.0, summary: "1/1 FG, 1/1 XP" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },
  p_bass: {
    1: { basePoints: 7.0, summary: "1/2 FG, 4/4 XP" },
    2: { basePoints: 6.0, summary: "2/3 FG" },
    3: { basePoints: 0.0, summary: "Eliminated" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },

  // Defenses
  p_def_sf: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 5.0, summary: "2 sacks, 2 INT, 21 pts allowed" },
    3: { basePoints: 3.0, summary: "2 sacks, 1 fumble rec, 31 pts allowed" },
    4: { basePoints: 8.0, summary: "3 sacks, 1 fumble rec, 1 INT, 19 pts allowed" },
  },
  p_def_bal: {
    1: { basePoints: 0.0, summary: "First-round Bye (0.0 pts)" },
    2: { basePoints: 11.0, summary: "4 sacks, 10 pts allowed" },
    3: { basePoints: 8.0, summary: "2 sacks, 1 INT, 17 pts allowed" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },
  p_def_kc: {
    1: { basePoints: 11.0, summary: "2 sacks, 7 pts allowed" },
    2: { basePoints: 5.0, summary: "2 sacks, 1 fumble rec, 24 pts allowed" },
    3: { basePoints: 10.0, summary: "4 sacks, 2 fumble rec, 1 INT, 10 pts allowed" },
    4: { basePoints: 7.0, summary: "1 sack, 1 fumble rec, 22 pts allowed" },
  },
  p_def_det: {
    1: { basePoints: 4.0, summary: "2 sacks, 23 pts allowed" },
    2: { basePoints: 8.0, summary: "4 sacks, 2 INT, 23 pts allowed" },
    3: { basePoints: 2.0, summary: "2 sacks, 34 pts allowed" },
    4: { basePoints: 0.0, summary: "Eliminated" },
  },
};

/**
 * Calculates a player's fantasy points and multiplier for a given round based on previous round's lineup.
 *
 * Consecutive Multiplier Rule:
 * - Round 1: always 1x.
 * - Round 2..4: If player was in user's active lineup in previous round, multiplier = min(4, previousMultiplier + 1).
 *   Otherwise, multiplier = 1x.
 */
export function calculateSlotMultiplier(
  playerId: string,
  currentRound: PlayoffRound,
  previousRoundLineup?: PlayoffUserLineupMap
): 1 | 2 | 3 | 4 {
  if (currentRound === 1 || !previousRoundLineup) return 1;

  // Search if player existed anywhere in the previous round lineup
  const prevPick = Object.values(previousRoundLineup).find(
    (pick) => pick && pick.playerId === playerId
  );

  if (prevPick) {
    const nextMult = (prevPick.multiplier + 1) as number;
    return Math.min(4, Math.max(1, nextMult)) as 1 | 2 | 3 | 4;
  }

  return 1;
}

/**
 * Resolves player points and summary for a given round.
 */
export function getPlayerRoundScore(
  playerId: string,
  round: PlayoffRound
): { basePoints: number; summary: string } {
  const playerStats = PLAYOFF_PLAYER_ROUND_STATS[playerId];
  if (playerStats && playerStats[round]) {
    return playerStats[round];
  }

  // Fallback defaults for players without recorded stats
  const player = PLAYOFF_PLAYERS.find((p) => p.id === playerId);
  if (!player) return { basePoints: 0, summary: "0.0 pts" };

  if (round === 1 && player.isByeRound1) {
    return { basePoints: 0, summary: "First-round Bye (0.0 pts)" };
  }
  if (player.eliminatedInRound && round > player.eliminatedInRound) {
    return { basePoints: 0, summary: `Eliminated in Round ${player.eliminatedInRound}` };
  }

  const proj = player.projectedPoints || 12.0;
  return {
    basePoints: Math.round(proj * 10) / 10,
    summary: `Projected ${proj} pts`,
  };
}

/**
 * Checks if a player is eliminated in the given round
 */
export function isPlayerEliminatedInRound(
  player: PlayoffPlayer,
  round: PlayoffRound
): boolean {
  if (!player.eliminatedInRound) return false;
  return round > player.eliminatedInRound;
}

/**
 * Resolves full NFL Team details for teamId
 */
export function getPlayoffTeam(teamId: string) {
  return NFL_TEAMS[teamId] || NFL_TEAMS.KC;
}
