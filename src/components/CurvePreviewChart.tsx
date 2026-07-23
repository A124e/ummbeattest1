import React from 'react';
import { CurveType, RoundConfig } from '../types';
import { generateCurvePlotPoints, calculateBpsAtProgress, bpsToBpm } from '../lib/curveMath';

interface CurvePreviewChartProps {
  minBps: number;
  maxBps: number;
  curveType: CurveType;
  stepCount?: number;
  config?: Partial<RoundConfig>;
  currentProgressPercent?: number; // 0..100 when active
  currentBps?: number;
  height?: number;
  showLabels?: boolean;
}

export const CurvePreviewChart: React.FC<CurvePreviewChartProps> = ({
  minBps,
  maxBps,
  curveType,
  stepCount = 5,
  config,
  currentProgressPercent,
  currentBps,
  height = 140,
  showLabels = true,
}) => {
  const points = generateCurvePlotPoints(minBps, maxBps, curveType, stepCount, 70, config);

  // Build SVG path d attribute string
  const svgWidth = 300;
  const svgHeight = height;
  const paddingX = 20;
  const paddingY = 20;

  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const pathCoords = points.map((p) => {
    const x = paddingX + (p.x / 100) * chartW;
    // Y is inverted in SVG (0 is top)
    const y = paddingY + chartH - (p.y / 100) * chartH;
    return { x, y, isDip: p.isDip, bps: p.bps, xPct: p.x };
  });

  const pathD = `M ${pathCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;
  const areaD = `M ${paddingX},${paddingY + chartH} L ${pathCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')} L ${
    paddingX + chartW
  },${paddingY + chartH} Z`;

  // Calculate current point if progress provided
  let currentX = 0;
  let currentY = 0;
  const hasActiveProgress =
    typeof currentProgressPercent === 'number' && currentProgressPercent >= 0;

  if (hasActiveProgress) {
    const clampedProgress = Math.max(0, Math.min(100, currentProgressPercent!));
    currentX = paddingX + (clampedProgress / 100) * chartW;

    // Use current base BPS or calculate exact macro BPS at this progress so dot rides directly on the curve line
    const baseBpsOnCurve = typeof currentBps === 'number'
      ? currentBps
      : calculateBpsAtProgress(clampedProgress / 100, minBps, maxBps, curveType, stepCount, config, false);

    const bpsRange = Math.max(0.1, maxBps - minBps);
    const yNorm = Math.max(0, Math.min(1, (baseBpsOnCurve - minBps) / bpsRange));
    currentY = paddingY + chartH - yNorm * chartH;
  }

  const getCurveLabel = (type: CurveType) => {
    switch (type) {
      case 'stochastic': return 'Random Steps & Dips';
      case 'random_wave': return 'Random Wave';
      case 'stepwise': return 'Stepwise Ramp';
      case 'scurve': return 'S-Curve';
      case 'exponential': return 'Exponential';
      case 'logarithmic': return 'Logarithmic';
      default: return 'Linear Ramp';
    }
  };

  return (
    <div className="w-full select-none">
      {showLabels && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5 px-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            Min: {minBps} BPS ({bpsToBpm(minBps)} BPM)
          </span>
          <span className="capitalize px-2.5 py-0.5 bg-slate-800 text-amber-300 rounded-md text-[11px] border border-amber-500/30 font-medium shadow-sm">
            {getCurveLabel(curveType)}
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            Max: {maxBps} BPS ({bpsToBpm(maxBps)} BPM)
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400"></span>
          </span>
        </div>
      )}

      <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 p-2 overflow-hidden shadow-inner">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            <linearGradient id="curveAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="curveLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={paddingX + chartW}
            y2={paddingY}
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.4"
          />
          <line
            x1={paddingX}
            y1={paddingY + chartH / 2}
            x2={paddingX + chartW}
            y2={paddingY + chartH / 2}
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.3"
          />
          <line
            x1={paddingX}
            y1={paddingY + chartH}
            x2={paddingX + chartW}
            y2={paddingY + chartH}
            stroke="#334155"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* Area Fill */}
          <path d={areaD} fill="url(#curveAreaGrad)" />

          {/* Curve Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#curveLineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Dip Markers (red/orange dots showing where speed drops occur) */}
          {pathCoords.map((pt, idx) => {
            if (!pt.isDip) return null;
            return (
              <circle
                key={`dip-${idx}`}
                cx={pt.x}
                cy={pt.y}
                r="3"
                fill="#f43f5e"
                stroke="#ffe4e6"
                strokeWidth="1"
              />
            );
          })}

          {/* Active Tracker Dot */}
          {hasActiveProgress && (
            <g>
              {/* Vertical guideline */}
              <line
                x1={currentX}
                y1={paddingY}
                x2={currentX}
                y2={paddingY + chartH}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.7"
              />
              {/* Pulse halo */}
              <circle
                cx={currentX}
                cy={currentY}
                r="10"
                fill="#38bdf8"
                opacity="0.3"
                className="animate-ping origin-center"
              />
              {/* Solid point */}
              <circle
                cx={currentX}
                cy={currentY}
                r="6"
                fill="#ffffff"
                stroke="#0284c7"
                strokeWidth="3"
              />
            </g>
          )}
        </svg>

        {/* Start and End Speed badges */}
        <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono px-2 pt-1 border-t border-slate-800/80">
          <span>0s (Start)</span>
          <span>50%</span>
          <span>Round End</span>
        </div>
      </div>
    </div>
  );
};
