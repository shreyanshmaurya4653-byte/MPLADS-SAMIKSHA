import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../../hooks/useLanguage';

export function FundUtilizationChart({ data }) {
  const { language } = useLanguage();
  const chartData = data && data.length > 0 ? data : [];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {language === 'hi' ? 'निधि उपयोग एवं अवशोषण' : 'Fund Utilization & Absorption'}
          </h3>
          <p className="text-xs text-slate-400">
            {language === 'hi' ? 'मासिक ट्रैकिंग: स्वीकृति बनाम जारी बनाम व्यय (₹ लाख)' : 'Monthly tracking: Sanctions vs. Releases vs. Spend (₹ Lakhs)'}
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            {language === 'hi' ? 'इस अधिकार क्षेत्र के लिए कोई व्यय संवितरण दर्ज नहीं है।' : 'No expenditure disbursements recorded for this jurisdiction.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="sanctioned" name={language === 'hi' ? 'स्वीकृत' : 'Sanctioned'} fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="released" name={language === 'hi' ? 'जारी राशि' : 'Released'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" name={language === 'hi' ? 'व्यय' : 'Spent'} fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
