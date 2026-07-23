import React from 'react';
import { Sliders, Volume2, Zap, ShieldAlert, Activity, Check, HelpCircle } from 'lucide-react';
import { CurveType, RoundConfig, SoundType } from '../types';
import { CurvePreviewChart } from './CurvePreviewChart';
import { audioEngine } from '../lib/audioEngine';

interface SettingsViewProps {
  config: RoundConfig;
  onChangeConfig: (updated: RoundConfig) => void;
  onDone: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onChangeConfig,
  onDone,
}) => {
  const updateField = <K extends keyof RoundConfig>(field: K, value: RoundConfig[K]) => {
    const updated = { ...config, [field]: value };

    // Keep minBps <= maxBps
    if (field === 'minBps' && (value as number) > updated.maxBps) {
      updated.maxBps = value as number;
    }
    if (field === 'maxBps' && (value as number) < updated.minBps) {
      updated.minBps = value as number;
    }

    onChangeConfig(updated);
  };

  const soundOptions: { type: SoundType; label: string; desc: string }[] = [
    { type: 'digital', label: 'Digital Click', desc: 'Classic sharp metronome pulse' },
    { type: 'woodblock', label: 'Woodblock', desc: 'Acoustic resonant wooden tap' },
    { type: 'synth', label: 'Synth Stab', desc: 'Electronic punchy saw synth' },
    { type: 'beep', label: 'Clean Beep', desc: 'Pure sine tone' },
    { type: 'bass', label: 'Bass Pulse', desc: 'Low frequency sub thump' },
    { type: 'tick', label: 'Metallic Tick', desc: 'Crisp high frequency click' },
  ];

  const curveOptions: { type: CurveType; label: string; desc: string }[] = [
    { type: 'stochastic', label: 'Random Steps & Dips', desc: 'Unpredictable step jumps with random hold spaces & speed drops' },
    { type: 'random_wave', label: 'Random Wave', desc: 'Rising wave of tempo with surges, plateaus, and dips' },
    { type: 'linear', label: 'Linear Ramp', desc: 'Constant smooth rate of speed increase' },
    { type: 'exponential', label: 'Exponential', desc: 'Accelerates faster towards end' },
    { type: 'logarithmic', label: 'Logarithmic', desc: 'Fast initial ramp, then tapers' },
    { type: 'scurve', label: 'S-Curve (Sigmoid)', desc: 'Smooth slow start and finish' },
    { type: 'stepwise', label: 'Step-Wise', desc: 'Discrete equal speed step staircase' },
  ];

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto w-full pb-12">
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Beat & Round Settings
          </h2>
          <p className="text-xs text-slate-400">Custom speed curves, modifiers & sound</p>
        </div>

        <button
          onClick={onDone}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20"
        >
          Save & Exit
        </button>
      </div>

      {/* 1. Round Length Section */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Round Duration (Length)
        </label>

        {/* Quick presets pill selector */}
        <div className="grid grid-cols-4 gap-2">
          {[30, 60, 120, 180, 300, 600].map((seconds) => (
            <button
              key={seconds}
              onClick={() => updateField('roundLengthSeconds', seconds)}
              className={`py-2 rounded-xl text-xs font-semibold font-mono border transition-all ${
                config.roundLengthSeconds === seconds
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {seconds < 60 ? `${seconds}s` : `${seconds / 60} min`}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-400">Custom Duration:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={1200}
              value={config.roundLengthSeconds}
              onChange={(e) => updateField('roundLengthSeconds', Math.max(10, parseInt(e.target.value) || 60))}
              className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-cyan-400 text-xs focus:outline-none focus:border-cyan-500"
            />
            <span className="text-slate-400">seconds</span>
          </div>
        </div>
      </div>

      {/* 2. Speed Limits (Min and Max BPS) */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Beat Speed Range (0.5 to 10.0 BPS)
          </label>
          <span className="text-[11px] font-mono text-cyan-400">
            {config.minBps.toFixed(1)} ➔ {config.maxBps.toFixed(1)} BPS
          </span>
        </div>

        {/* Min Speed Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Minimum Beat Speed (Start)</span>
            <span className="font-mono text-slate-200">{config.minBps.toFixed(1)} BPS ({Math.round(config.minBps * 60)} BPM)</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={10.0}
            step={0.1}
            value={config.minBps}
            onChange={(e) => updateField('minBps', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Max Speed Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Maximum Beat Speed (End Peak)</span>
            <span className="font-mono text-cyan-400">{config.maxBps.toFixed(1)} BPS ({Math.round(config.maxBps * 60)} BPM)</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={10.0}
            step={0.1}
            value={config.maxBps}
            onChange={(e) => updateField('maxBps', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>

      {/* 3. Speed Curve Type */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Speed Progression Curve
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {curveOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => updateField('curveType', opt.type)}
              className={`p-3 rounded-xl border text-left transition-all ${
                config.curveType === opt.type
                  ? 'bg-cyan-500/15 border-cyan-500 text-slate-100'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-xs">
                <span>{opt.label}</span>
                {config.curveType === opt.type && (
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>

        {/* If Step-wise or Stochastic selected, show step count slider */}
        {(config.curveType === 'stepwise' || config.curveType === 'stochastic') && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Random Step Segments:</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={4}
                max={16}
                value={config.stepCount || 8}
                onChange={(e) => updateField('stepCount', parseInt(e.target.value))}
                className="w-24 accent-cyan-400"
              />
              <span className="font-mono text-cyan-400 font-bold">{config.stepCount || 8} steps</span>
            </div>
          </div>
        )}

        {/* Fine-Tuning: Steepness & Timeshift Controls */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Curve Steepness & Timeline Phase Shift
            </span>
            <button
              onClick={() => {
                updateField('steepness', 1.0);
                updateField('timeshift', 0.0);
              }}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono"
            >
              Reset Shape
            </button>
          </div>

          {/* Steepness Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Curve Steepness (Slope Intensity)</span>
              <span className="font-mono text-cyan-400 font-bold">
                {(config.steepness ?? 1.0).toFixed(1)}x
                <span className="text-[10px] text-slate-500 font-normal ml-1">
                  ({(config.steepness ?? 1.0) < 0.8 ? 'Gentle' : (config.steepness ?? 1.0) > 1.3 ? 'Steep / Aggressive' : 'Standard'})
                </span>
              </span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3.0}
              step={0.1}
              value={config.steepness ?? 1.0}
              onChange={(e) => updateField('steepness', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Timeshift Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Timeline Shift (Surge Phase)</span>
              <span className="font-mono text-cyan-400 font-bold">
                {(config.timeshift ?? 0) > 0 ? `+${Math.round((config.timeshift ?? 0) * 100)}%` : `${Math.round((config.timeshift ?? 0) * 100)}%`}
                <span className="text-[10px] text-slate-500 font-normal ml-1">
                  {(config.timeshift ?? 0) > 0.05 ? 'Front-Loaded' : (config.timeshift ?? 0) < -0.05 ? 'Back-Loaded' : 'Balanced'}
                </span>
              </span>
            </div>
            <input
              type="range"
              min={-0.4}
              max={0.4}
              step={0.05}
              value={config.timeshift ?? 0.0}
              onChange={(e) => updateField('timeshift', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* Curve Preview */}
        <div className="pt-2">
          <CurvePreviewChart
            minBps={config.minBps}
            maxBps={config.maxBps}
            curveType={config.curveType}
            stepCount={config.stepCount}
            config={config}
            height={90}
            showLabels={false}
          />
        </div>
      </div>

      {/* 3.5. Random Speed Dynamics & Dips Settings */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-amber-500/30 space-y-3 bg-gradient-to-b from-slate-900 to-amber-950/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <label className="text-xs font-bold text-amber-200 uppercase tracking-wider">
              Random Speed Dynamics & Dips
            </label>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
            Unpredictable Beat
          </span>
        </div>

        <p className="text-[11px] text-slate-400">
          Adds random space intervals between speed increases and introduces occasional tempo drops to test adaptability.
        </p>

        <div className="space-y-3 pt-2 text-xs border-t border-slate-800">
          {/* Occasional Speed Dips Toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={config.enableOccasionalDips !== false}
                onChange={(e) => updateField('enableOccasionalDips', e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span className="font-medium">Enable Occasional Speed Dips (Tempo Drops)</span>
            </label>
          </div>

          {config.enableOccasionalDips !== false && (
            <div className="space-y-1 pl-6">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Speed Dip Frequency / Chance</span>
                <span className="font-mono text-amber-400 font-bold">{config.dipChancePercent ?? 25}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={config.dipChancePercent ?? 25}
                onChange={(e) => updateField('dipChancePercent', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          )}

          {/* Speed Jitter Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-200">
              <input
                type="checkbox"
                checked={config.enableSpeedJitter}
                onChange={(e) => updateField('enableSpeedJitter', e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
              />
              <span className="font-medium">Continuous Speed Jitter & Micro-Fluctuations</span>
            </label>
          </div>

          {config.enableSpeedJitter && (
            <div className="space-y-1 pl-6">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Jitter Intensity</span>
                <span className="font-mono text-amber-400 font-bold">
                  {Math.round((config.jitterIntensity ?? 0.3) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.8}
                step={0.05}
                value={config.jitterIntensity ?? 0.3}
                onChange={(e) => updateField('jitterIntensity', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-amber-400"
              />
            </div>
          )}
        </div>
      </div>

      {/* 4. Randomized Modifiers: Pauses */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Randomized Silence Pauses
            </label>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableRandomPauses}
              onChange={(e) => updateField('enableRandomPauses', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {config.enableRandomPauses && (
          <div className="space-y-3 pt-2 text-xs border-t border-slate-800/80">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Pause Probability</span>
                <span className="font-mono text-amber-400">{config.pauseChancePercent}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={config.pauseChancePercent}
                onChange={(e) => updateField('pauseChancePercent', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <div className="flex justify-between items-center text-slate-400 pt-1">
              <span>Pause Duration Range</span>
              <span className="font-mono text-slate-200">
                {config.pauseMinSeconds}s to {config.pauseMaxSeconds}s
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Randomized Speed Bursts (Half / Double Speed) */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Random Speed Multipliers
            </label>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableRandomSpeedMultipliers}
              onChange={(e) => updateField('enableRandomSpeedMultipliers', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
          </label>
        </div>

        {config.enableRandomSpeedMultipliers && (
          <div className="space-y-3 pt-2 text-xs border-t border-slate-800/80">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Burst Probability</span>
                <span className="font-mono text-purple-400">{config.multiplierChancePercent}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={config.multiplierChancePercent}
                onChange={(e) => updateField('multiplierChancePercent', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-purple-400"
              />
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span>Burst Duration</span>
              <span className="font-mono text-slate-200">{config.multiplierDurationSeconds} seconds</span>
            </div>

            <div className="flex items-center justify-around pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.allowDoubleSpeed}
                  onChange={(e) => updateField('allowDoubleSpeed', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-0"
                />
                <span>Allow 2.0x Double Speed</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={config.allowHalfSpeed}
                  onChange={(e) => updateField('allowHalfSpeed', e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-0"
                />
                <span>Allow 0.5x Half Speed</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 6. Sound & Feedback Options */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-4">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Audio Tone & Haptics
        </label>

        {/* Sound Selection Grid */}
        <div className="grid grid-cols-2 gap-2">
          {soundOptions.map((snd) => (
            <button
              key={snd.type}
              onClick={() => {
                updateField('soundType', snd.type);
                audioEngine.testClick(snd.type, config.soundPitchHz, config.volume);
              }}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                config.soundType === snd.type
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="font-bold text-xs">{snd.label}</div>
              <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{snd.desc}</div>
            </button>
          ))}
        </div>

        {/* Pitch Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Base Pitch Frequency</span>
            <span className="font-mono text-cyan-400">{config.soundPitchHz} Hz</span>
          </div>
          <input
            type="range"
            min={200}
            max={1800}
            step={25}
            value={config.soundPitchHz}
            onChange={(e) => updateField('soundPitchHz', parseInt(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Volume Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Master Volume</span>
            <span className="font-mono text-cyan-400">{Math.round(config.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1.0}
            step={0.05}
            value={config.volume}
            onChange={(e) => updateField('volume', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-950 rounded appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
          <label className="flex items-center justify-between cursor-pointer text-slate-300">
            <span>Haptic Feedback (Android Vibrate)</span>
            <input
              type="checkbox"
              checked={config.enableHaptics}
              onChange={(e) => updateField('enableHaptics', e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer text-slate-300">
            <span>Accent Beat 1 of Measure</span>
            <input
              type="checkbox"
              checked={config.accentFirstBeat}
              onChange={(e) => updateField('accentFirstBeat', e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
