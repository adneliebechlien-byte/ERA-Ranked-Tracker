const MODE_LABELS: Record<string, string> = {
  soloShowdown: "Solo Showdown",
  duoShowdown: "Duo Showdown",
  gemGrab: "Gem Grab",
  brawlBall: "Brawl Ball",
  bounty: "Bounty",
  heist: "Heist",
  hotZone: "Hot Zone",
  knockout: "Knockout",
  siege: "Siege",
  duels: "Duels",
  wipeout: "Wipeout",
};

export function modeLabel(mode: string): string {
  return MODE_LABELS[mode] ?? mode;
}

export function parseBattleTime(raw: string): Date {
  // Format: "20260902T101546.000Z" -> ISO "2026-09-02T10:15:46.000Z"
  const match = raw.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/
  );
  if (!match) return new Date(raw);
  const [, y, mo, d, h, mi, s] = match;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

export function timeAgo(raw: string): string {
  const date = parseBattleTime(raw);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "akkurat nå";
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} t siden`;
  const days = Math.floor(hours / 24);
  return `${days} d siden`;
}
