import { DebrisEntity } from "../types";

export function updateDebris(debris: DebrisEntity, now: number, dt: number): void {
  if (now < debris.warnStartedAt) return;
  debris.vy += 0.42 * dt;
  debris.y += debris.vy * dt;
}
