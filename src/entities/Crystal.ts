import { CrystalEntity } from "../types";

export function collectCrystal(crystal: CrystalEntity): number {
  crystal.active = false;
  return crystal.value;
}
