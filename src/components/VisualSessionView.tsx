import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Trash2,
  Plus,
  Eye,
  Sliders,
  Zap,
  Activity,
  Layers,
  Check,
  Flame,
} from 'lucide-react';
import { BeatTickEvent, RoundConfig, SessionRecord, VisualImage, VisualModeConfig } from '../types';
import { audioEngine, StateTickEvent } from '../lib/audioEngine';
import { bpsToBpm } from '../lib/curveMath';
import confetti from 'canvas-confetti';

const LOCAL_STORAGE_VISUAL_CONFIG_KEY = 'test1_beat_app_visual_config_v1';

// High quality default sample focus images if user hasn't uploaded any
const SAMPLE_IMAGES: VisualImage[] = [
  {
    id: 'sample-1',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=80',
    name: 'Neon Horizon',
    addedAt: Date.now() - 3000,
  },
  {
    id: 'sample-2',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    name: 'Cyber Grid',
    addedAt: Date.now() - 2000,
  },
  {
    id: 'sample-3',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    name: 'Cosmic Rhythm',
    addedAt: Date.now() - 1000,
  },
];

const DEFAULT_VISUAL_CONFIG: VisualModeConfig = {
  images: SAMPLE_IMAGES,
  slideshowIntervalSeconds: 5,
  advanceOnBeats: 16,
  transitionMode: 'timer',
  fitMode: 'cover',
  hudPosition: 'top-right',
  enableBeatPulse: true,
  hudMinimized: false,
};

interface VisualSessionViewProps {
  config: RoundConfig;
  onOpenSettings: () => void;
  onSaveSessionLog: (log: SessionRecord) => void;
  onRunningStateChange?: (isRunning: boolean) => void;
}

export const VisualSessionView: React.FC<VisualSessionViewProps> = ({
  config,
  onOpenSettings,
  onSaveSessionLog,
  onRunningStateChange,
}) => {
  // Visual Mode Configuration State
  const [visualConfig, setVisualConfig] = useState<VisualModeConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_VISUAL_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.images && parsed.images.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load visual config', e);
    }
    return DEFAULT_VISUAL_CONFIG;
  });

  // Current image index in slideshow
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Round execution states
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [beatEvent, setBeatEvent] = useState<BeatTickEvent | null>(null);
  const [stateTick, setStateTick] = useState<StateTickEvent | null>(null);
  const [activeRoundConfig, setActiveRoundConfig] = useState<RoundConfig | null>(null);

  // HUD & UI overlay states
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  const [showOverlays, setShowOverlays] = useState(true);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [peakBpsReached, setPeakBpsReached] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Notify parent when visual round running state changes
  useEffect(() => {
    if (onRunningStateChange) {
      onRunningStateChange(isRunning);
    }
  }, [isRunning, onRunningStateChange]);

  // Round completion summary modal
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completedStats, setCompletedStats] = useState<SessionRecord | null>(null);

  // Drag & drop upload state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // References for audio callbacks
  const configRef = useRef(config);
  const visualConfigRef = useRef(visualConfig);
  const currentImgIndexRef = useRef(currentImageIndex);
  const onSaveSessionLogRef = useRef(onSaveSessionLog);
  const peakBpsRef = useRef(0);
  const beatEventRef = useRef<BeatTickEvent | null>(null);
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep references synced
  useEffect(() => {
    configRef.current = config;
    visualConfigRef.current = visualConfig;
    currentImgIndexRef.current = currentImageIndex;
    onSaveSessionLogRef.current = onSaveSessionLog;
  }, [config, visualConfig, currentImageIndex, onSaveSessionLog]);

  // Save visual config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_VISUAL_CONFIG_KEY, JSON.stringify(visualConfig));
    } catch (err) {
      console.error('Failed saving visual config', err);
    }
  }, [visualConfig]);

  // Audio Engine Callbacks Setup
  useEffect(() => {
    audioEngine.setOnBeatCallback((event) => {
      setBeatEvent(event);
      beatEventRef.current = event;
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 90);

      setPeakBpsReached((prev) => {
        const next = Math.max(prev, event.effectiveBps);
        peakBpsRef.current = next;
        return next;
      });

      // Advance slideshow on beat count if configured
      const vCfg = visualConfigRef.current;
      if (
        vCfg.transitionMode === 'beat' &&
        vCfg.advanceOnBeats &&
        vCfg.images.length > 1 &&
        event.beatNumber % vCfg.advanceOnBeats === 0
      ) {
        setCurrentImageIndex((prev) => (prev + 1) % vCfg.images.length);
      }
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

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
      });

      const currentCfg = configRef.current;
      const stats: SessionRecord = {
        id: 'session-' + Date.now(),
        timestamp: Date.now(),
        presetName: (currentCfg.name || 'Custom Speed Curve') + ' (Visual Mode)',
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
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    };
  }, []);

  // Timer-based Slideshow interval effect
  useEffect(() => {
    if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);

    if (
      isRunning &&
      !isPaused &&
      visualConfig.transitionMode === 'timer' &&
      visualConfig.images.length > 1
    ) {
      slideshowTimerRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % visualConfig.images.length);
      }, Math.max(1, visualConfig.slideshowIntervalSeconds) * 1000);
    }

    return () => {
      if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    };
  }, [isRunning, isPaused, visualConfig.transitionMode, visualConfig.slideshowIntervalSeconds, visualConfig.images.length]);

  // Upload handler for user files
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const newImagesPromises = fileArray.map((file) => {
      return new Promise<VisualImage>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            url: e.target?.result as string,
            name: file.name,
            addedAt: Date.now(),
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newImagesPromises)
      .then((newImages) => {
        setVisualConfig((prev) => ({
          ...prev,
          images: [...prev.images, ...newImages],
        }));
      })
      .catch((err) => {
        console.error('Failed reading images', err);
      });
  };

  const handleRemoveImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisualConfig((prev) => {
      const updated = prev.images.filter((img) => img.id !== id);
      return { ...prev, images: updated };
    });
    setCurrentImageIndex(0);
  };

  const handleLoadSampleImages = () => {
    setVisualConfig((prev) => ({
      ...prev,
      images: SAMPLE_IMAGES,
    }));
    setCurrentImageIndex(0);
  };

  // Round controls
  const handleStart = () => {
    if (visualConfig.images.length === 0) {
      alert('Please upload or add at least one image before starting a Visual Round!');
      return;
    }
    const seed = config.randomSeed || Math.floor(Math.random() * 100000);
    const roundConfig: RoundConfig = { ...config, randomSeed: seed };
    setActiveRoundConfig(roundConfig);
    setPeakBpsReached(roundConfig.minBps);
    peakBpsRef.current = roundConfig.minBps;
    setIsRunning(true);
    setIsPaused(false);
    setIsGalleryOpen(false);
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
    const currentBps = stateTick?.currentBps || currentCfg.minBps;
    const beats = beatEventRef.current?.beatNumber || stateTick?.beatNumber || 0;

    const stats: SessionRecord = {
      id: 'session-' + Date.now(),
      timestamp: Date.now(),
      presetName: (currentCfg.name || 'Custom Speed Curve') + ' (Visual Mode)',
      durationCompletedSeconds: elapsed,
      totalRoundSeconds: currentCfg.roundLengthSeconds,
      startBps: currentCfg.minBps,
      maxBpsReached: Math.max(peakBpsRef.current, currentBps),
      totalBeats: beats,
      curveType: currentCfg.curveType,
      completed: false,
    };

    setCompletedStats(stats);
    setShowCompletionModal(true);
    onSaveSessionLog(stats);
  };

  // Navigation between images
  const handlePrevImage = () => {
    if (visualConfig.images.length <= 1) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? visualConfig.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    if (visualConfig.images.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % visualConfig.images.length);
  };

  // Helper values
  const activeImage = visualConfig.images[currentImageIndex] || visualConfig.images[0];
  const currentBps = stateTick?.effectiveBps || stateTick?.currentBps || config.minBps;
  const currentBpm = bpsToBpm(currentBps);
  const timeRemainingSec = stateTick?.timeRemainingSeconds ?? config.roundLengthSeconds;
  const elapsedSec = stateTick?.elapsedSeconds ?? 0;
  const progressPercent = stateTick?.progressPercent ?? 0;
  const currentModifier = beatEvent?.modifier || stateTick?.modifier || 'normal';

  // HUD corner alignment classes
  const getHudPositionClasses = () => {
    switch (visualConfig.hudPosition) {
      case 'top-left':
        return 'top-3 left-3';
      case 'bottom-left':
        return 'bottom-20 left-3';
      case 'bottom-right':
        return 'bottom-20 right-3';
      case 'top-right':
      default:
        return 'top-3 right-3';
    }
  };

  return (
    <div className="relative w-full h-full min-h-[580px] bg-slate-950 flex flex-col justify-between overflow-hidden select-none">
      {/* 1. Full Screen Background Image Display */}
      {activeImage ? (
        <div className="absolute inset-0 z-0 bg-slate-950 flex items-center justify-center overflow-hidden">
          <img
            src={activeImage.url}
            alt={activeImage.name}
            className={`w-full h-full transition-all duration-500 ease-out ${
              visualConfig.fitMode === 'contain' ? 'object-contain bg-slate-950' : 'object-cover'
            } ${
              isRunning && visualConfig.enableBeatPulse && isPulsing
                ? 'scale-[1.03] filter brightness-110'
                : 'scale-100 filter brightness-100'
            }`}
          />
          {/* Subtle gradient overlay to make HUD & controls stand out cleanly */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-slate-950/60 pointer-events-none" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <ImageIcon className="w-16 h-16 text-slate-700 mb-3" />
          <p className="text-sm font-semibold">No Images Uploaded</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Upload custom training focus images or load samples to start a Full Screen Visual Round.
          </p>
        </div>
      )}

      {/* 2. Top Header Toolbar (when not running) */}
      {!isRunning && (
        <div className="relative z-20 p-4 flex items-center justify-between bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Visual Focus Mode</h2>
              <p className="text-[10px] text-slate-400">
                {visualConfig.images.length} Image{visualConfig.images.length === 1 ? '' : 's'} in Gallery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGalleryOpen(!isGalleryOpen)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isGalleryOpen
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isGalleryOpen ? 'Hide Gallery' : 'Manage Images'}</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all"
              title="Speed Curve Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Image Gallery & Settings Management Drawer (when round is idle and gallery is toggled) */}
      {!isRunning && isGalleryOpen && (
        <div className="relative z-20 p-4 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Upload Drop Zone & Add Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              multiple
              accept="image/*"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e.dataTransfer.files);
              }}
              className={`flex-1 p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-slate-800 hover:border-cyan-500/50 bg-slate-950/60'
              }`}
            >
              <Upload className="w-6 h-6 text-cyan-400 mb-1" />
              <span className="text-xs font-bold text-slate-200">Upload Images</span>
              <span className="text-[10px] text-slate-500">Drag & drop or click to select multiple (JPG, PNG, WEBP)</span>
            </div>

            {visualConfig.images.length === 0 && (
              <button
                onClick={handleLoadSampleImages}
                className="px-4 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Load Sample Images</span>
              </button>
            )}
          </div>

          {/* Thumbnails list */}
          {visualConfig.images.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
                <span>Select active photo or click thumbnail:</span>
                <button
                  onClick={() => setVisualConfig((prev) => ({ ...prev, images: [] }))}
                  className="text-rose-400 hover:text-rose-300 text-[10px] underline"
                >
                  Clear All ({visualConfig.images.length})
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {visualConfig.images.map((img, idx) => {
                  const isActive = idx === currentImageIndex;
                  return (
                    <div
                      key={img.id}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative group h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isActive
                          ? 'border-cyan-400 ring-2 ring-cyan-500/30 scale-105 z-10'
                          : 'border-slate-800 hover:border-slate-600 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      {isActive && (
                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <button
                        onClick={(e) => handleRemoveImage(img.id, e)}
                        className="absolute top-1 right-1 p-1 rounded-lg bg-rose-950/80 text-rose-300 hover:bg-rose-900 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Slideshow & Visual Settings */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Transition Mode */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Slideshow Cycle</label>
              <select
                value={visualConfig.transitionMode}
                onChange={(e) =>
                  setVisualConfig((prev) => ({
                    ...prev,
                    transitionMode: e.target.value as any,
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="timer">Timer Interval</option>
                <option value="beat">Beat Count Sync</option>
                <option value="manual">Manual Only</option>
              </select>
            </div>

            {/* Interval / Beats setting */}
            {visualConfig.transitionMode === 'timer' && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Cycle Duration</label>
                <select
                  value={visualConfig.slideshowIntervalSeconds}
                  onChange={(e) =>
                    setVisualConfig((prev) => ({
                      ...prev,
                      slideshowIntervalSeconds: parseInt(e.target.value),
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value={3}>Every 3 seconds</option>
                  <option value={5}>Every 5 seconds</option>
                  <option value={10}>Every 10 seconds</option>
                  <option value={15}>Every 15 seconds</option>
                </select>
              </div>
            )}

            {visualConfig.transitionMode === 'beat' && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Advance Every</label>
                <select
                  value={visualConfig.advanceOnBeats || 16}
                  onChange={(e) =>
                    setVisualConfig((prev) => ({
                      ...prev,
                      advanceOnBeats: parseInt(e.target.value),
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value={8}>8 Beats</option>
                  <option value={16}>16 Beats</option>
                  <option value={32}>32 Beats</option>
                </select>
              </div>
            )}

            {/* Image Fit Mode */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Image Sizing</label>
              <select
                value={visualConfig.fitMode}
                onChange={(e) =>
                  setVisualConfig((prev) => ({
                    ...prev,
                    fitMode: e.target.value as any,
                  }))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="cover">Crop Full Fill (Cover)</option>
                <option value="contain">Fit Whole Image (Contain)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. UNINTRUSIVE SIDEBAR (ACTIVE DURING A VISUAL ROUND) */}
      {isRunning && (
        <div className="absolute top-4 right-4 z-40 flex flex-col items-end pointer-events-auto">
          {!isSidebarCollapsed ? (
            /* Expanded Unintrusive Sidebar */
            <div className="w-64 sm:w-72 bg-slate-950/85 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5 text-slate-100 transition-all duration-300 animate-in fade-in slide-in-from-right-4">
              {/* Header & Collapse Toggle */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      isPulsing ? 'bg-cyan-400 scale-125 shadow-lg shadow-cyan-400/80' : 'bg-cyan-500/50'
                    }`}
                  />
                  <span className="text-[10px] font-extrabold tracking-wider text-cyan-400 uppercase">
                    Visual Round Active
                  </span>
                </div>

                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
                  title="Collapse Sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* BEAT METER */}
              <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase">
                  <span>Beat Meter</span>
                  <span className="font-mono text-cyan-400 font-bold">{beatEvent?.beatNumber || 0} beats</span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Visual Beat Indicator Icon */}
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                      isPulsing
                        ? 'bg-cyan-400 text-slate-950 scale-110 shadow-lg shadow-cyan-400/50'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    <Zap className="w-5 h-5 fill-current" />
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black font-mono tracking-tight text-white">
                        {currentBps.toFixed(1)}
                      </span>
                      <span className="text-xs font-bold text-cyan-400">BPS</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {currentBpm} BPM
                    </p>
                  </div>
                </div>

                {/* Progress Bar & Time */}
                <div className="space-y-1.5 pt-1">
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>Rem: {Math.floor(timeRemainingSec / 60)}:{(timeRemainingSec % 60).toString().padStart(2, '0')}</span>
                    <span className="text-cyan-400 font-bold">Peak: {peakBpsReached.toFixed(1)} BPS</span>
                  </div>
                </div>
              </div>

              {/* SLIDESHOW QUICK SWITCH (If multiple images) */}
              {visualConfig.images.length > 1 && (
                <div className="flex items-center justify-between bg-slate-900/50 rounded-xl px-3 py-1.5 border border-slate-800/80 text-xs font-mono text-slate-300">
                  <button
                    onClick={handlePrevImage}
                    className="p-1 hover:text-cyan-400 transition-colors"
                    title="Previous Image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-medium">
                    Image {currentImageIndex + 1} / {visualConfig.images.length}
                  </span>
                  <button
                    onClick={handleNextImage}
                    className="p-1 hover:text-cyan-400 transition-colors"
                    title="Next Image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* CONTROLS: PAUSE, RESET, TAP OUT */}
              <div className="space-y-2 pt-1">
                {/* Pause / Resume */}
                <button
                  onClick={handleTogglePause}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                    isPaused
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                      : 'bg-slate-900 text-slate-100 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 fill-amber-300 text-amber-300" />
                      <span>Resume Round</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 fill-slate-100 text-slate-100" />
                      <span>Pause</span>
                    </>
                  )}
                </button>

                {/* Reset */}
                <button
                  onClick={handleStopReset}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>

                {/* Tap Out */}
                <button
                  onClick={handleMarkFailure}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-950/90 to-red-900/90 border border-rose-500/60 text-rose-200 hover:from-rose-900 hover:to-red-800 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Tap Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed Pill mode when user minimizes sidebar */
            <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-2.5 shadow-2xl text-slate-100 transition-all">
              <div className="flex items-center gap-1.5 px-1">
                <div className={`w-2 h-2 rounded-full ${isPulsing ? 'bg-cyan-400 scale-125' : 'bg-cyan-500/50'}`} />
                <span className="text-sm font-black font-mono text-white">
                  {currentBps.toFixed(1)} <span className="text-[10px] text-cyan-400 font-normal">BPS</span>
                </span>
              </div>

              <div className="h-4 w-px bg-slate-800" />

              <button
                onClick={handleTogglePause}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200"
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 fill-amber-300 text-amber-300" /> : <Pause className="w-3.5 h-3.5 fill-slate-200" />}
              </button>

              <button
                onClick={handleMarkFailure}
                className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 hover:bg-rose-900 text-rose-300"
                title="Tap Out"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                title="Expand Sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Start Round Controls (when NOT running) */}
      {!isRunning && (
        <div className="relative z-30 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent flex flex-col items-center gap-2">
          <div className="w-full max-w-sm flex items-center justify-between gap-2">
            <button
              onClick={handleStart}
              disabled={visualConfig.images.length === 0}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base tracking-wide shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>START VISUAL ROUND</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. Round Completion Summary Modal */}
      {showCompletionModal && completedStats && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            {completedStats.completed ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Visual Round Completed!</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Completed the full visual speed progression training round.
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
                    Pushed your limits! Max speed threshold saved in history.
                  </p>
                </div>
              </>
            )}

            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2 text-left text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Mode:</span>
                <span className="text-cyan-400 font-bold">Visual Focus Mode</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Duration:</span>
                <span className="text-slate-200">
                  {completedStats.durationCompletedSeconds}s / {completedStats.totalRoundSeconds}s
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Peak Speed:</span>
                <span className="text-cyan-400 font-bold">
                  {completedStats.maxBpsReached.toFixed(1)} BPS ({bpsToBpm(completedStats.maxBpsReached)} BPM)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Speed Curve:</span>
                <span className="capitalize text-slate-200">{completedStats.curveType}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Total Beats:</span>
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
