import { BOSS_LEVEL_INTERVAL, ENTITY_SIZE, LEVEL_HEIGHT, LEVEL_WIDTH, TILE_SIZE, WORLD_FLOOR_Y } from "./constants";
import { BossEntity, CrystalEntity, DebrisEntity, EnemyEntity, EntityType, GameEntity, LevelData, MerchantEntity } from "./types";

const SHOP_ITEMS = [
  { id: "double-jump" as const, label: "Double jump", cost: 8 },
  { id: "shield" as const, label: "Stone shield", cost: 6 },
  { id: "fire" as const, label: "Hotter fire", cost: 10 },
  { id: "speed" as const, label: "Longer stride", cost: 7 },
];

export function generateLevel(depth: number): LevelData {
  const terrain = [];
  for (let x = 0; x < LEVEL_WIDTH; x += 1) {
    const gap = depth > 2 && (x === 16 || x === 17 || (depth > 6 && x === 38));
    const groundY = WORLD_FLOOR_Y + (x % 11 === 0 ? TILE_SIZE : 0);
    if (!gap) {
      for (let y = groundY; y < LEVEL_HEIGHT * TILE_SIZE; y += TILE_SIZE) {
        terrain.push({ x: x * TILE_SIZE, y, width: TILE_SIZE, height: TILE_SIZE, solid: true });
      }
    }
  }

  const exit: GameEntity = {
    id: `exit-${depth}`,
    type: EntityType.Exit,
    x: (LEVEL_WIDTH - 4) * TILE_SIZE,
    y: WORLD_FLOOR_Y - ENTITY_SIZE,
    width: ENTITY_SIZE,
    height: ENTITY_SIZE,
    active: true,
  };

  const crystals: CrystalEntity[] = [10, 22, 35, 48].map((tile, index) => ({
    id: `crystal-${depth}-${index}`,
    type: EntityType.Crystal,
    x: tile * TILE_SIZE,
    y: WORLD_FLOOR_Y - ENTITY_SIZE - (index % 2) * 60,
    width: ENTITY_SIZE,
    height: ENTITY_SIZE,
    active: true,
    value: 2 + Math.floor(depth / 3),
  }));

  const debris: DebrisEntity[] = [14, 31, 52].map((tile, index) => makeDebris(depth, index, tile * TILE_SIZE));
  const enemies = makeEnemies(depth);
  const merchant = depth % 3 === 0 ? makeMerchant(depth) : undefined;
  const boss = depth % BOSS_LEVEL_INTERVAL === 0 ? makeBoss(depth) : undefined;

  return {
    depth,
    terrain,
    enemies,
    crystals,
    debris,
    merchant,
    boss,
    exit,
    checkpoints: [
      { id: `checkpoint-${depth}-1`, x: 20 * TILE_SIZE, reached: false },
      { id: `checkpoint-${depth}-2`, x: 42 * TILE_SIZE, reached: false },
    ],
  };
}

export function makeDebris(depth: number, index: number, x: number, now = performance.now()): DebrisEntity {
  const delay = 3500 + index * 1800 + Math.max(0, 8 - depth) * 120;
  return {
    id: `debris-${depth}-${index}-${Math.floor(now)}`,
    type: EntityType.Debris,
    x,
    y: -80,
    width: ENTITY_SIZE,
    height: ENTITY_SIZE,
    active: true,
    warnStartedAt: now + delay,
    impactAt: now + delay + 1800,
    warned: false,
    vy: 0,
  };
}

function makeEnemies(depth: number): EnemyEntity[] {
  const enemies: EnemyEntity[] = [];
  if (depth >= 2) enemies.push(enemy(depth, 0, EntityType.Crawler, 25, 20, 32));
  if (depth >= 4) enemies.push(enemy(depth, 1, EntityType.Crawler, 43, 39, 50));
  if (depth >= 6) enemies.push(enemy(depth, 2, EntityType.Bat, 33, 26, 56));
  if (depth >= 9) enemies.push(enemy(depth, 3, EntityType.Wraith, 18, 12, 58));
  return enemies;
}

function enemy(
  depth: number,
  index: number,
  type: EntityType.Crawler | EntityType.Bat | EntityType.Wraith,
  tile: number,
  minTile: number,
  maxTile: number,
): EnemyEntity {
  return {
    id: `${type}-${depth}-${index}`,
    type,
    x: tile * TILE_SIZE,
    y: type === EntityType.Bat ? WORLD_FLOOR_Y - 150 : WORLD_FLOOR_Y - ENTITY_SIZE,
    width: ENTITY_SIZE,
    height: ENTITY_SIZE,
    active: true,
    vx: type === EntityType.Bat ? 2.8 : type === EntityType.Wraith ? 0.9 : 1.2,
    hp: type === EntityType.Wraith ? 3 : 2,
    patrolMin: minTile * TILE_SIZE,
    patrolMax: maxTile * TILE_SIZE,
  };
}

function makeMerchant(depth: number): MerchantEntity {
  return {
    id: `merchant-${depth}`,
    type: EntityType.Merchant,
    x: 7 * TILE_SIZE,
    y: WORLD_FLOOR_Y - ENTITY_SIZE,
    width: ENTITY_SIZE,
    height: ENTITY_SIZE,
    active: true,
    items: SHOP_ITEMS,
  };
}

function makeBoss(depth: number): BossEntity {
  return {
    id: `boss-${depth}`,
    type: EntityType.Boss,
    x: 50 * TILE_SIZE,
    y: WORLD_FLOOR_Y - ENTITY_SIZE * 2,
    width: ENTITY_SIZE * 2,
    height: ENTITY_SIZE * 2,
    active: true,
    hp: 8 + depth,
    maxHp: 8 + depth,
    phase: 1,
    nextAttackAt: performance.now() + 2600,
    telegraphed: false,
  };
}
