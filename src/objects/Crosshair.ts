import Phaser from 'phaser';

export class Crosshair extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'crosshair');
    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.setDisplaySize(16, 16);
    this.setDepth(100);
    this.setVisible(true);
    this.scene.input.setDefaultCursor('none');
  }

  show(): void {
    this.setVisible(true);
  }

  hide(): void {
    // Keep crosshair visible at all times
  }

  updatePosition(pointer: Phaser.Input.Pointer): void {
    this.x = pointer.worldX;
    this.y = pointer.worldY;
  }
}

