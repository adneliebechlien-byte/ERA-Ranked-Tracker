// lib/history.ts
//
// Bindeledd mellom live-hentingen fra Brawl Stars API (client.ts) og den
// varige lagringen i Supabase (store.ts). Dette er funksjonen resten av
// appen bruker — den henter ferske kamper, lagrer alt nytt til databasen,
// og returnerer statistikk basert på ALL historikk vi har lagret, ikke
// bare de siste ~25 kampene API-et gir oss.

import { fetchRawBattlelog, normalizeBattles } from "./brawlstars/client";
import type { PlayerStats } from "./brawlstars/types";
import { loadStoredBattlesForTag, saveNewBattles, type StoredBattle } from "./store";
import { groupIntoSets } from "./stats";

function computeStats(
  name: string,
  tag: string,
  battles: StoredBattle[]
): PlayerStats {
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
}

export async function syncAndGetPlayerHistory(
  name: string,
  tag: string
): Promise<PlayerStats> {
  try {
    const raw = await fetchRawBattlelog(tag);
    const freshBattles = normalizeBattles(raw, tag).map((b) => ({
      ...b,
      tag,
    }));

    await saveNewBattles(tag, name, freshBattles);
    const allStored = await loadStoredBattlesForTag(tag);
    const sets = groupIntoSets(allStored);

    return computeStats(name, tag, sets);
  } catch (err) {
    // API-kallet feilet (nede, IP-blokkert, osv.) — vis historikken vi
    // allerede har lagret istedenfor å miste alt.
    const existing = await loadStoredBattlesForTag(tag);
    const sets = groupIntoSets(existing);
    return {
      ...computeStats(name, tag, sets),
      fetchError: err instanceof Error ? err.message : "Ukjent feil",
    };
  }
}
