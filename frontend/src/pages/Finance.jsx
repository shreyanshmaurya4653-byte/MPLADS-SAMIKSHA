import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { financeApi } from '../api/financeApi';
import { useLanguage } from '../hooks/useLanguage';
import {
  DollarSign,
  TrendingUp,
  AlertOctagon,
  FileCheck,
  CheckCircle2,
  ArrowUpRight,
  Filter,
  CreditCard,
  Building2,
  ExternalLink,
  PieChart
} from 'lucide-react';
import { Loader } from '../components/common/Loader';
import { JurisdictionSelectorBar } from '../components/common/JurisdictionSelectorBar';
import { useAuth } from '../hooks/useAuth';

export function Finance() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const role = user?.role || 'Ministry';

  // Auto-initialize jurisdiction filters based on authenticated user role
  const getInitialFilters = () => {
    if (role === 'District') {
      return {
        district_id: user?.district_id || 1,
        state_id: user?.state_id || 1
      };
    } else if (role === 'State') {
      return {
        state_id: user?.state_id || 1
      };
    } else if (role === 'MP') {
      return {
        mp_name: user?.name,
        constituency_id: user?.constituency_id,
        state_id: user?.state_id,
        house_type: user?.house_type || 'Lok Sabha'
      };
    }
    return {};
  };

  const [overview, setOverview] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flaggedOnly, setFlaggedOnly] = useState(true);
  const [jurisdictionFilters, setJurisdictionFilters] = useState(getInitialFilters);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ovData, payData] = await Promise.all([
        financeApi.getOverview(jurisdictionFilters),
        financeApi.getPayments({ flaggedOnly, ...jurisdictionFilters })
      ]);
      setOverview(ovData);
      setPayments(payData);
    } catch (err) {
      console.error('Failed to load financial intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [flaggedOnly, jurisdictionFilters]);

  const pipeline = overview?.summary || overview?.fund_pipeline || {
    total_sanctioned: 0,
    total_released: 0,
    total_spent: 0,
    unspent_balance: 0,
    utilization_rate: 0
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={24} />
            <h1 className="text-xl font-bold text-slate-900">
              {language === 'hi' ? 'वित्तीय एवं भुगतान सतर्कता बुद्धिमत्ता' : 'Financial & Payments Intelligence'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'hi'
              ? 'निधि प्रवाह (स्वीकृत → जारी → व्यय), अग्रिम भुगतान विसंगतियां एवं मील का पत्थर सत्यापन'
              : 'End-to-End Fund Flow Tracking, Milestone Discrepancies & Advance Disbursement Anomaly Detection'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
          <TrendingUp className="text-emerald-700" size={20} />
          <div>
            <span className="text-[10px] text-emerald-800 uppercase block font-semibold">Fund Utilization</span>
            <span className="text-lg font-black text-emerald-900">{pipeline.utilization_rate}%</span>
          </div>
        </div>
      </div>

      {/* Role-Based Jurisdictional Selector */}
      <JurisdictionSelectorBar
        onFilterChange={setJurisdictionFilters}
        activeFilters={jurisdictionFilters}
        onDataUploaded={fetchData}
      />

      {/* Fund Flow Pipeline Stages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border-l-4 border-l-blue-600 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            1. Total Sanctioned Pool
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            ₹{(pipeline.total_sanctioned / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Approved Administrative Allocations</span>
        </div>

        <div className="bg-white p-4 rounded-lg border-l-4 border-l-indigo-600 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            2. Tranche Released
          </span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            ₹{(pipeline.total_released / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Transferred to District Nodal Bank Accounts</span>
        </div>

        <div className="bg-white p-4 rounded-lg border-l-4 border-l-emerald-600 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            3. Ground Expenditure
          </span>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">
            ₹{(pipeline.total_spent / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Disbursed via Direct Vendor Payments</span>
        </div>

        <div className="bg-white p-4 rounded-lg border-l-4 border-l-amber-500 border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            4. Unspent Idle Balance
          </span>
          <div className="text-xl font-extrabold text-amber-600 mt-1">
            ₹{(pipeline.unspent_balance / 10000000).toFixed(2)} Cr
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Pending Utilization Certificates</span>
        </div>
      </div>

      {/* Sector Baseline Comparison & Flagged Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flagged Payment Summary Card */}
        <div className="bg-red-50/70 border border-red-200 rounded-lg p-5">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm mb-2">
            <AlertOctagon size={18} />
            Payment-to-Progress Mismatch Risks
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            The AI engine automatically cross-checks contractor payment disbursals against certified physical ground milestones. Flagged vouchers represent payments released disproportionately in advance without verified ground execution.
          </p>
          <div className="mt-4 pt-3 border-t border-red-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Flagged Milestone Vouchers:</span>
            <span className="font-black text-red-700 text-sm">{overview?.flagged_payments_count || payments.length}</span>
          </div>
        </div>

        {/* Sector Cost Comparison */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <PieChart size={14} className="text-blue-600" />
            Sectoral Cost Baseline Benchmark Analysis
          </h3>
          {(overview?.category_baselines || []).length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              {language === 'hi'
                ? 'कोई क्षेत्रीय लागत आधारभूत डेटा उपलब्ध नहीं है।'
                : 'No sectoral cost baseline benchmarks available.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {(overview?.category_baselines || []).map((sec, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded border border-slate-200">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>{sec.category || sec.sector}</span>
                    <span className="text-[10px] text-blue-700">{sec.count || sec.works_count} works</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
                    <span>Avg Sanction: ₹{((sec.avg_sanctioned || sec.avg_cost || 0) / 100000).toFixed(2)}L</span>
                    <span className="text-emerald-700 font-semibold">Spent: ₹{((sec.avg_expenditure || 0) / 100000).toFixed(2)}L</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Flagged Payments Ledger */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard size={16} className="text-blue-600" />
              Vendor Payment Vouchers & Milestone Audit
            </h3>
            <span className="text-xs text-slate-500">
              Disbursal records inspected by AI integrity rule-checkers
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFlaggedOnly(!flaggedOnly)}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
                flaggedOnly
                  ? 'bg-red-600 text-white border-red-700 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {flaggedOnly ? 'Showing Flagged Discrepancies Only' : 'Show All Vouchers'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8"><Loader text="Auditing financial payments..." /></div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No payment records found under selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b3b60] text-white uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Voucher #</th>
                  <th className="px-4 py-3">Work Project</th>
                  <th className="px-4 py-3">Voucher Amount</th>
                  <th className="px-4 py-3">Ground Progress at Payment</th>
                  <th className="px-4 py-3">Disbursal Date</th>
                  <th className="px-4 py-3">Audit Finding / Flag Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.payment_id} className={`hover:bg-slate-50 ${p.is_flagged ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-bold text-slate-800">#PAY-{p.payment_id}</span>
                      <div className="text-[10px] text-slate-400">Tranche {p.installment_no}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <Link
                        to={`/works/${encodeURIComponent(p.work_id)}`}
                        className="font-semibold text-blue-700 hover:underline flex items-center gap-1 truncate"
                        title={p.work_title || 'Work #' + p.work_id}
                      >
                        {p.work_title || `Work #${p.work_id}`} <ExternalLink size={11} />
                      </Link>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Sanctioned: ₹{((p.sanctioned_amount || 0) / 100000).toFixed(2)}L
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900">
                      ₹{((p.amount || 0) / 100000).toFixed(2)} Lakhs
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          (p.physical_progress_at_payment || 0) < 30
                            ? 'bg-red-100 text-red-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.physical_progress_at_payment || 0}% Progress
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {p.is_flagged ? (
                        <div className="flex items-center gap-1.5 text-red-700 font-semibold text-[11px]">
                          <AlertOctagon size={13} className="shrink-0" />
                          <span>{p.flag_reason || 'Advance payment with disproportionate milestone lag'}</span>
                        </div>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1 text-[11px]">
                          <FileCheck size={13} /> Verified Against Milestone Certificate
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
