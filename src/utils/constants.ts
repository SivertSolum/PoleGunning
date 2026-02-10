// Game dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 480;

// Physics
export const GRAVITY = 800;
export const GROUND_Y = 400;
export const RUNWAY_START_X = 50;
export const VAULT_PLANT_X = 640;

// Player
export const PLAYER_RUN_SPEED_MAX = 300;
export const PLAYER_RUN_ACCEL = 200;
export const PLAYER_WIDTH = 32;
export const PLAYER_HEIGHT = 64;

// Pole vault
export const MIN_VAULT_ANGLE = 30;   // degrees
export const MAX_VAULT_ANGLE = 80;   // degrees
export const MIN_VAULT_POWER = 200;
export const MAX_VAULT_POWER = 600;
export const ANGLE_ADJUST_SPEED = 60; // degrees per second

// Shooting
export const BULLET_SPEED = 700;
export const MAX_AMMO = 200;
export const AIR_TIME_BASE = 3.5; // seconds of air time at max vault

// Targets
export const TARGET_SIZE = 32;
export const TARGET_MIN_Y = 210;
export const TARGET_MAX_Y = 370;
export const TARGET_MIN_X = 980;
export const TARGET_MAX_X = 1250;
export const MOVING_TARGET_SPEED = 80;

// Spike wall (at the far right of the stage)
export const SPIKE_WALL_X = 1700;

// Scoring
export const POINTS_BULLSEYE = 100;
export const POINTS_HIT = 50;
export const POINTS_MOVING_BONUS = 25;
export const VAULT_HEIGHT_BONUS_MULT = 2;

// Colors (retro palette)
export const COLORS = {
  SKY_TOP: 0x4a90d9,
  SKY_BOTTOM: 0x87ceeb,
  GROUND: 0x5a8a3c,
  DIRT: 0x8b6914,
  RUNWAY: 0xc4956a,
  DARK: 0x1a1a2e,
  UI_BG: 0x16213e,
  UI_TEXT: 0xf0e68c,
  ACCENT: 0xe94560,
  WHITE: 0xffffff,
  BLACK: 0x000000,
};

