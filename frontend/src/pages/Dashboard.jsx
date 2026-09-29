import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  IndianRupee, 
  Clock, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  Landmark,
  PiggyBank,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { dashboardApi } from '../api/dashboardApi';
import { useWorks } from '../hooks/useWorks';
import { StatCard } from '../components/dashboard/StatCard';
import { TrendChart } from '../components/dashboard/TrendChart';
import { FundUtilizationChart } from '../components/dashboard/FundUtilizationChart';
import { RiskOverview } from '../components/dashboard/RiskOverview';
import { RecentAlerts } from '../components/dashboard/RecentAlerts';
import { WorkTable } from '../components/works/WorkTable';
import { formatCurrency } from '../utils/formatCurrency';
import { Loader } from '../components/common/Loader';
import { JurisdictionSelectorBar } from '../components/common/JurisdictionSelectorBar';

export function Dashboard() {
  const { user } = useAuth();
  const { language, t, tr } = useLanguage();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jurisdictionFilters, setJurisdictionFilters] = useState({});
  const { works, refetch: refetchWorks } = useWorks({ ...jurisdictionFilters, limit: 6 });

  // Re-fetch dashboard data whenever jurisdiction filter (State, District, etc.) or user role changes
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [statsData, trendsData, alertsData] = await Promise.all([
          dashboardApi.getStats(jurisdictionFilters),
          dashboardApi.getUtilizationTrends(jurisdictionFilters),
          dashboardApi.getRecentAlerts(jurisdictionFilters)
        ]);
        setStats(statsData);
        setTrends(Array.isArray(trendsData) ? trendsData : []);
        setAlerts(Array.isArray(alertsData) ? alertsData : []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user?.role, JSON.stringify(jurisdictionFilters)]);

  if (loading && !stats) {
    return <Loader text={language === 'hi' ? 'वास्तविक समय शासन विश्लेषण संकलित किया जा रहा है...' : 'Aggregating live governance intelligence...'} />;
  }

  const jurisdictionName =
    jurisdictionFilters.state_id && jurisdictionFilters.state_id !== 'All'
      ? `${language === 'hi' ? 'राज्य दायरा' : 'State Scope'} (ID: ${jurisdictionFilters.state_id})`
      : user?.constituency_name ||
        user?.district_name ||
        (user?.state_name ? tr(user.state_name) : '') ||
        t('nationalOverview', 'National Central Sector Scheme Overview');

  const totalWorks = stats?.total_works || 0;
  const totalSanctioned = stats?.total_sanctioned || 0;
  const totalExpenditure = stats?.total_expenditure || 0;
  const unspentBalance = stats?.unspent_balance || Math.max(0, totalSanctioned - totalExpenditure);
  const utilizationRate = stats?.utilization_rate || (totalSanctioned > 0 ? Math.round((totalExpenditure / totalSanctioned) * 100) : 0);
  const completedWorks = stats?.completed_works || 0;
  const delayedWorks = stats?.delayed_works || 0;
  const highRiskWorks = stats?.high_risk_works || 0;
  const entitlementAmount = stats?.entitlement_amount || 0;
  const activeMpsCount = stats?.active_mps_count || 0;

  const isConstituencySelected = Boolean(jurisdictionFilters.constituency_id && jurisdictionFilters.constituency_id !== 'All');
  const isMpSelected = Boolean(jurisdictionFilters.mp_name && jurisdictionFilters.mp_name !== 'All');
  const isMPRole = user?.role === 'MP';
  
  // Show MP Allocated Limit box ONLY when logged in as an MP, or when a particular constituency or MP is selected
  const showMpAllocatedLimit = isMPRole || isConstituencySelected || isMpSelected;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg shadow-blue-950/10">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20">
              {user?.role ? tr(user.role) : (language === 'hi' ? 'प्रशासनिक' : 'Administrative')} {t('governanceConsole', 'Governance Console')}
            </span>
            <h2 className="text-2xl md:text-3xl font-black mt-2 tracking-tight">
              {jurisdictionName}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {t('heroDesc')}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-3xl font-black">{utilizationRate}%</p>
              <p className="text-[11px] text-blue-300 font-semibold uppercase tracking-wider">
                {t('absorptionRate', 'Fund Absorption Rate')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role-Based Jurisdiction & MP Selector Bar */}
      <JurisdictionSelectorBar
        onFilterChange={setJurisdictionFilters}
        activeFilters={jurisdictionFilters}
        onDataUploaded={() => {
          if (refetchWorks) refetchWorks();
        }}
      />

      {/* Unified Aggregated Financial Flow & Governance Pipeline */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
              jurisdictionFilters.house_type === 'Rajya Sabha'
                ? 'bg-purple-600 text-white'
                : showMpAllocatedLimit
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-white'
            }`}>
              <Landmark size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm md:text-base text-slate-900">
                  {jurisdictionFilters.house_type === 'Rajya Sabha'
                    ? (language === 'hi' ? 'राज्य सभा वित्तीय प्रवाह एवं अभिशासन' : 'Rajya Sabha Financial Pipeline & Governance')
                    : showMpAllocatedLimit
                    ? (jurisdictionFilters.mp_name || user?.name || (language === 'hi' ? 'माननीय सांसद' : "Hon'ble MP"))
                    : t('financialFlowFunnel', 'National / Jurisdictional Financial Flow & Governance')}
                </h3>
                {jurisdictionFilters.house_type ? (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    jurisdictionFilters.house_type === 'Rajya Sabha'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {jurisdictionFilters.house_type}
                  </span>
                ) : showMpAllocatedLimit ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    MP Profile
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">
                {jurisdictionFilters.house_type === 'Rajya Sabha'
                  ? (language === 'hi' ? 'इस क्षेत्र में राज्य सभा सदस्यों द्वारा स्वीकृत एवं वितरित योजनाओं का वित्तीय विश्लेषण' : 'Tracking MPLADS funds & works sanctioned strictly by Rajya Sabha Members')
                  : showMpAllocatedLimit
                  ? (language === 'hi' ? 'सांसद स्थानीय क्षेत्र विकास योजना (एमपीलैड्स) वित्तीय कोटा एवं स्थिति' : 'MPLADS Entitlement Quota & Lifecycle Financial Progress')
                  : t('financialFlowSub', 'End-to-end tracking: Scheme Sanctions → Realized Expenditure → Risk Oversight')}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            {utilizationRate}% {language === 'hi' ? 'निधि उपयोग दर' : 'Fund Utilization'}
          </span>
        </div>

        {/* Unified Governance & Financial Pipeline */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showMpAllocatedLimit ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3.5 pt-1`}>
          {/* 1. MP Allocated Limit / Entitlement (Only shown when MP or specific constituency selected) */}
          {showMpAllocatedLimit && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                    {language === 'hi' ? 'सांसद आवंटित सीमा' : 'MP Allocated Limit'}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                    <Landmark size={13} />
                  </div>
                </div>
                <span className="text-xl font-black text-blue-950 mt-1 block">
                  {formatCurrency(entitlementAmount, language)}
                </span>
              </div>
              <span className="text-[10px] text-blue-600 font-medium mt-1">
                {jurisdictionFilters.mp_name || (user?.role === 'MP' ? (user?.name || "Hon'ble MP") : (language === 'hi' ? 'संसदीय कोटा' : 'Parliamentary Quota'))}
              </span>
            </div>
          )}

          {/* 2. Scheme Sanctions & Approved Works */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                  {t('sanctionedCommitment', 'Approved Sanctions')}
                </span>
                <div className="w-6 h-6 rounded-lg bg-slate-200/70 flex items-center justify-center text-slate-700">
                  <Briefcase size={13} />
                </div>
              </div>
              <span className="text-xl font-black text-slate-900 mt-1 block">
                {formatCurrency(totalSanctioned, language)}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1">
              {totalWorks.toLocaleString()} {language === 'hi' ? 'स्वीकृत कार्य' : 'works approved'}
            </span>
          </div>

          {/* 3. Disbursed Expenditure */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  {t('disbursedExpenditure', 'Disbursed Expenditure')}
                </span>
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <IndianRupee size={13} />
                </div>
              </div>
              <span className="text-xl font-black text-emerald-700 mt-1 block">
                {formatCurrency(totalExpenditure, language)}
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 font-medium mt-1">
              {completedWorks.toLocaleString()} {language === 'hi' ? 'पूर्ण' : 'delivered'} ({utilizationRate}% {language === 'hi' ? 'व्यय' : 'spent'})
            </span>
          </div>

          {/* 4. Unspent Balance */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                  {t('idleBalance', 'Unspent Balance')}
                </span>
                <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                  <PiggyBank size={13} />
                </div>
              </div>
              <span className="text-xl font-black text-amber-700 mt-1 block">
                {formatCurrency(unspentBalance, language)}
              </span>
            </div>
            <span className="text-[10px] text-amber-600 font-medium mt-1">
              {language === 'hi' ? 'परियोजना पाइपलाइन शेष' : 'Committed project pipeline'}
            </span>
          </div>

          {/* 5. High Risk Anomalies */}
          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
                  {t('highRiskWorks', 'High Risk Anomalies')}
                </span>
                <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
                  <AlertTriangle size={13} />
                </div>
              </div>
              <span className="text-xl font-black text-rose-900 mt-1 block">
                {highRiskWorks.toLocaleString()}
              </span>
            </div>
            <span className="text-[10px] text-rose-600 font-medium mt-1">
              {language === 'hi' ? 'भौतिक निरीक्षण आवश्यक' : 'Requires field inspection'}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <div className="flex justify-between text-xs font-semibold mb-1.5 text-slate-600">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={13} className="text-emerald-600" />
              {t('absorptionPace', 'Overall Fund Absorption Velocity')}
            </span>
            <span className="font-bold text-slate-900">{utilizationRate}% {language === 'hi' ? 'व्यय' : 'Spent'}</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full transition-all duration-700" 
              style={{ width: `${Math.min(100, utilizationRate)}%` }} 
              title={`Spent: ${utilizationRate}%`}
            />
            <div 
              className="bg-amber-400 h-full transition-all duration-700" 
              style={{ width: `${Math.max(0, 100 - utilizationRate)}%` }} 
              title={`Unspent Balance: ${100 - utilizationRate}%`}
            />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendChart data={trends} />
        <FundUtilizationChart data={trends} />
      </div>

      {/* Risk Overview & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskOverview stats={stats} />
        <RecentAlerts alerts={alerts} />
      </div>

      {/* Priority Works Table Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'hi' ? 'प्राथमिकता परियोजनाएं अवलोकन' : 'Priority Projects Overview'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'hi' ? 'इस अधिकार क्षेत्र में हाल ही में अद्यतन कार्य' : 'Recently updated works across this jurisdiction'}
            </p>
          </div>
          <Link
            to="/works"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            {language === 'hi' ? `सभी कार्य (${works.length.toLocaleString()})` : `All Works (${works.length.toLocaleString()})`} <ArrowRight size={13} />
          </Link>
        </div>
        <WorkTable works={works.slice(0, 5)} />
      </div>
    </div>
  );
}
