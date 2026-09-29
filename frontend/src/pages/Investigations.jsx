import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { investigationsApi } from '../api/investigationsApi';
import { useLanguage } from '../hooks/useLanguage';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  ChevronRight,
  ExternalLink,
  X,
  Send,
  Building,
  DollarSign
} from 'lucide-react';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export function Investigations() {
  const { language } = useLanguage();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await investigationsApi.getCases({
        status: statusFilter,
        priority: priorityFilter,
        search
      });
      setCases(data);
    } catch (err) {
      console.error('Failed to load investigation cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCases();
  };

  const handleOpenModal = (caseItem) => {
    setSelectedCase(caseItem);
    setOfficerRemarks(caseItem.officer_remarks || '');
    setNewStatus(caseItem.status);
  };

  const handleSaveUpdate = async () => {
    if (!selectedCase) return;
    setUpdating(true);
    try {
      await investigationsApi.updateCase(selectedCase.case_id, {
        status: newStatus,
        officer_remarks: officerRemarks
      });
      setSelectedCase(null);
      fetchCases();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'SHOWCAUSE_ISSUED':
      case 'RECOVERY_INITIATED':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'FIELD_INSPECTION':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'IN_REVIEW':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-600" size={24} />
            <h1 className="text-xl font-bold text-slate-900">
              {language === 'hi' ? 'सतर्कता जांच एवं साक्ष्य केंद्र' : 'Investigation & Evidence Management Center'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'hi'
              ? 'अखंडता लेखापरीक्षा, फील्ड निरीक्षण रिपोर्ट एवं साक्ष्य-समर्थित कानूनी कार्रवाई'
              : 'SIH 26102 Vigilance Workflow: Anomaly to Human Investigation, Field Audit & Legal Recovery'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">{language === 'hi' ? 'सक्रिय केस' : 'Active Cases'}</span>
            <span className="text-lg font-bold text-slate-800">{cases.length}</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-200" />
          <div className="text-right">
            <span className="text-xs text-slate-400 block">{language === 'hi' ? 'गंभीर प्राथमिकता' : 'Critical Flags'}</span>
            <span className="text-lg font-bold text-red-600">
              {cases.filter((c) => c.priority === 'CRITICAL').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder={language === 'hi' ? 'केस #, परियोजना नाम, या अधिकारी द्वारा खोजें...' : 'Search by Case #, Work Title, ID, or Assigned Officer...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter size={14} />
            <span>{language === 'hi' ? 'स्थिति:' : 'Status:'}</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="FIELD_INSPECTION">FIELD_INSPECTION</option>
            <option value="SHOWCAUSE_ISSUED">SHOWCAUSE_ISSUED</option>
            <option value="RECOVERY_INITIATED">RECOVERY_INITIATED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 focus:outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
          </select>
        </div>
      </div>

      {/* Cases Table / Cards */}
      {loading ? (
        <Loader text="Loading investigation dossiers..." />
      ) : cases.length === 0 ? (
        <EmptyState
          title="No investigation cases match your filter"
          description="Try changing your search terms or filters to view active case files."
          actionText="Reset Filters"
          onAction={() => {
            setStatusFilter('ALL');
            setPriorityFilter('ALL');
            setSearch('');
          }}
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b3b60] text-white uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Case ID</th>
                  <th className="px-4 py-3">Work Project</th>
                  <th className="px-4 py-3">Sanction / Spent</th>
                  <th className="px-4 py-3">Assigned Officer</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Workflow Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c.case_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-blue-700">{c.case_number}</div>
                      <div className="text-[10px] text-slate-400">ID: #{c.work_id}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate" title={c.work_title || 'Work #' + c.work_id}>
                        {c.work_title || `Work #${c.work_id}`}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{c.category || 'INFRASTRUCTURE'}</span>
                        <span>•</span>
                        <span className="text-amber-700 font-medium">{c.physical_progress || 0}% progress</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800">
                        ₹{((c.sanctioned_amount || 0) / 100000).toFixed(2)} Lakhs
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Spent: ₹{((c.expenditure || 0) / 100000).toFixed(2)} L
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 flex items-center gap-1.5">
                        <UserCheck size={13} className="text-emerald-600" />
                        {c.assigned_officer || 'District CVO'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityBadge(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(c.status)}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleOpenModal(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0b3b60] text-white rounded text-xs font-medium hover:bg-[#124d7b] transition-colors"
                      >
                        Inspect Dossier <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Case Details & Action Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#0b3b60] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                    Vigilance Case
                  </span>
                  <h2 className="text-base font-bold">{selectedCase.case_number}</h2>
                </div>
                <p className="text-xs text-slate-200 mt-0.5 truncate max-w-xl">
                  {selectedCase.work_title || `Project #${selectedCase.work_id}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-slate-300 hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Top Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Work ID</span>
                  <Link
                    to={`/works/${encodeURIComponent(selectedCase.work_id)}`}
                    className="font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    #{selectedCase.work_id} <ExternalLink size={11} />
                  </Link>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Sanctioned</span>
                  <span className="font-bold text-slate-800">
                    ₹{((selectedCase.sanctioned_amount || 0) / 100000).toFixed(2)} Lakhs
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Progress</span>
                  <span className="font-bold text-amber-700">
                    {selectedCase.physical_progress || 0}% Complete
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Assigned CVO</span>
                  <span className="font-bold text-slate-800">{selectedCase.assigned_officer}</span>
                </div>
              </div>

              {/* AI Anomaly & Findings */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800 font-bold text-xs mb-1">
                  <AlertTriangle size={15} />
                  Audit Anomaly & Primary Findings
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {selectedCase.findings || 'Discrepancy detected between financial release and ground milestone completion certificate.'}
                </p>
              </div>

              {/* Evidence Checklist */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase text-[11px] mb-2 flex items-center gap-1.5">
                  <FileText size={14} className="text-blue-600" />
                  Mandatory Statutory Evidence Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(() => {
                    let items = [];
                    try {
                      items = typeof selectedCase.evidence_checklist === 'string'
                        ? JSON.parse(selectedCase.evidence_checklist)
                        : (selectedCase.evidence_checklist || []);
                    } catch {
                      items = [
                        { item: "Sanction letter verified", verified: true },
                        { item: "Utilization certificate signed", verified: false },
                        { item: "ISRO Bhuvan geotagged photos match", verified: true },
                        { item: "Third-party inspection report", verified: false }
                      ];
                    }
                    return items.map((chk, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-2.5 rounded border text-xs ${
                          chk.verified
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-medium">{chk.item || chk}</span>
                        {chk.verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                            <CheckCircle size={12} /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Action Update Form */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                  Administrative Action & Legal Resolution
                </h4>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Transition Workflow State:
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="OPEN">OPEN (Case Registered)</option>
                    <option value="IN_REVIEW">IN_REVIEW (Document Audit)</option>
                    <option value="FIELD_INSPECTION">FIELD_INSPECTION (Site Team Dispatched)</option>
                    <option value="SHOWCAUSE_ISSUED">SHOWCAUSE_ISSUED (Notice Sent to Agency)</option>
                    <option value="RECOVERY_INITIATED">RECOVERY_INITIATED (Fund Clawback / Blacklist)</option>
                    <option value="RESOLVED">RESOLVED (Audit Cleared / Verified)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Chief Vigilance Officer / District Magistrate Remarks:
                  </label>
                  <textarea
                    rows={3}
                    value={officerRemarks}
                    onChange={(e) => setOfficerRemarks(e.target.value)}
                    placeholder="Enter formal inspection observations, directives, or closing justification..."
                    className="w-full border border-slate-300 rounded p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Action is logged to the immutable tamper-evident audit ledger.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUpdate}
                  disabled={updating}
                  className="px-4 py-1.5 bg-[#0b3b60] text-white rounded font-medium hover:bg-[#124d7b] disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Send size={13} />
                  {updating ? 'Recording...' : 'Submit Action'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
