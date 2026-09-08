// ERA Talents roster.
//
// Legg til eller endre spillere her. "tag" må være spillerens permanente
// Brawl Stars player tag (med # foran). "name" er visningsnavnet og kan
// endres fritt uten at det påvirker historikken, siden all statistikk er
// koblet til tag, ikke navn.

export type RosterPlayer = {
  name: string;
  tag: string;
};

export const TEAM_NAME = "ERA Talents";

export const ROSTER: RosterPlayer[] = [
  { name: "ERA|Yaarrf?", tag: "#9CJP2VYYP" },
  { name: "ERA|one day", tag: "#9C08R0JRJ" },
  { name: "ERA|12 3 13", tag: "#2RGGGJQ0" },
];
