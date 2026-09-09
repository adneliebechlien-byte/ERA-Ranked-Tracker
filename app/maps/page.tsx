import Link from "next/link";
import { ROSTER } from "@/lib/roster";
import { syncAndGetPlayerHistory } from "@/lib/history";
import { aggregateMapsWithTopBrawlers } from "@/lib/stats";
import type { StoredBattle } from "@/lib/store";
import { BrawlerIcon } from "@/components/Icon";
import { WinrateBar } from "@/components/StatBox";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function MapsPage() {
  const players = await Promise.all(
    ROSTER.map((p) => syncAndGetPlayerHistory(p.name, p.tag))
  );
  const allBattles = players.flatMap((p) => p.battles) as StoredBattle[];
  const maps = aggregateMapsWithTopBrawlers(allBattles, 2);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/" className="text-text-muted text-sm hover:text-text w-fit">
        ← Tilbake til oversikt
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold">Alle maps</h1>
        <p className="text-text-muted text-sm">
          Hvert map med samlet winrate og topp 3 brawlere spilt der (minimum 2 kamper per brawler)
        </p>
      </div>

      {maps.length === 0 ? (
        <p className="text-text-muted text-sm">Ingen kamper registrert ennå.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {maps.map((m) => (
            <div
              key={m.map}
              className="rounded-lg border border-border bg-panel p-5 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-display font-bold text-lg">{m.map}</h2>
                  <p className="text-text-muted text-xs">{m.totalGames} kamper totalt</p>
                </div>
                <div className="w-40">
                  <WinrateBar winrate={m.totalWinrate} />
                </div>
              </div>

              {m.topBrawlers.length === 0 ? (
                <p className="text-text-muted text-xs">
                  Ingen brawler har nok kamper på dette mapet ennå.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {m.topBrawlers.map((b, i) => (
                    <div
                      key={b.brawlerId}
                      className="flex items-center gap-3 rounded-md bg-panel-alt border border-border px-3 py-2"
                    >
                      <span className="font-display font-bold text-accent text-sm w-4">
                        {i + 1}
                      </span>
                      <BrawlerIcon brawlerId={b.brawlerId} size={32} />
                      <div className="flex flex-col">
                        <span className="text-sm">{b.brawlerName}</span>
                        <span className="text-text-muted text-xs">
                          {b.games} kamper · {b.winrate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
