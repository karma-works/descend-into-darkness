import { HEARING_RANGE } from "./constants";
import { AudioSettings, EntityType, SpatialResult, Vector } from "./types";

type CueMaterial = "body" | "rock" | "scrape" | "flutter" | "void" | "shimmer" | "voice" | "breath" | "beacon" | "spark";
type UrgencyCurve = "stable" | "approach" | "critical";

interface EntityAudioSource {
  oscillators: OscillatorNode[];
  gain: GainNode;
  panner: PannerNode;
  filter: BiquadFilterNode;
  type: EntityType;
}

interface AudioCueProfile {
  material: CueMaterial;
  wave: OscillatorType;
  baseFrequency: number;
  gain: number;
  pulseMinMs: number;
  pulseMaxMs: number;
  urgencyCurve: UrgencyCurve;
  filter: BiquadFilterType;
  filterFrequency: number;
  harmonics: number[];
}

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  effectsVolume: 1,
  speechVolume: 1,
  monoMode: false,
  verboseMara: false,
  reducedThreatSpeed: false,
};

const CUE_PROFILES: Record<EntityType, AudioCueProfile> = {
  [EntityType.Rex]: cue("body", "sine", 220, 0.03, 120, 360, "stable", "lowpass", 900, [1]),
  [EntityType.Debris]: cue("rock", "sawtooth", 420, 0.17, 70, 460, "critical", "bandpass", 1600, [1, 1.48]),
  [EntityType.Crawler]: cue("scrape", "sawtooth", 92, 0.08, 170, 720, "approach", "lowpass", 650, [1, 1.03]),
  [EntityType.Bat]: cue("flutter", "triangle", 980, 0.06, 80, 260, "approach", "highpass", 700, [1, 1.33]),
  [EntityType.Wraith]: cue("void", "sine", 52, 0.055, 450, 1200, "approach", "lowpass", 260, [1, 0.5]),
  [EntityType.Crystal]: cue("shimmer", "sine", 880, 0.075, 280, 1150, "stable", "highpass", 900, [1, 1.5, 2]),
  [EntityType.Merchant]: cue("voice", "sine", 330, 0.055, 500, 1400, "stable", "bandpass", 950, [1, 1.25]),
  [EntityType.Boss]: cue("breath", "sawtooth", 66, 0.11, 220, 880, "approach", "lowpass", 420, [1, 1.01]),
  [EntityType.Exit]: cue("beacon", "triangle", 520, 0.07, 240, 920, "stable", "bandpass", 780, [1, 1.5]),
  [EntityType.Fireball]: cue("spark", "square", 440, 0.05, 90, 220, "critical", "highpass", 800, [1]),
  [EntityType.Checkpoint]: cue("beacon", "sine", 660, 0.05, 240, 800, "stable", "bandpass", 1000, [1, 1.25]),
};

export class SpatialAudio {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private ambientGain: GainNode | undefined;
  private ambientOscillators: OscillatorNode[] = [];
  private sources = new Map<string, EntityAudioSource>();
  private noiseBuffer: AudioBuffer | undefined;
  private muted = false;
  private settings: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS };

  async start(): Promise<void> {
    this.context ??= new AudioContext();
    this.master ??= this.context.createGain();
    this.updateMasterGain();
    this.master.connect(this.context.destination);

    if (this.context.state !== "running") {
      await this.context.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.updateMasterGain();
  }

  setSettings(settings: AudioSettings): void {
    this.settings = { ...settings };
    this.updateMasterGain();
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(0.12 * this.settings.effectsVolume, this.now(), 0.08);
    }
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

    const profile = CUE_PROFILES[type];
    const proximity = Math.max(0, Math.min(1, 1 - distance / HEARING_RANGE));
    const panX = this.settings.monoMode ? 0 : Math.max(-HEARING_RANGE, Math.min(HEARING_RANGE, dx));
    const pitchShift = Math.max(-260, Math.min(260, -dy * 0.45));
    const gain = profile.gain * (0.18 + proximity * 0.82) * pulseAmount(this.now(), profile, proximity);

    source.oscillators.forEach((oscillator, index) => {
      const harmonic = profile.harmonics[index] ?? 1;
      oscillator.frequency.setTargetAtTime(Math.max(20, (profile.baseFrequency + pitchShift) * harmonic), this.now(), 0.03);
    });
    source.filter.frequency.setTargetAtTime(profile.filterFrequency + proximity * 700, this.now(), 0.05);
    source.gain.gain.setTargetAtTime(gain, this.now(), 0.04);
    setPannerPosition(source.panner, player.x + panX, player.y + dy, -80);
  }

  removeEntity(id: string): void {
    const source = this.sources.get(id);
    if (!source) return;
    source.gain.gain.setTargetAtTime(0, this.now(), 0.01);
    window.setTimeout(() => {
      try {
        source.oscillators.forEach((oscillator) => {
          oscillator.stop();
          oscillator.disconnect();
        });
        source.filter.disconnect();
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
      const delay = start + 0.05 + index * 0.12;
      this.playSignature(result.type, pan, delay, 0.11, vertical);
    });
  }

  playSignature(type: EntityType, pan = 0, start = this.now(), duration = 0.12, y = 0): void {
    const profile = CUE_PROFILES[type];
    const gain = Math.min(0.2, profile.gain * 2.25);
    if (profile.material === "rock" || profile.material === "scrape" || profile.material === "breath") {
      this.playNoiseBurst(type, gain, pan, y, start, duration);
      return;
    }
    this.playTone(profile.baseFrequency, gain, type, pan, y, start, profile.wave, duration);
  }

  playDebrisWarning(pan: number, overheadness: number): void {
    const monoPan = this.settings.monoMode ? 0 : pan;
    const frequency = 320 + overheadness * 520;
    this.playNoiseBurst(EntityType.Debris, 0.16 + overheadness * 0.08, monoPan, -140, this.now(), 0.24);
    this.playTone(frequency, 0.08 + overheadness * 0.08, EntityType.Debris, monoPan, -140, this.now() + 0.03, "sawtooth", 0.22);
  }

  startAmbient(depth: number): void {
    if (!this.context || !this.master) return;
    this.stopAmbient();
    this.ambientGain = this.context.createGain();
    this.ambientGain.gain.value = 0.12 * this.settings.effectsVolume;
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
    this.ambientGain.gain.setTargetAtTime(suppressed ? 0.01 : 0.12 * this.settings.effectsVolume, this.now(), 0.08);
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
    const profile = CUE_PROFILES[type];
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const panner = this.context.createPanner();
    const oscillators = profile.harmonics.map((harmonic, index) => {
      const oscillator = this.context!.createOscillator();
      oscillator.type = index === 0 ? profile.wave : "sine";
      oscillator.frequency.value = profile.baseFrequency * harmonic;
      oscillator.connect(filter);
      oscillator.start();
      return oscillator;
    });

    filter.type = profile.filter;
    filter.frequency.value = profile.filterFrequency;
    gain.gain.value = 0;
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 120;
    panner.maxDistance = HEARING_RANGE;
    filter.connect(gain).connect(panner).connect(this.master);
    return { oscillators, gain, panner, filter, type };
  }

  private playTone(
    frequency: number,
    gainValue: number,
    type: EntityType,
    pan: number,
    y: number,
    start: number,
    wave: OscillatorType = CUE_PROFILES[type].wave,
    duration = 0.09,
  ): void {
    if (!this.context || !this.master) return;
    const profile = CUE_PROFILES[type];
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const panner = this.context.createPanner();
    osc.type = wave;
    osc.frequency.value = frequency;
    filter.type = profile.filter;
    filter.frequency.value = profile.filterFrequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    setPannerPosition(panner, this.settings.monoMode ? 0 : pan, y, -80);
    osc.connect(filter).connect(gain).connect(panner).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private playNoiseBurst(type: EntityType, gainValue: number, pan: number, y: number, start: number, duration: number): void {
    if (!this.context || !this.master) return;
    const profile = CUE_PROFILES[type];
    const noise = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const panner = this.context.createPanner();
    noise.buffer = this.getNoiseBuffer();
    filter.type = profile.filter;
    filter.frequency.value = profile.filterFrequency;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    setPannerPosition(panner, this.settings.monoMode ? 0 : pan, y, -80);
    noise.connect(filter).connect(gain).connect(panner).connect(this.master);
    noise.start(start);
    noise.stop(start + duration + 0.02);
  }

  private getNoiseBuffer(): AudioBuffer {
    if (!this.context) throw new Error("Audio context is not started.");
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = Math.floor(this.context.sampleRate * 0.4);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private updateMasterGain(): void {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.75 * this.settings.effectsVolume, this.now(), 0.02);
  }

  private now(): number {
    return this.context?.currentTime ?? 0;
  }
}

function cue(
  material: CueMaterial,
  wave: OscillatorType,
  baseFrequency: number,
  gain: number,
  pulseMinMs: number,
  pulseMaxMs: number,
  urgencyCurve: UrgencyCurve,
  filter: BiquadFilterType,
  filterFrequency: number,
  harmonics: number[],
): AudioCueProfile {
  return { material, wave, baseFrequency, gain, pulseMinMs, pulseMaxMs, urgencyCurve, filter, filterFrequency, harmonics };
}

function pulseAmount(now: number, profile: AudioCueProfile, proximity: number): number {
  const urgency = profile.urgencyCurve === "stable" ? proximity : Math.min(1, proximity * 1.25);
  const interval = lerp(profile.pulseMaxMs, profile.pulseMinMs, urgency) / 1000;
  const phase = (now % interval) / interval;
  if (profile.urgencyCurve === "critical") return phase < 0.48 ? 1 : 0.18;
  if (profile.urgencyCurve === "approach") return phase < 0.35 ? 1 : 0.28;
  return 0.45 + 0.55 * Math.sin(phase * Math.PI) ** 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
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
