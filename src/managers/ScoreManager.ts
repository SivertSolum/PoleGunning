const HIGH_SCORES_KEY = 'polegunning_highscores';
const BEST_LEVEL_KEY = 'polegunning_bestlevel';
const MAX_HIGH_SCORES = 10;

export interface ScoreEntry {
  score: number;
  level: number;
  date: string;
  mode: 'level' | 'arcade';
}

export class ScoreManager {
  private static instance: ScoreManager;
  
  public currentScore: number = 0;
  public currentLevel: number = 1;
  public targetsHit: number = 0;
  public totalTargets: number = 0;
  public bullseyes: number = 0;
  public vaultHeight: number = 0;
  public combo: number = 0;
  public maxCombo: number = 0;

  static getInstance(): ScoreManager {
    if (!ScoreManager.instance) {
      ScoreManager.instance = new ScoreManager();
    }
    return ScoreManager.instance;
  }

  reset(): void {
    this.currentScore = 0;
    this.currentLevel = 1;
    this.targetsHit = 0;
    this.totalTargets = 0;
    this.bullseyes = 0;
    this.vaultHeight = 0;
    this.combo = 0;
    this.maxCombo = 0;
  }

  addPoints(points: number): void {
    this.currentScore += points;
  }

  registerHit(isBullseye: boolean): number {
    this.targetsHit++;
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    let points = isBullseye ? 100 : 50;
    
    // Combo multiplier
    if (this.combo >= 3) {
      points = Math.floor(points * (1 + (this.combo - 2) * 0.25));
    }

    this.currentScore += points;
    if (isBullseye) this.bullseyes++;
    
    return points;
  }

  registerMiss(): void {
    this.combo = 0;
  }

  addVaultBonus(height: number): number {
    this.vaultHeight = height;
    const bonus = Math.floor(height * 2);
    this.currentScore += bonus;
    return bonus;
  }

  getHighScores(mode: 'level' | 'arcade'): ScoreEntry[] {
    try {
      const data = localStorage.getItem(HIGH_SCORES_KEY);
      if (!data) return [];
      const all: ScoreEntry[] = JSON.parse(data);
      return all.filter(e => e.mode === mode).sort((a, b) => b.score - a.score);
    } catch {
      return [];
    }
  }

  saveBestLevel(level: number): boolean {
    try {
      const prev = this.getBestLevel();
      if (level > prev) {
        localStorage.setItem(BEST_LEVEL_KEY, String(level));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getBestLevel(): number {
    try {
      const val = localStorage.getItem(BEST_LEVEL_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  saveHighScore(mode: 'level' | 'arcade'): boolean {
    try {
      const existing = localStorage.getItem(HIGH_SCORES_KEY);
      const all: ScoreEntry[] = existing ? JSON.parse(existing) : [];
      
      const entry: ScoreEntry = {
        score: this.currentScore,
        level: this.currentLevel,
        date: new Date().toISOString().split('T')[0],
        mode,
      };

      all.push(entry);
      all.sort((a, b) => b.score - a.score);
      
      // Keep only top scores
      const trimmed = all.slice(0, MAX_HIGH_SCORES * 2);
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(trimmed));

      // Check if this is a new high score for this mode
      const modeScores = trimmed.filter(e => e.mode === mode);
      return modeScores[0]?.score === this.currentScore;
    } catch {
      return false;
    }
  }
}

