import type { Outcome } from "@/lib/brawlstars/types";

// Viser de siste N kampene som fargede bokser med L/W/U, akkurat som
// streak-raden i brawlstarsnorge.com sitt design. Forventer battles
// sortert NYEST FØRST, men rendrer eldst-til-nyest (venstre-til-høyre)
// slik referansen gjør.
export function StreakPills({
  outcomes,
  limit = 10,
}: {
  outcomes: Outcome[];
  limit?: number;
}) {
  const shown = outcomes.slice(0, limit).slice().reverse();

  if (shown.length === 0) {
    return <span className="text-text-muted text-xs">Ingen kamper ennå</span>;
  }

  return (
    <div className="flex gap-1.5">
      {shown.map((o, i) => (
        <span
          key={i}
          className="flex items-center justify-center w-6 h-6 rounded text-xs font-bold"
          style={{
            background:
              o === "win"
                ? "color-mix(in srgb, var(--win) 20%, transparent)"
                : o === "loss"
                ? "color-mix(in srgb, var(--loss) 20%, transparent)"
                : "color-mix(in srgb, var(--draw) 20%, transparent)",
            color:
              o === "win" ? "var(--win)" : o === "loss" ? "var(--loss)" : "var(--draw)",
          }}
        >
          {o === "win" ? "W" : o === "loss" ? "L" : "U"}
        </span>
      ))}
    </div>
  );
}
