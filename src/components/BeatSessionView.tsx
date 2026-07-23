import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Flame, Volume2, ShieldAlert, Sparkles, Image as ImageIcon, Sliders } from 'lucide-react';
import { BeatTickEvent, RoundConfig, SessionRecord } from '../types';
import { audioEngine, StateTickEvent } from '../lib/audioEngine';
import { bpsToBpm } from '../lib/curveMath';
import { CurvePreviewChart } from './CurvePreviewChart';
import confetti from 'canvas-confetti';

interface BeatSessionViewProps {
  config: RoundConfig;
  onOpenSettings: () => void;
  onOpenVisualMode?: () => void;
  onSaveSessionLog: (log: SessionRecord) => void;
}

export const BeatSessionView: React.FC<BeatSessionViewProps> = ({
  config,
  onOpenSettings,
  onOpenVisualMode,
  onSaveSessionLog,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [beatEvent, setBeatEvent] = useState<BeatTickEvent | null>(null);
  const [stateTick, setStateTick] = useState<StateTickEvent | null>(null);
  const [activeRoundConfig, setActiveRoundConfig] = useState<RoundConfig | null>(null);

  // Visual pulse animation state
  const [isPulsing, setIsPulsing] = useState(false);
  const [peakBpsReached, setPeakBpsReached] = useState(0);

  // Round completion summary state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedStats, setCompletedStats] = useState<SessionRecord | null>(null);

  // Stable references for audio callbacks
  const configRef = useRef(config);
  const onSaveSessionLogRef = useRef(onSaveSessionLog);
  const peakBpsRef = useRef(0);
  const beatEventRef = useRef<BeatTickEvent | null>(null);

  useEffect(() => {
    configRef.current = config;
    onSaveSessionLogRef.current = onSaveSessionLog;
  }, [config, onSaveSessionLog]);

  useEffect(() => {
    // Register audio engine callbacks ONCE
    audioEngine.setOnBeatCallback((event) => {
      setBeatEvent(event);
      beatEventRef.current = event;
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 80);

      setPeakBpsReached((prev) => {
        const next = Math.max(prev, event.effectiveBps);
        peakBpsRef.current = next;
        return next;
      });
    });

    audioEngine.setOnStateTickCallback((event) => {
      setStateTick(event);
      setPeakBpsReached((prev) => {
        const next = Math.max(prev, event.effectiveBps);
        peakBpsRef.current = next;
        return next;
      });
    });

    audioEngine.setOnEndedCallback(() => {
      setIsRunning(false);
      setIsPaused(false);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      const currentCfg = configRef.current;
      const stats: SessionRecord = {
        id: 'session-' + Date.now(),
        timestamp: Date.now(),
        presetName: currentCfg.name || 'Custom Speed Curve',
        durationCompletedSeconds: currentCfg.roundLengthSeconds,
        totalRoundSeconds: currentCfg.roundLengthSeconds,
        startBps: currentCfg.minBps,
        maxBpsReached: peakBpsRef.current || currentCfg.maxBps,
        totalBeats: beatEventRef.current?.beatNumber || 0,
        curveType: currentCfg.curveType,
        completed: true,
      };

      setCompletedStats(stats);
      setShowCompletionModal(true);
      onSaveSessionLogRef.current(stats);
    });

    return () => {
      audioEngine.setOnBeatCallback(null);
      audioEngine.setOnStateTickCallback(null);
      audioEngine.setOnEndedCallback(null);
      audioEngine.stop();
    };
  }, []);

  const handleStart = () => {
    const seed = config.randomSeed || Math.floor(Math.random() * 100000);
    const roundConfig: RoundConfig = { ...config, randomSeed: seed };
    setActiveRoundConfig(roundConfig);
    setPeakBpsReached(roundConfig.minBps);
    peakBpsRef.current = roundConfig.minBps;
    setIsRunning(true);
    setIsPaused(false);
    audioEngine.startRound(roundConfig);
  };

  const handleTogglePause = () => {
    const pausedState = audioEngine.togglePause();
    setIsPaused(pausedState);
  };

  const handleStopReset = () => {
    audioEngine.stop();
    setIsRunning(false);
    setIsPaused(false);
    setBeatEvent(null);
    setStateTick(null);
  };

  const handleMarkFailure = () => {
    if (!isRunning) return;
    audioEngine.stop();
    setIsRunning(false);
    setIsPaused(false);

    const currentCfg = activeRoundConfig || config;
    const elapsed = stateTick?.elapsedSeconds || 0;
    const failBps = currentBps;
    const beats = beatEventRef.current?.beatNumber || stateTick?.beatNumber || 0;

    const stats: SessionRecord = {
      id: 'session-' + Date.now(),
      timestamp: Date.now(),
      presetName: currentCfg.name || 'Custom Speed Curve',
      durationCompletedSeconds: elapsed,
      totalRoundSeconds: currentCfg.roundLengthSeconds,
      startBps: currentCfg.minBps,
      maxBpsReached: Math.max(peakBpsRef.current, failBps),
      totalBeats: beats,
      curveType: currentCfg.curveType,
      completed: false, // Explicitly marked as failed / tapped out
    };

    setCompletedStats(stats);
    setShowCompletionModal(true);
    onSaveSessionLog(stats);
  };

  // Format seconds to mm:ss
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentBps = stateTick?.effectiveBps ?? beatEvent?.effectiveBps ?? config.minBps;
  const currentBpm = bpsToBpm(currentBps);
  const progressPercent = stateTick?.progressPercent ?? beatEvent?.progressPercent ?? 0;
  const activeModifier = stateTick?.modifier ?? beatEvent?.modifier ?? 'normal';
  const timeRemaining = stateTick?.timeRemainingSeconds ?? beatEvent?.timeRemainingSeconds ?? config.roundLengthSeconds;
  const currentBarBeat = stateTick?.barBeat ?? beatEvent?.barBeat ?? 1;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 space-y-4 max-w-lg mx-auto w-full">
      {/* Header Info Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-800/90 shadow-md gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shrink-0">
            <Zap className="w-4 h-4 fill-cyan-400/20" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-100 truncate">
                {config.name || 'Beat Ramp Training'}
              </span>
              <span className="text-[10px] leading-none px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 font-mono shrink-0">
                {Math.floor(config.roundLengthSeconds / 60)}m ({config.roundLengthSeconds}s)
              </span>
            </div>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
              Active Round Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenVisualMode && (
            <button
              onClick={onOpenVisualMode}
              className="h-8 px-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Full Screen Visual Image Mode"
            >
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Visual</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Configure</span>
          </button>
        </div>
      </div>

      {/* Main Beat Speed & Pulse Visualizer */}
      <div className="relative flex flex-col items-center justify-center my-2">
        {/* Pulsing Backlight Effect */}
        <div
          className={`absolute w-56 h-56 rounded-full blur-3xl transition-all duration-100 ${
            isPulsing && isRunning && activeModifier !== 'paused'
              ? 'bg-cyan-500/35 scale-110'
              : 'bg-cyan-600/10 scale-90'
          }`}
        ></div>

        {/* Pulse Circle Button Frame */}
        <div
          className={`relative w-52 h-52 rounded-full flex flex-col items-center justify-center p-4 border-4 transition-all duration-75 shadow-xl select-none ${
            isPulsing && isRunning && activeModifier !== 'paused'
              ? 'border-cyan-400 bg-slate-900 scale-[1.03] shadow-cyan-500/40'
              : activeModifier === 'paused'
              ? 'border-amber-500/80 bg-amber-950/20 shadow-amber-500/20'
              : 'border-slate-800 bg-slate-900/90 shadow-slate-950'
          }`}
        >
          {/* Active Modifier Badge overlay */}
          {activeModifier === 'paused' && (
            <div className="absolute top-3 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500 text-amber-300 text-[10px] font-bold flex items-center gap-1 animate-pulse">
              <ShieldAlert className="w-3 h-3" />
              <span>RANDOM PAUSE</span>
            </div>
          )}

          {activeModifier === 'double' && (
            <div className="absolute top-3 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500 text-purple-300 text-[10px] font-bold flex items-center gap-1 animate-bounce">
              <Zap className="w-3 h-3" />
              <span>2.0x DOUBLE SPEED</span>
            </div>
          )}

          {activeModifier === 'half' && (
            <div className="absolute top-3 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500 text-blue-300 text-[10px] font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>0.5x HALF SPEED</span>
            </div>
          )}

          {activeModifier === 'normal' && (config.curveType === 'stochastic' || config.curveType === 'random_wave') && (
            <div className="absolute top-3 px-2 py-0.5 rounded-full bg-slate-800/90 border border-amber-500/40 text-amber-300 text-[9px] font-semibold tracking-wider flex items-center gap-1 uppercase">
              <Flame className="w-2.5 h-2.5 text-amber-400" />
              <span>{config.curveType === 'stochastic' ? 'Random Steps & Dips' : 'Random Wave'}</span>
            </div>
          )}

          {/* Speed Counter BPS */}
          <div className="text-center mt-2">
            <div className="text-5xl font-black tracking-tight text-white font-mono leading-none">
              {currentBps.toFixed(1)}
            </div>
            <div className="text-xs font-bold tracking-widest text-cyan-400 uppercase mt-1">
              Beats / Sec
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              ({currentBpm} BPM)
            </div>
          </div>

          {/* Bar & Beat Indicator Dots */}
          {isRunning && (
            <div className="flex items-center gap-1.5 mt-3">
              {Array.from({ length: config.beatsPerBar || 4 }).map((_, idx) => {
                const isActive = (beatEvent?.barBeat ?? currentBarBeat) === idx + 1;
                return (
                  <span
                    key={idx}
                    className={`h-2 rounded-full transition-all ${
                      isActive
                        ? 'w-4 bg-cyan-400 shadow-sm shadow-cyan-400'
                        : 'w-2 bg-slate-700'
                    }`}
                  ></span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Round Timer & Progress Bar */}
      <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Time Remaining
          </span>
          <span className="font-mono text-cyan-400 text-sm">
            {formatTime(timeRemaining)}
          </span>
        </div>

        {/* Progress bar line */}
        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-200 rounded-full"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
          <span>Start: {config.minBps} BPS</span>
          <span>{Math.round(progressPercent)}% Complete</span>
          <span>Max: {config.maxBps} BPS</span>
        </div>
      </div>

      {/* Speed Curve Live Chart */}
      {(() => {
        const activeCfg = isRunning && activeRoundConfig ? activeRoundConfig : config;
        const steepnessVal = activeCfg.steepness ?? 1.0;
        const timeshiftVal = activeCfg.timeshift ?? 0.0;
        const isCustomShape = steepnessVal !== 1.0 || timeshiftVal !== 0.0;

        return (
          <div className="space-y-1">
            {isCustomShape && (
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-1">
                <span>Curve Shape Fine-Tuned:</span>
                <span className="text-cyan-400 font-bold">
                  {steepnessVal !== 1.0 ? `Steepness: ${steepnessVal.toFixed(1)}x ` : ''}
                  {timeshiftVal !== 0.0 ? `Shift: ${timeshiftVal > 0 ? '+' : ''}${Math.round(timeshiftVal * 100)}%` : ''}
                </span>
              </div>
            )}
            <CurvePreviewChart
              minBps={activeCfg.minBps}
              maxBps={activeCfg.maxBps}
              curveType={activeCfg.curveType}
              stepCount={activeCfg.stepCount}
              config={activeCfg}
              currentProgressPercent={isRunning ? progressPercent : undefined}
              currentBps={isRunning ? stateTick?.currentBps : undefined}
              height={110}
            />
          </div>
        );
      })()}

      {/* Control Buttons (Android Material 3 touch layout) */}
      <div className="pt-1">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-lg tracking-wide shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Play className="w-6 h-6 fill-slate-950" />
            <span>START ROUND</span>
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleTogglePause}
                className={`py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-100 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {isPaused ? (
                  <>
                    <Play className="w-5 h-5 fill-amber-300" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-5 h-5 fill-slate-100" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                onClick={handleStopReset}
                className="py-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Failure / Tapped Out Button */}
            <button
              onClick={handleMarkFailure}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-950/80 via-red-900/60 to-rose-950/80 border border-rose-500/60 hover:border-rose-400 text-rose-200 hover:text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all active:scale-95 group"
            >
              <ShieldAlert className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span>MARK FAILURE (TAPPED OUT)</span>
            </button>
          </div>
        )}
      </div>

      {/* Test Audio Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => audioEngine.testClick(config.soundType, config.soundPitchHz, config.volume)}
          className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800"
        >
          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>Test Sound ({config.soundType})</span>
        </button>

        <div className="text-[11px] text-slate-500 font-mono">
          Modifiers: {config.enableRandomPauses ? 'Pauses ON' : 'Off'} •{' '}
          {config.enableRandomSpeedMultipliers ? 'Bursts ON' : 'Off'}
        </div>
      </div>

      {/* Round Result Summary Modal (Completed vs Failed) */}
      {showCompletionModal && completedStats && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            {completedStats.completed ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Round Completed!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Great job completing the entire beat speed progression round!
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-rose-200">Failure Recorded</h3>
                  <p className="text-xs text-rose-300/80 mt-1">
                    Pushed your limit! Speed threshold logged for performance tracking.
                  </p>
                </div>
              </>
            )}

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2 text-left text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className={completedStats.completed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {completedStats.completed ? 'COMPLETED' : 'FAILED (TAPPED OUT)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Duration:</span>
                <span className="text-slate-200">
                  {completedStats.durationCompletedSeconds}s / {completedStats.totalRoundSeconds}s
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">{completedStats.completed ? 'Peak Speed:' : 'Speed at Failure:'}</span>
                <span className="text-cyan-400 font-bold">
                  {completedStats.maxBpsReached.toFixed(1)} BPS ({bpsToBpm(completedStats.maxBpsReached)} BPM)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Speed Curve:</span>
                <span className="capitalize text-slate-200">{completedStats.curveType}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Beats Delivered:</span>
                <span className="text-slate-200">{completedStats.totalBeats} beats</span>
              </div>
            </div>

            <button
              onClick={() => setShowCompletionModal(false)}
              className={`w-full py-3 font-bold rounded-xl transition-all ${
                completedStats.completed
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-slate-950'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
