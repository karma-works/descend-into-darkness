import { MARA_LINES, MaraLine, MaraLineId } from "./MaraLines";
import { ThreatLevel } from "./types";

type PlaybackResult = "played" | "fallback";

export class MaraVoicePlayer {
  private context: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;
  private readonly buffers = new Map<MaraLineId, AudioBuffer | null>();
  private volume = 1;
  private muted = false;

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.cancel();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentGain) this.currentGain.gain.value = this.volume;
  }

  cancel(): void {
    if (!this.currentSource) return;
    this.currentSource.onended = null;
    this.currentSource.stop();
    this.currentSource.disconnect();
    this.currentGain?.disconnect();
    this.currentSource = null;
    this.currentGain = null;
  }

  preload(id: MaraLineId): void {
    void this.loadBuffer(MARA_LINES[id]);
  }

  async play(id: MaraLineId, onEnd: () => void, isCurrent: () => boolean = () => true): Promise<PlaybackResult> {
    if (this.muted) return "fallback";
    const line = MARA_LINES[id];
    const buffer = await this.loadBuffer(line);
    if (!isCurrent()) return "fallback";
    if (!buffer) return "fallback";

    const context = this.getContext();
    if (!context) return "fallback";
    if (context.state === "suspended") await context.resume();
    if (!isCurrent()) return "fallback";

    this.cancel();
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = this.volume;
    source.connect(gain);
    gain.connect(context.destination);
    source.onended = () => {
      if (this.currentSource === source) {
        this.currentSource = null;
        this.currentGain = null;
        source.disconnect();
        gain.disconnect();
        onEnd();
      }
    };
    this.currentSource = source;
    this.currentGain = gain;
    source.start();
    return "played";
  }

  private async loadBuffer(line: MaraLine): Promise<AudioBuffer | null> {
    if (this.buffers.has(line.id)) return this.buffers.get(line.id) ?? null;
    if (!line.src) {
      this.buffers.set(line.id, null);
      return null;
    }

    const context = this.getContext();
    if (!context) {
      this.buffers.set(line.id, null);
      return null;
    }

    try {
      const response = await fetch(line.src);
      if (!response.ok) {
        this.buffers.set(line.id, null);
        return null;
      }
      const audioData = await response.arrayBuffer();
      const buffer = await context.decodeAudioData(audioData);
      this.buffers.set(line.id, buffer);
      return buffer;
    } catch {
      this.buffers.set(line.id, null);
      return null;
    }
  }

  private getContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    this.context = new AudioContextCtor();
    return this.context;
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
