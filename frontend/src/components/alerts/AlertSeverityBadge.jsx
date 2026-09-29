import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';

export function AlertSeverityBadge({ severity }) {
  const { language, tr } = useLanguage();

  const styles = {
    High: 'bg-rose-50 text-rose-700 border-rose-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  const dots = {
    High: 'bg-rose-500',
    Medium: 'bg-amber-500',
    Low: 'bg-emerald-500'
  };

  const normKey = severity || 'Low';
  const current = styles[normKey] || styles.Low;
  const dot = dots[normKey] || dots.Low;

  const label = language === 'hi' 
    ? `${tr(normKey)} गंभीरता` 
    : `${normKey} Severity`;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${current}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
