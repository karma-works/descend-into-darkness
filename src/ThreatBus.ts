import { ARIALog } from "./ARIALog";
import { SpatialAudio } from "./SpatialAudio";
import { MaraEngine } from "./MaraEngine";
import { MARA_TACTICAL_DEBOUNCE_MS } from "./constants";
import { ThreatEvent, ThreatLevel } from "./types";

export class ThreatBus {
  private tacticalQueue: ThreatEvent[] = [];
  private lastTacticalAt = 0;
  private timer: number | undefined;

  constructor(
    private readonly mara: MaraEngine,
    private readonly aria: ARIALog,
    private readonly audio: SpatialAudio,
  ) {}

  emit(event: ThreatEvent): void {
    if (event.level === ThreatLevel.Critical) {
      this.tacticalQueue = [];
      this.aria.alertCritical(event.message);
      this.mara.speak(event.message, ThreatLevel.Critical);
      if (event.type) this.audio.playSignature(event.type);
      return;
    }

    if (event.level === ThreatLevel.Ambient) return;

    this.tacticalQueue.push(event);
    this.schedule();
  }

  private schedule(): void {
    if (this.timer !== undefined) return;
    const wait = Math.max(0, MARA_TACTICAL_DEBOUNCE_MS - (performance.now() - this.lastTacticalAt));
    this.timer = window.setTimeout(() => this.flush(), wait);
  }

  private flush(): void {
    this.timer = undefined;
    const event = this.tacticalQueue.shift();
    if (!event) return;
    this.lastTacticalAt = performance.now();
    this.mara.speak(event.message, ThreatLevel.Tactical);
    this.aria.logEvent(event.message);
    if (this.tacticalQueue.length > 0) this.schedule();
  }
}
