/**
 * Procedural retro sound effect generator using Web Audio API.
 * All sounds are generated at runtime - no external audio files needed.
 * Plays sounds directly via Web Audio API for simplicity.
 */
export class SoundGenerator {
  private static instance: SoundGenerator;
  private audioCtx: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private ready: boolean = false;
  private masterVolume: number = 0.5;

  static getInstance(): SoundGenerator {
    if (!SoundGenerator.instance) {
      SoundGenerator.instance = new SoundGenerator();
    }
    return SoundGenerator.instance;
  }

  async init(): Promise<void> {
    if (this.ready) return;
    
    try {
      this.audioCtx = new AudioContext();
      
      const generators: [string, () => AudioBuffer][] = [
        ['sfx_gunshot', () => this.createGunshot()],
        ['sfx_hit', () => this.createHit()],
        ['sfx_bullseye', () => this.createBullseye()],
        ['sfx_whoosh', () => this.createWhoosh()],
        ['sfx_plant', () => this.createPlant()],
        ['sfx_launch', () => this.createLaunch()],
        ['sfx_land', () => this.createLand()],
        ['sfx_combo', () => this.createCombo()],
        ['sfx_levelclear', () => this.createLevelClear()],
        ['sfx_fail', () => this.createFail()],
        ['sfx_select', () => this.createSelect()],
      ];

      for (const [key, gen] of generators) {
        this.buffers.set(key, gen());
      }

      this.ready = true;
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  }

  play(key: string, volume: number = 0.5): void {
    if (!this.ready || !this.audioCtx) return;
    
    const buffer = this.buffers.get(key);
    if (!buffer) return;

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const source = this.audioCtx.createBufferSource();
      const gainNode = this.audioCtx.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = volume * this.masterVolume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioCtx.destination);
      
      source.start(0);
    } catch (e) {
      // Silently ignore sound errors
    }
  }

  setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  getAudioContext(): AudioContext | null {
    return this.audioCtx;
  }

  // ─── Sound Generators ─────────────────────────────

  private createBuffer(duration: number): { buffer: AudioBuffer; data: Float32Array } {
    const sampleRate = this.audioCtx!.sampleRate;
    const buffer = this.audioCtx!.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    return { buffer, data };
  }

  private createGunshot(): AudioBuffer {
    const { buffer, data } = this.createBuffer(0.15);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const noise = (Math.random() * 2 - 1);
      const envelope = Math.exp(-t * 40);
      const punch = Math.sin(t * 150 * Math.PI * 2) * Math.exp(-t * 20);
      data[i] = (noise * 0.6 + punch * 0.4) * envelope * 0.8;
    }
    return buffer;
  }

  private createHit(): AudioBuffer {
    const { buffer, data } = this.createBuffer(0.2);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const freq = 300 - t * 1000;
      const tone = Math.sin(t * freq * Math.PI * 2);
      const noise = (Math.random() * 2 - 1) * 0.3;
      const envelope = Math.exp(-t * 15);
      data[i] = (tone * 0.7 + noise) * envelope * 0.6;
    }
    return buffer;
  }

  private createBullseye(): AudioBuffer {
    const { buffer, data } = this.createBuffer(0.4);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const freq1 = 400 + t * 600;
      const freq2 = 600 + t * 800;
      const tone = Math.sin(t * freq1 * Math.PI * 2) * 0.5 + Math.sin(t * freq2 * Math.PI * 2) * 0.3;
      const envelope = Math.exp(-t * 5) * Math.min(t * 20, 1);
      data[i] = tone * envelope * 0.5;
    }
    return buffer;
  }

  private createWhoosh(): AudioBuffer {
    const duration = 0.4;
    const { buffer, data } = this.createBuffer(duration);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const noise = Math.random() * 2 - 1;
      const envelope = Math.sin(t / duration * Math.PI);
      const freq = 200 + t * 800;
      const filter = Math.sin(t * freq * Math.PI * 2) * 0.3;
      data[i] = (noise * 0.5 + filter) * envelope * 0.4;
    }
    return buffer;
  }

  private createPlant(): AudioBuffer {
    const { buffer, data } = this.createBuffer(0.15);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const thud = Math.sin(t * 80 * Math.PI * 2) * Math.exp(-t * 30);
      const ring = Math.sin(t * 2000 * Math.PI * 2) * Math.exp(-t * 40) * 0.2;
      data[i] = (thud + ring) * 0.7;
    }
    return buffer;
  }

  private createLaunch(): AudioBuffer {
    const duration = 0.35;
    const { buffer, data } = this.createBuffer(duration);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const freq = 100 + t * 1500;
      const tone = Math.sin(t * freq * Math.PI * 2) * 0.4;
      const noise = (Math.random() * 2 - 1) * 0.2;
      const envelope = Math.sin(t / duration * Math.PI);
      data[i] = (tone + noise) * envelope * 0.5;
    }
    return buffer;
  }

  private createLand(): AudioBuffer {
    const { buffer, data } = this.createBuffer(0.25);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const freq = 60 - t * 40;
      const thump = Math.sin(t * Math.max(freq, 20) * Math.PI * 2);
      const dust = (Math.random() * 2 - 1) * Math.exp(-t * 10) * 0.3;
      const envelope = Math.exp(-t * 12);
      data[i] = (thump * 0.8 + dust) * envelope * 0.7;
    }
    return buffer;
  }

  private createCombo(): AudioBuffer {
    const { buffer, data } = this.createBuffer(0.25);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const step = Math.floor(t * 12) % 3;
      const freqs = [523, 659, 784];
      const tone = Math.sin(t * freqs[step] * Math.PI * 2);
      const envelope = Math.exp(-t * 6);
      data[i] = tone * envelope * 0.4;
    }
    return buffer;
  }

  private createLevelClear(): AudioBuffer {
    const { buffer, data } = this.createBuffer(0.8);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const noteTime = t * 5;
      const noteIdx = Math.floor(noteTime) % 5;
      const notes = [392, 440, 523, 587, 784];
      const freq = notes[noteIdx];
      const tone = Math.sin(t * freq * Math.PI * 2) * 0.5 +
                   Math.sin(t * freq * 2 * Math.PI * 2) * 0.2;
      const noteEnv = Math.exp(-(noteTime % 1) * 3);
      const masterEnv = Math.min(t * 10, 1) * 
                   Math.exp(-Math.max(t - 0.6, 0) * 5);
      data[i] = tone * noteEnv * masterEnv;
    }
    return buffer;
  }

  private createFail(): AudioBuffer {
    const { buffer, data } = this.createBuffer(0.5);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const freq = 400 - t * 300;
      const tone = Math.sin(t * freq * Math.PI * 2) * 0.5 +
                   Math.sin(t * (freq * 0.5) * Math.PI * 2) * 0.3;
      const envelope = Math.exp(-t * 4);
      data[i] = tone * envelope * 0.4;
    }
    return buffer;
  }

  private createSelect(): AudioBuffer {
    const { buffer, data } = this.createBuffer(0.08);
    const sr = this.audioCtx!.sampleRate;
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      const tone = Math.sin(t * 800 * Math.PI * 2);
      const envelope = Math.exp(-t * 30);
      data[i] = tone * envelope * 0.4;
    }
    return buffer;
  }
}
