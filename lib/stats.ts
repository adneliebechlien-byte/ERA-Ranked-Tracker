import type { StoredBattle } from "./store";
import type { NormalizedBattle, Outcome } from "./brawlstars/types";

export type MapAggregate = {
  map: string;
  games: number;
  wins: number;
  winrate: number;
  trend: number[];
};

// Grupperer enkelt-runder til faktiske Bo3-"sets". Brawl Stars Ranked
// spilles best av 3 runder på samme map med samme brawler; API-et gir oss
// hver runde separat, så vi må selv gjenkjenne hvilke runder som hører
// sammen og telle dem som ÉN kamp med ett samlet resultat.
//
// Regel: påfølgende runder (kronologisk) med samme map + mode + brawler
// hører til samme set, helt til én side har vunnet 2 runder (2-0 eller
// 2-1) — da er settet avgjort, og neste runde starter et nytt set.
export function groupIntoSets<T extends NormalizedBattle>(battles: T[]): T[] {
  const sorted = [...battles].sort((a, b) =>
    a.battleTime < b.battleTime ? -1 : 1
  );

  const sets: T[] = [];
  let group: T[] = [];

  function closeGroup() {
    if (group.length === 0) return;
    const wins = group.filter((b) => b.outcome === "win").length;
    const losses = group.filter((b) => b.outcome === "loss").length;
    const last = group[group.length - 1];
    const outcome: Outcome =
      wins > losses ? "win" : losses > wins ? "loss" : "draw";
    const hasTrophyData = group.some((b) => b.trophyChange !== null);
    const trophyChange = hasTrophyData
      ? group.reduce((sum, b) => sum + (b.trophyChange ?? 0), 0)
      : null;

    sets.push({ ...last, outcome, trophyChange });
    group = [];
  }

  for (const b of sorted) {
    const prev = group[group.length - 1];
    const sameContext =
      prev &&
      prev.map === b.map &&
      prev.mode === b.mode &&
      prev.brawlerId === b.brawlerId;

    if (!sameContext) closeGroup();

    group.push(b);

    const wins = group.filter((x) => x.outcome === "win").length;
    const losses = group.filter((x) => x.outcome === "loss").length;
    if (wins >= 2 || losses >= 2) closeGroup();
  }
  closeGroup();

  // Nyest først, som resten av appen forventer.
  return sets.reverse();
}

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
