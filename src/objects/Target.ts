import Phaser from 'phaser';
import { TARGET_SIZE } from '../utils/constants';

export class Target extends Phaser.Physics.Arcade.Sprite {
  public isDestroyed: boolean = false;
  public points: number = 50;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
  ) {
    super(scene, x, y, 'target_static', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 0.5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(TARGET_SIZE - 4, TARGET_SIZE - 4);
    body.setCircle((TARGET_SIZE - 4) / 2);
  }

  hit(): number {
    if (this.isDestroyed) return 0;
    this.isDestroyed = true;

    // Show destroyed frame
    this.setFrame(2);

    // Fade out after showing destroyed frame
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y + 20,
      duration: 500,
      delay: 200,
      onComplete: () => {
        this.setActive(false);
        this.setVisible(false);
      },
    });

    return this.points;
  }
}
