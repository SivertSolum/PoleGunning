export interface LevelConfig {
  level: number;
  targets: number;
  ammo: number;
  requiredHits: number;
  airTime: number;  // seconds
  targetSpread: number; // how spread out targets are (1.0 = normal)
}

const LEVEL_CONFIGS: LevelConfig[] = [
  // Level N = N targets
  { level: 1,  targets: 1,  ammo: 3,  requiredHits: 1,  airTime: 3.5, targetSpread: 0.8 },
  { level: 2,  targets: 2,  ammo: 4,  requiredHits: 2,  airTime: 3.5, targetSpread: 0.8 },
  { level: 3,  targets: 3,  ammo: 5,  requiredHits: 3,  airTime: 3.5, targetSpread: 0.9 },
  { level: 4,  targets: 4,  ammo: 6,  requiredHits: 4,  airTime: 3.5, targetSpread: 0.9 },
  { level: 5,  targets: 5,  ammo: 7,  requiredHits: 5,  airTime: 3.2, targetSpread: 1.0 },
  { level: 6,  targets: 6,  ammo: 8,  requiredHits: 6,  airTime: 3.2, targetSpread: 1.0 },
  { level: 7,  targets: 7,  ammo: 9,  requiredHits: 7,  airTime: 3.0, targetSpread: 1.1 },
  { level: 8,  targets: 8,  ammo: 10, requiredHits: 8,  airTime: 3.0, targetSpread: 1.1 },
  { level: 9,  targets: 9,  ammo: 11, requiredHits: 9,  airTime: 2.8, targetSpread: 1.2 },
  { level: 10, targets: 10, ammo: 12, requiredHits: 10, airTime: 2.8, targetSpread: 1.3 },
];

export class LevelManager {
  private static instance: LevelManager;

  static getInstance(): LevelManager {
    if (!LevelManager.instance) {
      LevelManager.instance = new LevelManager();
    }
    return LevelManager.instance;
  }

  getLevelConfig(level: number): LevelConfig {
    if (level <= LEVEL_CONFIGS.length) {
      return { ...LEVEL_CONFIGS[level - 1] };
    }
    // Beyond level 10: level N = N targets, procedurally scale difficulty
    const extra = level - LEVEL_CONFIGS.length;
    return {
      level,
      targets: level,
      ammo: level + 2,
      requiredHits: level,
      airTime: Math.max(2.8 - extra * 0.05, 1.8),
      targetSpread: Math.min(1.3 + extra * 0.05, 2.0),
    };
  }

  getArcadeConfig(wave: number): LevelConfig {
    const targetCount = 2 + Math.floor(wave / 3) + Math.floor(wave / 2);
    return {
      level: wave,
      targets: Math.min(targetCount, 12),
      ammo: 6 + Math.floor(wave / 2),
      requiredHits: 0, // In arcade, just score points
      airTime: Math.max(3.5 - wave * 0.1, 1.5),
      targetSpread: 1.0 + wave * 0.05,
    };
  }

  getTotalLevels(): number {
    return LEVEL_CONFIGS.length;
  }
}
