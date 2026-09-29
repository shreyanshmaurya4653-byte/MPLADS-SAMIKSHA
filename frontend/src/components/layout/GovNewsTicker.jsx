import React, { useState } from 'react';
import { Megaphone, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export function GovNewsTicker() {
  const [isPaused, setIsPaused] = useState(false);
  const { language, t } = useLanguage();

  const announcements = [
    t('ticker1'),
    t('ticker2'),
    t('ticker3'),
    t('ticker4')
  ];

  return (
    <div className="bg-amber-50 border-b border-amber-200/80 text-amber-950 text-xs py-1.5 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Label Badge */}
        <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-600 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-2xs">
          <Megaphone size={11} />
          <span>{t('tickerLabel', 'Latest Updates')}</span>
        </div>

        {/* Ticker Content */}
        <div
          className="flex-1 overflow-hidden relative cursor-pointer"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          title="Live National Governance Bulletin (Hover to pause)"
        >
          <div
            className={`whitespace-nowrap flex items-center gap-8 ${
              isPaused ? '' : 'animate-marquee'
            }`}
            style={{ animationDuration: '35s' }}
          >
            {announcements.map((text, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 font-medium text-[11.5px] text-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
