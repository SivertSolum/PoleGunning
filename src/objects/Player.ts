import Phaser from 'phaser';
import { GROUND_Y, PLAYER_RUN_SPEED_MAX, PLAYER_RUN_ACCEL, PLAYER_WIDTH, PLAYER_HEIGHT } from '../utils/constants';

export type PlayerState = 'idle' | 'running' | 'planting' | 'vaulting' | 'airborne' | 'shooting' | 'landing' | 'celebrating';

export class Player extends Phaser.GameObjects.Sprite {
  public state: PlayerState = 'idle';
  public runSpeed: number = 0;
  public vaultAngle: number = 55;
  public vaultPower: number = 0;
  public isPowerCharging: boolean = false;
  public ammo: number = 6;
  public maxAmmo: number = 6;
  private animTimer: number = 0;
  private currentFrameIndex: number = 6; // idle frame

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player', 6); // start on idle frame (index 6)
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(PLAYER_WIDTH - 8, PLAYER_HEIGHT - 4);
    body.setOffset(4, 4);
    body.setCollideWorldBounds(false);
  }

  setState(newState: PlayerState): this {
    this.state = newState;
    this.animTimer = 0;
    return this;
  }

  updatePlayer(delta: number): void {
    this.animTimer += delta;

    switch (this.state) {
      case 'idle':
        this.showFrame(6);
        break;

      case 'running':
        {
          const runFrame = Math.floor((this.animTimer / 100) % 6);
          this.showFrame(runFrame);
        }
        break;

      case 'planting':
        this.showFrame(7);
        break;

      case 'vaulting':
        {
          // Animated vault: cycle through vault phases during the spin
          const vaultTime = this.animTimer;
          if (vaultTime < 150) {
            this.showFrame(8);   // initial vault pose on pole
          } else if (vaultTime < 350) {
            this.showFrame(16);  // tucked for mid-rotation
          } else if (vaultTime < 550) {
            this.showFrame(17);  // extended body over the bar
          } else {
            this.showFrame(9);   // extending into airborne position
          }
        }
        break;

      case 'airborne':
        {
          // Gentle floating animation - alternate between two frames
          const floatFrame = Math.floor((this.animTimer / 400) % 2);
          this.showFrame(floatFrame === 0 ? 9 : 18);
        }
        break;

      case 'shooting':
        this.showFrame(10);
        break;

      case 'landing':
        this.showFrame(14);
        break;

      case 'celebrating':
        this.showFrame(15);
        break;
    }
  }

  showFrame(frame: number): void {
    if (this.currentFrameIndex !== frame) {
      this.currentFrameIndex = frame;
      this.setFrame(frame);
    }
  }

  accelerate(delta: number): void {
    this.runSpeed = Math.min(this.runSpeed + PLAYER_RUN_ACCEL * (delta / 1000), PLAYER_RUN_SPEED_MAX);
  }

  resetRun(): void {
    this.runSpeed = 0;
  }

  startPowerCharge(): void {
    this.isPowerCharging = true;
    this.vaultPower = 0;
  }

  chargePower(delta: number): void {
    if (this.isPowerCharging) {
      this.vaultPower = Math.min(this.vaultPower + 400 * (delta / 1000), 600);
    }
  }

  releasePower(): number {
    this.isPowerCharging = false;
    const power = this.vaultPower;
    // Power is also influenced by run speed
    const speedBonus = (this.runSpeed / PLAYER_RUN_SPEED_MAX) * 200;
    return power + speedBonus;
  }

  getVaultVelocity(): { vx: number; vy: number } {
    const totalPower = this.vaultPower + (this.runSpeed / PLAYER_RUN_SPEED_MAX) * 200;
    const angleRad = Phaser.Math.DegToRad(this.vaultAngle);
    return {
      vx: Math.cos(angleRad) * totalPower * 0.45,
      vy: -Math.sin(angleRad) * totalPower * 1.0,
    };
  }

  shoot(): boolean {
    if (this.ammo <= 0) return false;
    this.ammo--;
    this.state = 'shooting';
    this.animTimer = 0;
    return true;
  }
}
