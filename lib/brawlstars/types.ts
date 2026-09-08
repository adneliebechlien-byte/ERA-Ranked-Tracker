// Rå API-typer — bevisst løse (mange felt optional / unknown) fordi vi
// vet Supercell kan endre skjemaet uten varsel. All rå payload lagres
// separat når vi går over til database-lagring (se prosjektplanen §7).

export type RawBrawler = {
  id: number;
  name: string;
  power?: number;
  trophies?: number;
};

export type RawPlayerEntry = {
  tag: string;
  name: string;
  brawler?: RawBrawler;
};

export type RawBattle = {
  mode: string;
  type: string; // "ranked" | "soloRanked" | "friendly" | ...
  result?: "victory" | "defeat" | "draw";
  duration?: number;
  rank?: number;
  trophyChange?: number;
  starPlayer?: RawPlayerEntry | null;
  players?: RawPlayerEntry[]; // flat FFA format (Solo Showdown ranked)
  teams?: RawPlayerEntry[][]; // team format (all other modes)
};

export type RawBattlelogItem = {
  battleTime: string;
  event?: {
    id?: number;
    mode?: string;
    map?: string;
  };
  battle: RawBattle;
};

export type RawBattlelogResponse = {
  items: RawBattlelogItem[];
};

// Normalisert form vi faktisk bygger UI rundt.

export type Outcome = "win" | "loss" | "draw";

export type NormalizedBattle = {
  battleTime: string; // ISO
  map: string;
  mode: string;
  brawlerId: number;
  brawlerName: string;
  outcome: Outcome;
  trophyChange: number | null;
  rankedFormat: "ffa" | "team"; // Solo Showdown vs. lagmoduser
  // Kun satt for rankedFormat === "team". Dette er verdien fra
  // brawler.trophies i lagmodus-rangerte kamper, som (basert på at den er
  // et lite tall 0-20ish og beveger seg med vinn/tap) mest sannsynlig er
  // selve rank-poengene, IKKE ekte trofeer. Ubekreftet 100%, men eneste
  // rimelige tolkning av feltet i denne konteksten.
  rating: number | null;
};

export type PlayerStats = {
  name: string;
  tag: string;
  battles: NormalizedBattle[];
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number; // 0-100
  fetchError?: string;
};

export type BrawlerAggregate = {
  brawlerId: number;
  brawlerName: string;
  games: number;
  wins: number;
  winrate: number;
  trend: number[];
};
