export type CurveType = 'linear' | 'exponential' | 'logarithmic' | 'scurve' | 'stepwise' | 'stochastic' | 'random_wave';

export type SoundType = 'digital' | 'woodblock' | 'synth' | 'beep' | 'bass' | 'tick';

export type ModifierState = 'normal' | 'paused' | 'double' | 'half';

export interface RoundConfig {
  id?: string;
  name?: string;
  roundLengthSeconds: number; // e.g. 60 to 600 seconds
  minBps: number; // 0.5 to 10
  maxBps: number; // 0.5 to 10
  curveType: CurveType;
  steepness?: number; // Curve exponent / slope intensity (0.2 to 3.0, default 1.0)
  timeshift?: number; // Time shift / phase offset (-0.4 to +0.4, default 0.0)
  stepCount?: number; // For stepwise curve, e.g. 5 steps
  
  // Random Speed Variation & Dip Engine
  enableSpeedJitter: boolean; // Enable micro random fluctuations
  jitterIntensity: number; // 0.0 to 1.0
  enableOccasionalDips: boolean; // Speed occasionally drops back down slightly
  dipChancePercent: number; // 0 to 50% chance of a dip during step transitions
  randomSeed?: number; // Seed for deterministic pseudo-random curve plot

  // Randomized Pauses
  enableRandomPauses: boolean;
  pauseChancePercent: number; // 0 - 100% chance per check interval
  pauseMinSeconds: number; // e.g. 1
  pauseMaxSeconds: number; // e.g. 3
  
  // Randomized Speed Multipliers
  enableRandomSpeedMultipliers: boolean;
  multiplierChancePercent: number; // 0 - 100%
  multiplierDurationSeconds: number; // duration of double/half burst
  allowDoubleSpeed: boolean;
  allowHalfSpeed: boolean;

  // Sound & Feedback
  soundType: SoundType;
  soundPitchHz: number; // 200 - 2000
  volume: number; // 0.0 - 1.0
  enableHaptics: boolean;
  enableVisualFlash: boolean;
  accentFirstBeat: boolean;
  beatsPerBar: number; // e.g. 4 for metronome measure marking
}

export interface Preset {
  id: string;
  title: string;
  description: string;
  category: 'beginner' | 'intermediate' | 'advanced' | 'custom';
  config: RoundConfig;
  isCustom?: boolean;
}

export interface SessionRecord {
  id: string;
  timestamp: number;
  presetName: string;
  durationCompletedSeconds: number;
  totalRoundSeconds: number;
  startBps: number;
  maxBpsReached: number;
  totalBeats: number;
  curveType: CurveType;
  completed: boolean;
}

export interface VisualImage {
  id: string;
  url: string;
  name: string;
  addedAt: number;
}

export interface VisualModeConfig {
  images: VisualImage[];
  slideshowIntervalSeconds: number; // Duration per image in slideshow
  advanceOnBeats?: number; // e.g. advance image every N beats
  transitionMode: 'timer' | 'beat' | 'manual';
  fitMode: 'cover' | 'contain';
  hudPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  enableBeatPulse: boolean; // Subtle zoom/scale pulse on beat
  hudMinimized: boolean;
}

export interface BeatTickEvent {
  beatNumber: number;
  currentBps: number;
  effectiveBps: number;
  progressPercent: number;
  modifier: ModifierState;
  timeRemainingSeconds: number;
  barBeat: number;
}
