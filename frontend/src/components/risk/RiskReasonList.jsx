import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export function RiskReasonList({ reasons = [], anomalies = [] }) {
  if (!reasons.length && !anomalies.length) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex items-center gap-3 text-emerald-700 bg-emerald-50/50">
        <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
        <p className="text-xs font-semibold">No critical risk anomalies flagged for this project.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
      <h4 className="text-sm font-bold text-slate-900 mb-1">Explainable AI Audit Drivers</h4>
      <p className="text-xs text-slate-400 mb-4">Root causes identified by machine learning anomaly detectors</p>

      <div className="space-y-3">
        {reasons.map((reason, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="mt-0.5 text-amber-500 flex-shrink-0">
              <AlertTriangle size={15} />
            </div>
            <p className="text-xs font-medium text-slate-700 leading-relaxed">{reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
