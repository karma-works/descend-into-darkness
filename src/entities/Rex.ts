import { PLAYER_HEIGHT, PLAYER_WIDTH, STARTING_HP, TILE_SIZE, WORLD_FLOOR_Y } from "../constants";
import { PhysicsBody, PlayerStats } from "../types";

export class Rex {
  body: PhysicsBody = {
    x: TILE_SIZE * 2,
    y: WORLD_FLOOR_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    grounded: false,
  };

  stats: PlayerStats = {
    hp: STARTING_HP,
    gems: 0,
    shield: false,
    doubleJump: false,
    fireLevel: 1,
    speedLevel: 0,
  };

  facing: -1 | 1 = 1;
  jumpsRemaining = 1;

  resetForLevel(): void {
    this.body.x = TILE_SIZE * 2;
    this.body.y = WORLD_FLOOR_Y - PLAYER_HEIGHT;
    this.body.vx = 0;
    this.body.vy = 0;
    this.body.grounded = false;
    this.jumpsRemaining = this.stats.doubleJump ? 2 : 1;
  }
}
