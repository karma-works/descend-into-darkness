import { BossEntity } from "../types";

export function updateBoss(boss: BossEntity, now: number): "telegraph" | "attack" | undefined {
  if (!boss.active) return undefined;
  if (boss.hp <= boss.maxHp / 2) boss.phase = 2;
  if (!boss.telegraphed && now > boss.nextAttackAt - 600) {
    boss.telegraphed = true;
    return "telegraph";
  }
  if (now > boss.nextAttackAt) {
    boss.nextAttackAt = now + (boss.phase === 2 ? 1900 : 2800);
    boss.telegraphed = false;
    return "attack";
  }
  return undefined;
}
