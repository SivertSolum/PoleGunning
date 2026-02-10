import Phaser from 'phaser';
import { BULLET_SPEED } from '../utils/constants';

export class Gun extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'gun');
    scene.add.existing(this);
    this.setOrigin(0, 0.5);
    this.setDisplaySize(16, 10);
    this.setVisible(false);
    this.setDepth(5);
  }

  aimAt(targetX: number, targetY: number): number {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    this.setRotation(angle);
    // Flip gun sprite when aiming left
    if (Math.abs(angle) > Math.PI / 2) {
      this.setFlipY(true);
    } else {
      this.setFlipY(false);
    }
    return angle;
  }

  show(): void {
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }
}

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  public isActive: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(6, 3);
    this.setActive(false);
    this.setVisible(false);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(6, 3);
  }

  fire(fromX: number, fromY: number, angle: number): void {
    this.setPosition(fromX, fromY);
    this.setActive(true);
    this.setVisible(true);
    this.isActive = true;
    this.setRotation(angle);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(
      Math.cos(angle) * BULLET_SPEED,
      Math.sin(angle) * BULLET_SPEED
    );
  }

  deactivate(): void {
    this.setActive(false);
    this.setVisible(false);
    this.isActive = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
  }
}

