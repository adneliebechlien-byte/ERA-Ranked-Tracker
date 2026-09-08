// scripts/sync-battlelog.ts
//
// Henter battlelog for hele rosteret og lagrer nye kamper til
// data/battles.json. Kjør denne jevnlig (manuelt, eller f.eks. som en
// cron-jobb) for å unngå at kamper faller ut av de siste ~25 API-et gir
// oss før vi rekker å lagre dem.
//
// BRUK:
//   npm run sync
//
// Husk å commite og pushe data/battles.json etterpå hvis dere vil dele
// historikken mellom dere tre via git.

import { ROSTER } from "../lib/roster";
import { syncAndGetPlayerHistory } from "../lib/history";

async function main() {
  console.log(`Synker battlelog for ${ROSTER.length} spillere...\n`);

  for (const player of ROSTER) {
    const stats = await syncAndGetPlayerHistory(player.name, player.tag);

    if (stats.fetchError) {
      console.error(`❌ ${player.name}: ${stats.fetchError}`);
    } else {
      console.log(
        `✅ ${player.name}: ${stats.games} kamper lagret totalt (${stats.wins}W-${stats.losses}L)`
      );
    }
  }

  console.log("\nFerdig. Husk å commite data/battles.json hvis den endret seg.");
}

main();
