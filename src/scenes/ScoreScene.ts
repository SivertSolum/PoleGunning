import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../utils/constants';
import { ScoreManager } from '../managers/ScoreManager';
import { LevelManager } from '../managers/LevelManager';
import { MusicEngine } from '../utils/MusicEngine';

interface ScoreData {
  mode: 'level' | 'arcade';
  level: number;
  score: number;
  targetsHit: number;
  totalTargets: number;
  requiredHits: number;
  passed: boolean;
  vaultHeight: number;
  combo: number;
  spikeDeath?: boolean;
}

export class ScoreScene extends Phaser.Scene {
  private data!: ScoreData;

  constructor() {
    super({ key: 'ScoreScene' });
  }

  init(data: ScoreData): void {
    this.data = data;
  }

  create(): void {
    // Restore default cursor (hidden by game crosshair)
    this.input.setDefaultCursor('default');
    this.cameras.main.fadeIn(300, 0, 0, 0);

    const isPass = this.data.passed;

    // Level mode failure → dedicated Game Over screen
    if (this.data.mode === 'level' && !isPass) {
      this.createGameOverScreen();
      return;
    }

    // --- Normal results screen (pass, or arcade) ---
    const music = MusicEngine.getInstance();
    if (isPass) {
      music.play('score');
    } else {
      music.play('fail');
    }

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.DARK);

    const centerX = GAME_WIDTH / 2;

    // Result header
    const headerText = isPass ? 'NICE SHOT!' : 'NOT ENOUGH!';
    const headerColor = isPass ? '#44ff44' : '#ff4444';
    
    this.add.text(centerX, 40, headerText, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '24px',
      color: headerColor,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);

    // Stats panel
    const panelY = 90;
    const lineH = 24;
    const statStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#dddddd',
    };
    const valStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#f0e68c',
    };

    let y = panelY;

    // Level/Wave
    const modeStr = this.data.mode === 'level' ? 'LEVEL' : 'WAVE';
    this.add.text(centerX - 140, y, `${modeStr}:`, statStyle);
    this.add.text(centerX + 140, y, `${this.data.level}`, valStyle).setOrigin(1, 0);
    y += lineH;

    // Targets hit
    this.add.text(centerX - 140, y, 'TARGETS HIT:', statStyle);
    const hitColor = this.data.targetsHit >= this.data.totalTargets ? '#44ff44' : '#ff8844';
    this.add.text(centerX + 140, y, `${this.data.targetsHit} / ${this.data.totalTargets}`, {
      ...valStyle, color: hitColor,
    }).setOrigin(1, 0);
    y += lineH;

    if (this.data.mode === 'level') {
      const bestLvl = ScoreManager.getInstance().getBestLevel();
      this.add.text(centerX - 140, y, 'BEST LEVEL:', statStyle);
      this.add.text(centerX + 140, y, `${bestLvl}`, valStyle).setOrigin(1, 0);
      y += lineH;
    }

    // Vault height
    this.add.text(centerX - 140, y, 'VAULT HEIGHT:', statStyle);
    this.add.text(centerX + 140, y, `${Math.floor(this.data.vaultHeight)}`, valStyle).setOrigin(1, 0);
    y += lineH;

    // Max combo
    if (this.data.combo > 1) {
      this.add.text(centerX - 140, y, 'MAX COMBO:', statStyle);
      this.add.text(centerX + 140, y, `${this.data.combo}x`, {
        ...valStyle, color: '#ff6644',
      }).setOrigin(1, 0);
      y += lineH;
    }

    // Divider
    y += 10;
    const divider = this.add.graphics();
    divider.lineStyle(2, 0x444466, 1);
    divider.beginPath();
    divider.moveTo(centerX - 150, y);
    divider.lineTo(centerX + 150, y);
    divider.strokePath();
    y += 15;

    // Total score
    this.add.text(centerX - 140, y, 'TOTAL SCORE:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
    });
    
    // Animate score counting up
    const scoreDisplay = this.add.text(centerX + 140, y, '0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#f0e68c',
    }).setOrigin(1, 0);

    this.tweens.addCounter({
      from: 0,
      to: this.data.score,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        scoreDisplay.setText(Math.floor(tween.getValue()).toString());
      },
    });

    y += 40;

    // Save high score
    const sm = ScoreManager.getInstance();
    const isNewHigh = sm.saveHighScore(this.data.mode);

    // Track best level in level mode
    if (this.data.mode === 'level' && isPass) {
      const isNewBest = sm.saveBestLevel(this.data.level);
      if (isNewBest) {
        const newBestText = this.add.text(centerX, y, 'NEW BEST LEVEL!', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '14px',
          color: '#ffdd44',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5, 0.5);

        this.tweens.add({
          targets: newBestText,
          scaleX: 1.1,
          scaleY: 1.1,
          yoyo: true,
          repeat: -1,
          duration: 500,
        });
        y += 30;
      }
    } else if (isNewHigh) {
      const newHighText = this.add.text(centerX, y, 'NEW HIGH SCORE!', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ffdd44',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5);

      this.tweens.add({
        targets: newHighText,
        scaleX: 1.1,
        scaleY: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 500,
      });
      y += 30;
    }

    // Action buttons
    y = Math.max(y + 10, GAME_HEIGHT - 100);

    if (isPass) {
      // Next level / Continue
      const nextLabel = this.data.mode === 'level' ? 'NEXT LEVEL' : 'NEXT WAVE';
      const nextBtn = this.add.text(centerX, y, `> ${nextLabel} <`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#44ff44',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

      nextBtn.on('pointerover', () => nextBtn.setColor('#88ff88'));
      nextBtn.on('pointerout', () => nextBtn.setColor('#44ff44'));
      nextBtn.on('pointerdown', () => this.nextLevel());

      y += 30;
    } else {
      // Retry (arcade)
      const retryBtn = this.add.text(centerX, y, '> RETRY <', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#ff8844',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

      retryBtn.on('pointerover', () => retryBtn.setColor('#ffaa66'));
      retryBtn.on('pointerout', () => retryBtn.setColor('#ff8844'));
      retryBtn.on('pointerdown', () => this.retryLevel());

      y += 30;
    }

    // Back to menu
    const menuBtn = this.add.text(centerX, y, 'MAIN MENU', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#888888',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => menuBtn.setColor('#cccccc'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#888888'));
    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Keyboard shortcuts
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (isPass) this.nextLevel();
      else this.retryLevel();
    });
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private createGameOverScreen(): void {
    const music = MusicEngine.getInstance();
    music.play('fail');

    // Dark red background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a0a0a);

    const centerX = GAME_WIDTH / 2;

    // Big GAME OVER header
    const gameOverText = this.add.text(centerX, 80, 'GAME OVER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '32px',
      color: '#ff2222',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // Pulsing animation
    this.tweens.add({
      targets: gameOverText,
      alpha: 0.6,
      yoyo: true,
      repeat: -1,
      duration: 800,
      ease: 'Sine.easeInOut',
    });

    // Death / failure message
    let failMsg: string;
    if (this.data.spikeDeath) {
      failMsg = `Impaled by the spike wall on level ${this.data.level}!`;
    } else {
      const missed = this.data.totalTargets - this.data.targetsHit;
      failMsg = `You missed ${missed} target${missed !== 1 ? 's' : ''} on level ${this.data.level}`;
    }
    this.add.text(centerX, 140, failMsg, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#cc8888',
    }).setOrigin(0.5, 0.5);

    // Stats
    let y = 190;
    const statStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#aa6666',
    };
    const valStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ddaaaa',
    };

    this.add.text(centerX - 120, y, 'REACHED LEVEL:', statStyle);
    this.add.text(centerX + 120, y, `${this.data.level}`, valStyle).setOrigin(1, 0);
    y += 24;

    this.add.text(centerX - 120, y, 'TARGETS HIT:', statStyle);
    this.add.text(centerX + 120, y, `${this.data.targetsHit} / ${this.data.totalTargets}`, valStyle).setOrigin(1, 0);
    y += 24;

    this.add.text(centerX - 120, y, 'SCORE:', statStyle);
    this.add.text(centerX + 120, y, `${this.data.score}`, valStyle).setOrigin(1, 0);
    y += 24;

    const sm = ScoreManager.getInstance();
    const bestLvl = sm.getBestLevel();
    this.add.text(centerX - 120, y, 'BEST LEVEL:', statStyle);
    this.add.text(centerX + 120, y, `${bestLvl}`, { ...valStyle, color: '#ffdd44' }).setOrigin(1, 0);
    y += 40;

    // Save high score
    sm.saveHighScore(this.data.mode);

    // Divider
    const divider = this.add.graphics();
    divider.lineStyle(2, 0x442222, 1);
    divider.beginPath();
    divider.moveTo(centerX - 150, y);
    divider.lineTo(centerX + 150, y);
    divider.strokePath();
    y += 30;

    // Try Again button (restarts from level 1)
    const retryBtn = this.add.text(centerX, y, '> TRY AGAIN <', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ff6644',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerover', () => retryBtn.setColor('#ff8866'));
    retryBtn.on('pointerout', () => retryBtn.setColor('#ff6644'));
    retryBtn.on('pointerdown', () => this.retryLevel());
    y += 35;

    // Main menu button
    const menuBtn = this.add.text(centerX, y, 'MAIN MENU', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#886666',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => menuBtn.setColor('#ccaaaa'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#886666'));
    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Keyboard shortcuts
    this.input.keyboard!.on('keydown-ENTER', () => this.retryLevel());
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private nextLevel(): void {
    const nextLvl = this.data.level + 1;
    const sm = ScoreManager.getInstance();
    sm.currentLevel = nextLvl;

    // Check if we completed all levels in level mode
    if (this.data.mode === 'level') {
      const lm = LevelManager.getInstance();
      if (this.data.level >= lm.getTotalLevels()) {
        // Game complete!
        this.showVictory();
        return;
      }
    }

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { mode: this.data.mode, level: nextLvl });
    });
  }

  private retryLevel(): void {
    const sm = ScoreManager.getInstance();
    sm.reset();

    if (this.data.mode === 'level') {
      // Level mode: any miss resets to level 1
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { mode: 'level', level: 1 });
      });
    } else {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { mode: this.data.mode, level: this.data.level });
      });
    }
  }

  private showVictory(): void {
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);
    overlay.setDepth(200);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'YOU WIN!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '28px',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(201);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, `Final Score: ${this.data.score}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(201);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Press ENTER for menu', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#888888',
    }).setOrigin(0.5, 0.5).setDepth(201);

    this.input.keyboard!.once('keydown-ENTER', () => {
      this.scene.start('MenuScene');
    });
  }
}

