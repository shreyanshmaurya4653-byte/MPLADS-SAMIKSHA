import React from 'react';
import { Filter } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export function AlertFilters({
  severity,
  onSeverityChange,
  alertType,
  onAlertTypeChange
}) {
  const { language, tr } = useLanguage();
  const severities = ['All', 'High', 'Medium', 'Low'];
  const types = [
    'All',
    'COST_OVERRUN',
    'EXPENDITURE_SPIKE',
    'PROGRESS_PAYMENT_MISMATCH',
    'POSSIBLE_DUPLICATE',
    'DELAY'
  ];

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {language === 'hi' ? 'गंभीरता:' : 'Severity:'}
        </span>
        <div className="flex items-center gap-1.5">
          {severities.map((s) => (
            <button
              key={s}
              onClick={() => onSeverityChange(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                severity === s
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s === 'All' ? (language === 'hi' ? 'सभी' : 'All') : tr(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-4 w-px bg-slate-200 hidden sm:block" />

      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {language === 'hi' ? 'प्रकार:' : 'Type:'}
        </span>
        <select
          value={alertType}
          onChange={(e) => onAlertTypeChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {types.map((t) => (
            <option key={t} value={t}>
              {t === 'All' ? (language === 'hi' ? 'सभी विसंगति प्रकार' : 'All Anomaly Types') : tr(t)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
