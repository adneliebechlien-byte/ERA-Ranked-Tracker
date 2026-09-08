// Brawlify (cdn.brawlify.com) er et gratis, åpent CDN for Brawl Stars-
// grafikk, mye brukt av utviklere. Ingen nøkkel, ingen rate-limit, ingen
// kreditering påkrevd. Vi lenker direkte til bildene — ingen nedlasting
// eller lagring nødvendig hos oss.
// Kilde: https://github.com/Brawlify/CDN

export function brawlerIconUrl(brawlerId: number): string {
  return `https://cdn.brawlify.com/brawlers/borders/${brawlerId}.png`;
}

// Brawlify sine mode-ikoner er navngitt med stor forbokstav og bindestrek
// (f.eks. "Gem-Grab", "Brawl-Ball"), ikke Supercells camelCase-navn
// ("gemGrab"). Denne oversetter mellom de to.
const MODE_SLUGS: Record<string, string> = {
  soloShowdown: "Solo-Showdown",
  duoShowdown: "Duo-Showdown",
  gemGrab: "Gem-Grab",
  brawlBall: "Brawl-Ball",
  bounty: "Bounty",
  heist: "Heist",
  hotZone: "Hot-Zone",
  knockout: "Knockout",
  siege: "Siege",
  duels: "Duels",
  wipeout: "Wipeout",
  brawlBall5v5: "Brawl-Ball-5V5",
  knockout5v5: "Knockout-5V5",
  wipeout5v5: "Wipeout-5V5",
};

export function modeIconUrl(mode: string): string | null {
  const slug = MODE_SLUGS[mode];
  if (!slug) return null;
  return `https://cdn-misc.brawlify.com/gamemode/header/${slug}.png`;
}
