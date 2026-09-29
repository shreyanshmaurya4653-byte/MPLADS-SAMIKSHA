import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronUp, ChevronDown, MapPin } from 'lucide-react';
import { WorkStatusBadge } from './WorkStatusBadge';
import { formatCurrency } from '../../utils/formatCurrency';
import { getRiskBadgeConfig } from '../../utils/riskUtils';
import { useLanguage } from '../../hooks/useLanguage';

export function WorkTable({ works = [] }) {
  const { language, tr } = useLanguage();
  const [sortField, setSortField] = useState('risk_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [works, sortField, sortOrder]);

  const sortedWorks = [...works].sort((a, b) => {
    let aVal = a[sortField] ?? '';
    let bVal = b[sortField] ?? '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedWorks.length / pageSize) || 1;
  const paginatedWorks = sortedWorks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const renderSortIndicator = (field) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider select-none">
            <tr>
              <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1">{tr('ID')} {renderSortIndicator('id')}</div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('title')}>
                <div className="flex items-center gap-1">{tr('Work Title')} {renderSortIndicator('title')}</div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('sanctioned_amount')}>
                <div className="flex items-center gap-1">{tr('Sanctioned')} {renderSortIndicator('sanctioned_amount')}</div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('expenditure')}>
                <div className="flex items-center gap-1">{tr('Expenditure')} {renderSortIndicator('expenditure')}</div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('physical_progress')}>
                <div className="flex items-center gap-1">{tr('Progress')} {renderSortIndicator('physical_progress')}</div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">{tr('Status')} {renderSortIndicator('status')}</div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('risk_score')}>
                <div className="flex items-center gap-1">{tr('AI Risk')} {renderSortIndicator('risk_score')}</div>
              </th>
              <th className="py-3.5 px-4 text-right">{tr('Action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {sortedWorks.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                  {language === 'hi' ? 'चयनित अधिकार क्षेत्र के लिए कोई कार्य नहीं मिला' : 'No records found for the selected jurisdiction'}
                </td>
              </tr>
            ) : (
              paginatedWorks.map((work) => {
                const riskCfg = getRiskBadgeConfig(work.risk_level);
                return (
                  <tr key={work.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{work.id}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 leading-snug line-clamp-1">
                        {work.title && !work.title.includes('???') ? work.title : (work.description || `Work ${work.id}`)}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          work.house_type === 'Rajya Sabha'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {tr(work.house_type || 'Lok Sabha')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">{tr(work.category)}</span>
                        {work.mp_name && (
                          <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            {language === 'hi' ? 'सांसद: ' : 'MP: '}{work.mp_name}
                          </span>
                        )}
                        {work.subdivision && (
                          <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            {language === 'hi' ? 'तहसील/उप-प्रभाग: ' : 'Subdivision: '}{tr(work.subdivision)}
                          </span>
                        )}
                        {work.constituency_name && (
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {work.constituency_name} ({tr(work.district_name || 'District')})
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-800">{formatCurrency(work.sanctioned_amount, language)}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{formatCurrency(work.expenditure, language)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${work.physical_progress || 0}%` }}
                          />
                        </div>
                        <span className="font-semibold text-slate-600">{work.physical_progress || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <WorkStatusBadge status={work.status} />
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${riskCfg.badge}`}>
                        {work.risk_score || 0}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/works/${encodeURIComponent(work.id)}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          title="Inspect Satellite & Terrain Map"
                        >
                          <MapPin size={11} className="text-emerald-600" />
                          <span>Map</span>
                        </Link>
                        <Link
                          to={`/works/${encodeURIComponent(work.id)}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          {language === 'hi' ? 'विवरण' : 'Details'} <ArrowRight size={13} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {sortedWorks.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs select-none">
          <span className="text-slate-500 font-medium">
            {language === 'hi' ? 'दिखाए जा रहे हैं ' : 'Showing '}
            <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, sortedWorks.length)}</span> of <span className="font-bold text-slate-800">{sortedWorks.length}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {language === 'hi' ? 'पिछला' : 'Previous'}
            </button>
            <span className="px-2 text-slate-600 font-bold">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              {language === 'hi' ? 'अगला' : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
