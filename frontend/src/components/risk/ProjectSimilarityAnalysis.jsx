import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Building, 
  MapPin, 
  IndianRupee, 
  Layers, 
  Search, 
  Scale, 
  ShieldAlert,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { riskApi } from '../../api/riskApi';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';

export function ProjectSimilarityAnalysis({ works = [] }) {
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkA, setSelectedWorkA] = useState('');
  const [selectedWorkB, setSelectedWorkB] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [filterRisk, setFilterRisk] = useState('All');

  useEffect(() => {
    async function loadPairs() {
      try {
        setLoading(true);
        const data = await riskApi.getSimilarityPairs(40.0);
        setPairs(data || []);
        if (works.length >= 2) {
          setSelectedWorkA(works[0]?.id || '');
          setSelectedWorkB(works[5]?.id || works[1]?.id || '');
        }
      } catch (err) {
        console.error('Failed to load duplicate pairs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPairs();
  }, [works]);

  const handleRunComparison = async () => {
    if (!selectedWorkA || !selectedWorkB || selectedWorkA === selectedWorkB) return;
    try {
      setComparing(true);
      const res = await riskApi.compareProjects(selectedWorkA, selectedWorkB);
      setComparisonResult(res);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setComparing(false);
    }
  };

  const filteredPairs = filterRisk === 'All'
    ? pairs
    : pairs.filter((p) => p.similarity?.risk_level === filterRisk);

  if (loading) {
    return <Loader text="Running TF-IDF & metadata duplicate detection models..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <Copy size={13} /> Project Similarity &amp; Anti-Duplicate Engine
          </div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight">
            Cross-Scheme Duplication &amp; Overlap Detection
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Multi-attribute matching combining <strong>TF-IDF lexical cosine similarity</strong>, <strong>Jaccard scope overlap</strong>, <strong>administrative jurisdiction</strong>, and <strong>implementing agency overlap</strong> to preemptively prevent double-billing and duplicate asset creation.
          </p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Identified Duplicate Pairs</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{pairs.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Overlap score &ge; 40%</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">High Risk Severe Overlap</p>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {pairs.filter((p) => p.similarity?.risk_level === 'High').length}
          </p>
          <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Mandatory physical verification</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Same-Agency Duplication</p>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {pairs.filter((p) => p.similarity?.agency_match).length}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Shared executing department</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Similarity Score</p>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {pairs[0]?.similarity?.composite_similarity ? `${pairs[0].similarity.composite_similarity}%` : '0%'}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Peak cluster similarity index</p>
        </div>
      </div>

      {/* Flagged Duplicate Proposals List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Flagged Duplicate Work Proposals</h4>
            <p className="text-xs text-slate-400">Projects with elevated textual, agency, or financial overlap</p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            {['All', 'High', 'Medium'].map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setFilterRisk(tier)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterRisk === tier
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tier} {tier === 'High' && '🚨'}
              </button>
            ))}
          </div>
        </div>

        {filteredPairs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No duplicate pairs found in this threshold.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPairs.map((pair, idx) => {
              const { work_a, work_b, similarity } = pair;
              const isHigh = similarity.risk_level === 'High';
              return (
                <div
                  key={`${work_a.id}-${work_b.id}-${idx}`}
                  className={`p-5 rounded-2xl border transition-all ${
                    isHigh
                      ? 'border-rose-200 bg-rose-50/20 shadow-xs'
                      : 'border-slate-200 bg-slate-50/30'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isHigh ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {similarity.composite_similarity}% Similarity ({similarity.risk_level} Risk)
                      </span>
                      {similarity.agency_match && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                          Identical Agency
                        </span>
                      )}
                      {similarity.category_match && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                          Same Sector
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWorkA(work_a.id);
                        setSelectedWorkB(work_b.id);
                        setComparisonResult({
                          project_a: work_a,
                          project_b: work_b,
                          similarity_audit: similarity
                        });
                        const el = document.getElementById('project-comparator');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Scale size={14} /> Compare Side-by-Side
                    </button>
                  </div>

                  {/* Two Column Projects Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Project A */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {work_a.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{work_a.status}</span>
                      </div>
                      <Link to={`/works/${encodeURIComponent(work_a.id)}`} className="text-xs font-bold text-slate-900 hover:text-blue-600 block line-clamp-1">
                        {work_a.title && !work_a.title.includes('???') ? work_a.title : (work_a.description || `Project ${work_a.id}`)}
                      </Link>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{work_a.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1"><Building size={12} className="text-slate-400" /> {work_a.implementing_agency}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(work_a.sanctioned_amount)}</span>
                      </div>
                    </div>

                    {/* Project B */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                          {work_b.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{work_b.status}</span>
                      </div>
                      <Link to={`/works/${encodeURIComponent(work_b.id)}`} className="text-xs font-bold text-slate-900 hover:text-blue-600 block line-clamp-1">
                        {work_b.title && !work_b.title.includes('???') ? work_b.title : (work_b.description || `Project ${work_b.id}`)}
                      </Link>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{work_b.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1"><Building size={12} className="text-slate-400" /> {work_b.implementing_agency}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(work_b.sanctioned_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="mt-3 p-3 rounded-xl bg-white border border-slate-100 text-xs flex items-start gap-2">
                    <ShieldAlert size={15} className={`flex-shrink-0 mt-0.5 ${isHigh ? 'text-rose-500' : 'text-amber-500'}`} />
                    <div>
                      <span className="font-bold text-slate-900">AI Audit Directive: </span>
                      <span className="text-slate-600">{similarity.recommendation}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive Side-by-Side Comparator */}
      <div id="project-comparator" className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Scale size={16} className="text-blue-600" /> Interactive Side-by-Side Project Comparator
          </h4>
          <p className="text-xs text-slate-400">Select any two works to run real-time multi-dimensional similarity audit</p>
        </div>

        {/* Project Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Select Primary Work (A)
            </label>
            <select
              value={selectedWorkA}
              onChange={(e) => setSelectedWorkA(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id} - {w.title} ({formatCurrency(w.sanctioned_amount)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Select Comparison Candidate (B)
            </label>
            <select
              value={selectedWorkB}
              onChange={(e) => setSelectedWorkB(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id} - {w.title} ({formatCurrency(w.sanctioned_amount)})
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleRunComparison}
            loading={comparing}
            disabled={!selectedWorkA || !selectedWorkB || selectedWorkA === selectedWorkB}
            className="w-full"
          >
            Run Similarity Comparison <ArrowRight size={15} />
          </Button>
        </div>

        {/* Comparison Result Table */}
        {comparisonResult && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Composite Match Score</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">
                    {comparisonResult.similarity_audit?.composite_similarity}%
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    comparisonResult.similarity_audit?.risk_level === 'High'
                      ? 'bg-rose-100 text-rose-700'
                      : comparisonResult.similarity_audit?.risk_level === 'Medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {comparisonResult.similarity_audit?.risk_level} Duplicate Risk
                  </span>
                </div>
              </div>

              <div className="text-xs text-right space-y-1">
                <span className="font-semibold text-slate-500">Textual Overlap: </span>
                <span className="font-bold text-slate-900">{comparisonResult.similarity_audit?.text_similarity}%</span>
                <span className="mx-2 text-slate-300">|</span>
                <span className="font-semibold text-slate-500">Cost Variance: </span>
                <span className="font-bold text-slate-900">{comparisonResult.similarity_audit?.cost_variance_pct}%</span>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-white text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Evaluation Field</th>
                    <th className="py-2.5 px-3 font-bold text-blue-700">Project A ({comparisonResult.project_a?.id})</th>
                    <th className="py-2.5 px-3 font-bold text-indigo-700">Project B ({comparisonResult.project_b?.id})</th>
                    <th className="py-2.5 px-3 font-bold text-center">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 bg-white">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">Work Title</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{comparisonResult.project_a?.title}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{comparisonResult.project_b?.title}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-bold text-blue-600">{comparisonResult.similarity_audit?.text_similarity}%</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">Sector / Category</td>
                    <td className="py-2.5 px-3 text-slate-700">{comparisonResult.project_a?.category}</td>
                    <td className="py-2.5 px-3 text-slate-700">{comparisonResult.project_b?.category}</td>
                    <td className="py-2.5 px-3 text-center">
                      {comparisonResult.similarity_audit?.category_match ? (
                        <span className="text-emerald-600 font-bold flex items-center justify-center gap-1"><CheckCircle2 size={13} /> Identical</span>
                      ) : (
                        <span className="text-slate-400 font-semibold">Different</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">Executing Agency</td>
                    <td className="py-2.5 px-3 text-slate-700">{comparisonResult.project_a?.implementing_agency}</td>
                    <td className="py-2.5 px-3 text-slate-700">{comparisonResult.project_b?.implementing_agency}</td>
                    <td className="py-2.5 px-3 text-center">
                      {comparisonResult.similarity_audit?.agency_match ? (
                        <span className="text-rose-600 font-bold flex items-center justify-center gap-1"><AlertTriangle size={13} /> Same Agency</span>
                      ) : (
                        <span className="text-slate-400 font-semibold">Different</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">Sanctioned Budget</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{formatCurrency(comparisonResult.project_a?.sanctioned_amount)}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{formatCurrency(comparisonResult.project_b?.sanctioned_amount)}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-600">
                      {comparisonResult.similarity_audit?.cost_variance_pct}% Variance
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">Physical Progress</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">{comparisonResult.project_a?.physical_progress || 0}%</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">{comparisonResult.project_b?.physical_progress || 0}%</td>
                    <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">
                      {Math.abs((comparisonResult.project_a?.physical_progress || 0) - (comparisonResult.project_b?.physical_progress || 0))}% Diff
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Directive Box */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <HelpCircle size={14} className="text-blue-600" /> AI Recommendation &amp; Verification Protocol:
              </span>
              <p className="text-slate-600 leading-relaxed">
                {comparisonResult.similarity_audit?.recommendation}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default ProjectSimilarityAnalysis;
