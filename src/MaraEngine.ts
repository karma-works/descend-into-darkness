import { MARA_TACTICAL_DEBOUNCE_MS } from "./constants";
import { EntityType, ShopItem, SpatialResult, ThreatLevel } from "./types";

const LINES_SURVEY = [
  "Rex. Stay close. And listen.",
  "Good. The cave is answering you now.",
  "That echo is not decoration. It is the map.",
];

const LINES_DARK = [
  "Torch is gone. We are doing this your way now.",
  "I can hear the walls before I can see them. I hate how useful that is.",
  "The air changed. I am going to pretend that is normal fieldwork.",
];

const LINES_DESCENT = [
  "Do not wait for me to name it. Move when the cave goes quiet.",
  "Something learned our rhythm. Change it.",
  "Rex, ping first. I am not guessing down here.",
];

const LINES_BOSS = [
  "I have seen this before. In the fossil record.",
  "No jokes now. Listen for the breath.",
  "When it inhales, leave the center.",
];

export class MaraEngine {
  private voice: SpeechSynthesisVoice | null = null;
  private queue: { line: string; priority: ThreatLevel }[] = [];
  private speaking = false;
  private muted = false;
  private volume = 1;
  private lastTacticalAt = 0;

  constructor(private readonly onLine: (line: string) => void) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", () => this.pickVoice());
      this.pickVoice();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  speak(line: string, priority: ThreatLevel = ThreatLevel.Tactical): void {
    this.onLine(line);
    if (this.muted || !("speechSynthesis" in window)) return;

    if (priority === ThreatLevel.Critical) {
      window.speechSynthesis.cancel();
      this.queue = [];
      this.sayNow(line, priority);
      return;
    }

    const now = performance.now();
    if (priority === ThreatLevel.Tactical && now - this.lastTacticalAt < MARA_TACTICAL_DEBOUNCE_MS) {
      this.queue.push({ line, priority });
      return;
    }

    if (this.speaking) {
      this.queue.push({ line, priority });
      return;
    }

    this.sayNow(line, priority);
  }

  onDepthChange(depth: number): void {
    const pool = this.linesForDepth(depth);
    this.speak(pool[(depth - 1) % pool.length], ThreatLevel.Tactical);
  }

  onDeath(cause: string, direction: string, missedSignal: string): string {
    const line = `${cause}. ${direction}. ${missedSignal}`;
    this.speak(line, ThreatLevel.Critical);
    return line;
  }

  onEcholocationResult(results: SpatialResult[]): string {
    if (results.length === 0) {
      const line = "The ping came back almost empty. Open space nearby.";
      this.speak(line, ThreatLevel.Tactical);
      return line;
    }

    const clauses = results.slice(0, 4).map((result) => {
      const name = readableEntity(result.type);
      const vertical = result.vertical === "level" ? "" : ` ${result.vertical}`;
      return `${name} ${result.distance} ${result.direction}${vertical}`;
    });
    const line = clauses.join(", ") + ".";
    this.speak(line, ThreatLevel.Tactical);
    return line;
  }

  onProactiveThreat(type: string, direction: string, distance: string): void {
    this.speak(`${type} ${distance}. ${direction} side.`, ThreatLevel.Tactical);
  }

  onShopEnter(gems: number, items: ShopItem[]): void {
    const options = items.map((item) => `${item.label}, ${item.cost}`).join("; ");
    this.speak(`Merchant. You have ${gems} gems. Options: ${options}. Press E to buy what I recommend.`, ThreatLevel.Tactical);
  }

  onSilence(): void {
    this.speak("...", ThreatLevel.Tactical);
  }

  private sayNow(line: string, priority: ThreatLevel): void {
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.voice = this.voice;
    utterance.rate = priority === ThreatLevel.Critical ? 1.12 : 0.96;
    utterance.pitch = priority === ThreatLevel.Critical ? 0.9 : 1.02;
    utterance.volume = this.volume;
    utterance.onend = () => {
      this.speaking = false;
      const next = this.queue.shift();
      if (next) this.speak(next.line, next.priority);
    };
    this.speaking = true;
    this.lastTacticalAt = performance.now();
    window.speechSynthesis.speak(utterance);
  }

  private pickVoice(): void {
    const voices = window.speechSynthesis.getVoices();
    this.voice =
      voices.find((voice) => /female|samantha|victoria|zira|aria|jenny/i.test(voice.name)) ??
      voices.find((voice) => voice.lang.startsWith("en")) ??
      voices[0] ??
      null;
  }

  private linesForDepth(depth: number): string[] {
    if (depth % 5 === 0) return LINES_BOSS;
    if (depth >= 9) return LINES_DESCENT;
    if (depth >= 5) return LINES_DARK;
    return LINES_SURVEY;
  }
}

function readableEntity(type: EntityType): string {
  switch (type) {
    case EntityType.Crawler:
      return "crawler";
    case EntityType.Bat:
      return "bat swarm";
    case EntityType.Wraith:
      return "wraith";
    case EntityType.Debris:
      return "falling rock";
    case EntityType.Crystal:
      return "crystal";
    case EntityType.Merchant:
      return "merchant";
    case EntityType.Boss:
      return "boss";
    case EntityType.Exit:
      return "exit";
    default:
      return "object";
  }
}
