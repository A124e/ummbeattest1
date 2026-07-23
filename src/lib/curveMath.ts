import { CurveType, RoundConfig } from '../types';

/**
 * Deterministic pseudo-random helper function based on input value and seed
 */
function hashRandom(x: number, seed: number = 42): number {
  const sinVal = Math.sin(x * 12.9898 + seed * 78.233);
  return sinVal - Math.floor(sinVal);
}

/**
 * Calculates the base Beats Per Second (BPS) at progress t (0.0 to 1.0)
 */
export function calculateBpsAtProgress(
  t: number,
  minBps: number,
  maxBps: number,
  curveType: CurveType,
  stepCount: number = 5,
  config?: Partial<RoundConfig>,
  includeJitter: boolean = true
): number {
  const clampT = Math.max(0, Math.min(1, t));
  const delta = maxBps - minBps;
  const seed = config?.randomSeed || 12345;

  // Progression steepness & timeshift parameters
  const steepness = config?.steepness ?? 1.0;
  const timeshift = config?.timeshift ?? 0.0;

  // Time-warping factor for horizontal phase shift / timeline acceleration offset
  const clampedShift = Math.max(-0.45, Math.min(0.45, timeshift));
  const tShifted = Math.pow(clampT, Math.exp(-clampedShift * 2.2));

  let factor = 0;

  switch (curveType) {
    case 'linear':
      // Straight linear when steepness=1, bends into power curve when steepness!=1
      factor = Math.pow(tShifted, steepness);
      break;

    case 'exponential':
      // Accelerates gradually at first, rapidly towards end (scaled by steepness)
      factor = Math.pow(tShifted, 2.2 * steepness);
      break;

    case 'logarithmic':
      // Ramps up quickly early, then tapers off near max
      factor = Math.pow(tShifted, 0.45 / Math.max(0.1, steepness));
      break;

    case 'scurve': {
      // Smooth sigmoid curve with steepness (slope k) & timeshift (inflection center shift)
      const k = 10 * Math.max(0.1, steepness);
      const midPoint = 0.5 - clampedShift * 0.4;
      const rawSigmoid = (x: number) => 1 / (1 + Math.exp(-k * (x - midPoint)));
      const minS = rawSigmoid(0);
      const maxS = rawSigmoid(1);
      factor = (rawSigmoid(clampT) - minS) / Math.max(0.0001, maxS - minS);
      break;
    }

    case 'stepwise': {
      const steps = Math.max(2, stepCount);
      const stepIndex = Math.min(Math.floor(tShifted * steps), steps - 1);
      const baseFactor = stepIndex / (steps - 1);
      factor = Math.pow(baseFactor, steepness);
      break;
    }

    case 'stochastic': {
      // Random steps with variable hold spaces and occasional speed drops/dips
      const numSteps = Math.max(6, stepCount || 10);
      let currentSeg = 0;
      let cumulativeTime = 0;

      for (let i = 0; i < numSteps; i++) {
        const stepWidth = (0.6 + hashRandom(i * 3.1, seed) * 0.8) / numSteps;
        if (tShifted >= cumulativeTime && tShifted <= cumulativeTime + stepWidth) {
          currentSeg = i;
          break;
        }
        cumulativeTime += stepWidth;
        if (i === numSteps - 1) currentSeg = numSteps - 1;
      }

      if (currentSeg === 0) {
        factor = 0;
      } else if (currentSeg === numSteps - 1) {
        factor = 1.0;
      } else {
        const trend = Math.pow(currentSeg / (numSteps - 1), steepness);
        const randChoice = hashRandom(currentSeg * 7.7, seed);
        
        const allowDips = config?.enableOccasionalDips !== false;
        const dipThreshold = (config?.dipChancePercent ?? 25) / 100;

        if (allowDips && randChoice < dipThreshold) {
          const prevTrend = Math.max(0, Math.pow((currentSeg - 1) / (numSteps - 1), steepness));
          factor = Math.max(0, prevTrend - 0.15 * hashRandom(currentSeg * 11.3, seed));
        } else if (randChoice < dipThreshold + 0.2) {
          const prevTrend = Math.max(0, Math.pow((currentSeg - 1) / (numSteps - 1), steepness));
          factor = prevTrend;
        } else {
          const stepJump = 0.05 + hashRandom(currentSeg * 13.9, seed) * 0.25;
          factor = Math.min(1.0, trend + stepJump);
        }
      }
      break;
    }

    case 'random_wave': {
      // Rising sine wave with irregular fluctuations, surges, and dips
      const trend = Math.pow(tShifted, 1.2 * steepness);
      const wave1 = Math.sin((tShifted + clampedShift) * Math.PI * 6 + seed) * 0.15;
      const wave2 = Math.cos((tShifted + clampedShift) * Math.PI * 14 + seed * 2) * 0.08;
      
      let dipEffect = 0;
      if (config?.enableOccasionalDips !== false) {
        const dipRegion = hashRandom(Math.floor(tShifted * 8), seed);
        if (dipRegion < 0.3) {
          dipEffect = -0.18 * Math.sin(tShifted * Math.PI * 8);
        }
      }

      factor = Math.max(0, Math.min(1.0, trend + wave1 + wave2 + dipEffect));
      break;
    }

    case 'pyramid': {
      // Pyramid / Bell Curve: Peaks at midpoint, then decreases back down
      // Shift apex with timeshift parameter
      const apex = Math.max(0.2, Math.min(0.8, 0.5 + clampedShift));
      if (clampT <= apex) {
        const progressToApex = clampT / apex;
        factor = Math.pow(progressToApex, steepness);
      } else {
        const progressFromApex = (clampT - apex) / (1 - apex);
        factor = Math.pow(1 - progressFromApex, steepness);
      }
      break;
    }

    case 'interval_pulses': {
      // High / Low tempo HIIT pulses superimposed on a rising baseline trend
      const pulses = Math.max(3, stepCount || 6);
      const trend = Math.pow(tShifted, 0.9 * steepness);
      // Sine wave pulse between 0 and 1
      const pulseWave = (Math.sin(tShifted * Math.PI * 2 * pulses - Math.PI / 2) + 1) / 2;
      const amplitude = 0.35 * Math.min(1.5, steepness);
      factor = Math.max(0, Math.min(1.0, trend * (1 - amplitude) + pulseWave * amplitude));
      break;
    }

    case 'sawtooth': {
      // Repeating ramp cascades that drop back slightly before reaching higher peaks
      const cycles = Math.max(3, stepCount || 5);
      const cyclePos = (tShifted * cycles) % 1;
      const currentCycleIndex = Math.floor(tShifted * cycles);
      
      // Each cycle starts at a baseline and ramps up
      const cycleStartFactor = Math.pow(currentCycleIndex / cycles, steepness);
      const cycleEndFactor = Math.pow((currentCycleIndex + 1) / cycles, steepness);
      
      const rampWithinCycle = Math.pow(cyclePos, steepness);
      factor = cycleStartFactor + (cycleEndFactor - cycleStartFactor) * rampWithinCycle;
      break;
    }

    case 'burst_plateau': {
      // Staircase with smooth sigmoid bursts between flat plateaus
      const numSteps = Math.max(3, stepCount || 5);
      const scaledT = tShifted * numSteps;
      const currentStep = Math.floor(scaledT);
      const fraction = scaledT - currentStep;

      // Sigmoid transition in the first 25% of each step segment, 75% plateau
      let transitionFactor = 0;
      if (fraction < 0.3) {
        const normFrac = fraction / 0.3;
        transitionFactor = (1 - Math.cos(normFrac * Math.PI)) / 2;
      } else {
        transitionFactor = 1.0;
      }

      const stepBase = Math.pow(currentStep / numSteps, steepness);
      const stepNext = Math.pow(Math.min(numSteps, currentStep + 1) / numSteps, steepness);
      factor = stepBase + (stepNext - stepBase) * transitionFactor;
      break;
    }

    case 'parabolic': {
      // Quadratic parabolic acceleration - rapid late-stage burst
      factor = Math.pow(tShifted, 3.0 * steepness);
      break;
    }

    default:
      factor = Math.pow(tShifted, steepness);
  }

  // Calculate raw BPS
  let rawBps = minBps + delta * factor;

  // Apply optional micro-jitter only during live playback if enabled
  if (includeJitter && config?.enableSpeedJitter) {
    const intensity = config.jitterIntensity ?? 0.3;
    const jitter = (hashRandom(clampT * 100, seed) - 0.5) * intensity * 0.3 * delta;
    rawBps += jitter;
  }

  return Math.max(0.5, Math.min(15.0, Math.round(rawBps * 100) / 100));
}

/**
 * Converts BPS (Beats Per Second) to BPM (Beats Per Minute)
 */
export function bpsToBpm(bps: number): number {
  return Math.round(bps * 60);
}

/**
 * Generates point array for SVG charts [x, y] where x is 0..100 (progress %), y is 0..100 (speed %)
 */
export function generateCurvePlotPoints(
  minBps: number,
  maxBps: number,
  curveType: CurveType,
  stepCount: number = 5,
  pointCount: number = 100,
  config?: Partial<RoundConfig>
): { x: number; y: number; bps: number; isDip?: boolean }[] {
  const points: { x: number; y: number; bps: number; isDip?: boolean }[] = [];
  const bpsRange = Math.max(0.1, maxBps - minBps);

  let prevBps = minBps;

  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount;
    // Calculate macro curve BPS without high-frequency jitter for smooth SVG plot
    const bps = calculateBpsAtProgress(t, minBps, maxBps, curveType, stepCount, config, false);
    const progressPercent = t * 100;
    
    // Check if this point represents a true speed drop (dip) on the macro curve
    const isDip = i > 0 && bps < prevBps - 0.12;
    prevBps = bps;

    // Y percentage normalized from minBps (bottom 0%) to maxBps (top 100%)
    const bpsPercent = Math.max(0, Math.min(100, ((bps - minBps) / bpsRange) * 100));

    points.push({
      x: progressPercent,
      y: bpsPercent,
      bps,
      isDip,
    });
  }

  return points;
}
