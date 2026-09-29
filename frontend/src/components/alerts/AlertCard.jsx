import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Clock, ArrowRight, CheckCircle2, MessageSquare } from 'lucide-react';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useLanguage } from '../../hooks/useLanguage';

export function AlertCard({ alert, onUpdateStatus }) {
  const { language, tr } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Under Review');

  const handleVerify = () => {
    if (onUpdateStatus) {
      onUpdateStatus(alert.id, {
        status: selectedStatus,
        officer_remarks: remarks,
        action_taken: selectedStatus === 'Action Required' ? 'Show-cause notice served' : 'Verified by inspecting officer'
      });
    }
    setIsModalOpen(false);
  };

  const statusBadges = {
    'Pending': 'bg-slate-100 text-slate-700',
    'Under Review': 'bg-blue-50 text-blue-700 font-semibold',
    'Action Required': 'bg-rose-50 text-rose-700 font-semibold',
    'Resolved': 'bg-emerald-50 text-emerald-700 font-semibold'
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              {alert.id}
            </span>
            <AlertSeverityBadge severity={alert.severity} />
          </div>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full ${statusBadges[alert.status] || statusBadges.Pending}`}>
            {tr(alert.status)}
          </span>
        </div>

        <h4 className="text-sm font-bold text-slate-900 mb-1">{alert.title}</h4>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">{alert.description}</p>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock size={12} />
            <span>{alert.created_at || (language === 'hi' ? 'हाल ही में' : 'Recently')}</span>
            <span className="mx-1">•</span>
            <Link to={`/works/${encodeURIComponent(alert.work_id)}`} className="text-blue-600 hover:underline font-semibold">
              {language === 'hi' ? 'कार्य: ' : 'Work: '}{alert.work_id}
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setIsModalOpen(true)}>
              <MessageSquare size={13} className="mr-1" /> {language === 'hi' ? 'सत्यापित / ऑडिट करें' : 'Verify / Audit'}
            </Button>
            <Link to={`/works/${encodeURIComponent(alert.work_id)}`}>
              <Button size="sm" variant="ghost">
                <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Human Verification Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={language === 'hi' ? `विसंगति ऑडिट: ${alert.id}` : `Audit Anomaly: ${alert.id}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="font-bold text-slate-800">{alert.title}</p>
            <p className="text-slate-500 mt-0.5">{alert.description}</p>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {language === 'hi' ? 'सत्यापन कार्रवाई / परिणाम' : 'Verification Action / Outcome'}
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Under Review">
                {language === 'hi' ? 'समीक्षाधीन चिह्नित करें (क्षेत्रीय निरीक्षण लंबित)' : 'Mark Under Review (Field Inspection Pending)'}
              </option>
              <option value="Action Required">
                {language === 'hi' ? 'कार्रवाई अपेक्षित (ठेकेदार को कारण बताओ नोटिस जारी करें)' : 'Action Required (Issue Contractor Notice)'}
              </option>
              <option value="Resolved">
                {language === 'hi' ? 'समाधान किया गया / उचित पाया गया (कोई समस्या नहीं मिली)' : 'Resolved / Justified (No Issue Found)'}
              </option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {language === 'hi' ? 'आधिकारिक निष्कर्ष एवं निरीक्षण नोट्स' : 'Official Findings & Inspection Notes'}
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={language === 'hi' ? 'स्थल निष्कर्ष, बिल सत्यापन या जारी सुधारात्मक निर्देश दर्ज करें...' : 'Document physical site findings, verified bills, or corrective directives issued...'}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleVerify}>
              {language === 'hi' ? 'आधिकारिक ऑडिट प्रविष्टि सहेजें' : 'Save Official Audit Entry'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
