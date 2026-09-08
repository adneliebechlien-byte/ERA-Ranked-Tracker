export function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel px-5 py-3 flex flex-col gap-1 min-w-[110px]">
      <span className="text-text-muted text-[11px] tracking-wide uppercase">
        {label}
      </span>
      <span
        className="font-display text-2xl font-bold tabular-nums"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

export function WinrateBar({ winrate }: { winrate: number }) {
  const color =
    winrate >= 55 ? "var(--win)" : winrate < 45 ? "var(--loss)" : "var(--accent)";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="h-1.5 flex-1 rounded-full bg-panel-alt overflow-hidden min-w-[60px]">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, winrate))}%`, background: color }}
        />
      </div>
      <span
        className="font-display font-bold text-sm tabular-nums w-12 text-right"
        style={{ color }}
      >
        {winrate.toFixed(1)}%
      </span>
    </div>
  );
}
