import Phaser from 'phaser';
import { GROUND_Y } from '../utils/constants';

export class Pole extends Phaser.GameObjects.Sprite {
  public isPlanted: boolean = false;
  public isCarried: boolean = false;
  public bendAmount: number = 0;
  private plantX: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'pole');
    scene.add.existing(this);
    
    this.setOrigin(0.5, 1);
    this.setVisible(false);
    this.setDisplaySize(8, 128);
  }

  /** Start carrying the pole horizontally while running */
  startCarrying(): void {
    this.isCarried = true;
    this.isPlanted = false;
    this.setVisible(true);
    this.setRotation(-Math.PI / 2); // horizontal, pointing left (behind player)
  }

  /** Update pole position to follow the player while running */
  updateCarry(playerX: number, playerY: number, runBounce: number): void {
    if (!this.isCarried) return;
    this.x = playerX + 4;
    this.y = playerY - 18 + runBounce; // at hand height with slight bob
    this.setRotation(-Math.PI / 2); // keep horizontal
  }

  plant(x: number): void {
    this.plantX = x;
    this.isCarried = false;
    this.isPlanted = true;
    this.bendAmount = 0;
    this.setVisible(true);

    // Animate from current horizontal carry position to vertical planted position
    this.scene.tweens.add({
      targets: this,
      x: x,
      y: GROUND_Y,
      rotation: 0, // vertical
      duration: 120,
      ease: 'Quad.easeOut',
    });
  }

  updatePole(playerX: number, playerY: number, vaulting: boolean): void {
    if (!this.isPlanted) return;

    if (vaulting) {
      // Calculate bend based on player position relative to plant point
      const dx = playerX - this.plantX;
      const dy = playerY - GROUND_Y;
      const angle = Math.atan2(dy, dx);
      this.setRotation(angle + Math.PI / 2);
      
      // Scale based on distance (pole stretches/compresses)
      const dist = Math.sqrt(dx * dx + dy * dy);
      const baseLen = 128;
      this.setDisplaySize(8, Math.min(dist, baseLen));
      
      this.bendAmount = Math.abs(dx) / 100;
    }
  }

  release(): void {
    this.isPlanted = false;
    // Animate pole falling
    this.scene.tweens.add({
      targets: this,
      rotation: Math.PI / 2,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.setVisible(false);
        this.setAlpha(1);
      },
    });
  }

  reset(): void {
    this.isPlanted = false;
    this.isCarried = false;
    this.bendAmount = 0;
    this.setVisible(false);
    this.setRotation(0);
  }
}

