import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  ShieldAlert, 
  FileText,
  Search,
  ExternalLink
} from 'lucide-react';
import { riskApi } from '../../api/riskApi';
import { Loader } from '../common/Loader';
import { formatCurrency } from '../../utils/formatCurrency';

export function ContractorRiskAnalysis({ filters = {} }) {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await riskApi.getContractorPerformance(filters);
        setContractors(data || []);
      } catch (err) {
        console.error('Error fetching contractor performance:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filters?.state_id, filters?.district_id, filters?.subdivision]);

  if (loading) {
    return <Loader text="Loading contractor performance & risk profiles..." />;
  }

  const filtered = contractors.filter((c) =>
    (c.contractor_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.registration_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.project_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-stone-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
            <Briefcase size={13} /> Contractor Performance & Vigilance Engine
          </div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight">
            Vendor Risk, Delay Index & Variance Analytics
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Real-time tracking of executing contractors across <strong>delay days</strong>, <strong>cost escalation variances</strong>, <strong>quality audits</strong>, and <strong>statutory compliance observations</strong> in accordance with the 28-table Supabase schema.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monitored Contractors</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{contractors.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active Class A / EPC Vendors</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">High Risk / Show-Cause</p>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {contractors.filter((c) => (c.performance_score || 0) < 60 || c.cost_variance_percentage > 20).length}
          </p>
          <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Score &lt; 60 or Variance &gt; 20%</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Delay Duration</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {Math.round(
              contractors.reduce((acc, curr) => acc + (curr.delay_days || 0), 0) / (contractors.length || 1)
            )} d
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Across active contracts</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Quality Rating</p>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {(
              contractors.reduce((acc, curr) => acc + (curr.quality_score || 0), 0) / (contractors.length || 1)
            ).toFixed(1)}/100
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Technical inspection index</p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Contractor Performance Audit Ledger</h4>
            <p className="text-xs text-slate-400">Live evaluations from the contractor_performance table</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search contractor, PAN, project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-4">Contractor & Registration</th>
                <th className="py-3 px-4">Assigned Project</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Delay</th>
                <th className="py-3 px-3 text-center">Quality</th>
                <th className="py-3 px-3 text-center">Cost Variance</th>
                <th className="py-3 px-3 text-center">Performance</th>
                <th className="py-3 px-4">Audit Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const isCritical = (c.performance_score || 0) < 50 || (c.cost_variance_percentage || 0) > 40;
                const isWarning = (c.performance_score || 0) < 70 && !isCritical;
                return (
                  <tr key={c.performance_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{c.contractor_name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{c.registration_number}</span>
                        <span>•</span>
                        <span>PAN: {c.pan_number}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800 line-clamp-1">{c.project_name || `Project #${c.project_id}`}</p>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {c.project_id}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.completion_status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.completion_status === 'Delayed'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {c.completion_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {c.delay_days > 0 ? (
                        <span className="text-amber-600">+{c.delay_days}d</span>
                      ) : (
                        <span className="text-emerald-600">On-Time</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={c.quality_score >= 80 ? 'text-emerald-600' : 'text-slate-700'}>
                        {c.quality_score}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {c.cost_variance_percentage > 0 ? (
                        <span className={c.cost_variance_percentage > 20 ? 'text-rose-600' : 'text-amber-600'}>
                          +{c.cost_variance_percentage}%
                        </span>
                      ) : (
                        <span className="text-emerald-600">0.0%</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black ${
                        isCritical
                          ? 'bg-rose-100 text-rose-700'
                          : isWarning
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {c.performance_score}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                        {c.remarks || 'Standard adherence'}
                      </p>
                      {c.compliance_issues > 0 && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                          {c.compliance_issues} Non-compliance notice(s)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
