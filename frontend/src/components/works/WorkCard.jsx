import React from 'react';
import { Link } from 'react-router-dom';
import { Building, MapPin, ArrowRight } from 'lucide-react';
import { WorkStatusBadge } from './WorkStatusBadge';
import { formatCurrency } from '../../utils/formatCurrency';
import { getRiskColor } from '../../utils/riskUtils';
import { useLanguage } from '../../hooks/useLanguage';

export function WorkCard({ work }) {
  const { language, tr } = useLanguage();
  const riskColor = getRiskColor(work.risk_score || 0);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
            {work.id}
          </span>
          <WorkStatusBadge status={work.status} />
        </div>

        <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
          {work.title && !work.title.includes('???') ? work.title : (work.description || `Work ${work.id}`)}
        </h4>
        <p className="text-xs text-slate-500 mb-4">{tr(work.category)}</p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-slate-500">{language === 'hi' ? 'भौतिक प्रगति' : 'Physical Progress'}</span>
            <span className="text-slate-800">{work.physical_progress || 0}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${work.physical_progress || 0}%` }}
            />
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl mb-4 text-xs">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">{language === 'hi' ? 'स्वीकृत राशि' : 'Sanctioned'}</p>
            <p className="font-bold text-slate-800">{formatCurrency(work.sanctioned_amount, language)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">{language === 'hi' ? 'व्यय' : 'Spent'}</p>
            <p className="font-bold text-slate-800">{formatCurrency(work.expenditure, language)}</p>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: riskColor }} />
          <span className="text-xs font-bold" style={{ color: riskColor }}>
            {language === 'hi' ? 'जोखिम: ' : 'Risk: '}{work.risk_score || 0}/100
          </span>
        </div>
        <Link
          to={`/works/${encodeURIComponent(work.id)}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
        >
          {language === 'hi' ? 'विवरण' : 'Details'} <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
