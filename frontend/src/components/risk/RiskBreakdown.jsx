import React from 'react';

export function RiskBreakdown({ dossier }) {
  const factors = [
    { label: 'Financial / Cost Overrun', score: dossier?.cost_risk ?? 45, max: 100, color: 'bg-rose-500' },
    { label: 'Milestone & Execution Delay', score: dossier?.delay_risk ?? 60, max: 100, color: 'bg-amber-500' },
    { label: 'Payment-Progress Velocity Gap', score: dossier?.payment_risk ?? 40, max: 100, color: 'bg-purple-500' },
    { label: 'Duplicate Proposal Lexical Match', score: dossier?.duplicate_risk ?? 15, max: 100, color: 'bg-blue-500' },
    { label: 'Guideline Compliance Deviation', score: dossier?.compliance_risk ?? 20, max: 100, color: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
      <h4 className="text-sm font-bold text-slate-900 mb-1">Multi-Factor Risk Breakdown</h4>
      <p className="text-xs text-slate-400 mb-5">Sub-model weight distribution & specific risk vectors</p>

      <div className="space-y-4">
        {factors.map((f) => (
          <div key={f.label}>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-600">{f.label}</span>
              <span className="text-slate-900 font-bold">{f.score}/100</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full ${f.color} rounded-full transition-all duration-500`}
                style={{ width: `${Math.min(100, f.score)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
