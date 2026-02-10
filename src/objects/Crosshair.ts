import Phaser from 'phaser';

export class Crosshair extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'crosshair');
    scene.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.setDisplaySize(16, 16);
    this.setDepth(100);
    this.setVisible(true);
    // Render in screen space so camera scroll/shake never affects position
    this.setScrollFactor(0);
    this.scene.input.setDefaultCursor('none');
  }

  show(): void {
    this.setVisible(true);
  }

  hide(): void {
    // Keep crosshair visible at all times
  }

  updatePosition(pointer: Phaser.Input.Pointer): void {
    // Use screen-space coordinates for pixel-perfect mouse tracking.
    // pointer.x/y are already in game coordinates (scale-manager adjusted),
    // so this stays perfectly aligned with the OS cursor regardless of
    // camera scroll, lerp, or shake.
    this.x = Math.round(pointer.x);
    this.y = Math.round(pointer.y);
  }
}

