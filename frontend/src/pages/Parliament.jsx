import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, 
  Users, 
  Building2, 
  Award, 
  Search, 
  Filter, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowUpRight,
  Sparkles,
  Download,
  IndianRupee,
  Layers
} from 'lucide-react';
import { jurisdictionApi } from '../api/jurisdictionApi';
import { useLanguage } from '../hooks/useLanguage';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import { formatCurrency as formatCurrencyUtil } from '../utils/formatCurrency';
import { useAuth } from '../hooks/useAuth';

export function Parliament() {
  const { language, t, tr } = useLanguage();
  const { user } = useAuth();
  const role = user?.role || 'Ministry';
  const isState = role === 'State';
  const isMP = role === 'MP';

  const [activeHouse, setActiveHouse] = useState('All'); // 'All' | 'Lok Sabha' | 'Rajya Sabha'
  const [selectedState, setSelectedState] = useState(isState ? (user?.state_id || 'All') : 'All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ summary: null, members: [] });
  const [hierarchy, setHierarchy] = useState({ states: [] });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const queryParams = {
          house_type: activeHouse,
          state_id: isState ? (user?.state_id || selectedState) : selectedState,
          search: isMP ? (user?.name || search) : search
        };
        const [parlRes, hierRes] = await Promise.all([
          jurisdictionApi.getParliamentMembers(queryParams),
          jurisdictionApi.getHierarchy().catch(() => ({ states: [] }))
        ]);
        setData(parlRes);
        if (hierRes?.states) setHierarchy(hierRes);
      } catch (err) {
        console.error('Failed to load parliament data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activeHouse, selectedState, search, isState, isMP, user?.state_id, user?.name]);

  const summary = data?.summary || {
    lok_sabha: { total_seats: 543, active_mps: 543, works_count: 0, total_sanctioned: 0, total_expenditure: 0, utilization_rate: 0 },
    rajya_sabha: { total_seats: 245, active_mps: 245, works_count: 0, total_sanctioned: 0, total_expenditure: 0, utilization_rate: 0 }
  };

  const rawMembers = data?.members || [];
  const members = isMP 
    ? rawMembers.filter(m => (user?.name && m.mp_name.toLowerCase().includes(user.name.toLowerCase())) || String(m.constituency_id) === String(user?.constituency_id))
    : rawMembers;

  const formatCurrency = (val) => {
    return formatCurrencyUtil(val, language);
  };

  if (role === 'District') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-xl mx-auto my-8 space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
          <Building2 size={28} />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          {language === 'hi' ? 'ज़िला अधिकार क्षेत्र सीमित' : 'District Jurisdiction Scope'}
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {language === 'hi'
            ? 'संसदीय सदस्य निर्देशिका केवल राज्य नोडल अधिकारियों और केंद्रीय मंत्रालय के लिए उपलब्ध है। ज़िला स्तर पर कृपया अपने ज़िले के कार्य एवं वित्त देखें।'
            : 'The national Parliament Members Directory is reserved for State Nodal Officers and Ministry Oversight. As a District Planning Authority, please use the Works and District Finance portals to manage projects in your district.'}
        </p>
        <Link to="/works" className="inline-block px-4 py-2 bg-[#0b3b60] text-white rounded-lg text-xs font-bold hover:bg-[#124d7b]">
          {language === 'hi' ? 'ज़िला कार्य देखें' : 'View District Works'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Official Parliament Banner */}
      <div className="bg-gradient-to-r from-[#0b3b60] via-[#124d7b] to-[#1e3a8a] text-white rounded-xl p-6 sm:p-7 shadow-lg border-l-4 border-amber-500 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-amber-300 font-semibold text-xs tracking-wider uppercase mb-1">
              <Landmark size={18} />
              <span>{language === 'hi' ? 'संसद भवन • सांसद स्थानीय क्षेत्र विकास योजना' : 'Parliament of India • संसद भवन • MPLADS Oversight'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {language === 'hi' ? 'द्विसदनीय संसदीय योजना शासन एवं निगरानी' : 'Bicameral Parliamentary Scheme Governance'}
            </h1>
            <p className="text-slate-200 text-sm mt-1 max-w-2xl">
              {language === 'hi'
                ? 'प्रत्यक्ष रूप से निर्वाचित लोकसभा और राज्य-प्रतिनिधित्व करने वाले राज्यसभा सदस्यों की ₹5 करोड़ वार्षिक आवंटन एवं कार्यों की संवैधानिक निगरानी।'
                : 'Constitutional monitoring of works and ₹5 Crore annual allocations distinguishing directly elected Lok Sabha constituency representatives and State-representing Rajya Sabha members.'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-lg border border-white/15 text-center">
              <span className="block text-2xl font-bold text-amber-300">788</span>
              <span className="text-[11px] text-slate-200 uppercase tracking-wider font-semibold">
                {language === 'hi' ? 'कुल सदस्य' : 'Total Members'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bi-Cameral House Dossier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Lok Sabha Card */}
        <div 
          onClick={() => setActiveHouse('Lok Sabha')}
          className={`cursor-pointer rounded-xl p-6 border-2 transition-all relative overflow-hidden shadow-sm hover:shadow-md ${
            activeHouse === 'Lok Sabha' 
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50/40 border-emerald-600 ring-2 ring-emerald-600/20' 
              : 'bg-white border-slate-200 hover:border-emerald-400'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                <Users size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900">{language === 'hi' ? 'लोकसभा' : 'Lok Sabha'}</h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {language === 'hi' ? 'निचला सदन' : 'Lower House'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === 'hi' ? 'लोकसभा • जनता का सदन (संसदीय क्षेत्र आधारित)' : 'लोकसभा • House of the People (Constituency Based)'}
                </p>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-emerald-700">{summary.lok_sabha.total_seats}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200/80">
            <div>
              <span className="block text-[10px] font-bold text-blue-700 uppercase tracking-wider">{language === 'hi' ? 'आवंटित सीमा' : 'Allocated Limit'}</span>
              <span className="text-base font-black text-blue-950">{formatCurrency(summary.lok_sabha.allocated_amount)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === 'hi' ? 'कुल कार्य' : 'Total Works'}</span>
              <span className="text-base font-bold text-slate-800">{summary.lok_sabha.works_count.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{language === 'hi' ? 'स्वीकृत राशि' : 'Sanctioned'}</span>
              <span className="text-base font-bold text-emerald-700">{formatCurrency(summary.lok_sabha.total_sanctioned)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === 'hi' ? 'उपयोग दर' : 'Utilization'}</span>
              <span className="text-base font-bold text-slate-800">{summary.lok_sabha.utilization_rate}%</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-emerald-700 font-semibold">
            <span>{language === 'hi' ? 'प्रत्यक्ष प्रादेशिक अधिदेश (543 संसदीय क्षेत्र)' : 'Direct Territorial Mandate (543 PCs)'}</span>
            <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              {language === 'hi' ? 'लोकसभा सांसद देखें' : 'Explore Lok Sabha MPs'} <ArrowUpRight size={14} />
            </span>
          </div>
        </div>

        {/* Rajya Sabha Card */}
        <div 
          onClick={() => setActiveHouse('Rajya Sabha')}
          className={`cursor-pointer rounded-xl p-6 border-2 transition-all relative overflow-hidden shadow-sm hover:shadow-md ${
            activeHouse === 'Rajya Sabha' 
              ? 'bg-gradient-to-br from-purple-50 to-indigo-50/40 border-purple-600 ring-2 ring-purple-600/20' 
              : 'bg-white border-slate-200 hover:border-purple-400'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-md">
                <Building2 size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900">{language === 'hi' ? 'राज्यसभा' : 'Rajya Sabha'}</h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    {language === 'hi' ? 'उच्च सदन' : 'Upper House'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {language === 'hi' ? 'राज्यसभा • राज्यों की परिषद (राज्य एवं मनोनीत)' : 'राज्यसभा • Council of States (State & Nominated)'}
                </p>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-purple-800">{summary.rajya_sabha.total_seats}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-200/80">
            <div>
              <span className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider">{language === 'hi' ? 'आवंटित सीमा' : 'Allocated Limit'}</span>
              <span className="text-base font-black text-purple-950">{formatCurrency(summary.rajya_sabha.allocated_amount)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === 'hi' ? 'कुल कार्य' : 'Total Works'}</span>
              <span className="text-base font-bold text-slate-800">{summary.rajya_sabha.works_count.toLocaleString()}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider">{language === 'hi' ? 'स्वीकृत राशि' : 'Sanctioned'}</span>
              <span className="text-base font-bold text-purple-700">{formatCurrency(summary.rajya_sabha.total_sanctioned)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{language === 'hi' ? 'उपयोग दर' : 'Utilization'}</span>
              <span className="text-base font-bold text-slate-800">{summary.rajya_sabha.utilization_rate}%</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-purple-700 font-semibold">
            <span>{language === 'hi' ? '233 राज्य प्रतिनिधि + 12 मनोनीत' : '233 State Representatives + 12 Nominated'}</span>
            <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              {language === 'hi' ? 'राज्यसभा सांसद देखें' : 'Explore Rajya Sabha MPs'} <ArrowUpRight size={14} />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search & Interactive Filtering Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* House Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          {['All', 'Lok Sabha', 'Rajya Sabha'].map((house) => (
            <button
              key={house}
              onClick={() => setActiveHouse(house)}
              className={`px-4 py-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeHouse === house
                  ? 'bg-white text-[#0b3b60] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {house === 'All' ? (language === 'hi' ? 'संपूर्ण संसद (788)' : 'All Parliament (788)') : tr(house)}
            </button>
          ))}
        </div>

        {/* State Filter & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-[#0b3b60] outline-none cursor-pointer"
            >
              <option value="All">{language === 'hi' ? 'सभी 36 राज्य एवं केंद्रशासित प्रदेश' : 'All States & UTs (36)'}</option>
              {hierarchy.states?.map((st) => (
                <option key={st.state_id} value={st.state_id}>
                  {tr(st.state_name)}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder={language === 'hi' ? 'सांसद का नाम, सीट या दल खोजें...' : 'Search MP name, seat, party...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg font-medium focus:ring-2 focus:ring-[#0b3b60] outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* 4. Parliament Directory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-slate-800">
              {language === 'hi' ? 'संसदीय प्रतिनिधि निर्देशिका' : 'Parliamentary Representatives Directory'}
            </h2>
            <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {members.length} {language === 'hi' ? 'सदस्य सूचीबद्ध' : 'Members Listed'}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {language === 'hi' ? 'चौथी अनुसूची एवं निर्वाचन आयोग रजिस्ट्री' : 'Fourth Schedule & Election Commission Registry'}
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader text={language === 'hi' ? 'संसदीय प्रतिनिधित्व डेटा प्राप्त किया जा रहा है...' : 'Retrieving Parliamentary representation data...'} />
          </div>
        ) : members.length === 0 ? (
          <EmptyState 
            title={language === 'hi' ? 'कोई संसद सदस्य नहीं मिला' : 'No Parliament Members Found'} 
            description={language === 'hi' ? 'चयनित सदन, राज्य या खोज मानदंडों से कोई सांसद मेल नहीं खाता।' : 'No MPs match the selected house, state, or search criteria.'} 
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-[#0b3b60]/5 text-[#0b3b60] uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">{language === 'hi' ? 'संसद सदस्य' : 'Member of Parliament'}</th>
                  <th className="py-3.5 px-3">{language === 'hi' ? 'सदन का प्रकार' : 'House Type'}</th>
                  <th className="py-3.5 px-3">{language === 'hi' ? 'राज्य / प्रतिनिधित्व' : 'State / Representation'}</th>
                  <th className="py-3.5 px-3">{language === 'hi' ? 'संसदीय क्षेत्र / सीट' : 'Constituency / Seat'}</th>
                  <th className="py-3.5 px-3">{language === 'hi' ? 'राजनीतिक दल' : 'Political Party'}</th>
                  <th className="py-3.5 px-3 text-center">{language === 'hi' ? 'कार्य' : 'Works'}</th>
                  <th className="py-3.5 px-3 text-right text-blue-900 bg-blue-50/60">{language === 'hi' ? 'आवंटित सीमा' : 'Allocated Limit'}</th>
                  <th className="py-3.5 px-3 text-right">{language === 'hi' ? 'कुल स्वीकृत राशि' : 'Sanctioned Total'}</th>
                  <th className="py-3.5 px-3 text-right text-emerald-800">{language === 'hi' ? 'वितरित व्यय' : 'Disbursed'}</th>
                  <th className="py-3.5 px-4 text-center">{language === 'hi' ? 'औसत एआई जोखिम' : 'Avg AI Risk'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {members.map((mp) => {
                  const isLS = mp.house_type === 'Lok Sabha';
                  const riskScore = mp.avg_risk_score !== null ? parseFloat(mp.avg_risk_score) : null;

                  return (
                    <tr key={mp.constituency_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isLS ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {mp.mp_name ? mp.mp_name.slice(0, 2).toUpperCase() : 'MP'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{mp.mp_name || (language === 'hi' ? 'माननीय संसद सदस्य' : "Hon'ble Member of Parliament")}</span>
                            <span className="text-[11px] text-slate-400">{mp.constituency_number || (language === 'hi' ? 'आधिकारिक सीट' : 'Official Seat')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          isLS
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-50 text-purple-800 border border-purple-200'
                        }`}>
                          {isLS ? <Users size={12} /> : <Building2 size={12} />}
                          {tr(mp.house_type)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-700">
                        {tr(mp.state_name) || (language === 'hi' ? 'अखिल भारतीय मनोनीत' : 'All-India Nominated')}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {mp.constituency_name}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {mp.mp_party || (language === 'hi' ? 'निर्दलीय' : 'Independent')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                        {mp.works_count || 0}
                      </td>
                      <td className="py-3.5 px-3 text-right font-black text-blue-950 bg-blue-50/40">
                        {formatCurrency(mp.allocated_amount)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(mp.sanctioned_amount)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                        {formatCurrency(mp.expenditure_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {riskScore !== null ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            riskScore >= 60
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : riskScore >= 30
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {riskScore.toFixed(1)} / 100
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">{language === 'hi' ? 'सामान्य' : 'Baseline'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
