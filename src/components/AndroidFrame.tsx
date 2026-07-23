import React from 'react';
import {
  Activity,
  Sliders,
  BookmarkCheck,
  History as HistoryIcon,
  Image as ImageIcon,
} from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  activeTab: 'session' | 'visual' | 'settings' | 'presets' | 'history';
  onSelectTab: (tab: 'session' | 'visual' | 'settings' | 'presets' | 'history') => void;
  isBeatActive?: boolean;
  currentBps?: number;
  hideBottomNav?: boolean;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  activeTab,
  onSelectTab,
  isBeatActive = false,
  currentBps = 0,
  hideBottomNav = false,
}) => {
  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Content Area - Full screen responsive container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col w-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        {children}
      </div>

      {/* Bottom Navigation Bar */}
      {!hideBottomNav && (
        <div className="w-full bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-3 py-2.5 z-30 shadow-2xl shrink-0">
          <div className="flex items-center justify-around max-w-md md:max-w-lg mx-auto">
            {/* Session Tab */}
            <button
              onClick={() => onSelectTab('session')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
                activeTab === 'session'
                  ? 'bg-cyan-500/15 text-cyan-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Beat</span>
            </button>

            {/* Visual Mode Tab */}
            <button
              onClick={() => onSelectTab('visual')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
                activeTab === 'visual'
                  ? 'bg-cyan-500/15 text-cyan-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Visual</span>
            </button>

            {/* Settings Tab */}
            <button
              onClick={() => onSelectTab('settings')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
                activeTab === 'settings'
                  ? 'bg-cyan-500/15 text-cyan-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Settings</span>
            </button>

            {/* Presets Tab */}
            <button
              onClick={() => onSelectTab('presets')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
                activeTab === 'presets'
                  ? 'bg-cyan-500/15 text-cyan-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookmarkCheck className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Presets</span>
            </button>

            {/* History Tab */}
            <button
              onClick={() => onSelectTab('history')}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
                activeTab === 'history'
                  ? 'bg-cyan-500/15 text-cyan-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HistoryIcon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">History</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
