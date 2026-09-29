import React from 'react';

export function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendPositive,
  color = 'blue'
}) {
  const colorSchemes = {
    blue: { iconBg: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    emerald: { iconBg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
    amber: { iconBg: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
    rose: { iconBg: 'bg-rose-50 text-rose-600', border: 'border-rose-100' },
    purple: { iconBg: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
  };

  const scheme = colorSchemes[color] || colorSchemes.blue;

  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${scheme.iconBg}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        {trend && (
          <span className={`text-xs font-bold ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
}
