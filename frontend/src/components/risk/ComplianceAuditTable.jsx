import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertOctagon, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Search,
  FileCheck2
} from 'lucide-react';
import { riskApi } from '../../api/riskApi';
import { Loader } from '../common/Loader';

export function ComplianceAuditTable({ filters = {} }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await riskApi.getComplianceResults(filters);
        setResults(data || []);
      } catch (err) {
        console.error('Error fetching compliance results:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [filters?.state_id, filters?.district_id, filters?.subdivision]);

  if (loading) {
    return <Loader text="Evaluating MPLADS 2023 Statutory Compliance Rules..." />;
  }

  const filtered = results.filter((r) => {
    const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchSearch =
      (r.rule_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.rule_category || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.project_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.deviation_notes || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const warnCount = results.filter((r) => r.status === 'WARNING').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
            <ShieldCheck size={13} /> Statutory Scheme Guidelines Auditor
          </div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight">
            MoSPI MPLADS Compliance & Regulatory Audit Matrix
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Automated verification against official <strong>MPLADS Guidelines 2023</strong> covering Administrative Sanction ceilings, Utilization Certificate submission, asset duplication prohibitions, and physical-to-payment alignment rules.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rules Checked</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{results.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Statutory parameters</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passed Compliance</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{passCount}</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">100% compliant</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Warnings / Pending UCs</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{warnCount}</p>
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Requires clarification</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Critical Breaches</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{failCount}</p>
          <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Non-compliant violations</p>
        </div>
      </div>

      {/* Compliance Ledger */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {['ALL', 'FAIL', 'WARNING', 'PASS'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {st} {st === 'FAIL' ? `(${failCount})` : st === 'WARNING' ? `(${warnCount})` : st === 'PASS' ? `(${passCount})` : ''}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search rule or deviation..."
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
                <th className="py-3 px-4">Statutory Rule</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Subject Project</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Severity</th>
                <th className="py-3 px-4">Auditor Findings & Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.compliance_id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-mono font-bold text-blue-700">{r.rule_name}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {r.rule_category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{r.project_name || `Project #${r.project_id}`}</p>
                    <span className="text-[10px] font-mono text-slate-400">{r.project_code || `PRJ-${r.project_id}`}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      r.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-700'
                        : r.status === 'WARNING'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}>
                      {r.status === 'PASS' && <CheckCircle2 size={11} />}
                      {r.status === 'WARNING' && <AlertTriangle size={11} />}
                      {r.status === 'FAIL' && <AlertOctagon size={11} />}
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-[10px] font-bold uppercase ${
                      r.severity === 'CRITICAL' ? 'text-rose-600' : r.severity === 'HIGH' ? 'text-orange-600' : 'text-slate-500'
                    }`}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-md">
                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                      {r.deviation_notes}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
