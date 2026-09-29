import React from 'react';
import { 
  TrendingUp, 
  Wallet, 
  FileSpreadsheet, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Building, 
  ArrowUpRight,
  ShieldAlert,
  Percent,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

export function ProblemStatementAnomalyBreakdown({ anomalies, activeTab = 'all' }) {
  if (!anomalies) return null;

  const {
    expenditure_patterns: exp,
    fund_utilization: util,
    cost_estimates: cost,
    work_execution: exec
  } = anomalies;

  return (
    <div className="space-y-6">
      {/* 1. EXPENDITURE PATTERNS ANOMALIES */}
      {(activeTab === 'all' || activeTab === 'expenditure') && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <TrendingUp size={16} />
                </span>
                <h4 className="text-sm font-bold text-slate-900">1. Expenditure Patterns &amp; Velocity Anomalies</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Detection of abnormal outlay spikes, velocity surges, and agency fund concentration
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-3 py-1 bg-rose-50 text-rose-700 font-bold rounded-full border border-rose-200">
                {exp?.total_spikes_flagged || 0} Surges Flagged
              </span>
              <span className="text-slate-400 font-semibold">
                Spike Rate: <strong className="text-slate-800">{exp?.spike_rate_pct}%</strong>
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-2xl text-xs text-slate-600 border border-slate-200/60">
            <strong>AI Audit Finding: </strong> {exp?.audit_summary}
          </div>

          {/* Spikes Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Project ID &amp; Title</th>
                  <th className="py-2.5 px-3">Agency</th>
                  <th className="py-2.5 px-3">Sanctioned</th>
                  <th className="py-2.5 px-3">Actual Outlay</th>
                  <th className="py-2.5 px-3">Surge Deviation</th>
                  <th className="py-2.5 px-3">Anomaly Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {exp?.flagged_spikes?.map((item) => (
                  <tr key={item.work_id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      <Link to={`/works/${encodeURIComponent(item.work_id)}`} className="font-bold text-slate-900 hover:text-blue-600 block truncate max-w-xs">
                        {item.work_id} &bull; {item.title}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-normal">{item.category}</span>
                    </td>
                    <td className="py-2.5 px-3 truncate max-w-xs text-slate-600">{item.implementing_agency}</td>
                    <td className="py-2.5 px-3">{formatCurrency(item.sanctioned_amount)}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">{formatCurrency(item.expenditure)}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">+{item.spike_percentage}%</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {item.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Agency Concentration */}
          <div className="pt-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Top Executing Agencies by Fund Concentration:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              {exp?.agency_concentration?.slice(0, 3).map((ag, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-800 truncate pr-2">{ag.agency}</span>
                  <span className="font-bold text-blue-600 flex-shrink-0">{ag.share_pct}% Share</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. FUND UTILIZATION ANOMALIES */}
      {(activeTab === 'all' || activeTab === 'utilization') && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <Wallet size={16} />
                </span>
                <h4 className="text-sm font-bold text-slate-900">2. Fund Utilization &amp; Idle Capital Anomalies</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Release vs disbursement deficits, unspent balances, and slow utilization velocity
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-full border border-blue-200">
                {util?.overall_utilization_rate}% Overall Utilization
              </span>
              <span className="text-slate-400 font-semibold">
                Idle Works: <strong className="text-amber-600">{util?.idle_projects_count}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sanctioned Ceiling</p>
              <p className="text-base font-black text-slate-900 mt-0.5">{formatCurrency(util?.total_sanctioned)}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Released to Agency</p>
              <p className="text-base font-black text-blue-600 mt-0.5">{formatCurrency(util?.total_released)}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Utilized Incurred</p>
              <p className="text-base font-black text-emerald-600 mt-0.5">{formatCurrency(util?.total_utilized)}</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Unspent Idle Balance</p>
              <p className="text-base font-black text-amber-600 mt-0.5">{formatCurrency(util?.total_unspent_balance)}</p>
            </div>
          </div>

          {/* Idle Projects Table */}
          {util?.idle_projects?.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-bold text-amber-900">Projects with Idle / Lagging Utilization:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-amber-50/50 text-amber-800 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Work ID &amp; Title</th>
                      <th className="py-2.5 px-3">Released</th>
                      <th className="py-2.5 px-3">Utilized</th>
                      <th className="py-2.5 px-3">Unspent Balance</th>
                      <th className="py-2.5 px-3">Physical Progress</th>
                      <th className="py-2.5 px-3">Audit Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {util?.idle_projects?.map((item) => (
                      <tr key={item.work_id}>
                        <td className="py-2.5 px-3">
                          <Link to={`/works/${encodeURIComponent(item.work_id)}`} className="font-bold text-slate-900 hover:text-blue-600">
                            {item.work_id} &bull; {item.title}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3">{formatCurrency(item.released_amount)}</td>
                        <td className="py-2.5 px-3">{formatCurrency(item.expenditure)} ({item.utilization_pct}%)</td>
                        <td className="py-2.5 px-3 font-bold text-amber-600">{formatCurrency(item.unspent_balance)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{item.physical_progress}%</td>
                        <td className="py-2.5 px-3 text-amber-700 font-semibold">{item.audit_note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. COST ESTIMATES ANOMALIES */}
      {(activeTab === 'all' || activeTab === 'cost') && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                  <FileSpreadsheet size={16} />
                </span>
                <h4 className="text-sm font-bold text-slate-900">3. Cost Estimates &amp; Budget Overrun Anomalies</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Sanctioned ceiling breaches, Schedule of Rates (SoR) deviations, and cost inflation
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold rounded-full border border-purple-200">
                {cost?.overrun_project_count} Overruns ({cost?.overrun_rate_pct}%)
              </span>
              <span className="text-slate-400 font-semibold">
                Total Overrun: <strong className="text-rose-600">{formatCurrency(cost?.total_overrun_amount)}</strong>
              </span>
            </div>
          </div>

          <div className="p-3 bg-purple-50/50 rounded-2xl text-xs text-purple-900 border border-purple-100">
            <strong>AI Audit Directive: </strong> {cost?.audit_summary}
          </div>

          {/* Overruns Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Work ID &amp; Title</th>
                  <th className="py-2.5 px-3">DPR Estimate</th>
                  <th className="py-2.5 px-3">Sanctioned Ceiling</th>
                  <th className="py-2.5 px-3">Actual Incurred</th>
                  <th className="py-2.5 px-3">Budget Breach Amount</th>
                  <th className="py-2.5 px-3">Overrun %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {cost?.flagged_overruns?.map((item) => (
                  <tr key={item.work_id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      <Link to={`/works/${encodeURIComponent(item.work_id)}`} className="font-bold text-slate-900 hover:text-blue-600">
                        {item.work_id} &bull; {item.title}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{formatCurrency(item.estimated_cost)}</td>
                    <td className="py-2.5 px-3">{formatCurrency(item.sanctioned_amount)}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">{formatCurrency(item.actual_expenditure)}</td>
                    <td className="py-2.5 px-3 font-bold text-rose-600">+{formatCurrency(item.overrun_amount)}</td>
                    <td className="py-2.5 px-3 font-black text-rose-600">+{item.overrun_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. WORK EXECUTION ANOMALIES */}
      {(activeTab === 'all' || activeTab === 'execution') && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Activity size={16} />
                </span>
                <h4 className="text-sm font-bold text-slate-900">4. Work Execution &amp; Payment-Progress Divergence</h4>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Disbursements outpacing physical progress by &ge; 20%, milestone delay tracking, and stalled works
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="px-3 py-1 bg-rose-50 text-rose-700 font-bold rounded-full border border-rose-200">
                {exec?.mismatch_count} Payment Gaps
              </span>
              <span className="text-slate-400 font-semibold">
                Delayed Works: <strong className="text-amber-600">{exec?.delayed_count} ({exec?.delayed_rate_pct}%)</strong>
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50/50 rounded-2xl text-xs text-amber-900 border border-amber-100">
            <strong>AI Audit Directive: </strong> {exec?.audit_summary}
          </div>

          {/* Progress-Payment Mismatches */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800">Critical Payment vs Physical Milestone Disconnects:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Work Title</th>
                    <th className="py-2.5 px-3">Physical Progress</th>
                    <th className="py-2.5 px-3">Payment Disbursed</th>
                    <th className="py-2.5 px-3">Disconnection Gap</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Action Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {exec?.progress_payment_mismatches?.map((item) => (
                    <tr key={item.work_id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <Link to={`/works/${encodeURIComponent(item.work_id)}`} className="font-bold text-slate-900 hover:text-blue-600 block truncate max-w-xs">
                          {item.work_id} &bull; {item.title}
                        </Link>
                        <span className="text-[10px] text-slate-400">{item.implementing_agency}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.physical_progress}%</td>
                      <td className="py-2.5 px-3 font-bold text-rose-600">{item.payment_utilization}%</td>
                      <td className="py-2.5 px-3 font-black text-rose-600">+{item.mismatch_gap}% gap</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] font-semibold text-slate-600">
                        Halt interim payments until field certification
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default ProblemStatementAnomalyBreakdown;
