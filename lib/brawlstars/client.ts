import type {
  BrawlerAggregate,
  NormalizedBattle,
  PlayerStats,
  RawBattlelogResponse,
} from "./types";

// Vi går via RoyaleAPI sin proxy i stedet for api.brawlstars.com direkte.
// Grunnen: Brawl Stars sin API-nøkkel er IP-låst, og proxyen har en fast
// utgående IP (45.79.218.79) som er lagt til i "Allowed IP addresses" på
// nøkkelen — det fungerer uansett hvilken server denne koden kjører på.
const PROXY_BASE = "https://bsproxy.royaleapi.dev/v1";

// Kun lagbaserte rangerte moduser telles som "Ranked" i denne appen.
// Solo/Duo Showdown Ranked (type: "ranked" i API-et — ja, forvirrende
// navngitt av Supercell) er en helt separat, individuell stige som ikke
// er relevant for ERA sin lagstatistikk, og ekskluderes bevisst.
const RANKED_TYPES = new Set(["soloRanked"]);

function encodeTag(tag: string): string {
  const withHash = tag.startsWith("#") ? tag : `#${tag}`;
  return encodeURIComponent(withHash);
}

export async function fetchRawBattlelog(tag: string): Promise<RawBattlelogResponse> {
  const apiKey = process.env.BRAWL_STARS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "BRAWL_STARS_API_KEY mangler. Sett den i .env.local (se .env.example)."
    );
  }

  const url = `${PROXY_BASE}/players/${encodeTag(tag)}/battlelog`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    // Cache i 5 minutter server-side. Nok til å unngå unødvendig spam av
    // API-et ved vanlig sidenavigasjon, kort nok til at data føles ferske.
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 403) {
      throw new Error(
        `403 Forbidden — IP-en er trolig ikke godkjent på API-nøkkelen. Sjekk "Allowed IP addresses" på developer.brawlstars.com. (${body})`
      );
    }
    if (res.status === 404) {
      throw new Error(`404 — fant ikke spiller-tag ${tag}. Er taggen riktig?`);
    }
    throw new Error(`Brawl Stars API feilet (${res.status}): ${body}`);
  }

  return (await res.json()) as RawBattlelogResponse;
}

export function normalizeBattles(
  raw: RawBattlelogResponse,
  tag: string
): NormalizedBattle[] {
  const normalized: NormalizedBattle[] = [];

  for (const item of raw.items ?? []) {
    const battle = item.battle;
    if (!battle || !RANKED_TYPES.has(battle.type)) continue;

    const map = item.event?.map ?? "Ukjent map";
    const mode = item.event?.mode ?? battle.mode ?? "ukjent";

    if (battle.type === "ranked" && battle.players) {
      // Solo Showdown: flat liste, alle mot alle.
      const me = battle.players.find((p) => p.tag === tag);
      if (!me || !me.brawler) continue;

      const trophyChange = battle.trophyChange ?? null;
      const outcome =
        trophyChange === null
          ? "draw"
          : trophyChange > 0
          ? "win"
          : trophyChange < 0
          ? "loss"
          : "draw";

      normalized.push({
        battleTime: item.battleTime,
        map,
        mode,
        brawlerId: me.brawler.id,
        brawlerName: me.brawler.name,
        outcome,
        trophyChange,
        rankedFormat: "ffa",
        rating: null, // ekte troféer i FFA, ikke rank-poeng — ikke relevant som rating
        teammates: [], // FFA har ingen faste lagkamerater
      });
      continue;
    }

    if (battle.type === "soloRanked" && battle.teams) {
      const myTeam = battle.teams.find((team) =>
        team.some((p) => p.tag === tag)
      );
      const me = myTeam?.find((p) => p.tag === tag);
      if (!me || !me.brawler) continue;

      const outcome =
        battle.result === "victory"
          ? "win"
          : battle.result === "defeat"
          ? "loss"
          : "draw";

      const teammates = (myTeam ?? [])
        .filter((p) => p.tag !== tag)
        .map((p) => ({ tag: p.tag, name: p.name }));

      normalized.push({
        battleTime: item.battleTime,
        map,
        mode,
        brawlerId: me.brawler.id,
        brawlerName: me.brawler.name,
        outcome,
        trophyChange: battle.trophyChange ?? null,
        rankedFormat: "team",
        rating: me.brawler.trophies ?? null,
        teammates,
      });
    }
  }

  return normalized;
}

export async function getPlayerRankedStats(
  name: string,
  tag: string
): Promise<PlayerStats> {
  try {
    const raw = await fetchRawBattlelog(tag);
    const battles = normalizeBattles(raw, tag);

    const wins = battles.filter((b) => b.outcome === "win").length;
    const losses = battles.filter((b) => b.outcome === "loss").length;
    const draws = battles.filter((b) => b.outcome === "draw").length;
    const decisive = wins + losses;

    return {
      name,
      tag,
      battles,
      games: battles.length,
      wins,
      losses,
      draws,
      winrate: decisive > 0 ? (wins / decisive) * 100 : 0,
    };
  } catch (err) {
    return {
      name,
      tag,
      battles: [],
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winrate: 0,
      fetchError: err instanceof Error ? err.message : "Ukjent feil",
    };
  }
}

export function aggregateBrawlers(
  battles: NormalizedBattle[],
  minSampleSize = 3
): BrawlerAggregate[] {
  const map = new Map<
    number,
    { name: string; games: number; wins: number; chrono: NormalizedBattle[] }
  >();

  for (const b of battles) {
    const entry = map.get(b.brawlerId) ?? {
      name: b.brawlerName,
      games: 0,
      wins: 0,
      chrono: [],
    };
    entry.games += 1;
    if (b.outcome === "win") entry.wins += 1;
    entry.chrono.push(b);
    map.set(b.brawlerId, entry);
  }

  return Array.from(map.entries())
    .map(([brawlerId, v]) => ({
      brawlerId,
      brawlerName: v.name,
      games: v.games,
      wins: v.wins,
      winrate: v.games > 0 ? (v.wins / v.games) * 100 : 0,
      trend: buildTrend(v.chrono),
    }))
    .filter((b) => b.games >= minSampleSize)
    .sort((a, b) => b.winrate - a.winrate);
}

// Kumulativ netto-score (seier +1, tap -1) i kronologisk rekkefølge, brukt
// til sparkline-trender. Tar de siste 10 kampene for den gitte gruppen.
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
