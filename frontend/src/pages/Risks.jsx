import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Layers, 
  Info, 
  Copy, 
  TrendingUp, 
  Wallet, 
  FileSpreadsheet, 
  Activity, 
  Briefcase, 
  Database, 
  Filter 
} from 'lucide-react';
import { useRisks } from '../hooks/useRisks';
import { useWorks } from '../hooks/useWorks';
import { useLanguage } from '../hooks/useLanguage';
import { riskApi } from '../api/riskApi';
import { StatCard } from '../components/dashboard/StatCard';
import { RiskDistribution } from '../components/risk/RiskDistribution';
import { WorkTable } from '../components/works/WorkTable';
import { ProjectSimilarityAnalysis } from '../components/risk/ProjectSimilarityAnalysis';
import { ProblemStatementAnomalyBreakdown } from '../components/risk/ProblemStatementAnomalyBreakdown';
import { ContractorRiskAnalysis } from '../components/risk/ContractorRiskAnalysis';
import { ComplianceAuditTable } from '../components/risk/ComplianceAuditTable';
import { DatabaseSchemaExplorer } from '../components/risk/DatabaseSchemaExplorer';
import { JurisdictionSelectorBar } from '../components/common/JurisdictionSelectorBar';
import { Loader } from '../components/common/Loader';

export function Risks() {
  const { language, tr } = useLanguage();
  const [jurisdictionFilters, setJurisdictionFilters] = useState({});
  const { overview, loading: riskLoading, refetch: refetchRisks } = useRisks(jurisdictionFilters);
  const { works, loading: worksLoading, refetch: refetchWorks } = useWorks(jurisdictionFilters);
  const { works: highRiskWorksData, loading: highRiskLoading, refetch: refetchHighRisk } = useWorks({
    ...jurisdictionFilters,
    risk_level: 'High',
    sort_by: 'risk_score',
    limit: 1000
  });
  const [anomalyData, setAnomalyData] = useState(null);
  const [anomalyLoading, setAnomalyLoading] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState('overview'); 

  useEffect(() => {
    async function loadAnomalies() {
      try {
        setAnomalyLoading(true);
        const data = await riskApi.getAnomalyBreakdown(jurisdictionFilters);
        setAnomalyData(data);
      } catch (err) {
        console.error('Failed to load anomaly breakdown:', err);
      } finally {
        setAnomalyLoading(false);
      }
    }
    loadAnomalies();
  }, [jurisdictionFilters?.state_id, jurisdictionFilters?.district_id, jurisdictionFilters?.constituency_id, jurisdictionFilters?.house_type]);

  const highRiskWorks = useMemo(() => {
    if (highRiskWorksData && highRiskWorksData.length > 0) {
      return highRiskWorksData;
    }
    return (works || []).filter(
      (w) => w.risk_level === 'High' || w.risk_level === 'Critical' || (w.risk_score || 0) >= 40
    );
  }, [highRiskWorksData, works]);

  if (riskLoading || worksLoading || highRiskLoading || anomalyLoading) {
    return <Loader text={language === 'hi' ? 'बहु-स्तंभीय विसंगति एवं दोहराव पहचान विश्लेषण संकलित किया जा रहा है...' : 'Synthesizing multi-pillar anomaly & duplicate detection intelligence...'} />;
  }

  const navigationTabs = [
    { id: 'overview', label: language === 'hi' ? 'समग्र जोखिम अवलोकन' : 'Composite Risk Overview', icon: Layers },
    { id: 'expenditure', label: language === 'hi' ? 'व्यय पैटर्न' : 'Expenditure Patterns', icon: TrendingUp, badge: anomalyData?.expenditure_patterns?.total_spikes_flagged },
    { id: 'utilization', label: language === 'hi' ? 'निधि उपयोग' : 'Fund Utilization', icon: Wallet, badge: anomalyData?.fund_utilization?.idle_projects_count },
    { id: 'cost', label: language === 'hi' ? 'लागत अनुमान' : 'Cost Estimates', icon: FileSpreadsheet, badge: anomalyData?.cost_estimates?.overrun_project_count },
    { id: 'execution', label: language === 'hi' ? 'कार्य निष्पादन' : 'Work Execution', icon: Activity, badge: anomalyData?.work_execution?.mismatch_count },
    { id: 'similarity', label: language === 'hi' ? 'परियोजना समानता एवं दोहराव' : 'Project Similarity & Duplicates', icon: Copy, badge: anomalyData?.project_similarity?.total_pairs_flagged, highlight: true },
    { id: 'contractors', label: language === 'hi' ? 'ठेकेदार सतर्कता' : 'Contractor Vigilance', icon: Briefcase },
    { id: 'compliance', label: language === 'hi' ? 'वैधानिक दिशानिर्देश' : 'Statutory Guidelines', icon: ShieldCheck, badge: 6 },
    { id: 'database', label: language === 'hi' ? '28-तालिका संरचना' : '28-Table Architecture', icon: Database, badge: 28, highlight: true },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {language === 'hi' ? 'एआई विसंगति एवं जोखिम विश्लेषण केंद्र' : 'AI Anomaly & Risk Intelligence Center'}
          </h3>
          <p className="text-xs text-slate-400">
            {language === 'hi'
              ? 'सभी वैधानिक एमपीलैड्स स्तंभों और 28-तालिका डेटाबेस में स्वचालित बहु-कारक विसंगति निगरानी'
              : 'Automated multi-factor anomaly monitoring across all statutory MPLADS scheme pillars & 28-table database'}
          </p>
        </div>
      </div>

      {/* Role-Based Jurisdiction & MP Selector Bar */}
      <JurisdictionSelectorBar
        onFilterChange={setJurisdictionFilters}
        activeFilters={jurisdictionFilters}
        onDataUploaded={() => {
          if (refetchWorks) refetchWorks();
          if (refetchRisks) refetchRisks();
          if (refetchHighRisk) refetchHighRisk();
        }}
      />

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {navigationTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? tab.highlight 
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 text-white shadow-sm'
                  : tab.highlight
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100/80 border border-blue-200'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: COMPOSITE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title={language === 'hi' ? 'औसत जोखिम सूचकांक' : 'Average Risk Index'}
              value={`${overview?.average_score ?? 0}/100`}
              subtext={language === 'hi' ? 'योजना-स्तरीय भारित समग्र' : 'Scheme-wide weighted composite'}
              icon={Layers}
              color="purple"
            />
            <StatCard
              title={language === 'hi' ? 'गंभीर उच्च जोखिम' : 'Critical High Risk'}
              value={overview?.high_risk_count ?? 0}
              subtext={language === 'hi' ? 'उच्च विसंगति स्कोर (ऑडिट आवश्यक)' : 'High Anomaly Risk (Requires audit)'}
              icon={ShieldAlert}
              color="rose"
            />
            <StatCard
              title={language === 'hi' ? 'मध्यम जोखिम ध्यानार्थ' : 'Medium Risk Attention'}
              value={overview?.medium_risk_count ?? 0}
              subtext={language === 'hi' ? 'स्कोर 40 - 69' : 'Score 40 - 69'}
              icon={AlertTriangle}
              color="amber"
            />
            <StatCard
              title={language === 'hi' ? 'कम जोखिम (स्वस्थ)' : 'Low Risk (Healthy)'}
              value={overview?.low_risk_count ?? 0}
              subtext={language === 'hi' ? 'सामान्य माइलस्टोन निष्पादन' : 'Normal milestone execution'}
              icon={ShieldCheck}
              color="emerald"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <RiskDistribution distribution={overview?.distribution} />
            </div>

            {/* Problem Statement 4 Pillars Navigation Card */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    {language === 'hi' ? 'वैधानिक एमपीलैड्स समस्या विवरण नैदानिक स्तंभ' : 'Statutory MPLADS Problem Statement Diagnostic Pillars'}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold">
                    MoSPI Guidelines 2023
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  {language === 'hi'
                    ? 'एआई इंजन 5 प्रमुख ऑडिट आयामों के विरुद्ध विशेष मशीन लर्निंग मॉडल संचालित करता है:'
                    : 'The AI engine continuously runs specialized machine learning models against 5 core audit dimensions:'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div 
                  onClick={() => setActiveTab('expenditure')}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <span className="font-semibold text-slate-700">
                    {language === 'hi' ? '1. व्यय पैटर्न (वेग एवं असामान्य उछाल)' : '1. Expenditure Patterns (Velocity & Spikes)'}
                  </span>
                  <span className="font-bold text-blue-600">{language === 'hi' ? 'निरीक्षण →' : 'Inspect →'}</span>
                </div>
                <div 
                  onClick={() => setActiveTab('utilization')}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <span className="font-semibold text-slate-700">
                    {language === 'hi' ? '2. निधि उपयोग (अव्ययित एवं निष्क्रिय शेष)' : '2. Fund Utilization (Idle & Unspent Funds)'}
                  </span>
                  <span className="font-bold text-blue-600">{language === 'hi' ? 'निरीक्षण →' : 'Inspect →'}</span>
                </div>
                <div 
                  onClick={() => setActiveTab('cost')}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <span className="font-semibold text-slate-700">
                    {language === 'hi' ? '3. लागत अनुमान (वृद्धि एवं SoR अंतर)' : '3. Cost Estimates (Overruns & SoR Variance)'}
                  </span>
                  <span className="font-bold text-blue-600">{language === 'hi' ? 'निरीक्षण →' : 'Inspect →'}</span>
                </div>
                <div 
                  onClick={() => setActiveTab('execution')}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <span className="font-semibold text-slate-700">
                    {language === 'hi' ? '4. कार्य निष्पादन (प्रगति बनाम भुगतान असंतुलन)' : '4. Work Execution (Progress vs Payment Disconnects)'}
                  </span>
                  <span className="font-bold text-blue-600">{language === 'hi' ? 'निरीक्षण →' : 'Inspect →'}</span>
                </div>
                <div 
                  onClick={() => setActiveTab('similarity')}
                  className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200 flex justify-between items-center cursor-pointer hover:bg-blue-100/60 transition-colors"
                >
                  <span className="font-bold text-blue-900">
                    {language === 'hi' ? '5. परियोजना समानता एवं दोहराव प्रस्ताव' : '5. Project Similarity & Duplicate Proposals'}
                  </span>
                  <span className="font-black text-blue-700">{language === 'hi' ? 'मॉडल देखें →' : 'Inspect Model →'}</span>
                </div>
                <div 
                  onClick={() => setActiveTab('database')}
                  className="p-2.5 rounded-xl bg-cyan-50/50 border border-cyan-200 flex justify-between items-center cursor-pointer hover:bg-cyan-100/60 transition-colors"
                >
                  <span className="font-bold text-cyan-900">
                    {language === 'hi' ? '6. संपूर्ण 28-तालिका स्कीमा रजिस्ट्री' : '6. Complete 28-Table Schema Registry'}
                  </span>
                  <span className="font-black text-cyan-700">{language === 'hi' ? 'एक्सप्लोर करें →' : 'Explore →'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* High-Risk Works Priority Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'hi' ? 'प्राथमिकता विसंगति कतार' : 'Priority Anomaly Queue'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'hi' ? 'बहु-स्तंभ विसंगति अलर्ट ट्रिगर करने वाले कार्य' : 'Works triggering multi-pillar anomaly alerts'}
                </p>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                {overview?.high_risk_count ?? highRiskWorks.length} {language === 'hi' ? 'उच्च-जोखिम कार्य' : 'High-Risk Works'}
              </span>
            </div>
            <WorkTable works={highRiskWorks} />
          </div>
        </div>
      )}

      {/* TABS 2-5: DETAILED PROBLEM STATEMENT PILLARS */}
      {['expenditure', 'utilization', 'cost', 'execution'].includes(activeTab) && (
        <ProblemStatementAnomalyBreakdown
          anomalies={anomalyData}
          activeTab={activeTab}
        />
      )}

      {/* TAB 6: PROJECT SIMILARITY & DUPLICATE ANALYSIS */}
      {activeTab === 'similarity' && (
        <ProjectSimilarityAnalysis works={works} />
      )}

      {/* TAB 7: CONTRACTOR VIGILANCE */}
      {activeTab === 'contractors' && (
        <ContractorRiskAnalysis filters={jurisdictionFilters} />
      )}

      {/* TAB 8: STATUTORY GUIDELINES COMPLIANCE */}
      {activeTab === 'compliance' && (
        <ComplianceAuditTable filters={jurisdictionFilters} />
      )}

      {/* TAB 9: 28-TABLE SCHEMA EXPLORER */}
      {activeTab === 'database' && (
        <DatabaseSchemaExplorer />
      )}
    </div>
  );
}

export default Risks;
