import { MARA_TACTICAL_DEBOUNCE_MS } from "./constants";
import { lineForDepth, linesForDepth, MARA_LINES, MaraLineId } from "./MaraLines";
import { MaraVoicePlayer } from "./MaraVoicePlayer";
import { EntityType, ShopItem, SpatialResult, ThreatLevel } from "./types";

export class MaraEngine {
  private voice: SpeechSynthesisVoice | null = null;
  private readonly voicePlayer = new MaraVoicePlayer();
  private queue: { text: string; priority: ThreatLevel; lineId?: MaraLineId }[] = [];
  private speaking = false;
  private muted = false;
  private volume = 1;
  private lastTacticalAt = 0;
  private playbackToken = 0;

  constructor(private readonly onLine: (line: string) => void) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", () => this.pickVoice());
      this.pickVoice();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.voicePlayer.setMuted(muted);
    if (muted) {
      this.playbackToken += 1;
      this.speaking = false;
      this.queue = [];
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.voicePlayer.setVolume(this.volume);
  }

  preloadForDepth(depth: number): void {
    for (const id of linesForDepth(depth)) this.voicePlayer.preload(id);
  }

  speakLine(id: MaraLineId, priority: ThreatLevel = MARA_LINES[id].priority): void {
    const line = MARA_LINES[id];
    this.speakText(line.text, priority, id);
  }

  speak(line: string, priority: ThreatLevel = ThreatLevel.Tactical): void {
    this.speakText(line, priority);
  }

  private speakText(text: string, priority: ThreatLevel = ThreatLevel.Tactical, lineId?: MaraLineId): void {
    this.onLine(text);
    if (this.muted) return;

    if (priority === ThreatLevel.Critical) {
      this.playbackToken += 1;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      this.voicePlayer.cancel();
      this.queue = [];
      this.sayNow(text, priority, lineId);
      return;
    }

    const now = performance.now();
    if (priority === ThreatLevel.Tactical && now - this.lastTacticalAt < MARA_TACTICAL_DEBOUNCE_MS) {
      this.queue.push({ text, priority, lineId });
      return;
    }

    if (this.speaking) {
      this.queue.push({ text, priority, lineId });
      return;
    }

    this.sayNow(text, priority, lineId);
  }

  onDepthChange(depth: number): void {
    this.preloadForDepth(depth);
    this.preloadForDepth(depth + 1);
    this.speakLine(lineForDepth(depth), ThreatLevel.Tactical);
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
    this.speakLine("wraith-silence-01", ThreatLevel.Tactical);
  }

  private sayNow(text: string, priority: ThreatLevel, lineId?: MaraLineId): void {
    this.speaking = true;
    this.lastTacticalAt = performance.now();
    const token = ++this.playbackToken;
    if (lineId) {
      void this.voicePlayer.play(lineId, () => this.finishLine(), () => token === this.playbackToken).then((result) => {
        if (result === "fallback" && token === this.playbackToken) this.sayWithBrowser(text, priority);
      });
      return;
    }

    this.sayWithBrowser(text, priority);
  }

  private sayWithBrowser(line: string, priority: ThreatLevel): void {
    if (!("speechSynthesis" in window)) {
      this.finishLine();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.voice = this.voice;
    utterance.rate = priority === ThreatLevel.Critical ? 1.12 : 0.96;
    utterance.pitch = priority === ThreatLevel.Critical ? 0.9 : 1.02;
    utterance.volume = this.volume;
    utterance.onend = () => this.finishLine();
    utterance.onerror = () => this.finishLine();
    window.speechSynthesis.speak(utterance);
  }

  private finishLine(): void {
    this.speaking = false;
    const next = this.queue.shift();
    if (next) this.speakText(next.text, next.priority, next.lineId);
  }

  private pickVoice(): void {
    const voices = window.speechSynthesis.getVoices();
    this.voice =
      voices.find((voice) => /female|samantha|victoria|zira|aria|jenny/i.test(voice.name)) ??
      voices.find((voice) => voice.lang.startsWith("en")) ??
      voices[0] ??
      null;
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
