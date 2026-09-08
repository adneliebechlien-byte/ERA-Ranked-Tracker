import Link from "next/link";
import { notFound } from "next/navigation";
import { ROSTER } from "@/lib/roster";
import { aggregateBrawlers } from "@/lib/brawlstars/client";
import { syncAndGetPlayerHistory } from "@/lib/history";
import {
  aggregateByMap,
  currentStreak,
  winrateOverLast,
} from "@/lib/stats";
import { modeLabel, timeAgo } from "@/lib/format";
import { Sparkline } from "@/components/Sparkline";
import { StreakPills } from "@/components/StreakPills";
import { StatBox, WinrateBar } from "@/components/StatBox";
import { BrawlerIcon, ModeIcon } from "@/components/Icon";

export const revalidate = 300;
export const dynamic = "force-dynamic";

function initials(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: rawTag } = await params;
  const decoded = decodeURIComponent(rawTag);
  const tag = decoded.startsWith("#") ? decoded : `#${decoded}`;

  const rosterEntry = ROSTER.find((p) => p.tag === tag);
  if (!rosterEntry) notFound();

  const stats = await syncAndGetPlayerHistory(rosterEntry.name, tag);
  const battlesDesc = [...stats.battles].sort((a, b) =>
    a.battleTime < b.battleTime ? 1 : -1
  );
  const battlesAsc = [...battlesDesc].reverse();

  const wr5 = winrateOverLast(battlesDesc, 5);
  const wr10 = winrateOverLast(battlesDesc, 10);
  const wr20 = winrateOverLast(battlesDesc, 20);
  const streak = currentStreak(battlesDesc);

  const brawlerStats = aggregateBrawlers(stats.battles, 3);
  const mapStats = aggregateByMap(stats.battles, 3);
  const bestMap = mapStats[0];
  const worstMap = mapStats.length > 0 ? mapStats[mapStats.length - 1] : undefined;

  // Kumulativ form-graf over hele historikken vi har (for hero-bakgrunnen).
  let running = 0;
  const formTrend = battlesAsc.map((b) => {
    running += b.outcome === "win" ? 1 : b.outcome === "loss" ? -1 : 0;
    return running;
  });

  const latestRating = battlesDesc.find(
    (b) => b.rankedFormat === "team" && b.rating !== null
  )?.rating;

  return (
    <div className="flex flex-col gap-10">
      <Link href="/" className="text-text-muted text-sm hover:text-text w-fit">
        ← Tilbake til oversikt
      </Link>

      {/* Hero */}
      <section className="relative rounded-xl border border-border bg-panel p-6 overflow-hidden">
        {formTrend.length > 1 && (
          <div className="absolute inset-0 opacity-30 flex items-end">
            <div className="w-full h-full">
              <Sparkline values={formTrend} width={1000} height={140} />
            </div>
          </div>
        )}

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-panel-alt border border-border flex items-center justify-center font-display font-bold text-xl text-accent shrink-0">
              {initials(rosterEntry.name)}
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-2xl font-bold">{rosterEntry.name}</h1>
              <p className="text-text-muted text-sm">
                {tag}
                {latestRating !== undefined && latestRating !== null && (
                  <span> · Rating {latestRating}</span>
                )}
                {streak.type !== "none" && streak.count > 1 && (
                  <span className="text-accent">
                    {" "}
                    · {streak.type === "win" ? "🔥 " : ""}
                    {streak.type === "win" ? "W" : "L"}
                    {streak.count} streak
                  </span>
                )}
              </p>
              <StreakPills outcomes={battlesDesc.map((b) => b.outcome)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatBox label="Sett spilt" value={stats.games} />
            <StatBox label="Winrate" value={`${stats.winrate.toFixed(1)}%`} color="var(--accent)" />
            <StatBox label="Seire" value={stats.wins} color="var(--win)" />
            <StatBox label="Tap" value={stats.losses} color="var(--loss)" />
          </div>
        </div>

        {stats.fetchError && (
          <p className="relative text-loss text-sm mt-4">{stats.fetchError}</p>
        )}
      </section>

      {/* WR windows */}
      <section className="grid grid-cols-3 gap-4">
        {[
          { label: "Siste 5", value: wr5 },
          { label: "Siste 10", value: wr10 },
          { label: "Siste 20", value: wr20 },
        ].map((w) => (
          <div
            key={w.label}
            className="rounded-lg border border-border bg-panel p-4 flex flex-col gap-1"
          >
            <span className="text-text-muted text-xs">{w.label}</span>
            <span className="font-display text-2xl font-bold tabular-nums">
              {w.value.toFixed(0)}%
            </span>
          </div>
        ))}
      </section>

      {/* Best/worst map */}
      {(bestMap || worstMap) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestMap && (
            <div className="rounded-lg border-l-4 border border-border p-4 flex items-center justify-between" style={{ borderLeftColor: "var(--win)" }}>
              <div>
                <p className="text-win text-xs font-bold uppercase tracking-wide">Beste map</p>
                <p className="font-display text-lg font-bold">{bestMap.map}</p>
                <p className="text-text-muted text-xs">{bestMap.games} sett</p>
              </div>
              <span className="font-display text-3xl font-bold text-win">
                {bestMap.winrate.toFixed(1)}%
              </span>
            </div>
          )}
          {worstMap && (
            <div className="rounded-lg border-l-4 border border-border p-4 flex items-center justify-between" style={{ borderLeftColor: "var(--loss)" }}>
              <div>
                <p className="text-loss text-xs font-bold uppercase tracking-wide">Dårligste map</p>
                <p className="font-display text-lg font-bold">{worstMap.map}</p>
                <p className="text-text-muted text-xs">{worstMap.games} sett</p>
              </div>
              <span className="font-display text-3xl font-bold text-loss">
                {worstMap.winrate.toFixed(1)}%
              </span>
            </div>
          )}
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h2 className="font-display font-bold">Brawlere</h2>
          <p className="text-text-muted text-xs -mt-2">Minimum 3 kamper for å telle med</p>
          {brawlerStats.length === 0 ? (
            <p className="text-text-muted text-sm">Ingen brawler har nok kamper ennå.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-text-muted bg-panel-alt">
                <span>Brawler</span>
                <span>Trend</span>
                <span className="text-right">Winrate</span>
              </div>
              {brawlerStats.map((b, i) => (
                <div
                  key={b.brawlerId}
                  className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm ${
                    i !== brawlerStats.length - 1 ? "border-b border-border" : ""
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

          <h2 className="font-display font-bold mt-6">Maps</h2>
          <p className="text-text-muted text-xs -mt-2">Minimum 3 kamper for å telle med</p>
          {mapStats.length === 0 ? (
            <p className="text-text-muted text-sm">Ingen map har nok kamper ennå.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-text-muted bg-panel-alt">
                <span>Map</span>
                <span>Trend</span>
                <span className="text-right">Winrate</span>
              </div>
              {mapStats.map((m, i) => (
                <div
                  key={m.map}
                  className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm ${
                    i !== mapStats.length - 1 ? "border-b border-border" : ""
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

        <div className="lg:col-span-3 flex flex-col gap-3">
          <h2 className="font-display font-bold">Alle kamper</h2>
          {battlesDesc.length === 0 ? (
            <p className="text-text-muted text-sm">Ingen kamper registrert ennå.</p>
          ) : (
            <div className="flex flex-col">
              {battlesDesc.map((g, i) => (
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
                        {g.brawlerName}
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
