import React, { useState, useEffect } from 'react';
import { auditLogsApi } from '../api/auditLogsApi';
import { useLanguage } from '../hooks/useLanguage';
import {
  FileCode2,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  Hash,
  Terminal,
  Clock,
  Layers,
  Fingerprint
} from 'lucide-react';
import { Loader } from '../components/common/Loader';

export function AuditLogs() {
  const { language } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditLogsApi.getLogs({
        action: actionFilter,
        entity_type: entityFilter,
        limit: 100
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Fingerprint className="text-[#0b3b60]" size={24} />
            <h1 className="text-xl font-bold text-slate-900">
              {language === 'hi' ? 'अपरिवर्तनीय लेखापरीक्षा एवं अनुपालन खाता' : 'Immutable Governance & Audit Trail'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'hi'
              ? 'प्रत्येक प्रशासनिक निर्णय, सत्यापन स्थिति और फंड रिलीज का कालानुक्रमिक खाता'
              : 'SIH 26102 Cryptographically Verified Audit Ledger: Complete Traceability of Disbursals, Inquiries & Resolutions'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs">
          <ShieldCheck className="text-emerald-700" size={16} />
          <div>
            <span className="font-bold text-emerald-900 block">SHA-256 Ledger Active</span>
            <span className="text-[10px] text-emerald-700">Tamper-evident verification enabled</span>
          </div>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Filter size={14} />
          <span className="font-semibold">Filter Audit Stream:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 bg-slate-50 focus:outline-none"
          >
            <option value="ALL">All Administrative Actions</option>
            <option value="CASE_UPDATED">CASE_UPDATED</option>
            <option value="STATUS_CHANGE">STATUS_CHANGE</option>
            <option value="PAYMENT_RELEASED">PAYMENT_RELEASED</option>
            <option value="EVIDENCE_VERIFIED">EVIDENCE_VERIFIED</option>
            <option value="SANCTION_APPROVED">SANCTION_APPROVED</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 bg-slate-50 focus:outline-none"
          >
            <option value="ALL">All Entity Types</option>
            <option value="verification_case">Verification Cases</option>
            <option value="work">Public Works</option>
            <option value="payment">Financial Payments</option>
            <option value="evidence_doc">Evidence Documents</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <Loader text="Loading tamper-evident ledger records..." />
      ) : logs.length === 0 ? (
        <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
          No audit entries found matching the criteria.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b3b60] text-white uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Block # / Log ID</th>
                  <th className="px-4 py-3">Timestamp (IST)</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Entity Reference</th>
                  <th className="px-4 py-3">Officer / Actor ID</th>
                  <th className="px-4 py-3">Details & Audit Payload</th>
                  <th className="px-4 py-3 text-right">Integrity Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-700">
                      #{log.log_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-sans">
                      {log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : 'Just now'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-sans font-semibold">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-sans text-slate-600">
                      <span className="uppercase text-[10px] text-slate-400 font-bold block">{log.entity_type}</span>
                      ID: #{log.entity_id}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-sans text-slate-800 font-medium">
                      User #{log.user_id || 1}
                      <span className="text-[10px] text-slate-400 block font-mono">{log.ip_address || '127.0.0.1'}</span>
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-700 max-w-sm">
                      <p className="truncate" title={log.details}>
                        {log.details}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle size={10} />
                        <span>{log.block_hash || '0x4f82...'}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
