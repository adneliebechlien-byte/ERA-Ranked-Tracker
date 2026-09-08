// lib/store.ts
//
// Varig lagring av ranked-historikk, nå backet av Supabase (Postgres) i
// stedet for en lokal JSON-fil. Grunnen til byttet: en lokal fil skrevet
// med fs.writeFileSync overlever ikke på Vercel, siden serverless-miljøet
// der har et skrivebeskyttet, midlertidig filsystem — data ville forsvunnet
// mellom forespørsler. Supabase er en ekte, alltid-tilgjengelig database.
//
// Resten av appen (history.ts, sync-battlelog.ts, page.tsx) trenger ingen
// endringer — grensesnittet er bevisst likt det filbaserte laget hadde.

import { getSupabase } from "./supabaseClient";
import type { NormalizedBattle } from "./brawlstars/types";

export type StoredBattle = NormalizedBattle & { tag: string };

type Row = {
  tag: string;
  player_name: string;
  battle_time: string;
  map: string;
  mode: string;
  brawler_id: number;
  brawler_name: string;
  outcome: string;
  trophy_change: number | null;
  ranked_format: string;
  rating: number | null;
};

function rowToStoredBattle(row: Row): StoredBattle {
  return {
    tag: row.tag,
    battleTime: row.battle_time,
    map: row.map,
    mode: row.mode,
    brawlerId: row.brawler_id,
    brawlerName: row.brawler_name,
    outcome: row.outcome as StoredBattle["outcome"],
    trophyChange: row.trophy_change,
    rankedFormat: row.ranked_format as StoredBattle["rankedFormat"],
    rating: row.rating,
  };
}

export async function loadStoredBattlesForTag(
  tag: string
): Promise<StoredBattle[]> {
  const { data, error } = await getSupabase()
    .from("ranked_battles")
    .select(
      "tag, player_name, battle_time, map, mode, brawler_id, brawler_name, outcome, trophy_change, ranked_format, rating"
    )
    .eq("tag", tag)
    .order("battle_time", { ascending: false });

  if (error) {
    console.error("Supabase (loadStoredBattlesForTag) feilet:", error.message);
    return [];
  }

  return (data ?? []).map(rowToStoredBattle);
}

// Lagrer nye kamper. Databasen har en unik-constraint på (tag, battle_time),
// så vi kan trygt sende inn kamper vi allerede har lagret før — de blir
// automatisk hoppet over (ignoreDuplicates) i stedet for å lage duplikater.
export async function saveNewBattles(
  tag: string,
  playerName: string,
  battles: NormalizedBattle[]
): Promise<number> {
  if (battles.length === 0) return 0;

  const rows: Row[] = battles.map((b) => ({
    tag,
    player_name: playerName,
    battle_time: b.battleTime,
    map: b.map,
    mode: b.mode,
    brawler_id: b.brawlerId,
    brawler_name: b.brawlerName,
    outcome: b.outcome,
    trophy_change: b.trophyChange,
    ranked_format: b.rankedFormat,
    rating: b.rating,
  }));

  const { error, count } = await getSupabase()
    .from("ranked_battles")
    .upsert(rows, {
      onConflict: "tag,battle_time",
      ignoreDuplicates: true,
      count: "exact",
    });

  if (error) {
    console.error("Supabase (saveNewBattles) feilet:", error.message);
    return 0;
  }

  return count ?? 0;
}
