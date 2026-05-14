import { ARIA_EVENT_DEBOUNCE_MS } from "./constants";

export class ARIALog {
  private readonly eventLog: HTMLElement | null;
  private readonly alertRegion: HTMLElement | null;
  private queue: string[] = [];
  private flushTimer: number | undefined;

  constructor(eventLog: HTMLElement | null, alertRegion: HTMLElement | null) {
    this.eventLog = eventLog;
    this.alertRegion = alertRegion;
  }

  logEvent(message: string): void {
    this.queue.push(message);
    if (this.flushTimer !== undefined) return;
    this.flushTimer = window.setTimeout(() => this.flush(), ARIA_EVENT_DEBOUNCE_MS);
  }

  alertCritical(message: string): void {
    if (!this.alertRegion) return;
    this.alertRegion.textContent = "";
    window.setTimeout(() => {
      if (this.alertRegion) this.alertRegion.textContent = message;
    }, 20);
  }

  private flush(): void {
    const message = this.queue.shift();
    if (message && this.eventLog) {
      const p = document.createElement("p");
      p.textContent = message;
      this.eventLog.appendChild(p);
      while (this.eventLog.childElementCount > 30) {
        this.eventLog.firstElementChild?.remove();
      }
    }

    if (this.queue.length > 0) {
      this.flushTimer = window.setTimeout(() => this.flush(), ARIA_EVENT_DEBOUNCE_MS);
      return;
    }

    this.flushTimer = undefined;
  }
}
