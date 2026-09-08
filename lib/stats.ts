import type { StoredBattle } from "./store";
import type { NormalizedBattle } from "./brawlstars/types";

export type MapAggregate = {
  map: string;
  games: number;
  wins: number;
  winrate: number;
  trend: number[];
};

export function winrateOverLast(battles: NormalizedBattle[], n: number): number {
  // battles må være sortert nyest først.
  const slice = battles.slice(0, n);
  const wins = slice.filter((b) => b.outcome === "win").length;
  const losses = slice.filter((b) => b.outcome === "loss").length;
  const decisive = wins + losses;
  return decisive > 0 ? (wins / decisive) * 100 : 0;
}

export function currentStreak(battles: NormalizedBattle[]): {
  type: "win" | "loss" | "none";
  count: number;
} {
  // battles må være sortert nyest først.
  if (battles.length === 0) return { type: "none", count: 0 };
  const first = battles[0].outcome;
  if (first === "draw") return { type: "none", count: 0 };

  let count = 0;
  for (const b of battles) {
    if (b.outcome === first) count += 1;
    else break;
  }
  return { type: first, count };
}

export function aggregateByMap(
  battles: NormalizedBattle[],
  minSampleSize = 3
): MapAggregate[] {
  const map = new Map<
    string,
    { games: number; wins: number; chrono: NormalizedBattle[] }
  >();

  for (const b of battles) {
    const entry = map.get(b.map) ?? { games: 0, wins: 0, chrono: [] };
    entry.games += 1;
    if (b.outcome === "win") entry.wins += 1;
    entry.chrono.push(b);
    map.set(b.map, entry);
  }

  return Array.from(map.entries())
    .map(([mapName, v]) => ({
      map: mapName,
      games: v.games,
      wins: v.wins,
      winrate: v.games > 0 ? (v.wins / v.games) * 100 : 0,
      trend: buildTrend(v.chrono),
    }))
    .filter((m) => m.games >= minSampleSize)
    .sort((a, b) => b.winrate - a.winrate);
}

function buildTrend(chrono: NormalizedBattle[]): number[] {
  const sorted = [...chrono].sort((a, b) =>
    a.battleTime < b.battleTime ? -1 : 1
  );
  const last10 = sorted.slice(-10);
  let running = 0;
  return last10.map((b) => {
    running += b.outcome === "win" ? 1 : b.outcome === "loss" ? -1 : 0;
    return running;
  });
}

export type TeammatePairStats = {
  tags: string[];
  names: string[];
  games: number;
  wins: number;
  winrate: number;
};

// Ranked-spillere trenger ikke havne i samme lag — dette finner kampene der
// to (eller tre) av ERA-spillerne faktisk endte opp sammen, ved å matche på
// at battleTime + map + mode er identisk på tvers av deres individuelle
// battlelogs (samme ekte kamp sett fra to ulike spilleres perspektiv).
export function teammateStats(
  allBattles: StoredBattle[],
  nameByTag: Record<string, string>
): TeammatePairStats[] {
  const grouped = new Map<string, { tag: string; outcome: string }[]>();

  for (const b of allBattles) {
    const key = `${b.battleTime}|${b.map}|${b.mode}`;
    const arr = grouped.get(key) ?? [];
    arr.push({ tag: b.tag, outcome: b.outcome });
    grouped.set(key, arr);
  }

  const pairMap = new Map<
    string,
    { games: number; wins: number; tags: string[] }
  >();

  for (const entries of grouped.values()) {
    const uniqueTags = Array.from(new Set(entries.map((e) => e.tag)));
    if (uniqueTags.length < 2) continue;

    for (let i = 0; i < uniqueTags.length; i++) {
      for (let j = i + 1; j < uniqueTags.length; j++) {
        const pairKey = [uniqueTags[i], uniqueTags[j]].sort().join("+");
        const entry = pairMap.get(pairKey) ?? {
          games: 0,
          wins: 0,
          tags: [uniqueTags[i], uniqueTags[j]],
        };
        entry.games += 1;
        const outcome = entries.find((e) => e.tag === uniqueTags[i])?.outcome;
        if (outcome === "win") entry.wins += 1;
        pairMap.set(pairKey, entry);
      }
    }
  }

  return Array.from(pairMap.values())
    .map((e) => ({
      tags: e.tags,
      names: e.tags.map((t) => nameByTag[t] ?? t),
      games: e.games,
      wins: e.wins,
      winrate: e.games > 0 ? (e.wins / e.games) * 100 : 0,
    }))
    .sort((a, b) => b.games - a.games);
}
