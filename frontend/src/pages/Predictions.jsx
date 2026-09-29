import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { predictionsApi } from '../api/predictionsApi';
import { useLanguage } from '../hooks/useLanguage';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Clock,
  ExternalLink,
  ShieldAlert,
  Cpu,
  Layers,
  Zap,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Loader } from '../components/common/Loader';
import { JurisdictionSelectorBar } from '../components/common/JurisdictionSelectorBar';
import { useAuth } from '../hooks/useAuth';

export function Predictions() {
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
  const [delays, setDelays] = useState([]);
  const [overruns, setOverruns] = useState([]);
  const [trajectory, setTrajectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('delays');
  const [jurisdictionFilters, setJurisdictionFilters] = useState(getInitialFilters);

  const loadPredictions = async () => {
    setLoading(true);
    try {
      const [ovData, delData, ovrData, trajData] = await Promise.all([
        predictionsApi.getOverview(jurisdictionFilters),
        predictionsApi.getDelays(jurisdictionFilters),
        predictionsApi.getOverruns(jurisdictionFilters),
        predictionsApi.getTrajectory(jurisdictionFilters)
      ]);
      setOverview(ovData);
      setDelays(delData);
      setOverruns(ovrData);
      setTrajectory(trajData);
    } catch (err) {
      console.error('Failed to load predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, [jurisdictionFilters]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="text-purple-600" size={24} />
            <h1 className="text-xl font-bold text-slate-900">
              {language === 'hi' ? 'भविष्यवाणी विश्लेषिकी एवं प्रारंभिक चेतावनी' : 'Predictive Analytics & Early Warning Engine'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'hi'
              ? 'परियोजना विलंब संभावना स्कोर, लागत वृद्धि पूर्वानुमान और जोखिम प्रक्षेपवक्र'
              : 'SIH 26102 Predictive Intelligence: Delay Probability Estimator, Cost Overrun Forecaster & Risk Trajectory'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 text-xs">
          <Cpu className="text-purple-700" size={16} />
          <div>
            <span className="font-bold text-purple-900 block">GradientBoost & Isolation Forest</span>
            <span className="text-[10px] text-purple-600">Ensemble v2.4 Active</span>
          </div>
        </div>
      </div>

      {/* Role-Based Jurisdictional Selector */}
      <JurisdictionSelectorBar
        onFilterChange={setJurisdictionFilters}
        activeFilters={jurisdictionFilters}
        onDataUploaded={loadPredictions}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Monitored Public Works
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {overview?.total_monitored_works !== undefined ? overview.total_monitored_works.toLocaleString('en-IN') : 0}
          </div>
          <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-semibold">
            <Activity size={12} /> 100% Real-time ingestion
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-red-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            High Delay Risk Works
          </span>
          <div className="text-2xl font-black text-red-600 mt-1">
            {overview?.high_delay_risk_works ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Probability &gt; 70% of 6+ month slippage</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Projected Cost Overruns
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {overview?.projected_cost_overruns ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Burn rate exceeding schedule of rates</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-purple-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Average Portfolio Risk Score
          </span>
          <div className="text-2xl font-black text-purple-700 mt-1">
            {overview?.avg_predicted_risk_prob ?? 0} / 100
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Calculated across 8 core dimensions</span>
        </div>
      </div>

      {/* 12-Month Historical vs Predictive Trajectory Chart */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-purple-600" />
              National Risk Trajectory & Anomaly Frequency (Historical + 3-Month Forecast)
            </h3>
            <span className="text-[11px] text-slate-500">
              Tracking how predictive early-warning interventions bend the anomaly growth curve downward
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Actual Anomalies
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-3 h-3 rounded bg-purple-500 border border-dashed border-purple-700 inline-block" /> ML Forecast
            </span>
          </div>
        </div>

        {/* Trajectory Bar/Line Grid */}
        {trajectory.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {language === 'hi'
              ? 'वर्तमान में कोई विसंगति प्रक्षेपवक्र डेटा उपलब्ध नहीं है। विसंगति प्रवृत्तियों का विश्लेषण करने के लिए कार्य डेटा अपलोड करें।'
              : 'No anomaly trajectory data currently available. Upload work datasets to analyze anomaly trends.'}
          </div>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 text-center pt-4">
            {trajectory.map((t, idx) => {
              const heightActual = t.actual_anomalies ? Math.round((t.actual_anomalies / 220) * 100) : 0;
              const heightForecast = Math.round((t.predicted_anomalies / 220) * 100);
              const isForecast = t.actual_anomalies === null;

              return (
                <div key={idx} className="flex flex-col items-center">
                  <div className="h-28 w-full flex items-end justify-center gap-1 bg-slate-50 rounded-t p-1">
                    {t.actual_anomalies !== null && (
                      <div
                        style={{ height: `${heightActual}%` }}
                        className="w-3 bg-blue-600 rounded-t transition-all hover:bg-blue-700"
                        title={`Actual: ${t.actual_anomalies}`}
                      />
                    )}
                    <div
                      style={{ height: `${heightForecast}%` }}
                      className={`w-3 rounded-t transition-all ${
                        isForecast ? 'bg-purple-500 border-t-2 border-purple-800' : 'bg-purple-300'
                      }`}
                      title={`Forecast: ${t.predicted_anomalies}`}
                    />
                  </div>
                  <div className="w-full bg-slate-100 py-1 text-[9px] font-semibold text-slate-700 truncate border-t border-slate-200">
                    {t.month ? t.month.split(' ')[0] : ''}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs Switcher for Delay vs Overrun Forecaster */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('delays')}
          className={`px-4 py-2 rounded-t text-xs font-bold transition-colors ${
            activeTab === 'delays'
              ? 'bg-[#0b3b60] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Delay Risk Probability Forecaster ({delays.length})
        </button>
        <button
          onClick={() => setActiveTab('overruns')}
          className={`px-4 py-2 rounded-t text-xs font-bold transition-colors ${
            activeTab === 'overruns'
              ? 'bg-[#0b3b60] text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Cost Overrun & Escalation Models ({overruns.length})
        </button>
      </div>

      {/* Active Tab Content */}
      {loading ? (
        <Loader text="Computing predictive machine learning forecasts..." />
      ) : activeTab === 'delays' ? (
        delays.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-xs text-slate-400">
            {language === 'hi'
              ? 'वर्तमान में कोई विलंब जोखिम वाली परियोजनाएं नहीं पहचानी गई हैं।'
              : 'No high delay risk works identified in the current portfolio.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {delays.map((w) => (
              <div key={w.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-blue-700 font-bold block">WORK #{w.id} • {w.category}</span>
                    <Link
                      to={`/works/${encodeURIComponent(w.id)}`}
                      className="font-bold text-slate-900 hover:text-blue-700 text-xs block leading-snug mt-0.5"
                    >
                      {w.title}
                    </Link>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                      w.delay_probability >= 80
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {w.delay_probability}% PROBABILITY
                  </span>
                </div>

                {/* Progress and Forecast Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Progress</span>
                    <span className="font-extrabold text-slate-800 text-xs">{w.physical_progress}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Sanctioned</span>
                    <span className="font-extrabold text-slate-800 text-xs">
                      ₹{((w.sanctioned_amount || 0) / 100000).toFixed(1)}L
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Projected Delay</span>
                    <span className="font-extrabold text-red-600 text-xs">+{w.predicted_delay_months} Months</span>
                  </div>
                </div>

                {/* Inferred Root Cause */}
                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Inferred Root Cause: </span>
                  {w.root_cause}
                </div>

                {/* Recommended Intervention */}
                <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-[11px] text-blue-900 flex items-start gap-1.5">
                  <Zap size={14} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Recommended Administrative Action:</span>
                    {w.suggested_intervention}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Cost Overrun Forecasts Table */
        overruns.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-xs text-slate-400">
            {language === 'hi'
              ? 'वर्तमान में कोई लागत वृद्धि या ओवररन अनुमान नहीं मिले हैं।'
              : 'No projected cost overruns detected in the current portfolio.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0b3b60] text-white uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Work ID & Title</th>
                    <th className="px-4 py-3">Approved Sanction</th>
                    <th className="px-4 py-3">Spent to Date</th>
                    <th className="px-4 py-3">Physical Progress</th>
                    <th className="px-4 py-3">Projected Final Cost</th>
                    <th className="px-4 py-3">Cost Variance</th>
                    <th className="px-4 py-3">AI Decision Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overruns.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 max-w-xs">
                        <Link
                          to={`/works/${encodeURIComponent(o.id)}`}
                          className="font-semibold text-blue-700 hover:underline block truncate"
                        >
                          {o.title}
                        </Link>
                        <span className="text-[10px] text-slate-400">ID #{o.id} • {o.implementing_agency}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                        ₹{((o.sanctioned_amount || 0) / 100000).toFixed(2)}L
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        ₹{((o.expenditure_to_date || 0) / 100000).toFixed(2)}L
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{o.physical_progress}%</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-red-600">
                        ₹{((o.projected_total_cost || 0) / 100000).toFixed(2)}L
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 border border-red-200">
                          +{o.overrun_percentage}% OVERRUN
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-slate-600 text-[11px]">
                        {o.recommended_action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
