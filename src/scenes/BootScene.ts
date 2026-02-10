import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator';
import { MusicEngine } from '../utils/MusicEngine';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Show loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    const loadingText = this.add.text(width / 2, height / 2 - 40, 'LOADING...', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#f0e68c',
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xe94560, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // We'll generate all pixel art assets programmatically
    this.generateAssets();
  }

  create(): void {
    // Initialize sound generator (uses Web Audio API directly)
    const soundGen = SoundGenerator.getInstance();
    soundGen.init().then(() => {
      // Initialize music engine, sharing the same AudioContext
      const musicEngine = MusicEngine.getInstance();
      const ctx = soundGen.getAudioContext();
      if (ctx) {
        musicEngine.init(ctx);
      } else {
        musicEngine.init();
      }
      this.scene.start('MenuScene');
    }).catch(() => {
      // If audio fails, still start the game
      try {
        MusicEngine.getInstance().init();
      } catch (_) { /* ignore */ }
      this.scene.start('MenuScene');
    });
  }

  private generateAssets(): void {
    // Player sprite sheet - running frames
    this.generatePlayerSprites();
    // Pole
    this.generatePoleSprite();
    // Crossbar (vault-over bar)
    this.generateCrossbarSprite();
    // Gun
    this.generateGunSprite();
    // Bullet
    this.generateBulletSprite();
    // Crosshair
    this.generateCrosshairSprite();
    // Targets
    this.generateTargetSprites();
    // Muzzle flash
    this.generateMuzzleFlash();
    // Particles
    this.generateParticles();
    // Spike wall
    this.generateSpikeWallSprite();
    // Blood splatter particle
    this.generateBloodParticle();
    // Background tiles
    this.generateBackgroundAssets();
  }

  private generatePlayerSprites(): void {
    // Generate a pixel art player sprite sheet (8 run frames + vault + air + shoot poses)
    const frameW = 32;
    const frameH = 64;
    const totalFrames = 19;
    const canvas = document.createElement('canvas');
    canvas.width = frameW * totalFrames;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d')!;

    // Color palette
    const skin = '#e8b87a';
    const skinDark = '#c49660';
    const hair = '#4a3728';
    const shirt = '#d44040';
    const shirtDark = '#a83030';
    const pants = '#3a5a8c';
    const pantsDark = '#2a4060';
    const shoes = '#5a3a20';
    const outline = '#2a1a0a';

    for (let f = 0; f < totalFrames; f++) {
      const ox = f * frameW;
      
      // Frame types:
      // 0-5: run cycle
      // 6: standing/idle
      // 7: pole plant
      // 8: vaulting (on pole)
      // 9-10: airborne (arms up / shooting pose)
      // 11: shooting right
      // 12: shooting up-right
      // 13: shooting down-right
      // 14: landing
      // 15: celebrating

      ctx.save();
      
      if (f <= 5) {
        // Run cycle frames
        const phase = f / 6;
        const legSwing = Math.sin(phase * Math.PI * 2) * 6;
        const armSwing = Math.sin(phase * Math.PI * 2) * 4;
        const bounce = Math.abs(Math.sin(phase * Math.PI * 2)) * 2;
        
        this.drawPixelPerson(ctx, ox, -bounce, legSwing, armSwing, false, false, 0);
      } else if (f === 6) {
        // Idle
        this.drawPixelPerson(ctx, ox, 0, 0, 0, false, false, 0);
      } else if (f === 7) {
        // Pole plant - leaning forward
        this.drawPixelPerson(ctx, ox, 0, 3, -3, true, false, 0);
      } else if (f === 8) {
        // Vaulting - body curled
        this.drawPixelPerson(ctx, ox, -8, -4, 6, true, false, 0);
      } else if (f === 9) {
        // Airborne - arms up
        this.drawPixelPerson(ctx, ox, -4, 0, 0, false, false, 0);
      } else if (f === 10) {
        // Airborne - shooting ready
        this.drawPixelPerson(ctx, ox, -4, 0, 0, false, true, 0);
      } else if (f === 11) {
        // Shooting right
        this.drawPixelPerson(ctx, ox, -4, 0, 0, false, true, 0);
      } else if (f === 12) {
        // Shooting up-right
        this.drawPixelPerson(ctx, ox, -4, 0, 0, false, true, -30);
      } else if (f === 13) {
        // Shooting down-right
        this.drawPixelPerson(ctx, ox, -4, 0, 0, false, true, 30);
      } else if (f === 14) {
        // Landing - crouched
        this.drawPixelPerson(ctx, ox, 6, 5, -2, false, false, 0);
      } else if (f === 15) {
        // Celebrating - arms up
        this.drawPixelPerson(ctx, ox, 0, 0, -8, false, false, 0);
      } else if (f === 16) {
        // Vault tuck - body curled tight for mid-spin rotation
        this.drawPixelPerson(ctx, ox, -4, -5, 7, true, false, 0);
      } else if (f === 17) {
        // Vault extended - body stretched out, arms reaching
        this.drawPixelPerson(ctx, ox, -10, 0, -6, false, false, 0);
      } else if (f === 18) {
        // Airborne float variant - slight arm/leg variation for bobbing
        this.drawPixelPerson(ctx, ox, -3, 1, -2, false, false, 0);
      }
      
      ctx.restore();
    }

    const tex = this.textures.addCanvas('player', canvas);
    // Add individual frames so Phaser can reference them by frame index
    for (let i = 0; i < totalFrames; i++) {
      tex.add(i, 0, i * frameW, 0, frameW, frameH);
    }
  }

  private drawPixelPerson(
    ctx: CanvasRenderingContext2D,
    ox: number,
    bounceY: number,
    legOffset: number,
    armOffset: number,
    holdingPole: boolean,
    holdingGun: boolean,
    gunAngle: number
  ): void {
    const skin = '#e8b87a';
    const skinDark = '#c49660';
    const hair = '#4a3728';
    const shirt = '#d44040';
    const shirtDark = '#a83030';
    const pants = '#3a5a8c';
    const pantsDark = '#2a4060';
    const shoes = '#5a3a20';
    const outline = '#2a1a0a';
    const gunMetal = '#555555';

    const baseY = 20 + bounceY;

    // Head (8x8)
    this.fillPixelRect(ctx, ox + 12, baseY, 8, 8, skin);
    this.fillPixelRect(ctx, ox + 12, baseY, 8, 3, hair);
    // Eyes
    this.fillPixelRect(ctx, ox + 18, baseY + 3, 2, 2, '#2a1a0a');
    // Head outline
    this.fillPixelRect(ctx, ox + 11, baseY, 1, 8, outline);
    this.fillPixelRect(ctx, ox + 20, baseY, 1, 8, outline);
    this.fillPixelRect(ctx, ox + 12, baseY - 1, 8, 1, outline);

    // Neck
    this.fillPixelRect(ctx, ox + 14, baseY + 8, 4, 2, skin);

    // Torso (12x12)
    this.fillPixelRect(ctx, ox + 10, baseY + 10, 12, 12, shirt);
    this.fillPixelRect(ctx, ox + 10, baseY + 10, 3, 12, shirtDark);
    // Belt
    this.fillPixelRect(ctx, ox + 10, baseY + 20, 12, 2, '#3a3a3a');
    this.fillPixelRect(ctx, ox + 18, baseY + 20, 2, 2, '#d4a030'); // buckle

    // Arms
    const armY = baseY + 11;
    if (holdingGun) {
      // Right arm extended with gun
      this.fillPixelRect(ctx, ox + 22, armY + Math.round(armOffset), 6, 3, skin);
      // Gun
      this.fillPixelRect(ctx, ox + 26, armY + Math.round(armOffset) - 1, 5, 3, gunMetal);
      this.fillPixelRect(ctx, ox + 29, armY + Math.round(armOffset), 2, 1, '#888');
      // Left arm
      this.fillPixelRect(ctx, ox + 4, armY + 2, 6, 3, skin);
    } else if (holdingPole) {
      // Arms forward holding pole
      this.fillPixelRect(ctx, ox + 22, armY - 2, 8, 3, skin);
      this.fillPixelRect(ctx, ox + 4, armY + 2, 6, 3, skin);
    } else {
      // Normal arm swing
      this.fillPixelRect(ctx, ox + 22, armY + Math.round(armOffset), 4, 3, skin);
      this.fillPixelRect(ctx, ox + 6, armY - Math.round(armOffset), 4, 3, skin);
    }

    // Legs
    const legY = baseY + 22;
    // Right leg
    this.fillPixelRect(ctx, ox + 16, legY, 5, 10 + Math.round(legOffset), pants);
    this.fillPixelRect(ctx, ox + 16, legY, 2, 10 + Math.round(legOffset), pantsDark);
    // Left leg
    this.fillPixelRect(ctx, ox + 11, legY, 5, 10 - Math.round(legOffset), pants);
    this.fillPixelRect(ctx, ox + 11, legY, 2, 10 - Math.round(legOffset), pantsDark);

    // Shoes
    const rShoeY = legY + 10 + Math.round(legOffset);
    const lShoeY = legY + 10 - Math.round(legOffset);
    if (rShoeY > legY + 2) {
      this.fillPixelRect(ctx, ox + 15, Math.min(rShoeY, baseY + 38), 7, 4, shoes);
    }
    if (lShoeY > legY + 2) {
      this.fillPixelRect(ctx, ox + 10, Math.min(lShoeY, baseY + 38), 7, 4, shoes);
    }
  }

  private fillPixelRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  private generatePoleSprite(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Pole with gradient shading
    ctx.fillStyle = '#c0a060';
    ctx.fillRect(2, 0, 4, 128);
    ctx.fillStyle = '#d4b878';
    ctx.fillRect(3, 0, 2, 128);
    ctx.fillStyle = '#a08040';
    ctx.fillRect(2, 0, 1, 128);
    // Grip area
    ctx.fillStyle = '#333333';
    ctx.fillRect(1, 90, 6, 20);
    ctx.fillStyle = '#555555';
    ctx.fillRect(2, 92, 4, 2);
    ctx.fillRect(2, 96, 4, 2);
    ctx.fillRect(2, 100, 4, 2);
    ctx.fillRect(2, 104, 4, 2);
    // Tip
    ctx.fillStyle = '#888888';
    ctx.fillRect(3, 0, 2, 4);

    this.textures.addCanvas('pole', canvas);
  }

  private generateCrossbarSprite(): void {
    // Crossbar: two vertical uprights with a horizontal bar across the top
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    // Left upright
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(2, 0, 4, 96);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(2, 0, 2, 96);
    // Right upright
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(42, 0, 4, 96);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(42, 0, 2, 96);

    // Horizontal bar (resting on top of uprights)
    ctx.fillStyle = '#ee4444';
    ctx.fillRect(0, 4, 48, 5);
    ctx.fillStyle = '#ff6666';
    ctx.fillRect(0, 5, 48, 2);

    // Upright caps
    ctx.fillStyle = '#dddddd';
    ctx.fillRect(1, 0, 6, 4);
    ctx.fillRect(41, 0, 6, 4);

    this.textures.addCanvas('crossbar', canvas);
  }

  private generateGunSprite(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 10;
    const ctx = canvas.getContext('2d')!;

    // Pistol pixel art
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 2, 12, 4); // barrel
    ctx.fillStyle = '#444444';
    ctx.fillRect(0, 3, 12, 2); // barrel dark
    ctx.fillStyle = '#666666';
    ctx.fillRect(12, 1, 4, 6); // receiver
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(12, 6, 3, 4); // grip
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(13, 6, 1, 3); // grip highlight
    // Trigger
    ctx.fillStyle = '#888888';
    ctx.fillRect(10, 6, 1, 2);
    // Muzzle
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 2, 1, 4);
    // Sight
    ctx.fillStyle = '#777777';
    ctx.fillRect(13, 0, 2, 1);

    this.textures.addCanvas('gun', canvas);
  }

  private generateBulletSprite(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 6;
    canvas.height = 3;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffdd44';
    ctx.fillRect(0, 0, 6, 3);
    ctx.fillStyle = '#ffee88';
    ctx.fillRect(1, 1, 4, 1);
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(0, 0, 1, 3);

    this.textures.addCanvas('bullet', canvas);
  }

  private generateCrosshairSprite(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ff4444';
    // Horizontal line
    ctx.fillRect(0, 7, 6, 2);
    ctx.fillRect(10, 7, 6, 2);
    // Vertical line
    ctx.fillRect(7, 0, 2, 6);
    ctx.fillRect(7, 10, 2, 6);
    // Center dot
    ctx.fillStyle = '#ff6666';
    ctx.fillRect(7, 7, 2, 2);

    this.textures.addCanvas('crosshair', canvas);
  }

  private generateTargetSprites(): void {
    // Stationary target (bullseye)
    const canvas = document.createElement('canvas');
    canvas.width = 32 * 3; // 3 frames: normal, hit, destroyed
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Frame 0: Normal bullseye
    this.drawBullseye(ctx, 0, 0, false);
    // Frame 1: Hit (cracked)
    this.drawBullseye(ctx, 32, 0, true);
    // Frame 2: Destroyed (fragments)
    this.drawDestroyedTarget(ctx, 64, 0);

    const staticTex = this.textures.addCanvas('target_static', canvas);
    for (let i = 0; i < 3; i++) {
      staticTex.add(i, 0, i * 32, 0, 32, 32);
    }

  }

  private drawBullseye(ctx: CanvasRenderingContext2D, ox: number, oy: number, cracked: boolean): void {
    const cx = ox + 16;
    const cy = oy + 16;
    
    // Outer ring (white)
    this.fillPixelCircle(ctx, cx, cy, 14, '#eeeeee');
    // Red ring
    this.fillPixelCircle(ctx, cx, cy, 11, '#cc3333');
    // White ring
    this.fillPixelCircle(ctx, cx, cy, 8, '#eeeeee');
    // Red ring
    this.fillPixelCircle(ctx, cx, cy, 5, '#cc3333');
    // Bullseye center
    this.fillPixelCircle(ctx, cx, cy, 2, '#ffdd44');

    if (cracked) {
      ctx.fillStyle = '#333333';
      ctx.fillRect(cx - 1, cy - 8, 2, 16);
      ctx.fillRect(cx - 6, cy - 1, 12, 2);
    }
  }


  private drawDestroyedTarget(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    // Scattered fragments
    const colors = ['#cc3333', '#eeeeee', '#666666', '#888888', '#555555'];
    const rng = (seed: number) => {
      let x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 12; i++) {
      const fx = ox + 4 + rng(i * 3) * 24;
      const fy = oy + 4 + rng(i * 7 + 1) * 24;
      const fw = 2 + Math.floor(rng(i * 5 + 2) * 4);
      const fh = 2 + Math.floor(rng(i * 11 + 3) * 4);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(fx, fy, fw, fh);
    }
  }

  private fillPixelCircle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    color: string
  ): void {
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) {
          ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }
  }

  private generateMuzzleFlash(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 16 * 3;
    canvas.height = 12;
    const ctx = canvas.getContext('2d')!;

    // Frame 0: Big flash
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 3, 12, 6);
    ctx.fillStyle = '#ffff44';
    ctx.fillRect(0, 4, 16, 4);
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(4, 2, 8, 8);

    // Frame 1: Medium flash
    ctx.fillStyle = '#ffff44';
    ctx.fillRect(16 + 4, 4, 8, 4);
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(16 + 6, 3, 4, 6);

    // Frame 2: Small flash  
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(32 + 6, 5, 4, 3);
    ctx.fillStyle = '#664400';
    ctx.fillRect(32 + 7, 5, 2, 2);

    const mfTex = this.textures.addCanvas('muzzle_flash', canvas);
    for (let i = 0; i < 3; i++) {
      mfTex.add(i, 0, i * 16, 0, 16, 12);
    }
  }

  private generateParticles(): void {
    // Generic particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 4, 4);
    this.textures.addCanvas('particle', canvas);

    // Shell casing
    const canvas2 = document.createElement('canvas');
    canvas2.width = 4;
    canvas2.height = 6;
    const ctx2 = canvas2.getContext('2d')!;
    ctx2.fillStyle = '#d4a030';
    ctx2.fillRect(0, 0, 4, 6);
    ctx2.fillStyle = '#eebb44';
    ctx2.fillRect(1, 0, 2, 5);
    ctx2.fillStyle = '#aa7720';
    ctx2.fillRect(0, 5, 4, 1);
    this.textures.addCanvas('shell', canvas2);

    // Dust puff
    const canvas3 = document.createElement('canvas');
    canvas3.width = 8;
    canvas3.height = 8;
    const ctx3 = canvas3.getContext('2d')!;
    this.fillPixelCircle(ctx3, 4, 4, 3, '#c4a060');
    this.fillPixelCircle(ctx3, 4, 4, 2, '#d4b878');
    this.textures.addCanvas('dust', canvas3);
  }

  private generateSpikeWallSprite(): void {
    // A tall wall of spikes spanning the full stage height
    const w = 32;
    const h = 400; // full height from top to ground
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Dark steel base
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(4, 0, w - 8, h);

    // Draw spikes pointing left (towards the player)
    const spikeHeight = 24;
    const spikeWidth = 18;
    const spikeSpacing = 28;
    for (let sy = 6; sy < h - spikeHeight; sy += spikeSpacing) {
      // Spike body — triangle pointing left
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.moveTo(0, sy + spikeHeight / 2);           // tip (left)
      ctx.lineTo(spikeWidth, sy);                      // top-right
      ctx.lineTo(spikeWidth, sy + spikeHeight);        // bottom-right
      ctx.closePath();
      ctx.fill();
      // Highlight edge
      ctx.fillStyle = '#eeeeee';
      ctx.beginPath();
      ctx.moveTo(1, sy + spikeHeight / 2);
      ctx.lineTo(spikeWidth - 2, sy + 2);
      ctx.lineTo(spikeWidth - 2, sy + spikeHeight / 2);
      ctx.closePath();
      ctx.fill();
      // Dark shadow edge
      ctx.fillStyle = '#888888';
      ctx.beginPath();
      ctx.moveTo(1, sy + spikeHeight / 2);
      ctx.lineTo(spikeWidth - 2, sy + spikeHeight / 2);
      ctx.lineTo(spikeWidth - 2, sy + spikeHeight - 2);
      ctx.closePath();
      ctx.fill();
      // Blood drip on some spikes
      if (sy % (spikeSpacing * 2) === 6) {
        ctx.fillStyle = '#aa2222';
        ctx.fillRect(2, sy + spikeHeight / 2, 3, 8);
        ctx.fillRect(1, sy + spikeHeight / 2 + 6, 2, 4);
      }
    }

    // Danger stripes at the back
    ctx.fillStyle = '#cc8800';
    for (let dy = 0; dy < h; dy += 16) {
      ctx.fillRect(w - 8, dy, 8, 8);
    }
    ctx.fillStyle = '#222222';
    for (let dy = 8; dy < h; dy += 16) {
      ctx.fillRect(w - 8, dy, 8, 8);
    }

    this.textures.addCanvas('spike_wall', canvas);
  }

  private generateBloodParticle(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 6;
    canvas.height = 6;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#cc2222';
    ctx.fillRect(1, 0, 4, 6);
    ctx.fillRect(0, 1, 6, 4);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(2, 1, 2, 3);
    this.textures.addCanvas('blood', canvas);
  }

  private generateBackgroundAssets(): void {
    // Sky gradient (power-of-two dimensions for WebGL tileSprite compatibility)
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 64;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d')!;
    for (let y = 0; y < 512; y++) {
      const t = y / 512;
      const r = Math.floor(74 + t * (135 - 74));
      const g = Math.floor(144 + t * (206 - 144));
      const b = Math.floor(217 + t * (235 - 217));
      skyCtx.fillStyle = `rgb(${r},${g},${b})`;
      skyCtx.fillRect(0, y, 64, 1);
    }
    this.textures.addCanvas('sky', skyCanvas);

    // Cloud
    const cloudCanvas = document.createElement('canvas');
    cloudCanvas.width = 48;
    cloudCanvas.height = 20;
    const cloudCtx = cloudCanvas.getContext('2d')!;
    this.fillPixelCircle(cloudCtx, 12, 12, 8, '#e8e8e8');
    this.fillPixelCircle(cloudCtx, 24, 10, 10, '#f0f0f0');
    this.fillPixelCircle(cloudCtx, 36, 12, 7, '#e8e8e8');
    this.fillPixelCircle(cloudCtx, 18, 8, 6, '#f4f4f4');
    this.fillPixelCircle(cloudCtx, 30, 8, 6, '#f4f4f4');
    this.textures.addCanvas('cloud', cloudCanvas);

    // Ground tile (with grass and dirt)
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 32;
    groundCanvas.height = 32;
    const groundCtx = groundCanvas.getContext('2d')!;
    // Dirt base
    groundCtx.fillStyle = '#8b6914';
    groundCtx.fillRect(0, 0, 32, 32);
    // Dirt variation
    groundCtx.fillStyle = '#7a5a10';
    groundCtx.fillRect(5, 8, 4, 3);
    groundCtx.fillRect(18, 15, 6, 4);
    groundCtx.fillRect(10, 22, 3, 3);
    // Grass top
    groundCtx.fillStyle = '#5a8a3c';
    groundCtx.fillRect(0, 0, 32, 6);
    groundCtx.fillStyle = '#6a9a4c';
    groundCtx.fillRect(0, 0, 32, 3);
    // Grass tufts
    groundCtx.fillStyle = '#7aaa5c';
    for (let i = 0; i < 8; i++) {
      const gx = (i * 4 + 1) % 32;
      groundCtx.fillRect(gx, 0, 2, 2);
    }
    this.textures.addCanvas('ground', groundCanvas);

    // Runway tile
    const runwayCanvas = document.createElement('canvas');
    runwayCanvas.width = 32;
    runwayCanvas.height = 32;
    const runwayCtx = runwayCanvas.getContext('2d')!;
    runwayCtx.fillStyle = '#c4956a';
    runwayCtx.fillRect(0, 0, 32, 32);
    runwayCtx.fillStyle = '#b08558';
    runwayCtx.fillRect(0, 0, 32, 2);
    // Track lines
    runwayCtx.fillStyle = '#d4a878';
    runwayCtx.fillRect(0, 14, 32, 2);
    runwayCtx.fillRect(0, 28, 32, 2);
    // Some texture
    runwayCtx.fillStyle = '#b89068';
    runwayCtx.fillRect(8, 6, 3, 2);
    runwayCtx.fillRect(20, 18, 4, 2);
    this.textures.addCanvas('runway', runwayCanvas);

    // Bleacher / stadium background piece
    const bleacherCanvas = document.createElement('canvas');
    bleacherCanvas.width = 64;
    bleacherCanvas.height = 80;
    const bleacherCtx = bleacherCanvas.getContext('2d')!;
    // Structure
    bleacherCtx.fillStyle = '#888888';
    bleacherCtx.fillRect(0, 0, 64, 80);
    // Rows
    for (let row = 0; row < 5; row++) {
      const ry = row * 16;
      bleacherCtx.fillStyle = '#777777';
      bleacherCtx.fillRect(0, ry, 64, 2);
      bleacherCtx.fillStyle = '#999999';
      bleacherCtx.fillRect(0, ry + 2, 64, 6);
      // People silhouettes
      const colors = ['#d44040', '#4080d0', '#40a040', '#d0a040', '#a040a0'];
      for (let p = 0; p < 6; p++) {
        const px = 4 + p * 10;
        const ci = (row * 6 + p) % colors.length;
        bleacherCtx.fillStyle = colors[ci];
        bleacherCtx.fillRect(px, ry + 4, 6, 8);
        bleacherCtx.fillStyle = '#e8b87a';
        bleacherCtx.fillRect(px + 1, ry + 2, 4, 3);
      }
    }
    this.textures.addCanvas('bleachers', bleacherCanvas);

    // Fence
    const fenceCanvas = document.createElement('canvas');
    fenceCanvas.width = 32;
    fenceCanvas.height = 48;
    const fenceCtx = fenceCanvas.getContext('2d')!;
    // Posts
    fenceCtx.fillStyle = '#aaaaaa';
    fenceCtx.fillRect(0, 0, 3, 48);
    fenceCtx.fillRect(29, 0, 3, 48);
    // Horizontal bars
    fenceCtx.fillStyle = '#999999';
    fenceCtx.fillRect(0, 8, 32, 2);
    fenceCtx.fillRect(0, 24, 32, 2);
    fenceCtx.fillRect(0, 40, 32, 2);
    // Wire mesh pattern
    fenceCtx.fillStyle = '#bbbbbb';
    for (let y = 0; y < 48; y += 4) {
      for (let x = 3; x < 29; x += 4) {
        fenceCtx.fillRect(x, y, 1, 1);
        fenceCtx.fillRect(x + 2, y + 2, 1, 1);
      }
    }
    this.textures.addCanvas('fence', fenceCanvas);
  }
}

