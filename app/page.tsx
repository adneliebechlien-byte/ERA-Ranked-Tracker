import Link from "next/link";
import { ROSTER, TEAM_NAME } from "@/lib/roster";
import { aggregateBrawlers } from "@/lib/brawlstars/client";
import { syncAndGetPlayerHistory } from "@/lib/history";
import { aggregateByMap, teammateStats } from "@/lib/stats";
import type { PlayerStats } from "@/lib/brawlstars/types";
import type { StoredBattle } from "@/lib/store";
import { modeLabel, timeAgo } from "@/lib/format";
import { Sparkline } from "@/components/Sparkline";
import { StreakPills } from "@/components/StreakPills";
import { StatBox, WinrateBar } from "@/components/StatBox";
import { BrawlerIcon, ModeIcon } from "@/components/Icon";

export const revalidate = 300;
export const dynamic = "force-dynamic";

function combineStats(players: PlayerStats[]) {
  const wins = players.reduce((s, p) => s + p.wins, 0);
  const losses = players.reduce((s, p) => s + p.losses, 0);
  const games = players.reduce((s, p) => s + p.games, 0);
  const decisive = wins + losses;
  const winrate = decisive > 0 ? (wins / decisive) * 100 : 0;
  return { wins, losses, games, winrate };
}

export default async function Home() {
  if (ROSTER.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-panel p-8 text-center text-text-muted">
        Ingen spillere lagt til i rosteret. Rediger{" "}
        <code className="text-accent">lib/roster.ts</code> for å legge til
        ERA-spillerne.
      </div>
    );
  }

  const players = await Promise.all(
    ROSTER.map((p) => syncAndGetPlayerHistory(p.name, p.tag))
  );

  const combined = combineStats(players);
  const allBattles = players.flatMap((p) => p.battles) as StoredBattle[];
  const topBrawlers = aggregateBrawlers(allBattles, 3).slice(0, 10);
  const topMaps = aggregateByMap(allBattles, 3).slice(0, 10);
  const nameByTag = Object.fromEntries(ROSTER.map((p) => [p.tag, p.name]));
  const together = teammateStats(allBattles, nameByTag).filter((t) => t.games > 0);

  const combinedDesc = allBattles
    .slice()
    .sort((a, b) => (a.battleTime < b.battleTime ? 1 : -1));
  const recentGames = combinedDesc.slice(0, 12);

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="relative rounded-xl border border-border bg-panel p-6 overflow-hidden">
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-panel-alt border border-border flex items-center justify-center font-display font-bold text-xl text-accent shrink-0">
              ET
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-2xl font-bold">{TEAM_NAME}</h1>
              <p className="text-text-muted text-sm">Samlet rangert-form for hele laget</p>
              <StreakPills outcomes={combinedDesc.map((b) => b.outcome)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatBox label="Sett spilt" value={combined.games} />
            <StatBox label="Winrate" value={`${combined.winrate.toFixed(1)}%`} color="var(--accent)" />
            <StatBox label="Seire" value={combined.wins} color="var(--win)" />
            <StatBox label="Tap" value={combined.losses} color="var(--loss)" />
          </div>
        </div>
      </section>

      {/* Player cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {players.map((p) => (
          <Link
            href={`/player/${encodeURIComponent(p.tag)}`}
            key={p.tag}
            className="rounded-lg border border-border bg-panel p-5 flex flex-col gap-4 hover:border-accent transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display font-bold">{p.name}</h3>
                <p className="text-text-muted text-xs">{p.tag}</p>
              </div>
              {!p.fetchError && (
                <span className="font-display text-2xl font-bold tabular-nums">
                  {p.winrate.toFixed(0)}%
                </span>
              )}
            </div>

            {p.fetchError ? (
              <p className="text-loss text-sm">{p.fetchError}</p>
            ) : (
              <>
                <div className="text-sm text-text-muted">
                  <span className="text-win">{p.wins}W</span>
                  {" – "}
                  <span className="text-loss">{p.losses}L</span>
                  {p.draws > 0 && <span> – {p.draws}D</span>}
                  <span> · {p.games} kamper</span>
                </div>
                <StreakPills outcomes={p.battles.map((b) => b.outcome)} limit={10} />
              </>
            )}
          </Link>
        ))}
      </section>

      {/* Brawlers + maps */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-3">
          <h2 className="font-display font-bold">Beste brawlere</h2>
          <p className="text-text-muted text-xs -mt-2">Minimum 3 kamper for å telle med</p>
          {topBrawlers.length === 0 ? (
            <p className="text-text-muted text-sm">Ingen brawler har nok kamper ennå.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-text-muted bg-panel-alt">
                <span>Brawler</span>
                <span>Trend</span>
                <span className="text-right">Winrate</span>
              </div>
              {topBrawlers.map((b, i) => (
                <div
                  key={b.brawlerId}
                  className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm ${
                    i !== topBrawlers.length - 1 ? "border-b border-border" : ""
                  } ${i % 2 === 1 ? "bg-panel-alt" : "bg-panel"}`}
                >
                  <div className="flex items-center gap-2">
                    <BrawlerIcon brawlerId={b.brawlerId} size={28} />
                    <div className="flex flex-col">
                      <span>{b.brawlerName}</span>
                      <span className="text-text-muted text-xs">{b.games} kamper</span>
                    </div>
                  </div>
                  <Sparkline values={b.trend} width={70} height={24} />
                  <div className="w-28">
                    <WinrateBar winrate={b.winrate} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="font-display font-bold">Beste maps</h2>
          <p className="text-text-muted text-xs -mt-2">Minimum 3 kamper for å telle med</p>
          {topMaps.length === 0 ? (
            <p className="text-text-muted text-sm">Ingen map har nok kamper ennå.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-text-muted bg-panel-alt">
                <span>Map</span>
                <span>Trend</span>
                <span className="text-right">Winrate</span>
              </div>
              {topMaps.map((m, i) => (
                <div
                  key={m.map}
                  className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm ${
                    i !== topMaps.length - 1 ? "border-b border-border" : ""
                  } ${i % 2 === 1 ? "bg-panel-alt" : "bg-panel"}`}
                >
                  <div className="flex flex-col">
                    <span>{m.map}</span>
                    <span className="text-text-muted text-xs">{m.games} kamper</span>
                  </div>
                  <Sparkline values={m.trend} width={70} height={24} />
                  <div className="w-28">
                    <WinrateBar winrate={m.winrate} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Together + recent */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="font-display font-bold">Sammen</h2>
          <p className="text-text-muted text-xs -mt-2">
            Winrate når to eller flere av dere havner i samme rangerte lag
          </p>
          {together.length === 0 ? (
            <p className="text-text-muted text-sm">
              Ingen registrerte kamper der dere har spilt sammen ennå.
            </p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              {together.map((t, i) => (
                <div
                  key={t.tags.join("+")}
                  className={`flex items-center justify-between px-4 py-3 text-sm ${
                    i !== together.length - 1 ? "border-b border-border" : ""
                  } ${i % 2 === 1 ? "bg-panel-alt" : "bg-panel"}`}
                >
                  <span>{t.names.join(" + ")}</span>
                  <div className="w-32">
                    <WinrateBar winrate={t.winrate} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 flex flex-col gap-3">
          <h2 className="font-display font-bold">Siste kamper</h2>
          {recentGames.length === 0 ? (
            <p className="text-text-muted text-sm">Ingen kamper registrert ennå.</p>
          ) : (
            <div className="flex flex-col">
              {recentGames.map((g, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-3 pl-4 border-l-2"
                  style={{
                    borderColor:
                      g.outcome === "win"
                        ? "var(--win)"
                        : g.outcome === "loss"
                        ? "var(--loss)"
                        : "var(--draw)",
                    borderTop: i !== 0 ? "1px solid var(--border)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <ModeIcon mode={g.mode} size={28} />
                    <div>
                      <p className="text-sm">
                        {modeLabel(g.mode)} · {g.map}
                      </p>
                      <p className="text-text-muted text-xs flex items-center gap-1">
                        <BrawlerIcon brawlerId={g.brawlerId} size={16} />
                        {nameByTag[g.tag]} · {g.brawlerName}
                      </p>
                    </div>
                  </div>
                  <span className="text-text-muted text-xs whitespace-nowrap">
                    {timeAgo(g.battleTime)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
