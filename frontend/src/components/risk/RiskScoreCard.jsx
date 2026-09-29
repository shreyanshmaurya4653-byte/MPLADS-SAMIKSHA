import React from 'react';
import { getRiskColor, getRiskBadgeConfig } from '../../utils/riskUtils';

export function RiskScoreCard({ score = 0, level = 'Low', size = 130 }) {
  const riskColor = getRiskColor(score);
  const badgeCfg = getRiskBadgeConfig(level);
  
  const radius = (size / 2) * 0.75;
  const circumference = 2 * Math.PI * radius;
  const sweepAngle = 240;
  const strokeDashoffset = (circumference * (sweepAngle / 360)) * (1 - score / 100);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col items-center justify-center text-center">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">AI Risk Index</h4>
      <div className="relative flex items-center justify-center my-2">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={riskColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black text-slate-900 tracking-tight">{score}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">/ 100</span>
        </div>
      </div>

      <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${badgeCfg.badge}`}>
        {level} Priority Risk
      </span>
    </div>
  );
}
