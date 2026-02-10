/**
 * NES-style chiptune music engine using Web Audio API.
 * Emulates the 2A03 sound chip with:
 *   - 2 Pulse wave channels (with configurable duty cycle)
 *   - 1 Triangle wave channel (bass)
 *   - 1 Noise channel (percussion)
 *
 * All music is procedurally generated at runtime — no audio files needed.
 * Inspired by classic NES soundtracks, especially Castlevania's "Vampire Killer".
 */

// ─── Step Constants ────────────────────────────────
const R = 0;   // Rest (silence)
const S = -1;  // Sustain (continue previous note)

// Drum hit types for noise channel
const K = 1;   // Kick drum
const SN = 2;  // Snare drum
const HH = 3;  // Closed hi-hat
const OH = 4;  // Open hi-hat

// ─── Note Frequencies (Hz, Equal Temperament, A4=440) ──
// Octave 2
const _C2 = 65.41, _Cs2 = 69.30, _D2 = 73.42, _Eb2 = 77.78;
const _E2 = 82.41, _F2 = 87.31, _Fs2 = 92.50, _G2 = 98.00;
const _Gs2 = 103.83, _A2 = 110.00, _Bb2 = 116.54, _B2 = 123.47;
// Octave 3
const _C3 = 130.81, _Cs3 = 138.59, _D3 = 146.83, _Eb3 = 155.56;
const _E3 = 164.81, _F3 = 174.61, _Fs3 = 185.00, _G3 = 196.00;
const _Gs3 = 207.65, _A3 = 220.00, _Bb3 = 233.08, _B3 = 246.94;
// Octave 4
const _C4 = 261.63, _Cs4 = 277.18, _D4 = 293.66, _Eb4 = 311.13;
const _E4 = 329.63, _F4 = 349.23, _Fs4 = 369.99, _G4 = 392.00;
const _Gs4 = 415.30, _A4 = 440.00, _Bb4 = 466.16, _B4 = 493.88;
// Octave 5
const _C5 = 523.25, _Cs5 = 554.37, _D5 = 587.33, _Eb5 = 622.25;
const _E5 = 659.25, _F5 = 698.46, _Fs5 = 739.99, _G5 = 783.99;
const _Gs5 = 830.61, _A5 = 880.00, _Bb5 = 932.33, _B5 = 987.77;

// ─── Song Data Type ────────────────────────────────
interface SongData {
  name: string;
  tempo: number;        // BPM
  pulse1: number[];     // Lead melody (freq values, R for rest, S for sustain)
  pulse2: number[];     // Harmony / arpeggios
  triangle: number[];   // Bass line
  noise: number[];      // Drums (K, SN, HH, OH, or R)
  pulse1Vol: number;    // Channel volumes (0–1)
  pulse2Vol: number;
  triVol: number;
  noiseVol: number;
  pulse1Duty: number;   // Pulse duty cycle (0.125, 0.25, or 0.5)
  pulse2Duty: number;
}

// ─── Song Definitions ──────────────────────────────
// Each array position = 1 eighth note. Songs loop.

const SONGS: Record<string, SongData> = {

  // ═══════════════════════════════════════════════════
  // GAME THEME — "Vault Hunter's Pursuit"
  // Key: D minor, 150 BPM, 8 bars
  // Inspired by Castlevania's driving gothic energy
  // ═══════════════════════════════════════════════════
  game: {
    name: "Vault Hunter's Pursuit",
    tempo: 150,
    pulse1Duty: 0.25,
    pulse2Duty: 0.125,
    pulse1Vol: 0.105,
    pulse2Vol: 0.066,
    triVol: 0.09,
    noiseVol: 0.054,

    // Lead melody — Driving scalar runs with chromatic tension (harmonic minor)
    pulse1: [
      // Bar 1 (Dm): Rising run, Vampire Killer energy
      _D5, _E5, _F5, _G5, _A5,  S,   S, _G5,
      // Bar 2 (Dm): Descending with chromatic Cs
      _F5, _E5, _D5,_Cs5, _D5,  S,   S,  R,
      // Bar 3 (Bb): Arpeggiated Bb major
      _Bb4, S, _D5, _F5,  S,   S, _D5,_Bb4,
      // Bar 4 (A): Dominant tension
      _A4,  S,_Cs5, _E5,  S,   S, _D5,_Cs5,
      // Bar 5 (Dm): Second phrase, ascending further
      _D5, _E5, _F5, _A5,_Bb5,  S, _A5, _G5,
      // Bar 6 (C): Relative major brightness
      _F5, _E5, _C5, _E5, _G5,  S, _A5, _G5,
      // Bar 7 (Bb): Dramatic descending run
      _Bb5,_A5, _G5, _F5, _D5,_Bb4, _D5, _F5,
      // Bar 8 (A→Dm): Resolution to tonic
      _E5,_Cs5, _A4,_Cs5, _E5,_Cs5, _D5,  S,
    ],

    // Harmony — Driving arpeggiated chords (classic NES rhythm)
    pulse2: [
      // Bar 1 (Dm)
      _D4, _A4, _D4, _A4, _F4, _A4, _D4, _A4,
      // Bar 2 (Dm)
      _D4, _A4, _F4, _A4, _D4, _A4, _D4, _A4,
      // Bar 3 (Bb)
      _Bb3,_F4,_Bb3, _F4, _D4, _F4,_Bb3, _F4,
      // Bar 4 (A)
      _A3, _E4, _A3, _E4,_Cs4, _E4, _A3, _E4,
      // Bar 5 (Dm)
      _D4, _A4, _D4, _A4, _F4, _A4, _D4, _A4,
      // Bar 6 (C)
      _C4, _G4, _C4, _G4, _E4, _G4, _C4, _G4,
      // Bar 7 (Bb)
      _Bb3,_F4, _D4, _F4,_Bb3, _F4, _D4, _F4,
      // Bar 8 (A→Dm)
      _A3, _E4,_Cs4, _E4, _A3,_Cs4, _D4,  S,
    ],

    // Bass — Root-octave arpeggios on triangle wave
    triangle: [
      // Bar 1 (Dm)
      _D2, _D3, _A2, _D3, _D2, _D3, _A2, _D3,
      // Bar 2 (Dm)
      _D2, _F2, _A2, _D3, _A2, _F2, _D2, _D3,
      // Bar 3 (Bb)
      _Bb2,_Bb3,_F2,_Bb3,_Bb2,_Bb3, _F2,_Bb2,
      // Bar 4 (A)
      _A2, _A3, _E2, _A3, _A2, _A3, _E2, _A3,
      // Bar 5 (Dm)
      _D2, _D3, _A2, _D3, _D2, _D3, _F2, _D3,
      // Bar 6 (C)
      _C3, _C2, _G2, _C3, _C2, _E2, _G2, _C3,
      // Bar 7 (Bb)
      _Bb2,_Bb3,_F2,_Bb3,_Bb2, _D3, _F2,_Bb2,
      // Bar 8 (A→Dm)
      _A2, _A3, _E2, _A3, _A2, _E2, _D2,  S,
    ],

    // Drums — Driving rock beat with variation
    noise: [
      // Bars 1–2
      K, HH, SN, HH, K,  K, SN, HH,   K, HH, SN, HH, K,  K, SN, HH,
      // Bars 3–4 (slight variation, open hat at end)
      K, HH, SN, HH, K, HH, SN, HH,   K, HH, SN, HH, K,  K, SN, OH,
      // Bars 5–6
      K, HH, SN, HH, K,  K, SN, HH,   K, HH, SN, HH, K, HH, SN, HH,
      // Bars 7–8 (build-up, open hat finale)
      K, HH, SN, HH, K,  K, SN, HH,   K,  K, SN, HH, K,  K, SN, OH,
    ],
  },

  // ═══════════════════════════════════════════════════
  // MENU THEME — "The Arena Awaits"
  // Key: A minor, 110 BPM, 8 bars
  // Atmospheric, mysterious, anticipatory
  // ═══════════════════════════════════════════════════
  menu: {
    name: 'The Arena Awaits',
    tempo: 110,
    pulse1Duty: 0.25,
    pulse2Duty: 0.5,
    pulse1Vol: 0.075,
    pulse2Vol: 0.045,
    triVol: 0.075,
    noiseVol: 0.024,

    // Lead — Slower, more deliberate melody
    pulse1: [
      // Bar 1 (Am)
      _A4,  S,  S, _C5,  S, _E5,  S,  S,
      // Bar 2 (Am)
      _E5,  S, _D5,  S, _C5,  S, _B4,  S,
      // Bar 3 (F)
      _A4,  S,  S, _F4,  S, _A4,  S, _C5,
      // Bar 4 (Em)
      _B4,  S,  S,_Gs4,  S, _E4,  S,  S,
      // Bar 5 (Am)
      _A4,  S,  S, _E5,  S,  S, _A5,  S,
      // Bar 6 (Dm)
       S, _F5, _D5,  S, _A4,  S,  S, _D5,
      // Bar 7 (G)
      _B4,  S, _D5,  S, _G5,  S,  S, _D5,
      // Bar 8 (E)
      _E5,  S,  S,_Gs4, _B4,  S, _E5,  S,
    ],

    // Harmony — Sparse atmospheric pads (50% duty = hollow, flute-like)
    pulse2: [
      // Bar 1 (Am)
       R,  R, _E4,  S,  S,  S,  R,  R,
      // Bar 2 (Am)
       R,  R, _A4,  S,  S,  S,  R,  R,
      // Bar 3 (F)
       R,  R, _C4,  S,  S,  S,  R,  R,
      // Bar 4 (Em)
       R,  R, _E4,  S,  S,  S,  R,  R,
      // Bar 5 (Am)
       R,  R, _C5,  S,  S,  S,  R,  R,
      // Bar 6 (Dm)
       R,  R, _A4,  S,  S,  S,  R,  R,
      // Bar 7 (G)
       R,  R, _D5,  S,  S,  S,  R,  R,
      // Bar 8 (E)
       R,  R, _B4,  S,  S,  S,  R,  R,
    ],

    // Bass — Gentle root-fifth patterns
    triangle: [
      // Bar 1 (Am)
      _A2,  S, _E3,  S, _A2,  S, _E3,  S,
      // Bar 2 (Am)
      _A2,  S, _C3,  S, _E3,  S, _A2,  S,
      // Bar 3 (F)
      _F2,  S, _C3,  S, _F2,  S, _A2,  S,
      // Bar 4 (Em)
      _E2,  S, _B2,  S, _E3,  S,_Gs2,  S,
      // Bar 5 (Am)
      _A2,  S, _E3,  S, _A3,  S, _E3,  S,
      // Bar 6 (Dm)
      _D3,  S, _A2,  S, _D3,  S, _F2,  S,
      // Bar 7 (G)
      _G2,  S, _D3,  S, _B2,  S, _G3,  S,
      // Bar 8 (E)
      _E2,  S, _B2,  S,_Gs2,  S, _E3,  S,
    ],

    // Drums — Minimal, atmospheric
    noise: [
      R, R, HH, R, R, R, HH, R,    R, R, HH, R, R, R, HH, R,
      R, R, HH, R, R, R, HH, R,    R, R, HH, R, R, R, HH, R,
      R, R, HH, R, R, R, HH, R,    R, R, HH, R, R, R, HH, R,
      R, R, HH, R, R, R, HH, R,    R, R, HH, R, R, R, HH, R,
    ],
  },

  // ═══════════════════════════════════════════════════
  // SCORE THEME — "Victor's March"
  // Key: C major, 140 BPM, 4 bars
  // Triumphant, celebratory (plays when player passes)
  // ═══════════════════════════════════════════════════
  score: {
    name: "Victor's March",
    tempo: 140,
    pulse1Duty: 0.25,
    pulse2Duty: 0.25,
    pulse1Vol: 0.09,
    pulse2Vol: 0.066,
    triVol: 0.075,
    noiseVol: 0.036,

    pulse1: [
      // Bar 1 (C)
      _C5, _E5, _G5,  S, _E5, _G5, _A5,  S,
      // Bar 2 (G)
      _B4,  S, _G4,  S, _D5, _G5, _B4,  S,
      // Bar 3 (Am→F)
      _A4, _G4, _E4,  S, _F4,  S, _A4,  S,
      // Bar 4 (G→C)
      _G4,  S, _E4,  S, _C5,  S,  S,  S,
    ],

    pulse2: [
      // Bar 1 (C)
      _E4, _G4, _C5,  S, _G4, _C5, _E5,  S,
      // Bar 2 (G)
      _D4,  S, _B3,  S, _B4, _D5, _G4,  S,
      // Bar 3 (Am→F)
      _E4, _C4, _A3,  S, _A3,  S, _C4,  S,
      // Bar 4 (G→C)
      _B3,  S, _G3,  S, _E4,  S,  S,  S,
    ],

    triangle: [
      // Bar 1 (C)
      _C3, _G3, _C3, _E3, _C3, _G3, _E3, _C3,
      // Bar 2 (G)
      _G2, _D3, _G3, _D3, _G2, _B2, _D3, _G3,
      // Bar 3 (Am→F)
      _A2, _E3, _A3, _E3, _F2, _C3, _F3, _C3,
      // Bar 4 (G→C)
      _G2, _D3, _B2, _G2, _C3,  S,  S,  S,
    ],

    noise: [
      K, HH, SN, HH, K, HH, SN, HH,
      K, HH, SN, HH, K, HH, SN, HH,
      K, HH, SN, HH, K, HH, SN, HH,
      K, HH, SN, HH, K,  R,  R,  R,
    ],
  },

  // ═══════════════════════════════════════════════════
  // FAIL THEME — "Fallen Vaulter"
  // Key: D minor, 80 BPM, 4 bars
  // Somber, slow, melancholic
  // ═══════════════════════════════════════════════════
  fail: {
    name: 'Fallen Vaulter',
    tempo: 80,
    pulse1Duty: 0.5,
    pulse2Duty: 0.5,
    pulse1Vol: 0.066,
    pulse2Vol: 0.045,
    triVol: 0.06,
    noiseVol: 0.015,

    pulse1: [
      // Bar 1 (Dm)
      _D5,  S,  S,  S, _F5,  S,  S,  S,
      // Bar 2 (A)
      _E5,  S,  S,  S,_Cs5,  S,  S,  S,
      // Bar 3 (Bb)
      _D5,  S,  S,  S, _Bb4, S,  S,  S,
      // Bar 4 (A→Dm)
      _A4,  S,  S,  S, _D4,  S,  S,  S,
    ],

    pulse2: [
      // Bar 1 (Dm)
      _A4,  S,  S,  S, _D4,  S,  S,  S,
      // Bar 2 (A)
      _A3,  S,  S,  S, _A3,  S,  S,  S,
      // Bar 3 (Bb)
      _F4,  S,  S,  S, _D4,  S,  S,  S,
      // Bar 4 (A→Dm)
      _E4,  S,  S,  S, _A3,  S,  S,  S,
    ],

    triangle: [
      // Bar 1 (Dm)
      _D2,  S,  S,  S, _D3,  S,  S,  S,
      // Bar 2 (A)
      _A2,  S,  S,  S, _A2,  S,  S,  S,
      // Bar 3 (Bb)
      _Bb2, S,  S,  S, _F2,  S,  S,  S,
      // Bar 4 (A→Dm)
      _A2,  S,  S,  S, _D2,  S,  S,  S,
    ],

    noise: [
       R,  R,  R,  R,  R,  R,  R,  R,
       R,  R,  R,  R,  R,  R,  R,  R,
       R,  R,  R,  R,  R,  R,  R,  R,
       R,  R,  R,  R,  R,  R,  R,  R,
    ],
  },
};

// ─── Music Engine ──────────────────────────────────

export class MusicEngine {
  private static instance: MusicEngine;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Persistent oscillators
  private pulse1Osc: OscillatorNode | null = null;
  private pulse1Gain: GainNode | null = null;
  private pulse2Osc: OscillatorNode | null = null;
  private pulse2Gain: GainNode | null = null;
  private triOsc: OscillatorNode | null = null;
  private triGain: GainNode | null = null;

  // Noise
  private noiseBuffer: AudioBuffer | null = null;

  // Sequencer state
  private currentSong: SongData | null = null;
  private currentTrackName: string = '';
  private isPlaying: boolean = false;
  private currentStep: number = 0;
  private nextStepTime: number = 0;
  private schedulerTimer: ReturnType<typeof setInterval> | null = null;

  // Settings
  private volume: number = 0.105;
  private muted: boolean = false;

  // Scheduling parameters
  private readonly LOOKAHEAD = 0.12;       // seconds to look ahead
  private readonly SCHEDULE_INTERVAL = 25;  // ms between scheduler calls

  // ─── Singleton ─────────────────────────────────

  static getInstance(): MusicEngine {
    if (!MusicEngine.instance) {
      MusicEngine.instance = new MusicEngine();
    }
    return MusicEngine.instance;
  }

  // ─── Public API ────────────────────────────────

  init(existingCtx?: AudioContext): void {
    if (this.audioCtx) return;

    try {
      this.audioCtx = existingCtx || new AudioContext();

      // Master gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.audioCtx.destination);

      // Pre-generate noise buffer (2 seconds of white noise)
      this.createNoiseBuffer();
    } catch (e) {
      console.warn('MusicEngine: Audio initialization failed', e);
    }
  }

  play(trackName: string): void {
    if (!this.audioCtx || !this.masterGain) return;

    const song = SONGS[trackName];
    if (!song) {
      console.warn(`MusicEngine: Unknown track "${trackName}"`);
      return;
    }

    // Don't restart if already playing this track
    if (this.isPlaying && this.currentTrackName === trackName) return;

    // Stop current playback
    this.stopInternal();

    // Resume context if suspended (browser autoplay policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.currentSong = song;
    this.currentTrackName = trackName;
    this.currentStep = 0;
    this.isPlaying = true;

    // Create oscillators for this song
    this.createOscillators(song);

    // Fade in the master gain
    const now = this.audioCtx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(0, now);
    this.masterGain.gain.linearRampToValueAtTime(
      this.muted ? 0 : this.volume,
      now + 0.4
    );

    // Begin scheduling
    this.nextStepTime = now + 0.05;
    this.schedulerTimer = setInterval(() => this.schedule(), this.SCHEDULE_INTERVAL);
  }

  stop(): void {
    if (!this.isPlaying) return;

    // Fade out then clean up
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.3);
    }

    setTimeout(() => this.stopInternal(), 350);
  }

  stopImmediate(): void {
    this.stopInternal();
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : this.volume,
        now
      );
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : this.volume,
        now
      );
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentTrack(): string {
    return this.currentTrackName;
  }

  // ─── Private: Cleanup ──────────────────────────

  private stopInternal(): void {
    this.isPlaying = false;
    this.currentSong = null;
    this.currentTrackName = '';
    this.currentStep = 0;

    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    this.destroyOscillators();
  }

  // ─── Private: Noise Buffer ─────────────────────

  private createNoiseBuffer(): void {
    if (!this.audioCtx) return;
    const sampleRate = this.audioCtx.sampleRate;
    const length = Math.floor(sampleRate * 2);
    this.noiseBuffer = this.audioCtx.createBuffer(1, length, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  // ─── Private: Pulse Wave (NES Duty Cycles) ────

  private createPulseWave(duty: number): PeriodicWave {
    const N = 64; // number of harmonics
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    real[0] = 0;
    imag[0] = 0;
    for (let n = 1; n < N; n++) {
      const angle = 2 * Math.PI * n * duty;
      real[n] = Math.sin(angle) / (n * Math.PI);
      imag[n] = (1 - Math.cos(angle)) / (n * Math.PI);
    }
    return this.audioCtx!.createPeriodicWave(real, imag);
  }

  // ─── Private: Oscillator Management ────────────

  private createOscillators(song: SongData): void {
    if (!this.audioCtx || !this.masterGain) return;

    // Pulse 1 (Lead)
    this.pulse1Osc = this.audioCtx.createOscillator();
    this.pulse1Gain = this.audioCtx.createGain();
    this.pulse1Osc.setPeriodicWave(this.createPulseWave(song.pulse1Duty));
    this.pulse1Osc.frequency.value = 440;
    this.pulse1Gain.gain.value = 0;
    this.pulse1Osc.connect(this.pulse1Gain);
    this.pulse1Gain.connect(this.masterGain);
    this.pulse1Osc.start();

    // Pulse 2 (Harmony)
    this.pulse2Osc = this.audioCtx.createOscillator();
    this.pulse2Gain = this.audioCtx.createGain();
    this.pulse2Osc.setPeriodicWave(this.createPulseWave(song.pulse2Duty));
    this.pulse2Osc.frequency.value = 440;
    this.pulse2Gain.gain.value = 0;
    this.pulse2Osc.connect(this.pulse2Gain);
    this.pulse2Gain.connect(this.masterGain);
    this.pulse2Osc.start();

    // Triangle (Bass)
    this.triOsc = this.audioCtx.createOscillator();
    this.triGain = this.audioCtx.createGain();
    this.triOsc.type = 'triangle';
    this.triOsc.frequency.value = 110;
    this.triGain.gain.value = 0;
    this.triOsc.connect(this.triGain);
    this.triGain.connect(this.masterGain);
    this.triOsc.start();
  }

  private destroyOscillators(): void {
    try { this.pulse1Osc?.stop(); } catch (_) { /* already stopped */ }
    try { this.pulse2Osc?.stop(); } catch (_) { /* already stopped */ }
    try { this.triOsc?.stop(); } catch (_) { /* already stopped */ }

    this.pulse1Osc?.disconnect();
    this.pulse2Osc?.disconnect();
    this.triOsc?.disconnect();
    this.pulse1Gain?.disconnect();
    this.pulse2Gain?.disconnect();
    this.triGain?.disconnect();

    this.pulse1Osc = null;
    this.pulse2Osc = null;
    this.triOsc = null;
    this.pulse1Gain = null;
    this.pulse2Gain = null;
    this.triGain = null;
  }

  // ─── Private: Scheduler ────────────────────────

  private schedule(): void {
    if (!this.isPlaying || !this.audioCtx || !this.currentSong) return;

    const currentTime = this.audioCtx.currentTime;

    while (this.nextStepTime < currentTime + this.LOOKAHEAD) {
      this.scheduleStep(this.currentStep, this.nextStepTime);
      this.advanceStep();
    }
  }

  private advanceStep(): void {
    if (!this.currentSong) return;
    const secondsPerBeat = 60 / this.currentSong.tempo;
    const secondsPerStep = secondsPerBeat / 2; // each step = eighth note
    this.nextStepTime += secondsPerStep;
    this.currentStep++;
    if (this.currentStep >= this.currentSong.pulse1.length) {
      this.currentStep = 0; // loop
    }
  }

  private scheduleStep(step: number, time: number): void {
    const song = this.currentSong!;
    const idx = step % song.pulse1.length;

    // Tonal channels
    if (this.pulse1Osc && this.pulse1Gain) {
      this.scheduleTonalNote(this.pulse1Osc, this.pulse1Gain, song.pulse1[idx], song.pulse1Vol, time);
    }
    if (this.pulse2Osc && this.pulse2Gain) {
      this.scheduleTonalNote(this.pulse2Osc, this.pulse2Gain, song.pulse2[idx], song.pulse2Vol, time);
    }
    if (this.triOsc && this.triGain) {
      this.scheduleTonalNote(this.triOsc, this.triGain, song.triangle[idx], song.triVol, time);
    }

    // Noise channel
    this.scheduleNoise(song.noise[idx], song.noiseVol, time);
  }

  // ─── Private: Note Scheduling ──────────────────

  private scheduleTonalNote(
    osc: OscillatorNode,
    gain: GainNode,
    noteValue: number,
    channelVol: number,
    time: number
  ): void {
    if (noteValue > 0) {
      // ─ New note: retrigger with brief mute for NES-like attack
      gain.gain.cancelScheduledValues(time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(channelVol, time + 0.005);

      osc.frequency.cancelScheduledValues(time);
      osc.frequency.setValueAtTime(noteValue, time);
    } else if (noteValue === 0) {
      // ─ Rest: silence the channel
      gain.gain.cancelScheduledValues(time);
      gain.gain.setValueAtTime(0, time + 0.003);
    }
    // noteValue === S (-1): sustain — do nothing, previous note continues
  }

  // ─── Private: Drum Scheduling ──────────────────

  private scheduleNoise(drumType: number, channelVol: number, time: number): void {
    if (!this.audioCtx || !this.noiseBuffer || !this.masterGain || drumType <= 0) return;

    try {
      const source = this.audioCtx.createBufferSource();
      source.buffer = this.noiseBuffer;

      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      switch (drumType) {
        case K: // Kick — deep low-frequency thump
          filter.type = 'lowpass';
          filter.frequency.value = 180;
          gain.gain.setValueAtTime(channelVol * 2.5, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
          break;

        case SN: // Snare — mid-range crack
          filter.type = 'bandpass';
          filter.frequency.value = 1200;
          filter.Q.value = 0.8;
          gain.gain.setValueAtTime(channelVol * 1.8, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          break;

        case HH: // Closed hi-hat — sharp tick
          filter.type = 'highpass';
          filter.frequency.value = 8000;
          gain.gain.setValueAtTime(channelVol * 0.9, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
          break;

        case OH: // Open hi-hat — longer sizzle
          filter.type = 'highpass';
          filter.frequency.value = 6000;
          gain.gain.setValueAtTime(channelVol * 1.0, time);
          gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
          break;

        default:
          return;
      }

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      // Start from random position in noise buffer for variety
      const offset = Math.random() * 1.5;
      source.start(time, offset);
      source.stop(time + 0.3);
    } catch (_) {
      // Silently handle audio errors
    }
  }
}

