import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

export function WorkStatusBadge({ status }) {
  const { tr } = useLanguage();

  const styles = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Ongoing: 'bg-blue-50 text-blue-700 border-blue-200',
    Delayed: 'bg-rose-50 text-rose-700 border-rose-200',
    Sanctioned: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const dots = {
    Completed: 'bg-emerald-500',
    Ongoing: 'bg-blue-500',
    Delayed: 'bg-rose-500',
    Sanctioned: 'bg-slate-400'
  };

  const normKey = status || 'Sanctioned';
  const currentStyle = styles[normKey] || styles.Sanctioned;
  const currentDot = dots[normKey] || dots.Sanctioned;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${currentDot}`} />
      {tr(normKey)}
    </span>
  );
}
