import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Calendar,
  IndianRupee,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Copy,
  TrendingUp,
  Wallet,
  FileSpreadsheet,
  Activity,
  ShieldAlert,
  Scale
} from 'lucide-react';
import { worksApi } from '../api/worksApi';
import { useLanguage } from '../hooks/useLanguage';
import { WorkStatusBadge } from '../components/works/WorkStatusBadge';
import { RiskScoreCard } from '../components/risk/RiskScoreCard';
import { RiskBreakdown } from '../components/risk/RiskBreakdown';
import { RiskReasonList } from '../components/risk/RiskReasonList';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { Loader } from '../components/common/Loader';
import { Button } from '../components/common/Button';
import { ProjectGeoMap } from '../components/gis/ProjectGeoMap';

export function WorkDetails() {
  const params = useParams();
  const rawId = params['*'] || params.id || '';
  const id = decodeURIComponent(rawId);
  const navigate = useNavigate();
  const { language, tr } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDetails() {
      try {
        setLoading(true);
        const res = await worksApi.getWorkDetails(id);
        setData(res);
      } catch (err) {
        console.error('Failed to load work details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [id]);

  if (loading) {
    return <Loader text={language === 'hi' ? `परियोजना ${id} का डोजियर लोड हो रहा है...` : `Loading project dossier for ${id}...`} />;
  }

  const work = data?.project;
  const dossier = data?.risk_dossier;
  const alerts = data?.alerts || [];
  const similarCandidates = data?.similar_candidates || [];
  const geoLocation = data?.geo_location;

  const handleLocationUpdated = (updatedLocation) => {
    setData((prev) => ({
      ...prev,
      geo_location: {
        ...prev.geo_location,
        ...updatedLocation,
        is_calibrated: true
      }
    }));
  };

  if (!work) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-bold text-slate-700">
          {language === 'hi' ? 'परियोजना रिकॉर्ड नहीं मिला।' : 'Project record not found.'}
        </p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/works')}>
          {language === 'hi' ? 'कार्य सूची पर वापस जाएं' : 'Return to Works'}
        </Button>
      </div>
    );
  }

  const isOverrun = (work.expenditure || 0) > (work.sanctioned_amount || 0);
  const overrunPct = work.sanctioned_amount
    ? Math.round(((work.expenditure - work.sanctioned_amount) / work.sanctioned_amount) * 100)
    : 0;

  const paymentPct = work.sanctioned_amount
    ? Math.round(((work.expenditure || 0) / work.sanctioned_amount) * 100)
    : 0;
  const physicalPct = work.physical_progress || 0;
  const progressGap = paymentPct - physicalPct;
  const isPaymentMismatch = progressGap >= 20;

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/works"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> {language === 'hi' ? 'कार्य सूची पर वापस जाएं' : 'Back to Works List'}
        </Link>
      </div>

      {/* Project Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                {work.id}
              </span>
              <WorkStatusBadge status={work.status} />
              <span className="text-xs text-slate-400 font-semibold">&bull; {tr(work.category)}</span>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
              {work.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Building size={14} className="text-slate-400" /> {work.implementing_agency}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar size={14} className="text-slate-400" /> {language === 'hi' ? 'प्रारंभ: ' : 'Start: '}{formatDate(work.start_date)}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock size={14} className="text-slate-400" /> {language === 'hi' ? 'अपेक्षित: ' : 'Expected: '}{formatDate(work.expected_completion)}
              </span>
            </div>
          </div>

          <RiskScoreCard
            score={work.risk_score || 0}
            level={work.risk_level || 'Low'}
            size={120}
          />
        </div>
      </div>

      {/* Financial Audit Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {language === 'hi' ? 'स्वीकृत सीमा' : 'Sanctioned Ceiling'}
          </p>
          <p className="text-lg font-black text-slate-900 mt-1">{formatCurrency(work.sanctioned_amount, language)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {language === 'hi' ? 'स्वीकृत प्रशासनिक लागत' : 'Approved administrative cost'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {language === 'hi' ? 'एजेंसी को जारी राशि' : 'Released to Agency'}
          </p>
          <p className="text-lg font-black text-blue-600 mt-1">{formatCurrency(work.released_amount || work.sanctioned_amount, language)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {language === 'hi' ? 'प्रत्यक्ष RTGS संवितरण' : 'Direct RTGS transfers'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {language === 'hi' ? 'कुल व्यय' : 'Total Incurred Expenditure'}
          </p>
          <p className={`text-lg font-black mt-1 ${isOverrun ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatCurrency(work.expenditure, language)}
          </p>
          {isOverrun ? (
            <p className="text-[10px] font-bold text-rose-600 mt-0.5">
              +{overrunPct}% {language === 'hi' ? 'बजट अधिकता' : 'Budget Overrun'}
            </p>
          ) : (
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              {language === 'hi' ? 'स्वीकृत सीमा के भीतर' : 'Within limit'}
            </p>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {language === 'hi' ? 'भौतिक प्रगति' : 'Physical Progress'}
          </p>
          <p className="text-lg font-black text-emerald-600 mt-1">{work.physical_progress || 0}%</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {language === 'hi' ? 'सत्यापित माइलस्टोन' : 'On-ground verified milestone'}
          </p>
        </div>
      </div>

      {/* Geospatial GIS, Satellite & Terrain Intelligence with Google Maps parity */}
      <ProjectGeoMap
        work={work}
        geoLocation={geoLocation}
        onLocationUpdated={handleLocationUpdated}
      />

      {/* 4-Pillar Anomaly Evaluation Matrix */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            {language === 'hi' ? 'योजना विसंगति मूल्यांकन मैट्रिक्स' : 'Problem Statement Anomaly Evaluation Matrix'}
          </h4>
          <p className="text-xs text-slate-400">
            {language === 'hi'
              ? 'सभी चार योजना समस्या क्षेत्रों के विरुद्ध स्वचालित नैदानिक क्रॉस-चेक'
              : 'Automated diagnostic cross-check against all four scheme problem areas'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pillar 1: Expenditure Patterns */}
          <div className={`p-4 rounded-2xl border ${isOverrun ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 bg-slate-50/40'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                <TrendingUp size={16} />
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isOverrun ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {isOverrun ? (language === 'hi' ? 'उछाल चिह्नित' : 'Spike Flagged') : (language === 'hi' ? 'सामान्य वक्र' : 'Normal Curve')}
              </span>
            </div>
            <h5 className="text-xs font-bold text-slate-900">
              {language === 'hi' ? '1. व्यय पैटर्न' : '1. Expenditure Patterns'}
            </h5>
            <p className="text-[11px] text-slate-500 mt-1">
              {isOverrun 
                ? (language === 'hi' ? `व्यय बजट सीमा से +${overrunPct}% अधिक है। संभावित अनावंटित व्यय।` : `Expenditure outpaces budget ceiling by +${overrunPct}%. Potential unapproved outlays.`)
                : (language === 'hi' ? 'व्यय वेग अपेक्षित पैरामीट्रिक प्रक्षेपवक्र के भीतर है।' : 'Outlay velocity is within expected parametric trajectory.')}
            </p>
          </div>

          {/* Pillar 2: Fund Utilization */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40">
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Wallet size={16} />
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {paymentPct}% {language === 'hi' ? 'संवितरित' : 'Disbursed'}
              </span>
            </div>
            <h5 className="text-xs font-bold text-slate-900">
              {language === 'hi' ? '2. निधि उपयोग' : '2. Fund Utilization'}
            </h5>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'hi' ? 'जारी राशि: ' : 'Released: '}{formatCurrency(work.released_amount || work.sanctioned_amount, language)}. 
              {' '}{language === 'hi' ? 'अव्ययित शेष: ' : 'Unspent balance: '}{formatCurrency(Math.max(0, (work.released_amount || work.sanctioned_amount) - (work.expenditure || 0)), language)}.
            </p>
          </div>

          {/* Pillar 3: Cost Estimates */}
          <div className={`p-4 rounded-2xl border ${isOverrun ? 'border-purple-200 bg-purple-50/20' : 'border-slate-200 bg-slate-50/40'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                <FileSpreadsheet size={16} />
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isOverrun ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {isOverrun ? `+${overrunPct}% ${language === 'hi' ? 'वृद्धि' : 'Overrun'}` : (language === 'hi' ? 'SoR के भीतर' : 'Within SoR')}
              </span>
            </div>
            <h5 className="text-xs font-bold text-slate-900">
              {language === 'hi' ? '3. लागत अनुमान' : '3. Cost Estimates'}
            </h5>
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'hi' ? 'डीपीआर अनुमान: ' : 'DPR Estimate: '}{formatCurrency(work.estimated_cost || work.sanctioned_amount, language)}. 
              {' '}{language === 'hi' ? 'स्वीकृत: ' : 'Sanctioned: '}{formatCurrency(work.sanctioned_amount, language)}.
            </p>
          </div>

          {/* Pillar 4: Work Execution */}
          <div className={`p-4 rounded-2xl border ${isPaymentMismatch || work.status === 'Delayed' ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-slate-50/40'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <Activity size={16} />
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPaymentMismatch ? 'bg-rose-100 text-rose-700' : work.status === 'Delayed' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {isPaymentMismatch ? `+${progressGap}% ${language === 'hi' ? 'असंतुलन' : 'Gap'}` : tr(work.status)}
              </span>
            </div>
            <h5 className="text-xs font-bold text-slate-900">
              {language === 'hi' ? '4. कार्य निष्पादन' : '4. Work Execution'}
            </h5>
            <p className="text-[11px] text-slate-500 mt-1">
              {isPaymentMismatch 
                ? (language === 'hi' ? `चेतावनी: भुगतान (${paymentPct}%) भौतिक प्रगति (${physicalPct}%) से ${progressGap}% आगे है।` : `Warning: Payment (${paymentPct}%) outruns physical progress (${physicalPct}%) by ${progressGap}%.`)
                : (language === 'hi' ? `भौतिक प्रगति ${physicalPct}% है और स्थिति ${tr(work.status)} के रूप में चिह्नित है।` : `Physical progress is ${physicalPct}% with status marked as ${work.status}.`)}
            </p>
          </div>
        </div>
      </div>

      {/* 5. Project Similarity & Duplicate Proposal Analysis */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Copy size={16} className="text-blue-600" /> {language === 'hi' ? 'परियोजना समानता एवं दोहराव प्रस्ताव ऑडिट' : 'Project Similarity & Duplicate Proposal Audit'}
            </h4>
            <p className="text-xs text-slate-400">
              {language === 'hi'
                ? 'सभी योजना कार्यों के विरुद्ध एआई शाब्दिक, प्रशासनिक एवं भू-स्थानिक निकटता स्कैन'
                : 'AI TF-IDF lexical, administrative, and geospatial proximity scan against all scheme works'}
            </p>
          </div>

          {similarCandidates.length > 0 && similarCandidates[0]?.similarity?.composite_similarity >= 50 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
              <ShieldAlert size={14} /> {language === 'hi' ? 'संभावित दोहराव कार्य पहचाना गया' : 'Potential Duplicate Detected'} ({similarCandidates[0].similarity.composite_similarity}%)
            </span>
          )}
        </div>

        {similarCandidates.length === 0 ? (
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3 text-xs text-emerald-800">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">{language === 'hi' ? 'स्पष्ट प्रस्ताव सत्यापन' : 'Clean Proposal Validation'}</p>
              <p className="text-emerald-700">
                {language === 'hi' ? 'इस संसदीय क्षेत्र या निष्पादन एजेंसी में कोई अतिव्यापी या डुप्लिकेट कार्य नहीं पाया गया।' : 'No overlapping or duplicate works detected across this constituency or executing agency.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {similarCandidates.slice(0, 3).map((item) => {
              const cand = item.candidate;
              const sim = item.similarity;
              const isHigh = sim.risk_level === 'High';
              return (
                <div 
                  key={cand.id} 
                  className={`p-4 rounded-2xl border transition-all ${
                    isHigh ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200 bg-slate-50/30'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {cand.id}
                      </span>
                      <Link to={`/works/${encodeURIComponent(cand.id)}`} className="text-xs font-bold text-slate-900 hover:text-blue-600">
                        {cand.title}
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isHigh ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {sim.composite_similarity}% {language === 'hi' ? 'समानता' : 'Overlap'} ({tr(sim.risk_level)} {language === 'hi' ? 'जोखिम' : 'Risk'})
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-2">{cand.description}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] bg-white p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block font-medium">{language === 'hi' ? 'शाब्दिक मिलान:' : 'Text Lexical Match:'}</span>
                      <strong className="text-slate-900">{sim.text_similarity}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">{language === 'hi' ? 'श्रेणी:' : 'Category:'}</span>
                      <strong className={sim.category_match ? 'text-emerald-700' : 'text-slate-700'}>
                        {tr(cand.category)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">{language === 'hi' ? 'एजेंसी:' : 'Agency:'}</span>
                      <strong className={sim.agency_match ? 'text-rose-700' : 'text-slate-700'}>
                        {cand.implementing_agency}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">{language === 'hi' ? 'स्वीकृत:' : 'Sanctioned:'}</span>
                      <strong className="text-slate-900">{formatCurrency(cand.sanctioned_amount, language)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Risk Assessment Breakdown & Reasons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskBreakdown dossier={dossier} />
        <RiskReasonList
          reasons={dossier?.explanations || []}
          anomalies={work.anomalies || []}
        />
      </div>

      {/* Linked Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-slate-900">
            {language === 'hi' ? 'लेखापरीक्षा एवं विसंगति अलर्ट इतिहास' : 'Auditing & Anomaly Alert History'}
          </h4>
          <div className="divide-y divide-slate-100">
            {alerts.map((a) => (
              <div key={a.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 mr-2">
                    {a.id}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{a.title}</span>
                  <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {tr(a.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkDetails;
