import React, { useState } from 'react';
import { History as HistoryIcon, Flame, Trophy, Trash2, Calendar, Activity, ShieldAlert, CheckCircle2, TrendingUp } from 'lucide-react';
import { SessionRecord } from '../types';
import { bpsToBpm } from '../lib/curveMath';

interface HistoryViewProps {
  logs: SessionRecord[];
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ logs, onClearHistory }) => {
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');

  const totalRounds = logs.length;
  const completedLogs = logs.filter((log) => log.completed !== false);
  const failedLogs = logs.filter((log) => log.completed === false);

  const completedCount = completedLogs.length;
  const failedCount = failedLogs.length;
  const completionRate = totalRounds > 0 ? Math.round((completedCount / totalRounds) * 100) : 0;

  const totalDurationSeconds = logs.reduce((acc, log) => acc + log.durationCompletedSeconds, 0);
  const peakSpeedOverall = logs.reduce((acc, log) => Math.max(acc, log.maxBpsReached), 0);

  const avgFailureBps = failedCount > 0
    ? failedLogs.reduce((acc, log) => acc + log.maxBpsReached, 0) / failedCount
    : 0;

  const maxFailureBps = failedCount > 0
    ? failedLogs.reduce((acc, log) => Math.max(acc, log.maxBpsReached), 0)
    : 0;

  const filteredLogs = logs.filter((log) => {
    if (filter === 'completed') return log.completed !== false;
    if (filter === 'failed') return log.completed === false;
    return true;
  });

  const formatMinutes = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-4 space-y-5 max-w-lg mx-auto w-full pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-cyan-400" />
            Training & Failure History
          </h2>
          <p className="text-xs text-slate-400">Track speed thresholds, completed rounds & failure limits</p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-semibold transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Total Rounds & Rate
          </div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {totalRounds} <span className="text-xs font-normal text-slate-400">rounds</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{completionRate}% success rate</span>
          </div>
        </div>

        <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-cyan-400" />
            Peak Speed Reached
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
            {peakSpeedOverall > 0 ? peakSpeedOverall.toFixed(1) : '0.0'} <span className="text-xs">BPS</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            ({bpsToBpm(peakSpeedOverall)} BPM)
          </div>
        </div>
      </div>

      {/* Dedicated Failure Tracker Summary Card */}
      <div className="bg-slate-900/90 rounded-2xl p-4 border border-rose-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-rose-200 uppercase tracking-wider">
              Failure Threshold Tracker
            </span>
          </div>
          <span className="text-[10px] bg-rose-500/20 text-rose-300 font-mono px-2 py-0.5 rounded border border-rose-500/30">
            {failedCount} Tapped Out
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Avg Failure Speed</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">
              {avgFailureBps > 0 ? `${avgFailureBps.toFixed(1)} BPS` : 'None'}
            </div>
            {avgFailureBps > 0 && (
              <div className="text-[9px] text-slate-500">{bpsToBpm(avgFailureBps)} BPM</div>
            )}
          </div>

          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Max Failure Speed</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">
              {maxFailureBps > 0 ? `${maxFailureBps.toFixed(1)} BPS` : 'None'}
            </div>
            {maxFailureBps > 0 && (
              <div className="text-[9px] text-slate-500">{bpsToBpm(maxFailureBps)} BPM</div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({totalRounds})
        </button>

        <button
          onClick={() => setFilter('completed')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'completed'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Completed ({completedCount})
        </button>

        <button
          onClick={() => setFilter('failed')}
          className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
            filter === 'failed'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Failed ({failedCount})
        </button>
      </div>

      {/* History Log List */}
      <div className="space-y-2.5">
        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1 flex justify-between items-center">
          <span>Recent Logs</span>
          <span className="text-[11px] font-mono font-normal text-slate-500">
            {formatMinutes(totalDurationSeconds)} total
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="bg-slate-900/50 rounded-2xl p-8 border border-slate-800 text-center text-slate-500 text-xs space-y-2">
            <Activity className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No round logs match selected filter.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isCompleted = log.completed !== false;
            return (
              <div
                key={log.id}
                className={`bg-slate-900/90 rounded-2xl p-3.5 border flex items-center justify-between text-xs transition-all ${
                  isCompleted
                    ? 'border-slate-800 hover:border-slate-700'
                    : 'border-rose-950/80 bg-rose-950/10 hover:border-rose-800/60'
                }`}
              >
                <div className="space-y-1">
                  <div className="font-bold text-slate-100 flex items-center gap-2 flex-wrap">
                    <span>{log.presetName}</span>
                    <span className="capitalize px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400">
                      {log.curveType}
                    </span>

                    {/* Status Badge */}
                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        <ShieldAlert className="w-3 h-3 text-rose-400" />
                        Tapped Out
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatDate(log.timestamp)}
                    </span>
                    <span>•</span>
                    <span>
                      {log.durationCompletedSeconds}s / {log.totalRoundSeconds}s
                    </span>
                    <span>•</span>
                    <span>{log.totalBeats} beats</span>
                  </div>
                </div>

                <div className="text-right font-mono ml-2 shrink-0">
                  <div
                    className={`text-sm font-black ${
                      isCompleted ? 'text-cyan-400' : 'text-rose-400'
                    }`}
                  >
                    {log.maxBpsReached.toFixed(1)} BPS
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {bpsToBpm(log.maxBpsReached)} BPM
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
