import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Search, Filter, ArrowUpDown, TrendingUp, Building2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useLanguage } from '../hooks/useLanguage';
import { formatCompactCurrency } from '../utils/formatCurrency';
import { Loader } from '../components/common/Loader';

export function Trends() {
  const { language, t, tr } = useLanguage();
  const [districts, setDistricts] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [houseFilter, setHouseFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('totalWorks'); // 'totalWorks' | 'totalFunds' | 'completed'

  useEffect(() => {
    async function loadTrends() {
      try {
        setLoading(true);
        const houseQuery = houseFilter !== 'All' ? `?house_type=${encodeURIComponent(houseFilter)}` : '';
        const [distRes, stateRes] = await Promise.all([
          apiClient(`/trends/districts${houseQuery}`).catch(() => []),
          apiClient(`/trends/states${houseQuery}`).catch(() => [])
        ]);
        setDistricts(Array.isArray(distRes) ? distRes : []);
        setStates(Array.isArray(stateRes) ? stateRes : []);
      } catch (err) {
        console.error('Failed to load trends:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTrends();
  }, [houseFilter]);

  if (loading && states.length === 0) {
    return <Loader text={language === 'hi' ? 'मैक्रो विश्लेषणात्मक रुझान लोड हो रहे हैं...' : 'Loading macro analytical trends...'} />;
  }

  // Filter & sort states
  const filteredStates = states
    .filter(st => !searchTerm.trim() || st.state?.toLowerCase().includes(searchTerm.toLowerCase().trim()))
    .sort((a, b) => (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {language === 'hi' ? 'मैक्रो रुझान एवं तुलनात्मक विश्लेषण' : 'Macro Trends & Comparative Analytics'}
          </h3>
          <p className="text-xs text-slate-400">
            {language === 'hi'
              ? 'सभी 36 राज्यों और केंद्रशासित प्रदेशों में प्रदर्शन, निधि अवशोषण और विलंब सांद्रता का तुलनात्मक मूल्यांकन'
              : 'Benchmarking performance, fund absorption, and delay concentrations across all 36 States & UTs'}
          </p>
        </div>

        {/* House Type Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
          {[
            { id: 'All', label: language === 'hi' ? 'दोनों सदन' : 'All Houses' },
            { id: 'Lok Sabha', label: language === 'hi' ? 'लोकसभा' : 'Lok Sabha' },
            { id: 'Rajya Sabha', label: language === 'hi' ? 'राज्यसभा' : 'Rajya Sabha' }
          ].map(house => (
            <button
              key={house.id}
              onClick={() => setHouseFilter(house.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                houseFilter === house.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {house.label}
            </button>
          ))}
        </div>
      </div>

      {/* District Comparison Bar Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="mb-4">
          <h4 className="text-sm font-bold text-slate-900">
            {language === 'hi' ? 'परियोजना गतिविधि एवं जोखिम संकेंद्रण के अनुसार शीर्ष ज़िले' : 'Top Districts by Project Activity & Risk Concentrations'}
          </h4>
          <p className="text-xs text-slate-400">
            {language === 'hi' ? 'ज़िलावार कुल कार्य बनाम उच्च जोखिम एवं विलंबित परियोजनाएं' : 'Total works vs. high risk flagged vs. delayed projects by district'}
          </p>
        </div>

        <div className="h-72 w-full">
          {districts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              {language === 'hi' ? 'वर्तमान फ़िल्टर के लिए कोई ज़िला गतिविधि नहीं मिली।' : 'No district activity found for current filters.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districts.slice(0, 15)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="district" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
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
                <Bar dataKey="works" fill="#3b82f6" name={language === 'hi' ? 'कुल कार्य' : 'Total Works'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="delayed" fill="#f59e0b" name={language === 'hi' ? 'विलंबित कार्य' : 'Delayed Works'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="highRisk" fill="#ef4444" name={language === 'hi' ? 'उच्च जोखिम कार्य' : 'High Risk Works'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* State-Level Aggregated Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {language === 'hi' ? `राज्य एवं केंद्रशासित प्रदेश प्रदर्शन लीडरबोर्ड (${filteredStates.length} क्षेत्र)` : `State & UT Performance Leaderboard (${filteredStates.length} Regions)`}
            </h4>
            <p className="text-xs text-slate-400">
              {language === 'hi' ? 'केंद्रीय क्षेत्र निगरानी एवं वास्तविक डेटासेट से संकलित अवशोषण मेट्रिक्स' : 'Consolidated central sector monitoring and absorption metrics derived directly from uploaded datasets'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder={language === 'hi' ? 'राज्य खोजें...' : 'Search state...'}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-medium">{language === 'hi' ? 'क्रमबद्ध करें:' : 'Sort by:'}</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value="totalWorks">{language === 'hi' ? 'कुल कार्य' : 'Total Works'}</option>
                <option value="totalFunds">{language === 'hi' ? 'कुल निधि' : 'Total Funds'}</option>
                <option value="completed">{language === 'hi' ? 'पूर्ण कार्य' : 'Completed Works'}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">{language === 'hi' ? 'राज्य / केंद्रशासित प्रदेश' : 'State / UT'}</th>
                <th className="py-3 px-4">{language === 'hi' ? 'कुल स्वीकृत कार्य' : 'Total Sanctioned'}</th>
                <th className="py-3 px-4">{language === 'hi' ? 'पूर्ण कार्य' : 'Completed'}</th>
                <th className="py-3 px-4">{language === 'hi' ? 'विलंबित' : 'Delayed'}</th>
                <th className="py-3 px-4">{language === 'hi' ? 'उच्च जोखिम' : 'High Risk'}</th>
                <th className="py-3 px-4">{language === 'hi' ? 'कुल आवंटन' : 'Total Allocation'}</th>
                <th className="py-3 px-4">{language === 'hi' ? 'पूर्णता %' : 'Completion %'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStates.map((st) => {
                const totalW = Number(st.totalWorks) || 0;
                const compW = Number(st.completed) || 0;
                const compPct = totalW > 0 ? Math.round((compW / totalW) * 100) : 0;
                return (
                  <tr key={st.state_id || st.state} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black flex items-center justify-center">
                          {st.state_code || st.state?.slice(0, 2).toUpperCase()}
                        </span>
                        <span>{tr(st.state)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold">{totalW.toLocaleString()}</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">{compW.toLocaleString()}</td>
                    <td className="py-3 px-4 text-amber-600 font-bold">{(Number(st.delayed) || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-rose-600 font-bold">{(Number(st.highRisk) || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{formatCompactCurrency(st.totalFunds || 0, language)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${compPct}%` }} />
                        </div>
                        <span className="font-semibold text-slate-700">{compPct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
