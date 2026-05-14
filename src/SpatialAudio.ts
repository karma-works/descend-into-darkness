import { HEARING_RANGE } from "./constants";
import { EntityType, SpatialResult, Vector } from "./types";

interface EntityAudioSource {
  oscillator: OscillatorNode;
  gain: GainNode;
  panner: PannerNode;
  type: EntityType;
}

const SIGNATURES: Record<EntityType, { wave: OscillatorType; frequency: number; gain: number }> = {
  [EntityType.Rex]: { wave: "sine", frequency: 220, gain: 0.03 },
  [EntityType.Debris]: { wave: "sawtooth", frequency: 760, gain: 0.16 },
  [EntityType.Crawler]: { wave: "sawtooth", frequency: 95, gain: 0.08 },
  [EntityType.Bat]: { wave: "triangle", frequency: 1200, gain: 0.06 },
  [EntityType.Wraith]: { wave: "sine", frequency: 55, gain: 0.05 },
  [EntityType.Crystal]: { wave: "sine", frequency: 880, gain: 0.08 },
  [EntityType.Merchant]: { wave: "sine", frequency: 330, gain: 0.06 },
  [EntityType.Boss]: { wave: "sawtooth", frequency: 70, gain: 0.11 },
  [EntityType.Exit]: { wave: "triangle", frequency: 520, gain: 0.07 },
  [EntityType.Fireball]: { wave: "square", frequency: 440, gain: 0.05 },
  [EntityType.Checkpoint]: { wave: "sine", frequency: 660, gain: 0.05 },
};

export class SpatialAudio {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private ambientGain: GainNode | undefined;
  private ambientOscillators: OscillatorNode[] = [];
  private sources = new Map<string, EntityAudioSource>();
  private muted = false;

  async start(): Promise<void> {
    this.context ??= new AudioContext();
    this.master ??= this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.75;
    this.master.connect(this.context.destination);

    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.75, this.now(), 0.02);
  }

  setListener(player: Vector): void {
    if (!this.context) return;
    const listener = this.context.listener;
    if ("positionX" in listener) {
      listener.positionX.value = player.x;
      listener.positionY.value = player.y;
      listener.positionZ.value = 0;
    } else {
      (listener as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(player.x, player.y, 0);
    }
  }

  updateEntity(id: string, x: number, y: number, type: EntityType, player: Vector): void {
    if (!this.context || !this.master) return;
    const dx = x - player.x;
    const dy = y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > HEARING_RANGE && type !== EntityType.Exit) {
      this.removeEntity(id);
      return;
    }

    let source = this.sources.get(id);
    if (!source) {
      source = this.createSource(type);
      this.sources.set(id, source);
    }

    const panX = Math.max(-HEARING_RANGE, Math.min(HEARING_RANGE, dx));
    const pitchShift = Math.max(-260, Math.min(260, -dy * 0.45));
    const signature = SIGNATURES[type];
    const gain = signature.gain * Math.max(0.02, 1 - (distance / HEARING_RANGE) ** 2);
    source.oscillator.frequency.setTargetAtTime(signature.frequency + pitchShift, this.now(), 0.03);
    source.gain.gain.setTargetAtTime(gain, this.now(), 0.04);
    setPannerPosition(source.panner, player.x + panX, player.y + dy, -80);
  }

  removeEntity(id: string): void {
    const source = this.sources.get(id);
    if (!source) return;
    source.gain.gain.setTargetAtTime(0, this.now(), 0.01);
    window.setTimeout(() => {
      try {
        source.oscillator.stop();
        source.oscillator.disconnect();
        source.gain.disconnect();
        source.panner.disconnect();
      } catch {
        // Stopping an already stopped oscillator is harmless.
      }
    }, 80);
    this.sources.delete(id);
  }

  emitEcholocationPing(results: SpatialResult[]): void {
    if (!this.context || !this.master) return;
    const start = this.now();
    this.playTone(980, 0.06, EntityType.Rex, 0, 0, start);
    results.slice(0, 8).forEach((result, index) => {
      const pan = result.direction === "left" ? -260 : result.direction === "right" ? 260 : 0;
      const vertical = result.vertical === "above" ? 160 : result.vertical === "below" ? -160 : 0;
      const base = SIGNATURES[result.type].frequency;
      const delay = start + 0.025 + index * 0.011;
      this.playTone(base + vertical, 0.045, result.type, pan, vertical, delay);
    });
  }

  playSignature(type: EntityType, pan = 0): void {
    const signature = SIGNATURES[type];
    this.playTone(signature.frequency, Math.min(0.18, signature.gain * 2.2), type, pan, 0, this.now());
  }

  playDebrisWarning(pan: number, overheadness: number): void {
    const frequency = 520 + overheadness * 520;
    this.playTone(frequency, 0.18, EntityType.Debris, pan, -140, this.now(), "sawtooth", 0.18);
  }

  startAmbient(depth: number): void {
    if (!this.context || !this.master) return;
    this.stopAmbient();
    this.ambientGain = this.context.createGain();
    this.ambientGain.gain.value = 0.12;
    this.ambientGain.connect(this.master);

    const base = Math.max(38, 92 - depth * 4);
    [base, base * (depth >= 5 ? 1.17 : 1.5)].forEach((frequency) => {
      if (!this.context || !this.ambientGain) return;
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.connect(this.ambientGain);
      osc.start();
      this.ambientOscillators.push(osc);
    });
  }

  suppressAmbient(suppressed: boolean): void {
    if (!this.ambientGain) return;
    this.ambientGain.gain.setTargetAtTime(suppressed ? 0.01 : 0.12, this.now(), 0.08);
  }

  stopAll(): void {
    for (const id of this.sources.keys()) this.removeEntity(id);
    this.stopAmbient();
  }

  private stopAmbient(): void {
    for (const osc of this.ambientOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignore stale oscillator handles.
      }
    }
    this.ambientOscillators = [];
    this.ambientGain?.disconnect();
    this.ambientGain = undefined;
  }

  private createSource(type: EntityType): EntityAudioSource {
    if (!this.context || !this.master) throw new Error("Audio context is not started.");
    const signature = SIGNATURES[type];
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createPanner();
    oscillator.type = signature.wave;
    oscillator.frequency.value = signature.frequency;
    gain.gain.value = 0;
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 120;
    panner.maxDistance = HEARING_RANGE;
    oscillator.connect(gain).connect(panner).connect(this.master);
    oscillator.start();
    return { oscillator, gain, panner, type };
  }

  private playTone(
    frequency: number,
    gainValue: number,
    type: EntityType,
    pan: number,
    y: number,
    start: number,
    wave: OscillatorType = SIGNATURES[type].wave,
    duration = 0.09,
  ): void {
    if (!this.context || !this.master) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createPanner();
    osc.type = wave;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    setPannerPosition(panner, pan, y, -80);
    osc.connect(gain).connect(panner).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private now(): number {
    return this.context?.currentTime ?? 0;
  }
}

function setPannerPosition(panner: PannerNode, x: number, y: number, z: number): void {
  if ("positionX" in panner) {
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
  } else {
    (panner as unknown as { setPosition(x: number, y: number, z: number): void }).setPosition(x, y, z);
  }
}
