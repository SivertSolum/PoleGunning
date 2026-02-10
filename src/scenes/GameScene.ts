import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Pole } from '../objects/Pole';
import { Gun, Bullet } from '../objects/Gun';
import { Target } from '../objects/Target';
import { Crosshair } from '../objects/Crosshair';
import { ScoreManager } from '../managers/ScoreManager';
import { LevelManager, LevelConfig } from '../managers/LevelManager';
import { SoundGenerator } from '../utils/SoundGenerator';
import { MusicEngine } from '../utils/MusicEngine';
import {
  GAME_WIDTH, GAME_HEIGHT, GROUND_Y, RUNWAY_START_X, VAULT_PLANT_X,
  MIN_VAULT_ANGLE, MAX_VAULT_ANGLE, ANGLE_ADJUST_SPEED,
  TARGET_MIN_Y, TARGET_MAX_Y, TARGET_MIN_X, TARGET_MAX_X,
  SPIKE_WALL_X,
} from '../utils/constants';

type GamePhase = 'ready' | 'running' | 'planting' | 'vaulting' | 'airborne' | 'shooting' | 'landing' | 'results';

export class GameScene extends Phaser.Scene {
  // Game mode
  private gameMode: 'level' | 'arcade' = 'level';
  
  // Objects
  private player!: Player;
  private pole!: Pole;
  private gun!: Gun;
  private crosshair!: Crosshair;
  private bullets: Bullet[] = [];
  private targets: Target[] = [];

  // Background
  private bgElements: Phaser.GameObjects.GameObject[] = [];
  private clouds: Phaser.GameObjects.Sprite[] = [];

  // UI
  private uiContainer!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private ammoText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private angleIndicator!: Phaser.GameObjects.Graphics;
  private powerBar!: Phaser.GameObjects.Graphics;
  private instructionText!: Phaser.GameObjects.Text;

  // State
  private phase: GamePhase = 'ready';
  private airTimer: number = 0;
  private maxAirTime: number = 3.0;
  private currentLevelConfig!: LevelConfig;
  private vaultPeakHeight: number = 0;
  private cameraFollowing: boolean = false;

  // Input
  private wKey!: Phaser.Input.Keyboard.Key;
  private aKey!: Phaser.Input.Keyboard.Key;
  private sKey!: Phaser.Input.Keyboard.Key;
  private dKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private mKey!: Phaser.Input.Keyboard.Key;

  // Managers
  private scoreManager!: ScoreManager;
  private levelManager!: LevelManager;

  // Spike wall
  private spikeWall!: Phaser.GameObjects.Sprite;
  private isDead: boolean = false;

  // Particles
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private shellEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'GameScene' });
  }

  /** Play sound via Web Audio API */
  private playSound(key: string, volume: number = 0.5): void {
    SoundGenerator.getInstance().play(key, volume);
  }

  init(data: { mode?: 'level' | 'arcade'; level?: number }): void {
    this.gameMode = data.mode || 'level';
    this.scoreManager = ScoreManager.getInstance();
    this.levelManager = LevelManager.getInstance();
    
    if (!data.level || data.level === 1) {
      this.scoreManager.reset();
    } else {
      this.scoreManager.currentLevel = data.level;
    }

    // Always reset per-level stats
    this.scoreManager.targetsHit = 0;
    this.scoreManager.totalTargets = 0;
    this.scoreManager.combo = 0;
    this.scoreManager.maxCombo = 0;

    this.phase = 'ready';
    this.targets = [];
    this.bullets = [];
    this.bgElements = [];
    this.clouds = [];
    this.isDead = false;
  }

  create(): void {
    // Setup level config
    const level = this.scoreManager.currentLevel;
    if (this.gameMode === 'level') {
      this.currentLevelConfig = this.levelManager.getLevelConfig(level);
    } else {
      this.currentLevelConfig = this.levelManager.getArcadeConfig(level);
    }
    this.maxAirTime = this.currentLevelConfig.airTime;
    this.player?.destroy();

    // Input (WASD)
    this.wKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.aKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.sKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.dKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.mKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    // Start game music
    MusicEngine.getInstance().play('game');

    // Build the scene
    this.createBackground();
    this.createGround();
    this.createPlayer();
    this.createPole();
    this.createGun();
    this.createCrosshair();
    this.createBulletPool();
    this.createUI();
    this.createParticles();

    // Spike wall
    this.createSpikeWall();

    // Extend physics world to match the full stage width
    this.physics.world.setBounds(0, 0, GAME_WIDTH * 2, GAME_HEIGHT);

    // Camera
    this.cameras.main.setBounds(0, 0, GAME_WIDTH * 2, GAME_HEIGHT);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    // Set instruction
    this.showInstruction('Hold D to run!');

    // Spawn targets for this level (but keep them hidden until airborne)
    this.spawnTargets();
  }

  update(time: number, delta: number): void {
    // ESC to pause / go to menu
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start('MenuScene');
      return;
    }

    // Toggle music mute
    if (Phaser.Input.Keyboard.JustDown(this.mKey)) {
      MusicEngine.getInstance().toggleMute();
    }

    // Update clouds
    this.clouds.forEach(cloud => {
      cloud.x -= 0.2;
      if (cloud.x < -60) cloud.x = GAME_WIDTH * 2 + 60;
    });

    switch (this.phase) {
      case 'ready':
        this.updateReady(delta);
        break;
      case 'running':
        this.updateRunning(delta);
        break;
      case 'planting':
        this.updatePlanting(delta);
        break;
      case 'vaulting':
        this.updateVaulting(delta);
        break;
      case 'airborne':
      case 'shooting':
        this.updateAirborne(delta);
        break;
      case 'landing':
        this.updateLanding(delta);
        break;
      case 'results':
        break;
    }

    // Check spike wall collision — runs every frame, any phase
    if (!this.isDead && this.phase !== 'ready' && this.phase !== 'results') {
      if (this.player.x >= SPIKE_WALL_X - 16) {
        this.triggerSpikeDeath();
        return;
      }
    }

    // Update player animation
    this.player.updatePlayer(delta);

    // Update bullets and check collisions
    this.bullets.forEach(bullet => {
      if (bullet.isActive) {
        // Remove bullets that leave the screen
        if (bullet.x < -20 || bullet.x > GAME_WIDTH * 2 + 20 || bullet.y < -20 || bullet.y > GAME_HEIGHT + 20) {
          bullet.deactivate();
          this.scoreManager.registerMiss();
        } else {
          // Check bullet-target collisions continuously
          this.checkBulletTargetHit(bullet);
        }
      }
    });

    // Update targets
    // Targets are static, no per-frame update needed

    // Always update crosshair to follow mouse
    this.crosshair.updatePosition(this.input.activePointer);

    // Update UI
    this.updateUI();
  }

  // ─── Phase Updates ────────────────────────────────

  private updateReady(delta: number): void {
    if (this.dKey.isDown) {
      this.phase = 'running';
      this.player.setState('running');
      // Show pole held horizontally as the player starts running
      this.pole.startCarrying();
      this.showInstruction('Build speed! Press SPACE at the marker to plant pole.');
    }
  }

  private updateRunning(delta: number): void {
    // Accelerate while holding D
    if (this.dKey.isDown) {
      this.player.accelerate(delta);
    }

    // Move player
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(this.player.runSpeed);

    // Camera follow
    if (this.player.x > GAME_WIDTH / 3) {
      this.cameras.main.scrollX = this.player.x - GAME_WIDTH / 3;
    }

    // Update pole to follow player (carried horizontally with a slight bounce)
    const runBounce = Math.sin(this.time.now * 0.012) * 1.5;
    this.pole.updateCarry(this.player.x, this.player.y, runBounce);

    // Emit dust while running
    if (this.dustEmitter && this.player.runSpeed > 50) {
      this.dustEmitter.setPosition(this.player.x, GROUND_Y);
      this.dustEmitter.emitParticle(1);
    }

    // Check if player is within the vault zone and presses space
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.player.x >= VAULT_PLANT_X - 60 && this.player.x <= VAULT_PLANT_X + 80) {
      this.phase = 'planting';
      this.player.setState('planting');
      this.player.startPowerCharge();
      
      // Plant the pole (animates from horizontal carry to vertical planted)
      this.pole.plant(this.player.x + 20);
      this.playSound('sfx_plant', 0.6);
      
      // Stop running
      body.setVelocityX(0);
      
      this.showInstruction('W/S = angle | Hold SPACE for power | Release to VAULT!');
    }
  }

  private updatePlanting(delta: number): void {
    // Adjust angle with W/S
    if (this.wKey.isDown) {
      this.player.vaultAngle = Math.min(
        this.player.vaultAngle + ANGLE_ADJUST_SPEED * (delta / 1000),
        MAX_VAULT_ANGLE
      );
    }
    if (this.sKey.isDown) {
      this.player.vaultAngle = Math.max(
        this.player.vaultAngle - ANGLE_ADJUST_SPEED * (delta / 1000),
        MIN_VAULT_ANGLE
      );
    }

    // Charge power while space held
    if (this.spaceKey.isDown) {
      this.player.chargePower(delta);
    }

    // Release space to vault
    if (Phaser.Input.Keyboard.JustUp(this.spaceKey)) {
      this.executeVault();
    }

    // Update angle/power indicators
    this.updateAngleIndicator();
    this.updatePowerBar();
  }

  private executeVault(): void {
    this.phase = 'vaulting';
    this.player.setState('vaulting');

    const velocity = this.player.getVaultVelocity();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(velocity.vx, velocity.vy);
    body.setAllowGravity(true);
    this.playSound('sfx_launch', 0.6);

    // Hide angle/power indicators
    this.angleIndicator.setVisible(false);
    this.powerBar.setVisible(false);

    // Vault spin animation — full backward rotation over the bar
    this.tweens.add({
      targets: this.player,
      rotation: -Math.PI * 2,
      duration: 700,
      ease: 'Cubic.easeInOut',
    });

    // Extended vaulting phase with animation, then release pole
    this.time.delayedCall(700, () => {
      if (this.phase === 'vaulting') {
        this.pole.release();
        this.player.setRotation(0); // reset rotation for shooting phase
        this.phase = 'airborne';
        this.player.setState('airborne');
        this.airTimer = 0;
        this.vaultPeakHeight = 0;
        this.playSound('sfx_whoosh', 0.5);

        // Show targets
        this.targets.forEach(t => t.setVisible(true));

        // Transition to shooting after a brief moment
        this.time.delayedCall(300, () => {
          if (this.phase === 'airborne') {
            this.phase = 'shooting';
            this.player.setState('shooting');
            this.player.ammo = this.currentLevelConfig.ammo;
            this.player.maxAmmo = this.currentLevelConfig.ammo;
            this.gun.show();
            this.crosshair.show();
            this.showInstruction('AIM with mouse, CLICK to shoot!');
          }
        });
      }
    });
  }

  private updateVaulting(delta: number): void {
    // Pole bends and launches player
    this.pole.updatePole(this.player.x, this.player.y, true);

    // Track peak height
    const height = GROUND_Y - this.player.y;
    if (height > this.vaultPeakHeight) {
      this.vaultPeakHeight = height;
    }

    // Camera follow
    this.cameras.main.scrollX = Math.max(0, this.player.x - GAME_WIDTH / 3);
  }

  private updateAirborne(delta: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Track air time
    this.airTimer += delta / 1000;

    // Track peak height
    const height = GROUND_Y - this.player.y;
    if (height > this.vaultPeakHeight) {
      this.vaultPeakHeight = height;
    }

    // Slow down gravity for game feel (floaty airtime, more time to shoot)
    body.setGravityY(-650); // Reduce effective gravity while airborne

    // Camera follow
    const targetScrollX = Math.max(0, this.player.x - GAME_WIDTH / 3);
    this.cameras.main.scrollX += (targetScrollX - this.cameras.main.scrollX) * 0.1;

    // Aiming and shooting
    if (this.phase === 'shooting') {
      const pointer = this.input.activePointer;
      // Compute world coordinates from screen pointer + current (post-lerp)
      // camera scroll.  This avoids the stale pointer.worldX/Y that Phaser
      // computed at the start of the frame (before we moved the camera above).
      const cam = this.cameras.main;
      const aimWorldX = pointer.x + cam.scrollX;
      const aimWorldY = pointer.y + cam.scrollY;

      const gunAngle = this.gun.aimAt(aimWorldX, aimWorldY);
      this.gun.setPosition(this.player.x + 8, this.player.y - 30);

      // Fire on mouse click (with cooldown)
      if (pointer.isDown && this.canShoot()) {
        this.fireGun(gunAngle);
      }
    }

    // Check if air time is up or player hits ground
    if (this.airTimer >= this.maxAirTime || this.player.y >= GROUND_Y) {
      this.startLanding();
    }
  }

  private lastShotTime: number = 0;

  private canShoot(): boolean {
    const now = this.time.now;
    return now - this.lastShotTime > 150; // 150ms between shots (faster fire rate)
  }

  private fireGun(angle: number): void {
    if (!this.player.shoot()) return;
    this.lastShotTime = this.time.now;

    // Find inactive bullet
    let bullet = this.bullets.find(b => !b.isActive);
    if (!bullet) {
      bullet = new Bullet(this, 0, 0);
      this.bullets.push(bullet);
    }

    bullet.fire(this.gun.x, this.gun.y, angle);

    // Sound
    this.playSound('sfx_gunshot', 0.5);

    // Muzzle flash
    this.showMuzzleFlash(this.gun.x + Math.cos(angle) * 12, this.gun.y + Math.sin(angle) * 12);

    // Shell casing
    if (this.shellEmitter) {
      this.shellEmitter.setPosition(this.gun.x, this.gun.y);
      this.shellEmitter.emitParticle(1);
    }

    // Screen shake
    this.cameras.main.shake(60, 0.003);

    // Recoil effect on player
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(body.velocity.x - Math.cos(angle) * 20);
    body.setVelocityY(body.velocity.y - Math.sin(angle) * 15);
  }

  private checkBulletTargetHit(bullet: Bullet): void {
    if (!bullet.isActive) return;
    
    for (const target of this.targets) {
      if (target.isDestroyed || !target.active) continue;

      const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, target.x, target.y);
      if (dist < 20) {
        // Hit!
        const isBullseye = dist < 8;
        const points = this.scoreManager.registerHit(isBullseye);
        target.hit();
        bullet.deactivate();

        // Sound
        if (isBullseye) {
          this.playSound('sfx_bullseye', 0.6);
        } else {
          this.playSound('sfx_hit', 0.5);
        }
        if (this.scoreManager.combo >= 3) {
          this.playSound('sfx_combo', 0.4);
        }

        // Show point popup
        this.showPointPopup(target.x, target.y, points, isBullseye);

        // Particle explosion
        this.showTargetExplosion(target.x, target.y);
        
        break; // One bullet can only hit one target
      }
    }
  }

  private updateLanding(_delta: number): void {
    // Landing is handled by the tween in startLanding().
    // Nothing to do here each frame.
  }

  private startLanding(): void {
    this.phase = 'landing';
    this.player.setState('landing');
    this.gun.hide();
    this.crosshair.hide();

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(0);
    body.setAllowGravity(true);

    // Ensure player reaches ground
    this.tweens.add({
      targets: this.player,
      y: GROUND_Y,
      duration: 400,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        body.setVelocity(0, 0);
        body.setAllowGravity(false);
        this.player.y = GROUND_Y;

        // Dust on landing
        if (this.dustEmitter) {
          this.dustEmitter.setPosition(this.player.x, GROUND_Y);
          for (let i = 0; i < 5; i++) this.dustEmitter.emitParticle(1);
        }
        this.cameras.main.shake(100, 0.005);
        this.playSound('sfx_land', 0.6);

        // Calculate vault bonus
        const vaultBonus = this.scoreManager.addVaultBonus(this.vaultPeakHeight);
        if (vaultBonus > 0) {
          this.showPointPopup(this.player.x, this.player.y - 40, vaultBonus, false, 'VAULT BONUS');
        }

        // Show results after a delay
        this.time.delayedCall(1500, () => this.showResults());
      },
    });
  }

  private showResults(): void {
    this.phase = 'results';
    
    const hit = this.scoreManager.targetsHit;
    const total = this.targets.length;
    const required = this.currentLevelConfig.requiredHits;

    let passed = false;
    if (this.gameMode === 'level') {
      passed = hit >= total; // Must hit ALL targets to pass
    } else {
      passed = true; // Arcade always continues
    }

    if (passed) {
      this.player.setState('celebrating');
      this.playSound('sfx_levelclear', 0.35);
    } else {
      this.playSound('sfx_fail', 0.5);
    }

    // Go to score scene
    this.time.delayedCall(1000, () => {
      this.scene.start('ScoreScene', {
        mode: this.gameMode,
        level: this.scoreManager.currentLevel,
        score: this.scoreManager.currentScore,
        targetsHit: hit,
        totalTargets: total,
        requiredHits: required,
        passed,
        vaultHeight: this.vaultPeakHeight,
        combo: this.scoreManager.maxCombo,
      });
    });
  }

  // ─── Object Creation ──────────────────────────────

  private createBackground(): void {
    // Sky gradient background (no tileSprite needed – just draw to fill screen)
    const sky = this.add.sprite(0, 0, 'sky');
    sky.setOrigin(0, 0);
    sky.setScrollFactor(0);
    sky.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.bgElements.push(sky);

    // Clouds (parallax layer)
    for (let i = 0; i < 6; i++) {
      const cloud = this.add.sprite(
        100 + i * 250 + Math.random() * 100,
        30 + Math.random() * 80,
        'cloud'
      );
      cloud.setScrollFactor(0.3);
      cloud.setAlpha(0.8);
      cloud.setScale(1 + Math.random() * 0.5);
      this.clouds.push(cloud);
    }

    // Fence
    for (let i = 0; i < 20; i++) {
      const fence = this.add.sprite(
        i * 32,
        GROUND_Y - 48,
        'fence'
      );
      fence.setOrigin(0, 0);
      fence.setScrollFactor(0.8);
      fence.setAlpha(0.5);
      this.bgElements.push(fence);
    }

    // Vault zone — solid red square on the runway showing where you can plant
    const vaultZoneStart = VAULT_PLANT_X - 60;
    const vaultZoneEnd = VAULT_PLANT_X + 80; // must stop before the crossbar
    const vaultZone = this.add.graphics();
    vaultZone.fillStyle(0xcc2222, 0.45);
    vaultZone.fillRect(vaultZoneStart, GROUND_Y - 4, vaultZoneEnd - vaultZoneStart, 36);
    // Border outline
    vaultZone.lineStyle(2, 0xff4444, 0.8);
    vaultZone.strokeRect(vaultZoneStart, GROUND_Y - 4, vaultZoneEnd - vaultZoneStart, 36);
    this.bgElements.push(vaultZone);

    // Crossbar to vault over (positioned well past the vault zone)
    const crossbar = this.add.sprite(VAULT_PLANT_X + 90, GROUND_Y, 'crossbar');
    crossbar.setOrigin(0.5, 1);
    crossbar.setDepth(5);
    this.bgElements.push(crossbar);
  }

  private createGround(): void {
    // Runway — extend across the full world width
    const worldTiles = Math.ceil((GAME_WIDTH * 2) / 32) + 2; // enough to cover full camera
    for (let i = 0; i < worldTiles; i++) {
      const tile = this.add.sprite(i * 32, GROUND_Y, 'runway');
      tile.setOrigin(0, 0);
    }
    // Ground below runway
    for (let i = 0; i < worldTiles; i++) {
      const tile = this.add.sprite(i * 32, GROUND_Y + 32, 'ground');
      tile.setOrigin(0, 0);
    }
    for (let i = 0; i < worldTiles; i++) {
      const tile = this.add.sprite(i * 32, GROUND_Y + 64, 'ground');
      tile.setOrigin(0, 0);
    }
  }

  private createPlayer(): void {
    this.player = new Player(this, RUNWAY_START_X, GROUND_Y);
    this.player.setDepth(10);
    
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
  }

  private createPole(): void {
    this.pole = new Pole(this, 0, 0);
    this.pole.setDepth(8);
  }

  private createGun(): void {
    this.gun = new Gun(this, 0, 0);
  }

  private createCrosshair(): void {
    this.crosshair = new Crosshair(this);
  }

  private createBulletPool(): void {
    this.bullets = [];
    for (let i = 0; i < 15; i++) {
      const bullet = new Bullet(this, -100, -100);
      bullet.setDepth(9);
      this.bullets.push(bullet);
    }
  }

  private createSpikeWall(): void {
    this.spikeWall = this.add.sprite(SPIKE_WALL_X, 0, 'spike_wall');
    this.spikeWall.setOrigin(0, 0);
    this.spikeWall.setDepth(6);

    // Warning sign above the spikes
    const warnText = this.add.text(SPIKE_WALL_X + 16, GROUND_Y - 20, '⚠ DANGER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 1,
    });
    warnText.setOrigin(0.5, 1).setDepth(6);
  }

  private triggerSpikeDeath(): void {
    this.isDead = true;
    this.phase = 'results'; // stop all phase updates

    // Kill any running tweens on the player (e.g. vault rotation)
    this.tweens.killTweensOf(this.player);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setGravityY(0);
    body.setAllowGravity(false);

    this.gun.hide();
    this.crosshair.hide();

    // Play a death sound
    this.playSound('sfx_fail', 0.7);

    // Massive camera shake
    this.cameras.main.shake(500, 0.015);

    // Blood splatter particles flying from spike wall
    this.showBloodSplatter(this.player.x, this.player.y);

    // Player explosion — scatter body parts as colored rectangles
    this.showPlayerExplosion(this.player.x, this.player.y);

    // Hide the player sprite
    this.player.setVisible(false);

    // Flash screen red
    this.cameras.main.flash(400, 180, 0, 0);

    // Show DEATH text
    const deathText = this.add.text(this.player.x, this.player.y - 60, 'DEATH', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '28px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4,
    });
    deathText.setOrigin(0.5, 0.5).setDepth(100);

    // Animate death text
    this.tweens.add({
      targets: deathText,
      y: deathText.y - 40,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      ease: 'Cubic.easeOut',
      onComplete: () => deathText.destroy(),
    });

    // Also add a skull / secondary text
    const skullText = this.add.text(this.player.x, this.player.y - 20, '💀', {
      fontSize: '32px',
    });
    skullText.setOrigin(0.5, 0.5).setDepth(100);
    this.tweens.add({
      targets: skullText,
      y: skullText.y - 60,
      alpha: { from: 1, to: 0 },
      duration: 2500,
      ease: 'Cubic.easeOut',
      onComplete: () => skullText.destroy(),
    });

    // After a delay, show results (as failed)
    this.time.delayedCall(2500, () => {
      this.scene.start('ScoreScene', {
        mode: this.gameMode,
        level: this.scoreManager.currentLevel,
        score: this.scoreManager.currentScore,
        targetsHit: this.scoreManager.targetsHit,
        totalTargets: this.targets.length,
        requiredHits: this.currentLevelConfig.requiredHits,
        passed: false,
        vaultHeight: this.vaultPeakHeight,
        combo: this.scoreManager.maxCombo,
        spikeDeath: true,
      });
    });
  }

  private showBloodSplatter(x: number, y: number): void {
    // Emit a large burst of red particles
    const bloodEmitter = this.add.particles(x, y, 'blood', {
      speed: { min: 80, max: 250 },
      angle: { min: 140, max: 220 }, // spraying back to the left
      lifespan: { min: 600, max: 1500 },
      alpha: { start: 1, end: 0 },
      scale: { start: 1.5, end: 0.3 },
      gravityY: 300,
      emitting: false,
      tint: [0xcc0000, 0xff2222, 0x880000, 0xff4444],
    });
    bloodEmitter.setDepth(50);
    bloodEmitter.explode(40);

    // Secondary splatter — smaller drops
    const bloodEmitter2 = this.add.particles(x, y, 'blood', {
      speed: { min: 30, max: 120 },
      angle: { min: 100, max: 260 },
      lifespan: { min: 400, max: 1000 },
      alpha: { start: 0.8, end: 0 },
      scale: { start: 0.8, end: 0.2 },
      gravityY: 400,
      emitting: false,
      tint: [0xaa0000, 0xdd1111],
    });
    bloodEmitter2.setDepth(50);
    bloodEmitter2.explode(25);
  }

  private showPlayerExplosion(x: number, y: number): void {
    // Scatter "body part" rectangles in different colors
    const partColors = [
      0xd44040, // shirt red
      0x3a5a8c, // pants blue
      0xe8b87a, // skin
      0x4a3728, // hair
      0x5a3a20, // shoes
      0xcc0000, // blood
    ];

    for (let i = 0; i < 14; i++) {
      const pw = Phaser.Math.Between(3, 8);
      const ph = Phaser.Math.Between(3, 10);
      const color = partColors[i % partColors.length];
      const part = this.add.rectangle(x, y, pw, ph, color);
      part.setDepth(55);

      this.tweens.add({
        targets: part,
        x: x + Phaser.Math.Between(-100, 60),
        y: y + Phaser.Math.Between(-80, 120),
        rotation: Phaser.Math.Between(-10, 10),
        alpha: 0,
        duration: Phaser.Math.Between(600, 1400),
        ease: 'Cubic.easeOut',
        onComplete: () => part.destroy(),
      });
    }
  }

  private spawnTargets(): void {
    const config = this.currentLevelConfig;
    const spread = config.targetSpread;

    // Spawn targets
    for (let i = 0; i < config.targets; i++) {
      const x = TARGET_MIN_X + (i / Math.max(config.targets - 1, 1)) * (TARGET_MAX_X - TARGET_MIN_X) * spread;
      const y = TARGET_MIN_Y + Math.random() * (TARGET_MAX_Y - TARGET_MIN_Y);
      const target = new Target(this, x, y);
      target.setVisible(false);
      target.setDepth(7);
      this.targets.push(target);
    }

    this.scoreManager.totalTargets = this.targets.length;
  }

  // ─── UI ───────────────────────────────────────────

  private createUI(): void {
    const fontStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#f0e68c',
    };
    const fontStyleSmall = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#ffffff',
    };

    // Score
    this.scoreText = this.add.text(10, 10, 'SCORE: 0', fontStyle)
      .setScrollFactor(0).setDepth(50);

    // Level
    const modeStr = this.gameMode === 'level' ? 'LVL' : 'WAVE';
    this.levelText = this.add.text(10, 26, `${modeStr}: ${this.scoreManager.currentLevel}`, fontStyle)
      .setScrollFactor(0).setDepth(50);

    // Ammo
    this.ammoText = this.add.text(GAME_WIDTH - 10, 10, '', fontStyle)
      .setOrigin(1, 0).setScrollFactor(0).setDepth(50);

    // Combo
    this.comboText = this.add.text(GAME_WIDTH / 2, 10, '', {
      ...fontStyle,
      fontSize: '12px',
      color: '#ff6644',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(50).setVisible(false);

    // Timer
    this.timerText = this.add.text(GAME_WIDTH - 10, 26, '', fontStyle)
      .setOrigin(1, 0).setScrollFactor(0).setDepth(50);

    // Angle indicator
    this.angleIndicator = this.add.graphics();
    this.angleIndicator.setVisible(false).setDepth(15);

    // Power bar
    this.powerBar = this.add.graphics();
    this.powerBar.setVisible(false).setDepth(15);

    // Instruction text
    this.instructionText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '', {
      ...fontStyleSmall,
      color: '#aaddff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(50);
  }

  private updateUI(): void {
    this.scoreText.setText(`SCORE: ${this.scoreManager.currentScore}`);
    
    if (this.phase === 'shooting' || this.phase === 'airborne') {
      // Show ammo as pixel bullets
      let ammoStr = 'AMMO: ';
      for (let i = 0; i < this.player.maxAmmo; i++) {
        ammoStr += i < this.player.ammo ? '|' : '.';
      }
      this.ammoText.setText(ammoStr);

      // Timer
      const remaining = Math.max(0, this.maxAirTime - this.airTimer);
      this.timerText.setText(`TIME: ${remaining.toFixed(1)}`);
      if (remaining < 1) {
        this.timerText.setColor('#ff4444');
      } else {
        this.timerText.setColor('#f0e68c');
      }

      // Combo
      if (this.scoreManager.combo >= 2) {
        this.comboText.setVisible(true);
        this.comboText.setText(`${this.scoreManager.combo}x COMBO!`);
      } else {
        this.comboText.setVisible(false);
      }
    } else {
      this.ammoText.setText('');
      this.timerText.setText('');
      this.comboText.setVisible(false);
    }
  }

  private updateAngleIndicator(): void {
    this.angleIndicator.setVisible(true);
    this.angleIndicator.clear();

    const px = this.player.x;
    const py = this.player.y - 40;
    const len = 40;
    const angleRad = Phaser.Math.DegToRad(this.player.vaultAngle);
    const endX = px + Math.cos(angleRad) * len;
    const endY = py - Math.sin(angleRad) * len;

    // Draw arc showing angle range
    this.angleIndicator.lineStyle(1, 0xffffff, 0.3);
    this.angleIndicator.beginPath();
    for (let a = MIN_VAULT_ANGLE; a <= MAX_VAULT_ANGLE; a += 5) {
      const r = Phaser.Math.DegToRad(a);
      const ax = px + Math.cos(r) * (len - 5);
      const ay = py - Math.sin(r) * (len - 5);
      if (a === MIN_VAULT_ANGLE) {
        this.angleIndicator.moveTo(ax, ay);
      } else {
        this.angleIndicator.lineTo(ax, ay);
      }
    }
    this.angleIndicator.strokePath();

    // Draw current angle line
    this.angleIndicator.lineStyle(2, 0xff4444, 1);
    this.angleIndicator.beginPath();
    this.angleIndicator.moveTo(px, py);
    this.angleIndicator.lineTo(endX, endY);
    this.angleIndicator.strokePath();

    // Arrow head
    this.angleIndicator.fillStyle(0xff4444, 1);
    this.angleIndicator.fillCircle(endX, endY, 3);
  }

  private updatePowerBar(): void {
    this.powerBar.setVisible(true);
    this.powerBar.clear();

    const px = this.player.x - 20;
    const py = this.player.y - 75;
    const barW = 40;
    const barH = 6;
    const fill = this.player.vaultPower / 600;

    // Background
    this.powerBar.fillStyle(0x333333, 0.8);
    this.powerBar.fillRect(px, py, barW, barH);

    // Fill (green -> yellow -> red)
    let color = 0x44ff44;
    if (fill > 0.66) color = 0xff4444;
    else if (fill > 0.33) color = 0xffff44;

    this.powerBar.fillStyle(color, 1);
    this.powerBar.fillRect(px + 1, py + 1, (barW - 2) * fill, barH - 2);

    // Label
    this.powerBar.lineStyle(1, 0xffffff, 0.5);
    this.powerBar.strokeRect(px, py, barW, barH);
  }

  private showInstruction(text: string): void {
    this.instructionText.setText(text);
    this.instructionText.setAlpha(1);

    // Fade out after a few seconds
    this.tweens.killTweensOf(this.instructionText);
    this.tweens.add({
      targets: this.instructionText,
      alpha: 0,
      duration: 800,
      delay: 4000,
    });
  }

  // ─── Effects ──────────────────────────────────────

  private createParticles(): void {
    // Dust particles
    this.dustEmitter = this.add.particles(0, 0, 'dust', {
      speed: { min: 10, max: 40 },
      angle: { min: 230, max: 310 },
      lifespan: 400,
      alpha: { start: 0.6, end: 0 },
      scale: { start: 1, end: 0.5 },
      gravityY: -20,
      emitting: false,
    });
    this.dustEmitter.setDepth(6);

    // Shell casing particles
    this.shellEmitter = this.add.particles(0, 0, 'shell', {
      speed: { min: 40, max: 80 },
      angle: { min: 200, max: 260 },
      lifespan: 600,
      alpha: { start: 1, end: 0.3 },
      rotate: { min: 0, max: 360 },
      gravityY: 300,
      emitting: false,
    });
    this.shellEmitter.setDepth(11);
  }

  private showMuzzleFlash(x: number, y: number): void {
    const flash = this.add.sprite(x, y, 'muzzle_flash', 0);
    flash.setDepth(12);

    // Animate through flash frames
    let frame = 0;
    this.time.addEvent({
      delay: 40,
      repeat: 2,
      callback: () => {
        frame++;
        if (frame < 3) {
          flash.setFrame(frame);
        } else {
          flash.destroy();
        }
      },
    });
  }

  private showPointPopup(x: number, y: number, points: number, isBullseye: boolean, label?: string): void {
    const text = label ? `${label}\n+${points}` : `+${points}`;
    const color = isBullseye ? '#ffdd44' : '#ffffff';
    const fontSize = isBullseye ? '12px' : '10px';

    const popup = this.add.text(x, y, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize,
      color,
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    });
    popup.setOrigin(0.5, 0.5);
    popup.setDepth(60);

    this.tweens.add({
      targets: popup,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });

    if (isBullseye) {
      // Extra flash effect for bullseye
      const bullseyeText = this.add.text(x, y - 16, 'BULLSEYE!', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 2,
      });
      bullseyeText.setOrigin(0.5, 0.5).setDepth(60);
      this.tweens.add({
        targets: bullseyeText,
        y: y - 60,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 1200,
        ease: 'Cubic.easeOut',
        onComplete: () => bullseyeText.destroy(),
      });
    }
  }

  private showTargetExplosion(x: number, y: number): void {
    // Create a bunch of pixel particles
    const colors = [0xff4444, 0xffdd44, 0xffffff, 0xff8844, 0xcc3333];
    for (let i = 0; i < 8; i++) {
      const p = this.add.rectangle(
        x, y,
        Phaser.Math.Between(2, 5),
        Phaser.Math.Between(2, 5),
        colors[i % colors.length]
      );
      p.setDepth(15);

      this.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-30, 30),
        alpha: 0,
        rotation: Phaser.Math.Between(0, 6),
        duration: Phaser.Math.Between(300, 600),
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }

    // Camera shake
    this.cameras.main.shake(80, 0.004);
  }
}

