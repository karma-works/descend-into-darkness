import { PlayerStats, ShopItem } from "../types";

export function buyRecommended(stats: PlayerStats, items: ShopItem[]): string {
  const preferred = items.find((item) => item.id === "double-jump" && !stats.doubleJump && stats.gems >= item.cost)
    ?? items.find((item) => item.id === "shield" && !stats.shield && stats.gems >= item.cost)
    ?? items.find((item) => item.id === "fire" && stats.gems >= item.cost)
    ?? items.find((item) => item.id === "speed" && stats.gems >= item.cost);

  if (!preferred) return "Not enough gems. The merchant is unmoved by potential.";

  stats.gems -= preferred.cost;
  if (preferred.id === "double-jump") stats.doubleJump = true;
  if (preferred.id === "shield") stats.shield = true;
  if (preferred.id === "fire") stats.fireLevel += 1;
  if (preferred.id === "speed") stats.speedLevel += 1;
  return `Purchased ${preferred.label}.`;
}
