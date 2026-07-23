import { Preset, RoundConfig } from '../types';

export const DEFAULT_CONFIG: RoundConfig = {
  roundLengthSeconds: 120, // 2 mins
  minBps: 1.0, // 60 BPM
  maxBps: 5.0, // 300 BPM
  curveType: 'stochastic',
  steepness: 1.0,
  timeshift: 0.0,
  stepCount: 8,
  
  // Random Speed Variations & Dips
  enableSpeedJitter: true,
  jitterIntensity: 0.3,
  enableOccasionalDips: true,
  dipChancePercent: 25,
  
  enableRandomPauses: false,
  pauseChancePercent: 15,
  pauseMinSeconds: 1.5,
  pauseMaxSeconds: 3.0,
  
  enableRandomSpeedMultipliers: false,
  multiplierChancePercent: 20,
  multiplierDurationSeconds: 3.0,
  allowDoubleSpeed: true,
  allowHalfSpeed: true,

  soundType: 'digital',
  soundPitchHz: 800,
  volume: 0.8,
  enableHaptics: true,
  enableVisualFlash: true,
  accentFirstBeat: true,
  beatsPerBar: 4,
};

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'preset-stochastic-ramp',
    title: 'Stochastic Step & Dip',
    description: 'Increases in speed are unpredictable with random hold spaces in-between steps and occasional speed drops.',
    category: 'intermediate',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 150,
      minBps: 1.0,
      maxBps: 5.5,
      curveType: 'stochastic',
      stepCount: 9,
      enableSpeedJitter: true,
      enableOccasionalDips: true,
      dipChancePercent: 30,
    },
  },
  {
    id: 'preset-random-wave-surge',
    title: 'Random Wave & Surge',
    description: 'Rising wave of tempo featuring unpredictable speed surges, plateaus, and sudden speed dips.',
    category: 'intermediate',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 180,
      minBps: 1.0,
      maxBps: 6.0,
      curveType: 'random_wave',
      enableSpeedJitter: true,
      jitterIntensity: 0.4,
      enableOccasionalDips: true,
      dipChancePercent: 35,
    },
  },
  {
    id: 'preset-beginner-warmup',
    title: 'Beginner Smooth Warmup',
    description: 'Gradual linear increase from 0.5 BPS (30 BPM) to 2.5 BPS (150 BPM) over 2 minutes.',
    category: 'beginner',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 120,
      minBps: 0.5,
      maxBps: 2.5,
      curveType: 'linear',
      enableSpeedJitter: false,
      enableOccasionalDips: false,
      enableRandomPauses: false,
      enableRandomSpeedMultipliers: false,
    },
  },
  {
    id: 'preset-reaction-randomizer',
    title: 'Chaos Reaction Test',
    description: 'Stochastic speed ramp combined with random pauses & double-speed bursts to test reflexes.',
    category: 'advanced',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 120,
      minBps: 2.0,
      maxBps: 6.5,
      curveType: 'stochastic',
      enableSpeedJitter: true,
      enableOccasionalDips: true,
      dipChancePercent: 35,
      enableRandomPauses: true,
      pauseChancePercent: 25,
      pauseMinSeconds: 1.5,
      pauseMaxSeconds: 3.0,
      enableRandomSpeedMultipliers: true,
      multiplierChancePercent: 30,
      multiplierDurationSeconds: 3.0,
      allowDoubleSpeed: true,
      allowHalfSpeed: true,
    },
  },
  {
    id: 'preset-speed-accelerator',
    title: 'Exponential Accelerator',
    description: 'Slow build-up that suddenly ramps up fast near the end (1.0 to 7.0 BPS).',
    category: 'intermediate',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 180,
      minBps: 1.0,
      maxBps: 7.0,
      curveType: 'exponential',
      enableSpeedJitter: false,
      enableOccasionalDips: false,
      enableRandomPauses: false,
      enableRandomSpeedMultipliers: false,
    },
  },
  {
    id: 'preset-pyramid-peak',
    title: 'Pyramid Peak Sprint',
    description: 'Ramps up to peak tempo at mid-round (6.0 BPS), then steadily ramps back down to test recovery pacing.',
    category: 'intermediate',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 180,
      minBps: 1.0,
      maxBps: 6.0,
      curveType: 'pyramid',
      enableSpeedJitter: true,
      jitterIntensity: 0.2,
      enableOccasionalDips: false,
    },
  },
  {
    id: 'preset-hiit-pulses',
    title: 'HIIT Pulse Intervals',
    description: 'Alternating high-tempo sprint bursts and recovery valleys over a rising baseline (1.5 to 7.0 BPS).',
    category: 'advanced',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 240,
      minBps: 1.5,
      maxBps: 7.0,
      curveType: 'interval_pulses',
      stepCount: 6,
      enableSpeedJitter: true,
      jitterIntensity: 0.3,
      enableOccasionalDips: false,
    },
  },
  {
    id: 'preset-sawtooth-cascades',
    title: 'Cascading Sawtooth Ramps',
    description: 'Repeated mini-ramp waves that drop back slightly before surging to higher peak speeds each cycle.',
    category: 'intermediate',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 180,
      minBps: 1.0,
      maxBps: 6.5,
      curveType: 'sawtooth',
      stepCount: 5,
      enableSpeedJitter: true,
      jitterIntensity: 0.25,
      enableOccasionalDips: false,
    },
  },
  {
    id: 'preset-burst-plateau',
    title: 'Staircase Stamina Hold',
    description: 'Rapid step increases followed by steady flat plateaus to lock in muscle memory before the next jump.',
    category: 'beginner',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 150,
      minBps: 1.0,
      maxBps: 4.5,
      curveType: 'burst_plateau',
      stepCount: 5,
      enableSpeedJitter: false,
      enableOccasionalDips: false,
      enableRandomPauses: false,
      enableRandomSpeedMultipliers: false,
    },
  },
  {
    id: 'preset-parabolic-overdrive',
    title: 'Parabolic Reflex Overdrive (10 BPS)',
    description: 'Gradual build that turns into an explosive high-speed sprint reaching 10.0 BPS (600 BPM).',
    category: 'advanced',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 120,
      minBps: 2.0,
      maxBps: 10.0,
      curveType: 'parabolic',
      enableSpeedJitter: true,
      jitterIntensity: 0.4,
      enableOccasionalDips: true,
      dipChancePercent: 30,
      enableRandomPauses: false,
      enableRandomSpeedMultipliers: true,
      multiplierChancePercent: 20,
      multiplierDurationSeconds: 2.0,
      allowDoubleSpeed: true,
      allowHalfSpeed: false,
    },
  },
  {
    id: 'preset-sigmoid-endurance',
    title: 'S-Curve Sprint',
    description: 'Smooth S-Curve ramp going all the way up to 10.0 BPS (600 BPM) peak.',
    category: 'advanced',
    config: {
      ...DEFAULT_CONFIG,
      roundLengthSeconds: 240,
      minBps: 1.5,
      maxBps: 10.0,
      curveType: 'scurve',
      enableSpeedJitter: false,
      enableOccasionalDips: false,
      enableRandomPauses: false,
      enableRandomSpeedMultipliers: false,
    },
  },
];

const LOCAL_STORAGE_PRESETS_KEY = 'test1_beat_app_custom_presets';

export function loadCustomPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PRESETS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed loading custom presets', err);
    return [];
  }
}

export function saveCustomPreset(preset: Preset): Preset[] {
  const existing = loadCustomPresets();
  const updated = [preset, ...existing.filter((p) => p.id !== preset.id)];
  try {
    localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed saving preset', err);
  }
  return updated;
}

export function deleteCustomPreset(id: string): Preset[] {
  const existing = loadCustomPresets();
  const updated = existing.filter((p) => p.id !== id);
  try {
    localStorage.setItem(LOCAL_STORAGE_PRESETS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed deleting preset', err);
  }
  return updated;
}
