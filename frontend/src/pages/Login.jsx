import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  LogIn,
  Landmark,
  Building,
  Layers,
  Award,
  Lock,
  User,
  MapPin,
  CheckCircle2,
  Compass,
  KeyRound,
  X,
  Phone,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { jurisdictionApi } from '../api/jurisdictionApi';
import { GEO_MASTER } from '../constants/geoMasterData';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { GovTopStrip } from '../components/layout/GovTopStrip';
import { GovFooter } from '../components/layout/GovFooter';
import { InsightAiLogo } from '../components/common/InsightAiLogo';

export function Login() {
  const { language, t, tr } = useLanguage();
  const navigate = useNavigate();
  const { login, loading, setDemoRole } = useAuth();

  // Demo accounts definition with authentic Unique IDs and administrative powers
  const demoAccounts = [
    {
      role: 'MP',
      uniqueId: 'MP-LS-2024-042',
      password: 'mp123',
      title: language === 'hi' ? 'माननीय संसद सदस्य (सांसद)' : "Hon'ble Member of Parliament (MP)",
      subtitle: language === 'hi' ? 'लोकसभा / राज्यसभा' : 'Lok Sabha / Rajya Sabha',
      name: 'Shri Rajesh Kumar Sharma',
      designation: language === 'hi' ? 'संसद सदस्य (लोकसभा / राज्यसभा)' : 'Member of Parliament (LS / RS)',
      badge: language === 'hi' ? 'संसदीय क्षेत्र स्तर' : 'Constituency Tier',
      scopePill: language === 'hi' ? '₹5 करोड़ वार्षिक पात्रता' : '₹5 Cr Annual Quota',
      desc: language === 'hi'
        ? 'संसदीय क्षेत्र विकास, कार्य अनुशंसा एवं परिसंपत्ति प्रगति समीक्षा'
        : 'Constituency Development, Project Recommendations & Asset Progress',
      avatar: 'MP',
      bg: 'bg-amber-600',
      border: 'border-amber-500/70',
      activeBg: 'bg-amber-500/20 ring-1 ring-amber-400'
    },
    {
      role: 'District',
      uniqueId: 'IAS-UP-2018-084',
      password: 'dist123',
      title: language === 'hi' ? 'ज़िलाधिकारी एवं उपायुक्त (DM / DC)' : 'District Magistrate & Collector (DM / DC)',
      subtitle: language === 'hi' ? 'स्वीकृति एवं तहसील निष्पादन' : 'Sanctions & Tehsil Administration',
      name: 'Smt. Priya Verma, IAS',
      designation: language === 'hi' ? 'ज़िलाधिकारी एवं ज़िला योजना प्राधिकारी' : 'District Magistrate & District Planning Authority',
      badge: language === 'hi' ? 'नियुक्त ज़िला व तहसील सीमित' : 'District & Tehsil Scoped',
      scopePill: language === 'hi' ? 'प्रशासनिक स्वीकृति प्राधिकारी' : 'Principal Sanctioning Authority',
      desc: language === 'hi'
        ? 'ज़िला एवं तहसील प्रशासनिक स्वीकृति, तकनीकी प्राक्कलन एवं स्थल निरीक्षण'
        : 'District & Tehsil Administrative Sanctions, Technical Scrutiny & Field Audits',
      avatar: 'DM',
      bg: 'bg-emerald-600',
      border: 'border-emerald-500/70',
      activeBg: 'bg-emerald-500/20 ring-1 ring-emerald-400'
    },
    {
      role: 'State',
      uniqueId: 'SNO-UP-PLAN-01',
      password: 'state123',
      title: language === 'hi' ? 'राज्य नोडल योजना प्राधिकरण' : 'State Nodal Planning Authority',
      subtitle: language === 'hi' ? 'समग्र राज्य एवं अंतर-ज़िला' : 'Inter-District Coordination & PFMS',
      name: 'Dr. Suresh Singh, IAS',
      designation: language === 'hi' ? 'प्रमुख सचिव / राज्य नोडल अधिकारी (योजना)' : 'Principal Secretary / State Nodal Officer (Planning)',
      badge: language === 'hi' ? 'समस्त राज्य ज़िले' : 'All State Districts',
      scopePill: language === 'hi' ? 'राज्यव्यापी अंतर-ज़िला निगरानी' : 'State-Wide Monitoring',
      desc: language === 'hi'
        ? 'राज्यव्यापी अंतर-ज़िला निगरानी, अनिस्तारित शेष एवं PFMS समन्वय'
        : 'State-Wide Inter-District Monitoring, Unspent Balances & Treasury Coordination',
      avatar: 'SO',
      bg: 'bg-purple-600',
      border: 'border-purple-500/70',
      activeBg: 'bg-purple-500/20 ring-1 ring-purple-400'
    },
    {
      role: 'Ministry',
      uniqueId: 'MOSPI-CENTRAL-09',
      password: 'min123',
      title: language === 'hi' ? 'केंद्रीय मंत्रालय (MoSPI)' : 'MoSPI Central Ministry Oversight',
      subtitle: language === 'hi' ? 'राष्ट्रीय एआई ऑडिट एवं नीति' : 'National AI Auditing & Scheme Policy',
      name: 'Shri Ananya Krishnan',
      designation: language === 'hi' ? 'संयुक्त सचिव, एमपीलैड्स प्रभाग (MoSPI)' : 'Joint Secretary, MPLADS Division (MoSPI, New Delhi)',
      badge: language === 'hi' ? 'अखिल भारत (36 राज्य)' : 'Pan-India (36 States)',
      scopePill: language === 'hi' ? 'एआई विसंगति व धोखाधड़ी रोकथाम' : 'AI Anomaly & Risk Engine',
      desc: language === 'hi'
        ? 'अखिल भारतीय मैक्रो विश्लेषण, एआई विसंगति जांच एवं राष्ट्रीय नीति'
        : 'Pan-India Macro Analytics, AI Anomaly Detection & National Policy',
      avatar: 'JS',
      bg: 'bg-rose-600',
      border: 'border-rose-500/70',
      activeBg: 'bg-rose-500/20 ring-1 ring-rose-400'
    },
  ];

  // Active role selected for sign in
  const [selectedRole, setSelectedRole] = useState('MP');
  const [loginUniqueId, setLoginUniqueId] = useState('MP-LS-2024-042');
  const [loginPassword, setLoginPassword] = useState('mp123');
  const [loginError, setLoginError] = useState('');
  const [signingInRole, setSigningInRole] = useState(null);

  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotId, setForgotId] = useState('');
  const [forgotNotice, setForgotNotice] = useState(null);
  const [sendingReset, setSendingReset] = useState(false);

  // Pre-load default state, district and constituency from local master data
  const defaultState = GEO_MASTER.states.find((s) => s.state_name === 'Uttar Pradesh') || GEO_MASTER.states[0];
  const defaultDists = (GEO_MASTER.districts || []).filter((d) => Number(d.state_id) === Number(defaultState.state_id));
  const defaultConsts = (GEO_MASTER.constituencies || []).filter((c) => Number(c.state_id) === Number(defaultState.state_id));

  // Dynamic Jurisdiction Selection
  const [geoData, setGeoData] = useState(GEO_MASTER);
  const [demoStateId, setDemoStateId] = useState(defaultState.state_id);
  const [demoDistrictId, setDemoDistrictId] = useState(defaultDists[0]?.district_id || '');
  const [demoConstituencyId, setDemoConstituencyId] = useState(defaultConsts[0]?.constituency_id || '');

  useEffect(() => {
    let isMounted = true;
    async function loadGeo() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const data = await jurisdictionApi.getGeoMaster({ signal: controller.signal });
        clearTimeout(timeoutId);
        if (isMounted && data?.states?.length > 0) {
          setGeoData({
            states: data.states || GEO_MASTER.states,
            districts: data.districts || GEO_MASTER.districts,
            constituencies: data.constituencies || GEO_MASTER.constituencies
          });
        }
      } catch {
        // Fall back gracefully to bundled GEO_MASTER without any interruption
      }
    }
    loadGeo();
    return () => { isMounted = false; };
  }, []);

  const handleDemoStateChange = (newSid) => {
    const sId = Number(newSid);
    setDemoStateId(sId);
    const stateDists = (geoData.districts || []).filter((d) => Number(d.state_id) === sId);
    if (stateDists.length > 0) {
      setDemoDistrictId(stateDists[0].district_id);
    } else {
      setDemoDistrictId('');
    }
    const stateConsts = (geoData.constituencies || []).filter((c) => Number(c.state_id) === sId);
    if (stateConsts.length > 0) {
      setDemoConstituencyId(stateConsts[0].constituency_id);
    } else {
      setDemoConstituencyId('');
    }
  };

  const handleDemoDistrictChange = (newDid) => {
    const dId = Number(newDid);
    setDemoDistrictId(dId);
    const matchedConst = (geoData.constituencies || []).find(
      (c) => Number(c.district_id) === dId && Number(c.state_id) === Number(demoStateId)
    );
    if (matchedConst) {
      setDemoConstituencyId(matchedConst.constituency_id);
    }
  };

  const handleDemoConstituencyChange = (newCid) => {
    const cId = Number(newCid);
    setDemoConstituencyId(cId);
  };

  const availableDemoDistricts = (geoData.districts || []).filter(
    (d) => Number(d.state_id) === Number(demoStateId)
  );

  const availableDemoConstituencies = (geoData.constituencies || []).filter(
    (c) => Number(c.state_id) === Number(demoStateId)
  );

  const selectedStateObj = (geoData.states || []).find((s) => Number(s.state_id) === Number(demoStateId));
  const selectedDistObj = (geoData.districts || []).find((d) => Number(d.district_id) === Number(demoDistrictId));
  const selectedConstObj = (geoData.constituencies || []).find((c) => Number(c.constituency_id) === Number(demoConstituencyId));

  // Select a role: populates the credentials immediately with official Unique ID
  const handleSelectRole = (acc) => {
    setSelectedRole(acc.role);
    setLoginUniqueId(acc.uniqueId);
    setLoginPassword(acc.password);
    setLoginError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setSigningInRole(selectedRole);

    const extra = {
      state_id: demoStateId,
      district_id: selectedRole === 'District' ? demoDistrictId || undefined : undefined,
      constituency_id: selectedRole === 'MP' ? demoConstituencyId || undefined : undefined
    };

    try {
      const res = await login(loginUniqueId, loginPassword, extra);
      if (res.success) {
        navigate('/dashboard');
      } else {
        const matched = demoAccounts.find((d) => d.uniqueId === loginUniqueId) || demoAccounts.find((d) => d.role === selectedRole);
        if (matched) {
          setDemoRole({
            ...matched,
            unique_id: loginUniqueId,
            employee_id: loginUniqueId,
            state_id: demoStateId,
            district_id: selectedRole === 'District' ? demoDistrictId : undefined,
            constituency_id: demoConstituencyId,
            state_name: selectedStateObj?.state_name || 'Uttar Pradesh',
            district_name: selectedRole === 'District' ? (selectedDistObj?.district_name || 'District Jurisdiction') : null,
            constituency_name: selectedConstObj?.constituency_name || 'Central Constituency',
            name: (selectedRole === 'MP' && selectedConstObj?.mp_name) ? selectedConstObj.mp_name : matched.name,
            party: (selectedRole === 'MP' && selectedConstObj?.mp_party) ? selectedConstObj.mp_party : matched.party
          });
          navigate('/dashboard');
        } else {
          setLoginError(res.error || 'Invalid Official Unique ID or password.');
        }
      }
    } catch (err) {
      setLoginError(err.message || 'Authentication error.');
    } finally {
      setSigningInRole(null);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setSendingReset(true);
    setTimeout(() => {
      setSendingReset(false);
      const matched = demoAccounts.find((d) => d.uniqueId.toLowerCase() === forgotId.trim().toLowerCase()) ||
        demoAccounts.find((d) => d.role === selectedRole) || demoAccounts[0];
      setForgotNotice({
        type: 'success',
        message: `OTP token dispatched to registered mobile of [${matched.name}]. For instant demo access, the default password is: ${matched.password}`
      });
      setLoginUniqueId(matched.uniqueId);
      setLoginPassword(matched.password);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans text-slate-800 antialiased">
      {/* Indian National Top Strip & Accessibility */}
      <GovTopStrip />

      {/* Official Portal Header Banner */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <InsightAiLogo className="w-12 h-16 sm:w-14 sm:h-18" />
            <div className="border-l border-slate-300 pl-2.5">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-[#0a3d62] tracking-tight">
                  MPLADS-SAMIKSHA
                </h1>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-blue-600 text-white">
                  PORTAL
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-700">
                {language === 'hi' ? 'सांसद स्थानीय क्षेत्र विकास योजना (एमपीलैड्स)' : 'Members of Parliament Local Area Development Scheme'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                {language === 'hi' ? 'एआई-संचालित राष्ट्रीय निगरानी एवं शासन प्रणाली' : 'AI-Powered National Monitoring & Governance System'}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              {language === 'hi' ? 'एनआईसी एसएसओ सुरक्षित गेटवे' : 'NIC SSO Secure Gateway'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-10 flex flex-col justify-center">
        {/* Statutory Warning Box */}
        <div className="mb-6 p-3 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
          <ShieldCheck size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>{language === 'hi' ? 'केवल आधिकारिक उपयोग हेतु: ' : 'OFFICIAL USE ONLY: '}</strong>
            {language === 'hi'
              ? 'यह प्रणाली संसद सदस्यों, ज़िलाधिकारियों, राज्य नोडल अधिकारियों और MoSPI प्रशासनिक अधिकारियों के लिए आरक्षित है। अनधिकृत पहुंच या दुरुपयोग का प्रयास सूचना प्रौद्योगिकी अधिनियम, 2000 के तहत दंडनीय है।'
              : 'This system is reserved for Members of Parliament, District Magistrates/Collectors, State Nodal Officers, and MoSPI Administrative Authorities. Unauthorized access or attempt to misuse is punishable under the Information Technology Act, 2000.'}
          </p>
        </div>

        <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          {/* Top Indian Tricolor Accent Line */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

          <div className="p-6 sm:p-8 md:p-10">
            {/* Official Portal Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0b3b60] flex items-center justify-center text-white shadow-md font-bold">
                  <Building2 size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-wide">MPLADS-SAMIKSHA</h2>
                  <p className="text-[11px] text-blue-700 font-semibold uppercase tracking-wider">
                    {language === 'hi' ? 'भारत सरकार • सांख्यिकी एवं कार्यक्रम कार्यान्वयन मंत्रालय' : 'Government of India • MoSPI'}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                <ShieldCheck size={12} className="text-emerald-600" />
                {language === 'hi' ? 'एसएसओ सुरक्षित' : 'SSO Secure'}
              </span>
            </div>

            {/* Official Portal Sign In Card */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {language === 'hi' ? 'आधिकारिक पोर्टल साइन इन' : 'Official Portal Sign In'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'hi' ? 'प्रशासनिक स्तर चुनें या अपनी विशिष्ट पहचान संख्या (Unique ID) दर्ज करें' : 'Select an administrative tier or enter your official Unique ID & password'}
                </p>
              </div>

              {/* Role Selection Tabs / Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {language === 'hi' ? 'साख लोड करने हेतु पद चुनें:' : 'Select Role to Load Credentials:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {demoAccounts.map((acc) => {
                    const isSelected = selectedRole === acc.role;
                    return (
                      <button
                        key={acc.role}
                        type="button"
                        onClick={() => handleSelectRole(acc)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className={`w-6 h-6 rounded-lg ${acc.bg} text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0`}>
                            {acc.avatar}
                          </span>
                          <div className="truncate">
                            <p className={`text-xs font-bold leading-tight truncate ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                              {tr(acc.role)}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{acc.uniqueId}</p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={15} className="text-blue-600 flex-shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Demo Jurisdiction Selector (for testing any State / Constituency / District) */}
              <div className="p-3.5 bg-gradient-to-b from-amber-50/90 to-amber-50/50 border border-amber-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass size={14} className="text-amber-700" />
                    {language === 'hi' ? 'डेमो परीक्षण अधिकार क्षेत्र चयन:' : 'Evaluation Jurisdiction Scope:'}
                  </span>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200/60">
                    {language === 'hi' ? '36 राज्य / 788 संसदीय क्षेत्र' : '36 States / 788 Constituencies'}
                  </span>
                </div>

                {/* Dynamic Selectors depending on selectedRole */}
                {selectedRole === 'MP' ? (
                  <div className="space-y-2">
                    {/* In MP Section: ONLY State & Parliamentary Constituency (NO DISTRICT ASKED) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {language === 'hi' ? 'राज्य / केंद्र शासित प्रदेश' : 'State / UT'}
                        </label>
                        <select
                          value={demoStateId}
                          onChange={(e) => handleDemoStateChange(e.target.value)}
                          className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                        >
                          {(geoData.states || []).map((s) => (
                            <option key={s.state_id} value={s.state_id}>
                              {tr(s.state_name)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {language === 'hi' ? 'संसदीय निर्वाचन क्षेत्र' : 'Parliamentary Constituency'}
                        </label>
                        <select
                          value={demoConstituencyId}
                          onChange={(e) => handleDemoConstituencyChange(e.target.value)}
                          className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                        >
                          {availableDemoConstituencies.map((c) => (
                            <option key={c.constituency_id} value={c.constituency_id}>
                              {c.constituency_name} ({c.house_type || 'Lok Sabha'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Live MP Profile Badge */}
                    {selectedConstObj && (
                      <div className="p-2 bg-white/95 border border-amber-200/90 rounded-xl flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-slate-700 shadow-2xs">
                        <div className="flex items-center gap-1.5 overflow-hidden truncate">
                          <span className="w-5 h-5 rounded-md bg-amber-600 text-white font-bold text-[9px] flex items-center justify-center flex-shrink-0">
                            MP
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {language === 'hi' ? 'माननीय सांसद: ' : "Hon'ble MP: "}{selectedConstObj.mp_name || 'Shri Rajesh Sharma'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {selectedConstObj.mp_party && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 font-bold text-amber-900">
                              {selectedConstObj.mp_party}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                            {selectedConstObj.house_type || 'Lok Sabha'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 font-semibold text-blue-800">
                            {selectedStateObj?.state_name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : selectedRole === 'District' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {language === 'hi' ? 'राज्य / केंद्र शासित प्रदेश' : 'State / UT'}
                        </label>
                        <select
                          value={demoStateId}
                          onChange={(e) => handleDemoStateChange(e.target.value)}
                          className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                        >
                          {(geoData.states || []).map((s) => (
                            <option key={s.state_id} value={s.state_id}>
                              {tr(s.state_name)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {language === 'hi' ? 'ज़िला (ज़िलाधिकारी क्षेत्राधिकार)' : 'District (Collector Scope)'}
                        </label>
                        <select
                          value={demoDistrictId}
                          onChange={(e) => setDemoDistrictId(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                        >
                          {availableDemoDistricts.map((d) => (
                            <option key={d.district_id} value={d.district_id}>
                              {tr(d.district_name)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-900/80 bg-white/70 p-1.5 rounded-lg border border-amber-200/50">
                      {language === 'hi'
                        ? 'नियुक्त ज़िला क्षेत्राधिकार: इस ज़िले के सभी उप-प्रभागों/तहसीलों एवं लोकसभा/राज्यसभा सांसदों के कार्यों की पूर्ण निगरानी व प्रशासनिक स्वीकृति।'
                        : 'Strictly locked to assigned district: Coordinates all subdivisions, Lok Sabha and Rajya Sabha MP recommendations, sanctions and physical audits.'}
                    </p>
                  </div>
                ) : selectedRole === 'State' ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 mb-1">
                          {language === 'hi' ? 'राज्य / केंद्र शासित प्रदेश' : 'State / UT'}
                        </label>
                        <select
                          value={demoStateId}
                          onChange={(e) => handleDemoStateChange(e.target.value)}
                          className="w-full p-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                        >
                          {(geoData.states || []).map((s) => (
                            <option key={s.state_id} value={s.state_id}>
                              {tr(s.state_name)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col justify-end">
                        <div className="p-2 bg-white border border-amber-300 rounded-xl text-[11px] font-bold text-purple-900 truncate">
                          {language === 'hi' ? 'समग्र राज्य एवं अंतर-ज़िला' : 'Consolidated Inter-District Scope'}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-900/80 bg-white/70 p-1.5 rounded-lg border border-amber-200/50">
                      {language === 'hi'
                        ? 'राज्य नोडल योजना प्राधिकरण: राज्य के सभी ज़िलों एवं अंतर-ज़िला विकास परियोजनाओं का अनुश्रवण, अनिस्तारित शेष एवं PFMS निधि समन्वय।'
                        : 'State Nodal Planning Authority: State-wide inter-district monitoring, treasury unspent balances & PFMS releases.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white border border-amber-300 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                      <Award size={14} className="text-rose-600" />
                      {language === 'hi' ? 'केंद्रीय मंत्रालय (MoSPI) - अखिल भारतीय अधिकार क्षेत्र' : 'MoSPI Central Ministry - Pan-India Apex Jurisdiction'}
                    </div>
                    <p className="text-[10.5px] text-slate-600">
                      {language === 'hi'
                        ? 'सभी 36 राज्य एवं केंद्र शासित प्रदेश, 788 संसदीय क्षेत्र, राष्ट्रीय AI विसंगति जांच एवं योजना नीति निर्धारण।'
                        : 'Pan-India macro analytics across all 36 States/UTs, 788 parliamentary seats, AI Anomaly Engine & Scheme Policy.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Login Form with Unique ID and Password only */}
              <form onSubmit={handleLogin} className="space-y-4 pt-2">
                {/* Official Unique ID Input */}
                <Input
                  label={language === 'hi' ? 'आधिकारिक विशिष्ट पहचान संख्या (Unique ID)' : 'Official Unique ID'}
                  type="text"
                  value={loginUniqueId}
                  onChange={(e) => setLoginUniqueId(e.target.value)}
                  placeholder="e.g. MP-LS-2024-042 or IAS-UP-2018-084"
                  icon={ShieldCheck}
                  required
                />

                {/* Password Input with Forgot Password Option */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      {language === 'hi' ? 'पासवर्ड' : 'Password'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotId(loginUniqueId);
                        setForgotNotice(null);
                        setShowForgotPassword(true);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    >
                      {language === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot Password?'}
                    </button>
                  </div>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    icon={Lock}
                    required
                  />
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-semibold flex items-center gap-2">
                    <AlertCircle size={15} />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={loading || signingInRole !== null}
                    className="w-full cursor-pointer font-bold shadow-sm"
                  >
                    {language === 'hi' ? `कंसोल में साइन इन करें (${tr(selectedRole)})` : `Sign In to Console (${selectedRole})`} <ArrowRight size={16} />
                  </Button>
                </div>
              </form>
            </div>

            {/* Footer Security Badge */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" /> NIC Secured &bull; 256-Bit SSL
              </span>
              <span>MoSPI &bull; Govt of India</span>
            </div>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative space-y-4">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'hi' ? 'आधिकारिक पासवर्ड रीसेट' : 'Official Password Recovery'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {language === 'hi' ? 'एनआईसी नोडल सत्यापन गेटवे' : 'NIC Nodal Verification Gateway'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'hi'
                ? 'सरकारी सेवा सुरक्षा नियमों के अनुसार पासवर्ड रीसेट आपके पंजीकृत मोबाइल और एनआईसी नोडल अधिकारी अनुमोदन पर आधारित है।'
                : 'As per Government of India security standards, password resets require OTP verification on the registered official mobile number or NIC Nodal Officer authorization.'}
            </p>

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <Input
                label={language === 'hi' ? 'अपनी विशिष्ट पहचान संख्या (Unique ID) दर्ज करें' : 'Enter Official Unique ID'}
                type="text"
                value={forgotId}
                onChange={(e) => setForgotId(e.target.value)}
                placeholder="e.g. MP-LS-2024-042 or IAS-UP-2018-084"
                icon={UserCheck}
                required
              />

              {forgotNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                  {forgotNotice.message}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={sendingReset}
                  className="flex-1 text-xs font-bold"
                >
                  {language === 'hi' ? 'ओटीपी / रीसेट टोकन भेजें' : 'Send Reset Token / OTP'}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {language === 'hi' ? 'बंद करें' : 'Close'}
                </button>
              </div>
            </form>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10.5px] text-slate-500 space-y-1">
              <div className="font-bold text-slate-700 flex items-center gap-1">
                <HelpCircle size={12} className="text-blue-600" />
                <span>NIC Nodal Helpdesk Support:</span>
              </div>
              <p>Email: <span className="font-mono text-blue-700">helpdesk@mplads.gov.in</span> &bull; Toll-Free: <span className="font-semibold">1800-11-2026</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Official Government Footer */}
      <GovFooter />
    </div>
  );
}

export default Login;
