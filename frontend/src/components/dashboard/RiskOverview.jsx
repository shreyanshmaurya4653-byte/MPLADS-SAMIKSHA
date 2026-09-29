import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export function RiskOverview({ stats }) {
  const { language } = useLanguage();
  const high = stats?.high_risk_works ?? 0;
  const total = stats?.total_works ?? 0;
  const delayed = stats?.delayed_works ?? 0;
  const completed = stats?.completed_works ?? 0;

  const highPct = total ? Math.round((high / total) * 100) : 0;
  const delayedPct = total ? Math.round((delayed / total) * 100) : 0;
  const compPct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {language === 'hi' ? 'एआई जोखिम विश्लेषण सारांश' : 'AI Risk Intelligence Summary'}
          </h3>
          <p className="text-xs text-slate-400">
            {language === 'hi' ? 'अधिकार क्षेत्र जोखिम प्रोफाइलिंग एवं माइलस्टोन वेग' : 'Jurisdiction risk profiling & milestone velocity'}
          </p>
        </div>
        <div className={`p-2 rounded-xl ${high > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {high > 0 ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600">
              {language === 'hi' ? 'उच्च जोखिम कार्य विसंगति फ़्लैग' : 'High Risk Works Anomaly Flag'}
            </span>
            <span className="text-rose-600 font-bold">
              {high.toLocaleString()} {language === 'hi' ? 'में से' : 'of'} {total.toLocaleString()} ({highPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${highPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600">
              {language === 'hi' ? 'समय-सीमा उल्लंघन (विलंबित कार्य)' : 'Timeline Breaches (Delayed Works)'}
            </span>
            <span className="text-amber-600 font-bold">
              {delayed.toLocaleString()} {language === 'hi' ? 'में से' : 'of'} {total.toLocaleString()} ({delayedPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${delayedPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-600">
              {language === 'hi' ? 'स्वस्थ एवं पूर्ण कार्य वितरण' : 'Healthy & Completed Delivery'}
            </span>
            <span className="text-emerald-600 font-bold">
              {completed.toLocaleString()} {language === 'hi' ? 'में से' : 'of'} {total.toLocaleString()} ({compPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${compPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
