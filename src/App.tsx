import React, { useState, useEffect } from 'react';
import { RoundConfig, SessionRecord } from './types';
import { DEFAULT_CONFIG } from './lib/presetsData';
import { AndroidFrame } from './components/AndroidFrame';
import { BeatSessionView } from './components/BeatSessionView';
import { VisualSessionView } from './components/VisualSessionView';
import { SettingsView } from './components/SettingsView';
import { PresetsView } from './components/PresetsView';
import { HistoryView } from './components/HistoryView';

const LOCAL_STORAGE_LOGS_KEY = 'test1_beat_app_session_history';

export default function App() {
  const [activeTab, setActiveTab] = useState<'session' | 'visual' | 'settings' | 'presets' | 'history'>('session');
  const [config, setConfig] = useState<RoundConfig>(DEFAULT_CONFIG);
  const [historyLogs, setHistoryLogs] = useState<SessionRecord[]>([]);
  const [isVisualRoundRunning, setIsVisualRoundRunning] = useState(false);

  // Reset visual running state when switching tabs away from visual
  useEffect(() => {
    if (activeTab !== 'visual') {
      setIsVisualRoundRunning(false);
    }
  }, [activeTab]);

  // Load history logs on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (raw) {
        setHistoryLogs(JSON.parse(raw));
      }
    } catch (err) {
      console.error('Failed loading history logs', err);
    }
  }, []);

  const handleSaveSessionLog = (log: SessionRecord) => {
    const updated = [log, ...historyLogs];
    setHistoryLogs(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed saving session log', err);
    }
  };

  const handleClearHistory = () => {
    setHistoryLogs([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
    } catch (err) {
      console.error('Failed clearing history', err);
    }
  };

  const handleSelectPresetConfig = (newConfig: RoundConfig) => {
    setConfig(newConfig);
  };

  const handleStartSessionWithConfig = (newConfig: RoundConfig) => {
    setConfig(newConfig);
    setActiveTab('session');
  };

  return (
    <AndroidFrame
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      currentBps={config.minBps}
      hideBottomNav={isVisualRoundRunning}
    >
      {activeTab === 'session' && (
        <BeatSessionView
          config={config}
          onOpenSettings={() => setActiveTab('settings')}
          onOpenVisualMode={() => setActiveTab('visual')}
          onSaveSessionLog={handleSaveSessionLog}
        />
      )}

      {activeTab === 'visual' && (
        <VisualSessionView
          config={config}
          onOpenSettings={() => setActiveTab('settings')}
          onSaveSessionLog={handleSaveSessionLog}
          onRunningStateChange={setIsVisualRoundRunning}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsView
          config={config}
          onChangeConfig={setConfig}
          onDone={() => setActiveTab('session')}
        />
      )}

      {activeTab === 'presets' && (
        <PresetsView
          currentConfig={config}
          onSelectPresetConfig={handleSelectPresetConfig}
          onStartSessionWithConfig={handleStartSessionWithConfig}
        />
      )}

      {activeTab === 'history' && (
        <HistoryView logs={historyLogs} onClearHistory={handleClearHistory} />
      )}
    </AndroidFrame>
  );
}
