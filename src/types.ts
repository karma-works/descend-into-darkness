export enum GameState {
  Menu = "MENU",
  Playing = "PLAYING",
  Paused = "PAUSED",
  Shop = "SHOP",
  Dead = "DEAD",
  Complete = "COMPLETE",
}

export enum EntityType {
  Rex = "rex",
  Debris = "debris",
  Crawler = "crawler",
  Bat = "bat",
  Wraith = "wraith",
  Crystal = "crystal",
  Merchant = "merchant",
  Boss = "boss",
  Exit = "exit",
  Fireball = "fireball",
  Checkpoint = "checkpoint",
}

export enum ThreatLevel {
  Ambient = "AMBIENT",
  Tactical = "TACTICAL",
  Critical = "CRITICAL",
}

export type Direction = "left" | "right" | "center" | "above" | "below";

export interface Vector {
  x: number;
  y: number;
}

export interface Rect extends Vector {
  width: number;
  height: number;
}

export interface PhysicsBody extends Rect {
  vx: number;
  vy: number;
  grounded: boolean;
}

export interface TerrainTile extends Rect {
  solid: boolean;
}

export interface GameEntity extends Rect {
  id: string;
  type: EntityType;
  active: boolean;
}

export interface EnemyEntity extends GameEntity {
  type: EntityType.Crawler | EntityType.Bat | EntityType.Wraith;
  vx: number;
  hp: number;
  patrolMin: number;
  patrolMax: number;
}

export interface DebrisEntity extends GameEntity {
  warnStartedAt: number;
  impactAt: number;
  warned: boolean;
  vy: number;
}

export interface CrystalEntity extends GameEntity {
  value: number;
}

export interface MerchantEntity extends GameEntity {
  items: ShopItem[];
}

export interface BossEntity extends GameEntity {
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  nextAttackAt: number;
  telegraphed: boolean;
}

export interface FireballEntity extends GameEntity {
  vx: number;
  ttl: number;
}

export interface Checkpoint {
  id: string;
  x: number;
  reached: boolean;
}

export interface ShopItem {
  id: "shield" | "double-jump" | "fire" | "speed";
  label: string;
  cost: number;
}

export interface LevelData {
  depth: number;
  terrain: TerrainTile[];
  enemies: EnemyEntity[];
  crystals: CrystalEntity[];
  debris: DebrisEntity[];
  merchant?: MerchantEntity;
  boss?: BossEntity;
  exit: GameEntity;
  checkpoints: Checkpoint[];
}

export interface PlayerStats {
  hp: number;
  gems: number;
  shield: boolean;
  doubleJump: boolean;
  fireLevel: number;
  speedLevel: number;
}

export interface SpatialResult {
  type: EntityType;
  direction: Direction;
  distance: "near" | "mid" | "far";
  vertical: "above" | "level" | "below";
}

export interface ThreatEvent {
  level: ThreatLevel;
  message: string;
  type?: EntityType;
  direction?: Direction;
  at: number;
}
