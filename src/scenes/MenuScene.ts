import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../utils/constants';
import { ScoreManager } from '../managers/ScoreManager';
import { SoundGenerator } from '../utils/SoundGenerator';
import { MusicEngine } from '../utils/MusicEngine';

export class MenuScene extends Phaser.Scene {
  private selectedOption: number = 0;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private wKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private enterKey!: Phaser.Input.Keyboard.Key;
  private mKey!: Phaser.Input.Keyboard.Key;
  private titleBounce: number = 0;
  private muteIcon?: Phaser.GameObjects.Text;
  private overlayActive: boolean = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Restore default cursor (hidden by game crosshair)
    this.input.setDefaultCursor('default');
    this.selectedOption = 0;
    this.menuItems = [];
    this.overlayActive = false;
    this.wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.mKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    // Start menu music
    MusicEngine.getInstance().play('menu');

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, COLORS.DARK);

    // Animated background elements
    this.createBackgroundDecor();

    // Title
    const titleY = 80;
    const title1 = this.add.text(GAME_WIDTH / 2, titleY, 'POLE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '36px',
      color: '#f0e68c',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    const title2 = this.add.text(GAME_WIDTH / 2, titleY + 44, 'GUNNING', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '36px',
      color: '#e94560',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // Subtitle
    this.add.text(GAME_WIDTH / 2, titleY + 80, 'Vault. Aim. Shoot.', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#aaaaaa',
    }).setOrigin(0.5, 0.5);

    // Menu items
    const menuStartY = 220;
    const menuSpacing = 35;
    const options = [
      'PLAY',
      'HIGH SCORES',
      'HOW TO PLAY',
    ];

    options.forEach((label, i) => {
      const item = this.add.text(GAME_WIDTH / 2, menuStartY + i * menuSpacing, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5);
      
      item.setInteractive({ useHandCursor: true });
      item.on('pointerover', () => {
        if (this.overlayActive) return;
        this.selectedOption = i;
        this.updateSelection();
      });
      item.on('pointerdown', () => {
        if (this.overlayActive) return;
        this.selectedOption = i;
        this.selectOption();
      });
      
      this.menuItems.push(item);
    });

    this.updateSelection();

    // Decorative gun sprite
    const gunDecor = this.add.sprite(GAME_WIDTH / 2 + 140, titleY + 20, 'gun');
    gunDecor.setDisplaySize(48, 30);
    gunDecor.setRotation(-0.3);
    gunDecor.setAlpha(0.6);

    // Music mute indicator
    const music = MusicEngine.getInstance();
    this.muteIcon = this.add.text(GAME_WIDTH - 10, 10, music.isMuted() ? 'M: OFF' : 'M: ON', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#666666',
    }).setOrigin(1, 0);

    // Footer
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'W/S: navigate | ENTER: select | M: music', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#666666',
    }).setOrigin(0.5, 0.5);

    // Version number (injected from package.json at build time)
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 6, `v${__APP_VERSION__}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#444444',
    }).setOrigin(0.5, 0.5);

    // Title animation
    this.tweens.add({
      targets: title1,
      y: titleY - 3,
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: title2,
      y: titleY + 44 + 3,
      yoyo: true,
      repeat: -1,
      duration: 1500,
      ease: 'Sine.easeInOut',
      delay: 200,
    });
  }

  update(): void {
    if (this.overlayActive) return;

    if (Phaser.Input.Keyboard.JustDown(this.sKey)) {
      this.selectedOption = (this.selectedOption + 1) % this.menuItems.length;
      this.updateSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.wKey)) {
      this.selectedOption = (this.selectedOption - 1 + this.menuItems.length) % this.menuItems.length;
      this.updateSelection();
    }
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.selectOption();
    }
    // Toggle music mute
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
      const muted = MusicEngine.getInstance().toggleMute();
      if (this.muteIcon) {
        this.muteIcon.setText(muted ? 'M: OFF' : 'M: ON');
      }
    }
  }

  private playSound(key: string, volume: number = 0.5): void {
    SoundGenerator.getInstance().play(key, volume);
  }

  private updateSelection(): void {
    this.playSound('sfx_select', 0.3);
    this.menuItems.forEach((item, i) => {
      if (i === this.selectedOption) {
        item.setColor('#f0e68c');
        item.setText('> ' + item.text.replace(/^> /, '').replace(/ <$/, '') + ' <');
        item.setScale(1.05);
      } else {
        item.setColor('#ffffff');
        item.setText(item.text.replace(/^> /, '').replace(/ <$/, ''));
        item.setScale(1);
      }
    });
  }

  private selectOption(): void {
    switch (this.selectedOption) {
      case 0: // Play
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('GameScene', { mode: 'level', level: 1 });
        });
        break;
      case 1: // High Scores
        this.showHighScores();
        break;
      case 2: // How to Play
        this.showHowToPlay();
        break;
    }
  }

  private showHighScores(): void {
    this.overlayActive = true;
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 80, GAME_HEIGHT - 60, 0x111122, 0.95);
    overlay.setDepth(100);

    const title = this.add.text(GAME_WIDTH / 2, 40, 'HIGH SCORES', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '16px',
      color: '#f0e68c',
    }).setOrigin(0.5, 0.5).setDepth(101);

    const sm = ScoreManager.getInstance();

    let yPos = 80;
    
    // Best level completed
    const bestLevel = sm.getBestLevel();
    const bestLevelText = bestLevel > 0
      ? `HIGHEST LEVEL COMPLETED: ${bestLevel}`
      : 'No levels completed yet';
    const bestLevelEntry = this.add.text(GAME_WIDTH / 2, yPos, bestLevelText, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: bestLevel > 0 ? '#ffdd44' : '#888888',
    }).setOrigin(0.5, 0).setDepth(101);
    yPos += 24;

    const backText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Press any key to go back', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#888888',
    }).setOrigin(0.5, 0.5).setDepth(101);

    this.input.keyboard!.once('keydown', () => {
      overlay.destroy();
      title.destroy();
      bestLevelEntry.destroy();
      backText.destroy();
      this.scene.restart();
    });
  }

  private showHowToPlay(): void {
    this.overlayActive = true;
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 60, GAME_HEIGHT - 40, 0x111122, 0.95);
    overlay.setDepth(100);

    const lines = [
      'HOW TO PLAY',
      '',
      '1. RUNNING',
      '   Hold D to build speed',
      '',
      '2. PLANTING THE POLE',
      '   Press SPACE at the red marker',
      '',
      '3. VAULT SETUP',
      '   W/S adjusts launch angle',
      '   Hold SPACE to charge power',
      '   Release SPACE to vault!',
      '',
      '4. MID-AIR SHOOTING',
      '   Aim with MOUSE',
      '   Click to SHOOT targets',
      '',
      '5. SCORING',
      '   Hit targets for points',
      '   Chain hits for combos!',
      '   Higher vault = bonus points',
      '',
      'Press any key to go back',
    ];

    const textObj = this.add.text(100, 30, lines.join('\n'), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#dddddd',
      lineSpacing: 4,
    }).setDepth(101);

    // Color the title
    // (Phaser text doesn't support per-line coloring easily, so this is fine as-is)

    this.input.keyboard!.once('keydown', () => {
      overlay.destroy();
      textObj.destroy();
      this.scene.restart();
    });
  }

  private createBackgroundDecor(): void {
    // Floating pixel targets in the background
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      const y = Phaser.Math.Between(50, GAME_HEIGHT - 50);
      const circle = this.add.graphics();
      circle.fillStyle(0xe94560, 0.1);
      circle.fillCircle(x, y, Phaser.Math.Between(20, 40));
      
      this.tweens.add({
        targets: circle,
        alpha: 0.3,
        yoyo: true,
        repeat: -1,
        duration: Phaser.Math.Between(2000, 4000),
        ease: 'Sine.easeInOut',
      });
    }

    // Dotted line decoration
    const line = this.add.graphics();
    line.lineStyle(1, 0x333355, 0.3);
    for (let x = 0; x < GAME_WIDTH; x += 8) {
      line.fillStyle(0x333355, 0.3);
      line.fillRect(x, GAME_HEIGHT - 80, 4, 1);
    }
  }
}

