import {
  AMBIENT_SUPPRESSION_RANGE,
  DEBRIS_WARN_MS,
  DOUBLE_JUMP_FORCE,
  ECHOLOCATION_COOLDOWN_MS,
  ENTITY_SIZE,
  FIRE_COOLDOWN_MS,
  HEARING_RANGE,
  JUMP_FORCE,
  LEVEL_WIDTH,
  REX_SPEED,
  TILE_SIZE,
  WORLD_FLOOR_Y,
} from "./constants";
import { ARIALog } from "./ARIALog";
import { Input } from "./Input";
import { generateLevel, makeDebris } from "./Level";
import { MaraEngine } from "./MaraEngine";
import { distance, intersects, moveBody } from "./Physics";
import { SpatialAudio } from "./SpatialAudio";
import { ThreatBus } from "./ThreatBus";
import { updateBoss } from "./entities/Boss";
import { collectCrystal } from "./entities/Crystal";
import { updateDebris } from "./entities/Debris";
import { updateEnemy } from "./entities/Enemy";
import { buyRecommended } from "./entities/Merchant";
import { Rex } from "./entities/Rex";
import {
  DebrisEntity,
  EntityType,
  FireballEntity,
  GameEntity,
  GameState,
  LevelData,
  Rect,
  SpatialResult,
  ThreatLevel,
  AudioSettings,
} from "./types";

interface GameUi {
  setMaraLine(line: string): void;
  setState(line: string): void;
  setDepth(depth: number): void;
  setPingReady(ready: boolean, secondsLeft?: number): void;
  setMode(mode: string): void;
}

export class Game {
  private readonly rex = new Rex();
  private readonly audio = new SpatialAudio();
  private readonly mara: MaraEngine;
  private readonly threatBus: ThreatBus;
  private level: LevelData = generateLevel(1);
  private state = GameState.Menu;
  private lastFrameAt = 0;
  private animationFrame = 0;
  private depth = 1;
  private lastPingAt = -ECHOLOCATION_COOLDOWN_MS;
  private lastFireAt = -FIRE_COOLDOWN_MS;
  private fireballs: FireballEntity[] = [];
  private muted = false;
  private wraithSilence = false;
  private readonly settings: AudioSettings = {
    effectsVolume: 1,
    speechVolume: 1,
    monoMode: false,
    verboseMara: false,
    reducedThreatSpeed: false,
  };

  constructor(
    private readonly input: Input,
    private readonly aria: ARIALog,
    private readonly ui: GameUi,
  ) {
    this.mara = new MaraEngine((line) => this.ui.setMaraLine(line));
    this.threatBus = new ThreatBus(this.mara, this.aria, this.audio);
    this.applyAudioSettings();
    this.depth = Number(localStorage.getItem("depth-record") ?? "1") || 1;
    this.ui.setDepth(1);
    this.ui.setState("MENU");
  }

  async begin(): Promise<void> {
    if (this.state !== GameState.Menu && this.state !== GameState.Dead && this.state !== GameState.Complete) return;
    cancelAnimationFrame(this.animationFrame);
    await this.audio.start();
    this.depth = 1;
    this.loadLevel(this.depth);
    this.rex.stats.hp = Math.max(1, this.rex.stats.hp);
    this.state = GameState.Playing;
    this.ui.setState(this.statusLine());
    this.aria.logEvent("Game started. Level 1. Listen for Mara.");
    this.mara.onDepthChange(this.depth);
    this.playTrainingSequence();
    this.lastFrameAt = performance.now();
    this.loop(this.lastFrameAt);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationFrame);
    this.audio.stopAll();
  }

  private loop = (now: number): void => {
    const dt = Math.min(2.5, (now - this.lastFrameAt) / (1000 / 60));
    this.lastFrameAt = now;
    if (this.state === GameState.Playing || this.state === GameState.Shop || this.state === GameState.Paused) {
      this.update(now, dt);
    }
    this.input.endFrame();
    if (this.state === GameState.Dead || this.state === GameState.Complete) return;
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private update(now: number, dt: number): void {
    if (this.input.consume("pause")) this.togglePause();
    if (this.input.consume("mute")) this.toggleMute();
    this.updateSettingsInput();
    if (this.state !== GameState.Playing && this.state !== GameState.Shop) return;
    if (this.state === GameState.Shop) {
      this.updateShop();
      return;
    }

    this.updatePlayer(now, dt);
    this.updateWorld(now, dt);
    this.updateAudio();
    this.checkCollisions(now);
    this.updateUi(now);
  }

  private updatePlayer(now: number, dt: number): void {
    const speed = ((REX_SPEED + this.rex.stats.speedLevel * 0.4) * TILE_SIZE) / 60;
    const body = this.rex.body;
    body.vx = 0;
    if (this.input.state.left) {
      body.vx = -speed;
      this.rex.facing = -1;
    }
    if (this.input.state.right) {
      body.vx = speed;
      this.rex.facing = 1;
    }

    if (body.grounded) this.rex.jumpsRemaining = this.rex.stats.doubleJump ? 2 : 1;
    if (this.input.consume("jump") && this.rex.jumpsRemaining > 0) {
      body.vy = body.grounded ? -JUMP_FORCE : -DOUBLE_JUMP_FORCE;
      body.grounded = false;
      this.rex.jumpsRemaining -= 1;
      this.audio.playSignature(EntityType.Rex);
    }

    if (this.input.consume("echolocate")) this.ping(now);
    if (this.input.consume("fire")) this.fire(now);

    moveBody(body, this.level.terrain, dt);
    body.x = Math.max(0, Math.min(body.x, LEVEL_WIDTH * TILE_SIZE - body.width));
    if (body.y > WORLD_FLOOR_Y + TILE_SIZE * 4) {
      this.kill("The void", "Below you", "The reverb opened up. That was the edge.");
    }
  }

  private updateWorld(now: number, dt: number): void {
    const threatDt = this.settings.reducedThreatSpeed ? dt * 0.65 : dt;
    for (const debris of this.level.debris) {
      if (!debris.active) continue;
      if (!debris.warned && now >= debris.warnStartedAt) {
        debris.warned = true;
        const pan = spatialPan(debris, this.rex.body);
        const overheadness = 1 - Math.min(1, Math.abs(centerX(debris) - centerX(this.rex.body)) / 360);
        this.audio.playDebrisWarning(pan, overheadness);
        if (overheadness > 0.75) {
          this.threatBus.emit({
            level: ThreatLevel.Critical,
            message: "Rock overhead. Move.",
            type: EntityType.Debris,
            direction: directionFrom(debris, this.rex.body),
            at: now,
          });
        }
      }
      updateDebris(debris, now, threatDt);
      const impactDeadline = debris.impactAt + (this.settings.reducedThreatSpeed ? 900 : 0);
      if (now > impactDeadline || debris.y >= WORLD_FLOOR_Y - debris.height) {
        debris.active = false;
        this.audio.playSignature(EntityType.Debris, spatialPan(debris, this.rex.body));
      }
    }

    this.level.debris = this.level.debris.filter((debris) => debris.active);
    while (this.level.debris.length < 3) {
      const tile = 8 + Math.floor(Math.random() * 52);
      this.level.debris.push(makeDebris(this.depth, this.level.debris.length, tile * TILE_SIZE, now));
    }

    for (const enemy of this.level.enemies) {
      if (!enemy.active) continue;
      updateEnemy(enemy, this.rex.body, threatDt);
    }

    for (const fireball of this.fireballs) {
      fireball.x += fireball.vx * dt;
      fireball.ttl -= dt;
      if (fireball.ttl <= 0) fireball.active = false;
    }
    this.fireballs = this.fireballs.filter((fireball) => fireball.active);

    if (this.level.boss?.active) {
      const bossEvent = updateBoss(this.level.boss, now);
      if (bossEvent === "telegraph") {
        this.threatBus.emit({
          level: ThreatLevel.Critical,
          message: "Boss inhale. Leave the center.",
          type: EntityType.Boss,
          direction: directionFrom(this.level.boss, this.rex.body),
          at: now,
        });
      }
      if (bossEvent === "attack" && Math.abs(centerX(this.level.boss) - centerX(this.rex.body)) < 170) {
        this.damage("Boss charge", directionText(this.level.boss, this.rex.body), "The low rumble was the telegraph.");
      }
    }
  }

  private checkCollisions(now: number): void {
    for (const debris of this.level.debris) {
      if (debris.active && intersects(this.rex.body, debris)) {
        debris.active = false;
        this.kill("Rock", directionText(debris, this.rex.body), `${DEBRIS_WARN_MS} milliseconds of crackle. Center pan meant danger.`);
      }
    }

    for (const enemy of this.level.enemies) {
      if (!enemy.active) continue;
      if (intersects(this.rex.body, enemy)) {
        const missed = enemy.type === EntityType.Wraith ? "When the cave went quiet, that was the warning." : "The rhythm got louder before contact.";
        this.damage(readableThreat(enemy.type), directionText(enemy, this.rex.body), missed);
      }
    }

    for (const crystal of this.level.crystals) {
      if (!crystal.active || !intersects(this.rex.body, crystal)) continue;
      const value = collectCrystal(crystal);
      this.rex.stats.gems += value;
      this.audio.playSignature(EntityType.Crystal);
      this.aria.logEvent(`Crystal collected. ${value} gems.`);
    }

    for (const fireball of this.fireballs) {
      for (const enemy of this.level.enemies) {
        if (!fireball.active || !enemy.active || !intersects(fireball, enemy)) continue;
        enemy.hp -= this.rex.stats.fireLevel;
        fireball.active = false;
        this.audio.playSignature(EntityType.Fireball);
        if (enemy.hp <= 0) {
          enemy.active = false;
          this.aria.logEvent(`${readableThreat(enemy.type)} defeated.`);
        }
      }

      const boss = this.level.boss;
      if (boss?.active && fireball.active && intersects(fireball, boss)) {
        boss.hp -= this.rex.stats.fireLevel;
        fireball.active = false;
        if (boss.hp <= 0) {
          boss.active = false;
          this.audio.removeEntity(boss.id);
          this.aria.logEvent("Boss defeated. The breathing stopped.");
          this.mara.speakLine("boss-defeated-01", ThreatLevel.Tactical);
        }
      }
    }

    for (const checkpoint of this.level.checkpoints) {
      if (!checkpoint.reached && this.rex.body.x >= checkpoint.x) {
        checkpoint.reached = true;
        this.audio.playSignature(EntityType.Checkpoint);
        this.aria.logEvent("Checkpoint reached.");
      }
    }

    if (this.level.merchant?.active && distance(this.rex.body, this.level.merchant) < 90 && this.input.consume("interact")) {
      this.state = GameState.Shop;
      this.mara.onShopEnter(this.rex.stats.gems, this.level.merchant.items);
      this.ui.setState("SHOP");
    }

    if (intersects(this.rex.body, this.level.exit)) {
      this.completeLevel(now);
    }
  }

  private updateShop(): void {
    if (!this.level.merchant) {
      this.state = GameState.Playing;
      return;
    }
    if (this.input.consume("interact")) {
      const line = buyRecommended(this.rex.stats, this.level.merchant.items);
      this.aria.logEvent(line);
      this.mara.speak(line, ThreatLevel.Tactical);
      this.state = GameState.Playing;
    }
    if (this.input.consume("pause")) this.state = GameState.Playing;
    this.ui.setState("SHOP");
  }

  private updateAudio(): void {
    const player = { x: centerX(this.rex.body), y: centerY(this.rex.body) };
    this.audio.setListener(player);
    this.audio.updateEntity(this.level.exit.id, centerX(this.level.exit), centerY(this.level.exit), EntityType.Exit, player);
    this.level.crystals.filter((crystal) => crystal.active).forEach((crystal) => {
      this.audio.updateEntity(crystal.id, centerX(crystal), centerY(crystal), EntityType.Crystal, player);
    });
    this.level.enemies.filter((enemy) => enemy.active).forEach((enemy) => {
      this.audio.updateEntity(enemy.id, centerX(enemy), centerY(enemy), enemy.type, player);
    });
    if (this.level.merchant?.active) {
      this.audio.updateEntity(this.level.merchant.id, centerX(this.level.merchant), centerY(this.level.merchant), EntityType.Merchant, player);
    }
    if (this.level.boss?.active) {
      this.audio.updateEntity(this.level.boss.id, centerX(this.level.boss), centerY(this.level.boss), EntityType.Boss, player);
    }

    const wraith = this.level.enemies.find((enemy) => enemy.active && enemy.type === EntityType.Wraith);
    const suppress = Boolean(wraith && distance(this.rex.body, wraith) < AMBIENT_SUPPRESSION_RANGE);
    if (suppress !== this.wraithSilence) {
      this.wraithSilence = suppress;
      this.audio.suppressAmbient(suppress);
      if (suppress) this.mara.onSilence();
    }
  }

  private updateUi(now: number): void {
    this.ui.setState(this.statusLine());
    const remaining = ECHOLOCATION_COOLDOWN_MS - (now - this.lastPingAt);
    this.ui.setPingReady(remaining <= 0, remaining > 0 ? Math.ceil(remaining / 1000) : undefined);
  }

  private ping(now: number): void {
    if (now - this.lastPingAt < ECHOLOCATION_COOLDOWN_MS) return;
    this.lastPingAt = now;
    const results = this.spatialResults();
    this.audio.emitEcholocationPing(results);
    if (this.settings.verboseMara) {
      const line = this.mara.onEcholocationResult(results);
      this.aria.logEvent(`Echolocation: ${line}`);
    }
  }

  private fire(now: number): void {
    if (now - this.lastFireAt < FIRE_COOLDOWN_MS) return;
    this.lastFireAt = now;
    const fireball: FireballEntity = {
      id: `fire-${Math.floor(now)}`,
      type: EntityType.Fireball,
      x: this.rex.body.x + this.rex.body.width / 2,
      y: this.rex.body.y + this.rex.body.height / 2,
      width: 18,
      height: 18,
      active: true,
      vx: this.rex.facing * (7 + this.rex.stats.fireLevel),
      ttl: 80,
    };
    this.fireballs.push(fireball);
    this.audio.playSignature(EntityType.Fireball, this.rex.facing * 180);
  }

  private spatialResults(): SpatialResult[] {
    const entities: GameEntity[] = [
      this.level.exit,
      ...this.level.crystals.filter((entity) => entity.active),
      ...this.level.enemies.filter((entity) => entity.active),
      ...this.level.debris.filter((entity) => entity.active && entity.warned),
    ];
    if (this.level.merchant?.active) entities.push(this.level.merchant);
    if (this.level.boss?.active) entities.push(this.level.boss);

    return entities
      .map((entity) => ({ entity, range: distance(this.rex.body, entity) }))
      .filter((item) => item.range < HEARING_RANGE)
      .sort((a, b) => a.range - b.range)
      .map(({ entity, range }) => ({
        type: entity.type,
        direction: directionFrom(entity, this.rex.body),
        distance: range < 180 ? "near" : range < 430 ? "mid" : "far",
        vertical: centerY(entity) < centerY(this.rex.body) - 50 ? "above" : centerY(entity) > centerY(this.rex.body) + 50 ? "below" : "level",
      }));
  }

  private damage(cause: string, direction: string, missedSignal: string): void {
    if (this.rex.stats.shield) {
      this.rex.stats.shield = false;
      this.aria.logEvent("Shield shattered. Rex survives the hit.");
      this.mara.speakLine("shield-broken-01", ThreatLevel.Critical);
      return;
    }

    this.rex.stats.hp -= 1;
    this.threatBus.emit({
      level: ThreatLevel.Critical,
      message: `${cause} contact. ${direction}.`,
      type: EntityType.Rex,
      direction: "center",
      at: performance.now(),
    });
    if (this.rex.stats.hp <= 0) this.kill(cause, direction, missedSignal);
    else {
      this.rex.body.x = Math.max(0, this.rex.body.x - this.rex.facing * 80);
      this.rex.body.vx = 0;
    }
  }

  private kill(cause: string, direction: string, missedSignal: string): void {
    if (this.state === GameState.Dead) return;
    this.state = GameState.Dead;
    this.audio.stopAll();
    const line = this.mara.onDeath(cause, direction, missedSignal);
    this.aria.logEvent(line);
    this.ui.setState("DEAD — press Space to restart");
    this.rex.stats.hp = 3;
    cancelAnimationFrame(this.animationFrame);
  }

  private completeLevel(now: number): void {
    this.depth += 1;
    const record = Math.max(Number(localStorage.getItem("depth-record") ?? "1") || 1, this.depth);
    localStorage.setItem("depth-record", String(record));
    this.aria.logEvent(`Depth ${this.depth - 1} cleared. Descending to ${this.depth}.`);
    this.audio.playSignature(EntityType.Exit);
    if (this.depth > 10) {
      this.state = GameState.Complete;
      this.ui.setState("COMPLETE — press Space to restart");
      this.mara.speakLine("complete-01", ThreatLevel.Tactical);
      cancelAnimationFrame(this.animationFrame);
      return;
    }
    this.loadLevel(this.depth);
    this.lastFrameAt = now;
  }

  private loadLevel(depth: number): void {
    this.audio.stopAll();
    this.level = generateLevel(depth);
    this.fireballs = [];
    this.rex.resetForLevel();
    this.ui.setDepth(depth);
    this.audio.startAmbient(depth);
    this.mara.onDepthChange(depth);
  }

  private togglePause(): void {
    if (this.state === GameState.Playing) {
      this.state = GameState.Paused;
      this.ui.setState("PAUSED");
      return;
    }
    if (this.state === GameState.Paused) {
      this.state = GameState.Playing;
      this.ui.setState(this.statusLine());
    }
  }

  private toggleMute(): void {
    this.muted = !this.muted;
    this.audio.setMuted(this.muted);
    this.mara.setMuted(this.muted);
    this.aria.logEvent(this.muted ? "Audio muted." : "Audio unmuted.");
  }

  private updateSettingsInput(): void {
    if (this.input.consume("mono")) {
      this.settings.monoMode = !this.settings.monoMode;
      this.applyAudioSettings();
      this.aria.logEvent(this.settings.monoMode ? "Mono spatial mode on." : "Stereo spatial mode on.");
    }
    if (this.input.consume("verbose")) {
      this.settings.verboseMara = !this.settings.verboseMara;
      this.applyAudioSettings();
      this.aria.logEvent(this.settings.verboseMara ? "Verbose Mara on." : "Verbose Mara off.");
    }
    if (this.input.consume("reducedThreatSpeed")) {
      this.settings.reducedThreatSpeed = !this.settings.reducedThreatSpeed;
      this.applyAudioSettings();
      this.aria.logEvent(this.settings.reducedThreatSpeed ? "Reduced threat speed on." : "Reduced threat speed off.");
    }
    if (this.input.consume("effectsDown")) this.adjustEffects(-0.1);
    if (this.input.consume("effectsUp")) this.adjustEffects(0.1);
    if (this.input.consume("speechDown")) this.adjustSpeech(-0.1);
    if (this.input.consume("speechUp")) this.adjustSpeech(0.1);
  }

  private adjustEffects(delta: number): void {
    this.settings.effectsVolume = clamp01(this.settings.effectsVolume + delta);
    this.applyAudioSettings();
    this.aria.logEvent(`Effects volume ${Math.round(this.settings.effectsVolume * 100)} percent.`);
  }

  private adjustSpeech(delta: number): void {
    this.settings.speechVolume = clamp01(this.settings.speechVolume + delta);
    this.applyAudioSettings();
    this.aria.logEvent(`Speech volume ${Math.round(this.settings.speechVolume * 100)} percent.`);
  }

  private applyAudioSettings(): void {
    this.audio.setSettings(this.settings);
    this.mara.setVolume(this.settings.speechVolume);
    this.ui.setMode(this.modeLine());
  }

  private playTrainingSequence(): void {
    this.mara.speakLine("sound-check-01", ThreatLevel.Tactical);
    window.setTimeout(() => this.audio.playSignature(EntityType.Exit, -260), 700);
    window.setTimeout(() => this.audio.playSignature(EntityType.Crystal, 260), 1150);
    window.setTimeout(() => this.audio.playSignature(EntityType.Crawler, -160), 1600);
    window.setTimeout(() => this.audio.playDebrisWarning(0, 1), 2050);
  }

  private statusLine(): string {
    return `${this.state} — Level ${this.depth} — HP ${this.rex.stats.hp} — Gems ${this.rex.stats.gems}`;
  }

  private modeLine(): string {
    const spatial = this.settings.monoMode ? "Mono" : "Stereo";
    const mara = this.settings.verboseMara ? "Verbose" : "Quiet";
    const threats = this.settings.reducedThreatSpeed ? "Slow" : "Normal";
    return `${spatial} / ${mara} / ${threats}`;
  }
}

function centerX(rect: Rect): number {
  return rect.x + rect.width / 2;
}

function centerY(rect: Rect): number {
  return rect.y + rect.height / 2;
}

function spatialPan(source: Rect, player: Rect): number {
  return Math.max(-320, Math.min(320, centerX(source) - centerX(player)));
}

function directionFrom(source: Rect, player: Rect): "left" | "right" | "center" {
  const dx = centerX(source) - centerX(player);
  if (Math.abs(dx) < 45) return "center";
  return dx < 0 ? "left" : "right";
}

function directionText(source: Rect, player: Rect): string {
  const horizontal = directionFrom(source, player);
  if (horizontal === "center" && centerY(source) < centerY(player) - 60) return "above";
  return horizontal;
}

function readableThreat(type: EntityType): string {
  if (type === EntityType.Crawler) return "Crawler";
  if (type === EntityType.Bat) return "Bat swarm";
  if (type === EntityType.Wraith) return "Wraith";
  if (type === EntityType.Boss) return "Boss";
  return "Threat";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
