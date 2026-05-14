import { EntityType, EnemyEntity, Rect } from "../types";

export function updateEnemy(enemy: EnemyEntity, player: Rect, dt: number): void {
  if (enemy.type === EntityType.Bat) {
    const targetX = player.x - enemy.x;
    enemy.vx += Math.sign(targetX) * 0.06 * dt;
    enemy.vx = Math.max(-4.5, Math.min(4.5, enemy.vx));
    enemy.y += Math.sin(performance.now() / 150) * 0.5 * dt;
  } else if (enemy.type === EntityType.Wraith) {
    enemy.vx = Math.sign(player.x - enemy.x || 1) * 0.75;
  }

  enemy.x += enemy.vx * dt;
  if (enemy.x < enemy.patrolMin) {
    enemy.x = enemy.patrolMin;
    enemy.vx = Math.abs(enemy.vx);
  }
  if (enemy.x > enemy.patrolMax) {
    enemy.x = enemy.patrolMax;
    enemy.vx = -Math.abs(enemy.vx);
  }
}
