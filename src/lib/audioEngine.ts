import { BeatTickEvent, ModifierState, RoundConfig, SoundType } from '../types';
import { calculateBpsAtProgress } from './curveMath';

export interface StateTickEvent {
  beatNumber: number;
  currentBps: number;
  effectiveBps: number;
  progressPercent: number;
  modifier: ModifierState;
  timeRemainingSeconds: number;
  elapsedSeconds: number;
  barBeat: number;
}

export class BeatAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  private config: RoundConfig | null = null;
  private startTime: number = 0; // AudioContext.currentTime when round started
  private pauseTimeOffset: number = 0; // Total duration paused in seconds
  private lastPauseStart: number = 0;

  private nextNoteTime: number = 0; // AudioContext.currentTime of next scheduled beat
  private currentBeatNumber: number = 0;
  private timerId: number | null = null;

  // Randomized modifier tracking
  private activeModifier: ModifierState = 'normal';
  private modifierEndTime: number = 0; // AudioContext.currentTime when current modifier expires
  private nextModifierCheckTime: number = 0;

  // Callbacks
  private onBeatCallback: ((event: BeatTickEvent) => void) | null = null;
  private onStateTickCallback: ((event: StateTickEvent) => void) | null = null;
  private onEndedCallback: (() => void) | null = null;

  constructor() {
    // Lazy AudioContext instantiation
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setOnBeatCallback(cb: ((event: BeatTickEvent) => void) | null) {
    this.onBeatCallback = cb;
  }

  public setOnStateTickCallback(cb: ((event: StateTickEvent) => void) | null) {
    this.onStateTickCallback = cb;
  }

  public setOnEndedCallback(cb: (() => void) | null) {
    this.onEndedCallback = cb;
  }

  public startRound(config: RoundConfig) {
    const ctx = this.initAudioContext();
    this.stop(); // Stop any existing round

    this.config = {
      ...config,
      randomSeed: config.randomSeed || Math.floor(Math.random() * 100000),
    };
    this.isRunning = true;
    this.isPaused = false;
    this.currentBeatNumber = 0;
    this.pauseTimeOffset = 0;
    this.activeModifier = 'normal';
    this.modifierEndTime = 0;

    const now = ctx.currentTime;
    this.startTime = now;
    this.nextNoteTime = now;
    this.nextModifierCheckTime = now + 2; // First modifier check after 2s

    this.scheduleLoop();
  }

  public togglePause(): boolean {
    if (!this.isRunning || !this.audioCtx) return false;

    if (this.isPaused) {
      // Resume
      this.initAudioContext();
      const pausedDuration = this.audioCtx.currentTime - this.lastPauseStart;
      this.pauseTimeOffset += pausedDuration;
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
      this.isPaused = false;
      this.scheduleLoop();
      return false; // Returns new paused status (false)
    } else {
      // Pause
      this.isPaused = true;
      this.lastPauseStart = this.audioCtx.currentTime;
      if (this.timerId !== null) {
        window.clearTimeout(this.timerId);
        this.timerId = null;
      }
      return true; // Returns new paused status (true)
    }
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.activeModifier = 'normal';
  }

  private scheduleLoop() {
    if (!this.isRunning || this.isPaused || !this.audioCtx || !this.config) return;

    const now = this.audioCtx.currentTime;
    const elapsed = Math.max(0, now - this.startTime - this.pauseTimeOffset);
    const roundLength = this.config.roundLengthSeconds;

    // Check if round finished
    if (elapsed >= roundLength) {
      this.stop();
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
      return;
    }

    // Schedule due beats in lookahead window (100ms)
    const lookAheadTime = 0.1;
    while (this.nextNoteTime < now + lookAheadTime) {
      this.scheduleBeat(this.nextNoteTime);
    }

    // Update randomized modifiers (Pauses / Double Speed / Half Speed)
    this.updateRandomModifiers(now, elapsed);

    // Calculate current progress & BPS for smooth UI ticker
    const progress = Math.min(1.0, elapsed / roundLength);
    const baseBps = calculateBpsAtProgress(
      progress,
      this.config.minBps,
      this.config.maxBps,
      this.config.curveType,
      this.config.stepCount || 5,
      this.config
    );

    let effectiveBps = baseBps;
    if (this.activeModifier === 'double') {
      effectiveBps = Math.min(15.0, baseBps * 2.0);
    } else if (this.activeModifier === 'half') {
      effectiveBps = Math.max(0.25, baseBps * 0.5);
    }

    // Emit UI state tick (30ms interval for smooth timer countdown and progress bar)
    if (this.onStateTickCallback) {
      this.onStateTickCallback({
        beatNumber: this.currentBeatNumber,
        currentBps: baseBps,
        effectiveBps,
        progressPercent: progress * 100,
        modifier: this.activeModifier,
        timeRemainingSeconds: Math.max(0, Math.ceil(roundLength - elapsed)),
        elapsedSeconds: Math.floor(elapsed),
        barBeat: (Math.max(0, this.currentBeatNumber - 1) % (this.config.beatsPerBar || 4)) + 1,
      });
    }

    this.timerId = window.setTimeout(() => this.scheduleLoop(), 30);
  }

  private scheduleBeat(time: number) {
    if (!this.config || !this.audioCtx) return;

    const elapsed = Math.max(0, time - this.startTime - this.pauseTimeOffset);
    const roundLength = this.config.roundLengthSeconds;
    if (elapsed >= roundLength) return;

    const progress = Math.min(1.0, elapsed / roundLength);
    const baseBps = calculateBpsAtProgress(
      progress,
      this.config.minBps,
      this.config.maxBps,
      this.config.curveType,
      this.config.stepCount || 5,
      this.config
    );

    let effectiveBps = baseBps;
    if (this.activeModifier === 'double') {
      effectiveBps = Math.min(15.0, baseBps * 2.0);
    } else if (this.activeModifier === 'half') {
      effectiveBps = Math.max(0.25, baseBps * 0.5);
    }

    // Play synthesized click unless paused modifier is active
    if (this.activeModifier !== 'paused') {
      const barBeat = (this.currentBeatNumber % (this.config.beatsPerBar || 4)) + 1;
      const isAccent = this.config.accentFirstBeat && barBeat === 1;
      this.playSynthClick(time, this.config.soundType, this.config.soundPitchHz, isAccent, this.config.volume);

      // Trigger haptic vibration on user's device if enabled
      if (this.config.enableHaptics && 'vibrate' in navigator) {
        try {
          navigator.vibrate(isAccent ? 25 : 12);
        } catch {
          // Ignore vibration permissions error
        }
      }
    }

    // Notify UI beat listener for pulse visualizer
    if (this.onBeatCallback) {
      const delayMs = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
      setTimeout(() => {
        if (this.isRunning && this.onBeatCallback) {
          this.onBeatCallback({
            beatNumber: this.currentBeatNumber,
            currentBps: baseBps,
            effectiveBps,
            progressPercent: progress * 100,
            modifier: this.activeModifier,
            timeRemainingSeconds: Math.max(0, Math.ceil(roundLength - elapsed)),
            barBeat: (this.currentBeatNumber % (this.config.beatsPerBar || 4)) + 1,
          });
        }
      }, delayMs);
    }

    // Advance next note time according to effective BPS
    const secondsPerBeat = 1.0 / Math.max(0.25, effectiveBps);
    this.nextNoteTime += secondsPerBeat;
    this.currentBeatNumber++;
  }

  private updateRandomModifiers(time: number, elapsed: number) {
    if (!this.config) return;

    // Check if current modifier expired
    if (this.activeModifier !== 'normal' && time >= this.modifierEndTime) {
      this.activeModifier = 'normal';
      this.nextModifierCheckTime = time + 2; // Cool-off 2 seconds before next check
    }

    // Check if we should trigger a new random modifier
    if (this.activeModifier === 'normal' && time >= this.nextModifierCheckTime && elapsed > 5) {
      const roll = Math.random() * 100;

      // 1. Check for Pause
      if (this.config.enableRandomPauses && roll < this.config.pauseChancePercent) {
        this.activeModifier = 'paused';
        const duration =
          this.config.pauseMinSeconds +
          Math.random() * (this.config.pauseMaxSeconds - this.config.pauseMinSeconds);
        this.modifierEndTime = time + duration;
        return;
      }

      // 2. Check for Speed Multipliers (Double / Half)
      if (this.config.enableRandomSpeedMultipliers && roll < (this.config.pauseChancePercent + this.config.multiplierChancePercent)) {
        const options: ('double' | 'half')[] = [];
        if (this.config.allowDoubleSpeed) options.push('double');
        if (this.config.allowHalfSpeed) options.push('half');

        if (options.length > 0) {
          const chosen = options[Math.floor(Math.random() * options.length)];
          this.activeModifier = chosen;
          this.modifierEndTime = time + (this.config.multiplierDurationSeconds || 3.0);
          return;
        }
      }

      // Recheck in 2.5 seconds if no modifier triggered
      this.nextModifierCheckTime = time + 2.5;
    }
  }

  private playSynthClick(
    time: number,
    soundType: SoundType,
    basePitch: number,
    isAccent: boolean,
    masterVolume: number
  ) {
    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const pitchMultiplier = isAccent ? 1.4 : 1.0;
    const pitch = basePitch * pitchMultiplier;
    const vol = Math.min(1.0, Math.max(0.01, masterVolume)) * (isAccent ? 1.2 : 0.9);

    switch (soundType) {
      case 'digital':
        osc.type = 'square';
        osc.frequency.setValueAtTime(pitch, time);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
        osc.start(time);
        osc.stop(time + 0.035);
        break;

      case 'woodblock': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch * 1.5, time);
        osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, time + 0.04);
        gain.gain.setValueAtTime(vol * 1.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        osc.start(time);
        osc.stop(time + 0.055);
        break;
      }

      case 'synth': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(pitch * 0.8, time);
        osc.frequency.linearRampToValueAtTime(pitch * 1.8, time + 0.02);
        gain.gain.setValueAtTime(vol * 0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
        osc.start(time);
        osc.stop(time + 0.065);
        break;
      }

      case 'beep':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, time);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        osc.start(time);
        osc.stop(time + 0.055);
        break;

      case 'bass': {
        osc.type = 'sine';
        const bassPitch = isAccent ? 120 : 80;
        osc.frequency.setValueAtTime(bassPitch, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.08);
        gain.gain.setValueAtTime(vol * 1.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
        osc.start(time);
        osc.stop(time + 0.095);
        break;
      }

      case 'tick': {
        // High frequency crisp tick
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch * 2.5, time);
        gain.gain.setValueAtTime(vol * 0.9, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
        osc.start(time);
        osc.stop(time + 0.02);
        break;
      }
    }
  }

  /**
   * One-off manual audio sample playback for testing settings/volume
   */
  public testClick(soundType: SoundType, pitch: number, volume: number) {
    const ctx = this.initAudioContext();
    const now = ctx.currentTime;
    this.playSynthClick(now, soundType, pitch, true, volume);
  }
}

export const audioEngine = new BeatAudioEngine();
