import { ThreatLevel } from "./types";

export type MaraArc = "survey" | "dark" | "descent" | "boss" | "system";

export type MaraLineId =
  | "survey-01"
  | "survey-02"
  | "survey-03"
  | "dark-01"
  | "dark-02"
  | "dark-03"
  | "descent-01"
  | "descent-02"
  | "descent-03"
  | "boss-01"
  | "boss-02"
  | "boss-03"
  | "boss-defeated-01"
  | "complete-01"
  | "shield-broken-01"
  | "sound-check-01"
  | "wraith-silence-01";

export interface MaraLine {
  id: MaraLineId;
  text: string;
  arc: MaraArc;
  priority: ThreatLevel;
  src?: string;
}

export const MARA_LINES: Record<MaraLineId, MaraLine> = {
  "survey-01": {
    id: "survey-01",
    text: "Rex. Stay close. And listen.",
    arc: "survey",
    priority: ThreatLevel.Tactical,
  },
  "survey-02": {
    id: "survey-02",
    text: "Good. The cave is answering you now.",
    arc: "survey",
    priority: ThreatLevel.Tactical,
  },
  "survey-03": {
    id: "survey-03",
    text: "That echo is not decoration. It is the map.",
    arc: "survey",
    priority: ThreatLevel.Tactical,
  },
  "dark-01": {
    id: "dark-01",
    text: "Torch is gone. We are doing this your way now.",
    arc: "dark",
    priority: ThreatLevel.Tactical,
  },
  "dark-02": {
    id: "dark-02",
    text: "I can hear the walls before I can see them. I hate how useful that is.",
    arc: "dark",
    priority: ThreatLevel.Tactical,
  },
  "dark-03": {
    id: "dark-03",
    text: "The air changed. I am going to pretend that is normal fieldwork.",
    arc: "dark",
    priority: ThreatLevel.Tactical,
  },
  "descent-01": {
    id: "descent-01",
    text: "Do not wait for me to name it. Move when the cave goes quiet.",
    arc: "descent",
    priority: ThreatLevel.Tactical,
  },
  "descent-02": {
    id: "descent-02",
    text: "Something learned our rhythm. Change it.",
    arc: "descent",
    priority: ThreatLevel.Tactical,
  },
  "descent-03": {
    id: "descent-03",
    text: "Rex, ping first. I am not guessing down here.",
    arc: "descent",
    priority: ThreatLevel.Tactical,
  },
  "boss-01": {
    id: "boss-01",
    text: "I have seen this before. In the fossil record.",
    arc: "boss",
    priority: ThreatLevel.Tactical,
  },
  "boss-02": {
    id: "boss-02",
    text: "No jokes now. Listen for the breath.",
    arc: "boss",
    priority: ThreatLevel.Tactical,
  },
  "boss-03": {
    id: "boss-03",
    text: "When it inhales, leave the center.",
    arc: "boss",
    priority: ThreatLevel.Tactical,
  },
  "boss-defeated-01": {
    id: "boss-defeated-01",
    text: "The breathing stopped. I am choosing to enjoy that.",
    arc: "boss",
    priority: ThreatLevel.Tactical,
  },
  "complete-01": {
    id: "complete-01",
    text: "Ten levels. We are alive. That is not the same as safe.",
    arc: "system",
    priority: ThreatLevel.Tactical,
  },
  "shield-broken-01": {
    id: "shield-broken-01",
    text: "Shield gone. Useful while it lasted.",
    arc: "system",
    priority: ThreatLevel.Critical,
  },
  "sound-check-01": {
    id: "sound-check-01",
    text: "Sound check. Hear the exit beacon, crystal shimmer, crawler scrape, and rock crackle. Press Q to scan with those same sounds.",
    arc: "system",
    priority: ThreatLevel.Tactical,
  },
  "wraith-silence-01": {
    id: "wraith-silence-01",
    text: "...",
    arc: "descent",
    priority: ThreatLevel.Tactical,
  },
};

export const MARA_DEPTH_LINES: Record<Exclude<MaraArc, "system">, MaraLineId[]> = {
  survey: ["survey-01", "survey-02", "survey-03"],
  dark: ["dark-01", "dark-02", "dark-03"],
  descent: ["descent-01", "descent-02", "descent-03"],
  boss: ["boss-01", "boss-02", "boss-03"],
};

export function lineForDepth(depth: number): MaraLineId {
  const pool = linesForDepth(depth);
  return pool[(depth - 1) % pool.length];
}

export function linesForDepth(depth: number): MaraLineId[] {
  if (depth % 5 === 0) return MARA_DEPTH_LINES.boss;
  if (depth >= 9) return MARA_DEPTH_LINES.descent;
  if (depth >= 5) return MARA_DEPTH_LINES.dark;
  return MARA_DEPTH_LINES.survey;
}
