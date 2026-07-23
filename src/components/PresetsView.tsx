import React, { useState, useEffect } from 'react';
import { BookmarkCheck, Plus, Trash2, Play, Sparkles, Check, Bookmark } from 'lucide-react';
import { Preset, RoundConfig } from '../types';
import { DEFAULT_PRESETS, loadCustomPresets, saveCustomPreset, deleteCustomPreset } from '../lib/presetsData';
import { CurvePreviewChart } from './CurvePreviewChart';

interface PresetsViewProps {
  currentConfig: RoundConfig;
  onSelectPresetConfig: (config: RoundConfig) => void;
  onStartSessionWithConfig: (config: RoundConfig) => void;
}

export const PresetsView: React.FC<PresetsViewProps> = ({
  currentConfig,
  onSelectPresetConfig,
  onStartSessionWithConfig,
}) => {
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');

  useEffect(() => {
    setCustomPresets(loadCustomPresets());
  }, []);

  const handleSaveCurrentAsPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetTitle.trim()) return;

    const newPreset: Preset = {
      id: 'custom-preset-' + Date.now(),
      title: newPresetTitle.trim(),
      description: newPresetDesc.trim() || `${currentConfig.minBps}-${currentConfig.maxBps} BPS (${currentConfig.curveType} curve)`,
      category: 'custom',
      config: { ...currentConfig, name: newPresetTitle.trim() },
      isCustom: true,
    };

    const updated = saveCustomPreset(newPreset);
    setCustomPresets(updated);
    setShowSaveModal(false);
    setNewPresetTitle('');
    setNewPresetDesc('');
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteCustomPreset(id);
    setCustomPresets(updated);
  };

  const allPresets = [...customPresets, ...DEFAULT_PRESETS];

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-cyan-400" />
            Training Presets
          </h2>
          <p className="text-xs text-slate-400">Select pre-configured beat speed curves</p>
        </div>

        <button
          onClick={() => setShowSaveModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Save Current</span>
        </button>
      </div>

      {/* Preset List */}
      <div className="space-y-3">
        {allPresets.map((preset) => {
          const cfg = preset.config;
          const isSelected =
            currentConfig.minBps === cfg.minBps &&
            currentConfig.maxBps === cfg.maxBps &&
            currentConfig.roundLengthSeconds === cfg.roundLengthSeconds &&
            currentConfig.curveType === cfg.curveType;

          return (
            <div
              key={preset.id}
              onClick={() => onSelectPresetConfig({ ...cfg, name: preset.title })}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950/30'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{preset.title}</span>
                    {preset.isCustom && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                        Custom
                      </span>
                    )}
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{preset.description}</p>
                </div>

                {preset.isCustom && (
                  <button
                    onClick={(e) => handleDeletePreset(preset.id, e)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-all"
                    title="Delete Preset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Stats pill bar */}
              <div className="flex flex-wrap gap-2 text-[11px] font-mono text-slate-300 mt-3">
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
                  ⚡ {cfg.minBps.toFixed(1)} ➔ {cfg.maxBps.toFixed(1)} BPS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">
                  ⏱️ {cfg.roundLengthSeconds / 60} min ({cfg.roundLengthSeconds}s)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 capitalize">
                  📈 {cfg.curveType}
                </span>
                {cfg.enableRandomPauses && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-950/40 border border-amber-800/60 text-amber-300">
                    ⏸️ Pauses
                  </span>
                )}
                {cfg.enableRandomSpeedMultipliers && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-800/60 text-purple-300">
                    ⚡ Bursts
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-800/60">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartSessionWithConfig({ ...cfg, name: preset.title });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Start Round</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Custom Preset Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCurrentAsPreset}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Bookmark className="w-5 h-5" />
              <span>Save Custom Preset</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Preset Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Fast Sprint"
                  value={newPresetTitle}
                  onChange={(e) => setNewPresetTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief notes on target speed and goal..."
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
                <div>Range: {currentConfig.minBps} ➔ {currentConfig.maxBps} BPS</div>
                <div>Curve: {currentConfig.curveType} | Length: {currentConfig.roundLengthSeconds}s</div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
