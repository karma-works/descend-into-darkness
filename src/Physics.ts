import { GRAVITY, MAX_FALL_SPEED, TILE_SIZE } from "./constants";
import { PhysicsBody, Rect, TerrainTile } from "./types";

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function moveBody(body: PhysicsBody, terrain: TerrainTile[], dt: number): void {
  body.vy = Math.min(MAX_FALL_SPEED, body.vy + GRAVITY * dt);
  body.grounded = false;

  body.x += body.vx * dt;
  for (const tile of terrain) {
    if (!tile.solid || !intersects(body, tile)) continue;
    if (body.vx > 0) body.x = tile.x - body.width;
    if (body.vx < 0) body.x = tile.x + tile.width;
    body.vx = 0;
  }

  body.y += body.vy * dt;
  for (const tile of terrain) {
    if (!tile.solid || !intersects(body, tile)) continue;
    if (body.vy > 0) {
      body.y = tile.y - body.height;
      body.grounded = true;
    } else if (body.vy < 0) {
      body.y = tile.y + tile.height;
    }
    body.vy = 0;
  }
}

export function terrainAt(terrain: TerrainTile[], x: number, y: number): TerrainTile | undefined {
  return terrain.find((tile) => tile.solid && x >= tile.x && x < tile.x + TILE_SIZE && y >= tile.y && y < tile.y + TILE_SIZE);
}

export function distance(a: Rect, b: Rect): number {
  const ax = a.x + a.width / 2;
  const ay = a.y + a.height / 2;
  const bx = b.x + b.width / 2;
  const by = b.y + b.height / 2;
  return Math.hypot(ax - bx, ay - by);
}
