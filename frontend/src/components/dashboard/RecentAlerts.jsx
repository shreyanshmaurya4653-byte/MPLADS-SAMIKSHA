import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { AlertSeverityBadge } from '../alerts/AlertSeverityBadge';
import { useLanguage } from '../../hooks/useLanguage';

export function RecentAlerts({ alerts = [] }) {
  const { language } = useLanguage();

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {language === 'hi' ? 'हालिया एआई विसंगति अलर्ट' : 'Recent AI Anomaly Flags'}
          </h3>
          <p className="text-xs text-slate-400">
            {language === 'hi' ? 'आधिकारिक निरीक्षण की आवश्यकता वाले उच्च प्राथमिकता अलर्ट' : 'High priority alerts requiring official inspection'}
          </p>
        </div>
        <Link
          to="/alerts"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          {language === 'hi' ? 'सभी देखें' : 'View All'} <ArrowRight size={13} />
        </Link>
      </div>

      <div className="divide-y divide-slate-100">
        {alerts.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            {language === 'hi' ? 'इस अधिकार क्षेत्र में कोई खुला गंभीर अलर्ट नहीं है।' : 'No open critical alerts in this jurisdiction.'}
          </p>
        ) : (
          alerts.slice(0, 4).map((alert) => (
            <div key={alert.id} className="py-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 text-rose-500 flex-shrink-0">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-snug">{alert.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{alert.description}</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <AlertSeverityBadge severity={alert.severity} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
