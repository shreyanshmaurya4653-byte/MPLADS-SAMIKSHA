import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Building, 
  Globe2, 
  Search, 
  UserCheck, 
  UploadCloud, 
  RotateCcw, 
  Layers,
  Landmark,
  Compass
} from 'lucide-react';
import { jurisdictionApi } from '../../api/jurisdictionApi';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { DataUploadModal } from './DataUploadModal';

export function JurisdictionSelectorBar({ onFilterChange, activeFilters = {}, onDataUploaded }) {
  const { user } = useAuth();
  const { language, t, tr } = useLanguage();
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Selected filters state
  const [selectedState, setSelectedState] = useState(activeFilters.state_id || '');
  const [selectedDistrict, setSelectedDistrict] = useState(activeFilters.district_id || '');
  const [selectedConstituency, setSelectedConstituency] = useState(activeFilters.constituency_id || '');
  const [selectedMpName, setSelectedMpName] = useState(activeFilters.mp_name || '');
  const [selectedHouseType, setSelectedHouseType] = useState(activeFilters.house_type || '');
  const [mpSearchInput, setMpSearchInput] = useState(activeFilters.mp_name || '');

  useEffect(() => {
    async function loadHierarchy() {
      try {
        setLoading(true);
        const data = await jurisdictionApi.getHierarchy();
        setHierarchy(data);

        // If user is District, auto-lock to their assigned district
        if (user?.role === 'District' && data?.districts?.length > 0) {
          const dist = data.districts.find(d => Number(d.district_id) === Number(user.district_id)) || data.districts[0];
          setSelectedDistrict(dist.district_id);
          setSelectedState(dist.state_id || user.state_id || 1);
          if (onFilterChange) {
            onFilterChange({
              state_id: dist.state_id || user.state_id || 1,
              district_id: dist.district_id,
              house_type: selectedHouseType || undefined
            });
          }
        } else if (user?.role === 'State' && data?.states?.length > 0) {
          const st = data.states.find(s => Number(s.state_id) === Number(user.state_id)) || data.states[0];
          setSelectedState(st.state_id);
          if (onFilterChange) {
            onFilterChange({
              state_id: st.state_id,
              house_type: selectedHouseType || undefined
            });
          }
        } else if (user?.role === 'MP' && data?.constituencies?.length > 0) {
          const c = data.constituencies.find(x => Number(x.constituency_id) === Number(user.constituency_id) || (user.name && x.mp_name && x.mp_name.toLowerCase().includes(user.name.toLowerCase()))) || data.constituencies[0];
          setSelectedConstituency(c.constituency_id);
          setSelectedDistrict(c.district_id);
          setSelectedState(c.state_id);
          const chosenMp = c.mp_name || user.name || '';
          const chosenHt = c.house_type || user.house_type || 'Lok Sabha';
          setSelectedMpName(chosenMp);
          setSelectedHouseType(chosenHt);
          if (onFilterChange) {
            onFilterChange({
              state_id: c.state_id,
              district_id: c.district_id,
              constituency_id: c.constituency_id,
              mp_name: chosenMp || undefined,
              house_type: chosenHt
            });
          }
        }
      } catch (err) {
        console.error('Failed to load jurisdiction hierarchy:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHierarchy();
  }, [user?.role, user?.district_id, user?.state_id, user?.constituency_id]);

  // Trigger callback when filters change
  const applyFilters = (overrides = {}) => {
    const sId = overrides.state_id !== undefined ? overrides.state_id : selectedState;
    const dId = overrides.district_id !== undefined ? overrides.district_id : selectedDistrict;
    const cId = overrides.constituency_id !== undefined ? overrides.constituency_id : selectedConstituency;
    const mp = overrides.mp_name !== undefined ? overrides.mp_name : selectedMpName;
    const ht = overrides.house_type !== undefined ? overrides.house_type : selectedHouseType;

    if (onFilterChange) {
      onFilterChange({
        state_id: sId || undefined,
        district_id: dId || undefined,
        constituency_id: cId || undefined,
        mp_name: mp || undefined,
        house_type: ht || undefined
      });
    }
  };

  const handleStateChange = (stateId) => {
    setSelectedState(stateId);
    setSelectedDistrict('');
    setSelectedConstituency('');
    setSelectedMpName('');
    setMpSearchInput('');
    applyFilters({ state_id: stateId, district_id: '', constituency_id: '', mp_name: '' });
  };

  const handleDistrictChange = (distId) => {
    setSelectedDistrict(distId);
    setSelectedConstituency('');
    setSelectedMpName('');
    setMpSearchInput('');
    applyFilters({ district_id: distId, constituency_id: '', mp_name: '' });
  };

  const handleConstituencyChange = (constId) => {
    setSelectedConstituency(constId);
    if (selectedHouseType === 'Rajya Sabha') {
      setSelectedMpName('');
      setMpSearchInput('');
      applyFilters({ constituency_id: constId, mp_name: '' });
    } else {
      const matched = hierarchy?.constituencies?.find((c) => String(c.constituency_id) === String(constId));
      const mpName = matched?.mp_name || '';
      setSelectedMpName(mpName);
      setMpSearchInput(mpName);
      applyFilters({ constituency_id: constId, mp_name: mpName });
    }
  };

  const handleMpSelect = (mpName) => {
    setSelectedMpName(mpName);
    setMpSearchInput(mpName);
    const matched = hierarchy?.mps?.find((m) => m.mp_name === mpName);
    if (matched) {
      if (!isDistrict) {
        if (matched.constituency_id) setSelectedConstituency(matched.constituency_id);
        if (matched.district_id) setSelectedDistrict(matched.district_id);
        if (matched.state_id) setSelectedState(matched.state_id);
      }
      applyFilters({
        mp_name: mpName,
        ...(matched.constituency_id && !isDistrict ? { constituency_id: matched.constituency_id } : {}),
        ...(matched.house_type ? { house_type: matched.house_type } : {})
      });
      if (matched.house_type) setSelectedHouseType(matched.house_type);
    } else {
      applyFilters({ mp_name: mpName });
    }
  };

  const handleHouseTypeChange = (ht) => {
    setSelectedHouseType(ht);
    if (ht === 'Rajya Sabha') {
      setSelectedMpName('');
      setMpSearchInput('');
      applyFilters({ house_type: ht, mp_name: '' });
    } else {
      applyFilters({ house_type: ht });
    }
  };

  const handleReset = () => {
    if (user?.role === 'MP') return; // Cannot reset MP scope

    let resetS = '';
    let resetD = '';
    if (user?.role === 'District') {
      resetD = hierarchy?.districts?.[0]?.district_id || user?.district_id || '';
      resetS = hierarchy?.districts?.[0]?.state_id || user?.state_id || 1;
    } else if (user?.role === 'State') {
      resetS = hierarchy?.states?.[0]?.state_id || user?.state_id || 1;
    }

    setSelectedState(resetS);
    setSelectedDistrict(resetD);
    setSelectedConstituency('');
    setSelectedMpName('');
    setSelectedHouseType('');
    setMpSearchInput('');
    applyFilters({
      state_id: resetS,
      district_id: resetD,
      constituency_id: '',
      mp_name: '',
      house_type: ''
    });
  };

  const isMP = user?.role === 'MP';
  const isDistrict = user?.role === 'District';
  const isState = user?.role === 'State';
  const isNational = user?.role === 'Ministry' || user?.role === 'Admin';

  // Filter districts by selectedState
  const availableDistricts = (hierarchy?.districts || []).filter((d) => {
    if (!selectedState) return true;
    return String(d.state_id) === String(selectedState);
  });

  // Effective district ID to determine constituencies
  const effectiveDistrictId = isDistrict 
    ? (hierarchy?.districts?.[0]?.district_id || selectedDistrict)
    : selectedDistrict;

  // Filter constituencies by selectedDistrict or selectedState
  const availableConstituencies = (hierarchy?.constituencies || []).filter((c) => {
    if (effectiveDistrictId) {
      return String(c.district_id) === String(effectiveDistrictId);
    }
    if (selectedState) {
      return String(c.state_id) === String(selectedState);
    }
    return true;
  });

  // Available MPs (filtered by district, state, and house_type if selected)
  const availableMps = (hierarchy?.mps || []).filter((m) => {
    if (selectedHouseType && selectedHouseType !== 'All' && m.house_type) {
      if (m.house_type !== selectedHouseType) return false;
    }
    if (effectiveDistrictId) {
      return !m.district_id || String(m.district_id) === String(effectiveDistrictId);
    }
    if (selectedState) {
      return !m.state_id || String(m.state_id) === String(selectedState);
    }
    return true;
  });

  // Assigned district and state names for badge
  const assignedDistrictName = hierarchy?.districts?.[0]?.district_name || user?.district_name || 'Assigned District';
  const assignedStateName = hierarchy?.states?.[0]?.state_name || user?.state_name || 'Assigned State';

  return (
    <>
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {isNational ? <Globe2 size={16} /> : isState ? <Building size={16} /> : isDistrict ? <MapPin size={16} /> : <UserCheck size={16} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {isNational
                    ? (language === 'hi' ? 'राष्ट्रीय सर्वेक्षण एवं अधिकार क्षेत्र' : 'National Survey & Cascaded Jurisdiction')
                    : isState
                    ? `${language === 'hi' ? 'राज्य अधिकार क्षेत्र' : 'State Jurisdiction'} (${assignedStateName})`
                    : isDistrict
                    ? `${language === 'hi' ? 'ज़िला प्राधिकरण' : 'District Authority'} (${assignedDistrictName})`
                    : (language === 'hi' ? 'संसदीय क्षेत्र अधिकार दायरा' : 'Constituency Jurisdictional Scope')}
                </h4>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {user?.role} {language === 'hi' ? 'स्तर' : 'Tier'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isNational
                  ? (language === 'hi' ? 'राज्य > ज़िला > संसदीय क्षेत्र > सांसद क्रम में फ़िल्टर करें' : 'Filter State > District > Constituency > MP across India')
                  : isState
                  ? (language === 'hi' ? 'ज़िला > संसदीय क्षेत्र > सांसद क्रम में फ़िल्टर करें' : 'Filter District > Constituency > MP within assigned State')
                  : isDistrict
                  ? (language === 'hi' ? 'अपने ज़िले के संसदीय क्षेत्र एवं सांसद (लोकसभा/राज्यसभा) चुनें' : 'Filter Constituencies and multiple MPs (Lok Sabha / Rajya Sabha) in your assigned district')
                  : (language === 'hi' ? 'आपके संसदीय क्षेत्र की अनुशंसाओं के लिए निर्धारित' : 'Locked to your parliamentary constituency recommendations')}
              </p>
            </div>
          </div>

          {/* Right Action: Badges, Upload Data & Reset */}
          <div className="flex items-center gap-2">
            {/* For District Officer: Prominent Assigned Jurisdiction Indicator (Option to select District/State is hidden) */}
            {isDistrict && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold shadow-2xs">
                <MapPin size={13} className="text-emerald-600 flex-shrink-0" />
                <span>
                  {language === 'hi' ? 'नियुक्त ज़िला: ' : 'Assigned: '}
                  {tr(assignedDistrictName)}, {tr(assignedStateName)}
                </span>
              </div>
            )}

            {/* For State Officer: Assigned State Badge */}
            {isState && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 text-xs font-bold shadow-2xs">
                <Building size={13} className="text-purple-600 flex-shrink-0" />
                <span>
                  {language === 'hi' ? 'नियुक्त राज्य: ' : 'Assigned State: '}
                  {tr(assignedStateName)}
                </span>
              </div>
            )}

            {!isMP && (
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
              >
                <UploadCloud size={14} /> {language === 'hi' ? 'योजना डेटा अपलोड करें' : 'Upload Scheme Data'}
              </button>
            )}

            {(selectedConstituency || selectedMpName || selectedHouseType || (isNational && (selectedState || selectedDistrict)) || (isState && selectedDistrict)) && !isMP && (
              <button
                type="button"
                onClick={handleReset}
                title={t('filterReset', 'Reset Filters')}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* SELECTORS GRID: STRICTLY SCOPED PER USER ROLE                  */}
        {/* ============================================================== */}
        <div className={`grid gap-2.5 pt-2 border-t border-slate-100 text-xs ${
          isDistrict 
            ? (selectedHouseType === 'Rajya Sabha' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3')
            : isState 
            ? (selectedHouseType === 'Rajya Sabha' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')
            : (selectedHouseType === 'Rajya Sabha' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5')
        }`}>
          {/* 1. STATE SELECTOR: ONLY SHOWN FOR NATIONAL / MINISTRY (HIDDEN FOR DISTRICT & STATE) */}
          {isNational && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {t('filterSelectState', 'State Jurisdiction')}
              </label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="">{t('filterAllStates', 'All States (National)')}</option>
                {(hierarchy?.states || []).map((s) => (
                  <option key={s.state_id} value={s.state_id}>
                    {tr(s.state_name)} ({s.state_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 2. DISTRICT SELECTOR: SHOWN FOR NATIONAL AND STATE (COMPLETELY HIDDEN FOR DISTRICT OFFICER!) */}
          {(isNational || isState) && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {t('filterSelectDistrict', 'District Jurisdiction')}
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="">
                  {selectedState ? (language === 'hi' ? 'राज्य के सभी ज़िले' : 'All Districts in State') : t('filterAllDistricts', 'All Districts')}
                </option>
                {availableDistricts.map((d) => (
                  <option key={d.district_id} value={d.district_id}>
                    {tr(d.district_name)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. CONSTITUENCY DIVISION */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t('filterSelectConstituency', 'Constituency Division')}
            </label>
            {!isMP ? (
              <select
                value={selectedConstituency}
                onChange={(e) => handleConstituencyChange(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">
                  {effectiveDistrictId ? (language === 'hi' ? 'ज़िले के सभी संसदीय क्षेत्र' : 'All Constituencies in District') : t('filterAllConstituencies', 'All Constituencies')}
                </option>
                {availableConstituencies.map((c) => (
                  <option key={c.constituency_id} value={c.constituency_id}>
                    {c.constituency_name} ({c.mp_name ? c.mp_name.split(' ')[0] : (language === 'hi' ? 'सांसद' : 'MP')})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 truncate">
                <Layers size={13} className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{user?.constituency_name || hierarchy?.constituencies?.[0]?.constituency_name || (language === 'hi' ? 'संसदीय प्रभाग' : 'Constituency Division')}</span>
              </div>
            )}
          </div>

          {/* 5. MULTIPLE MP SELECTOR (HIDDEN WHEN RAJYA SABHA IS SELECTED - RS MPS REPRESENT ENTIRE STATE) */}
          {selectedHouseType !== 'Rajya Sabha' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>{language === 'hi' ? 'माननीय सांसद चुनें' : "Hon'ble MP"}</span>
                <span className="text-slate-400 font-medium">({availableMps.length} {language === 'hi' ? 'सांसद' : 'MPs'})</span>
              </label>
              {!isMP ? (
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    list="mp-datalist"
                    placeholder={t('filterSearchMp', 'Search MP (LS / RS)...')}
                    value={mpSearchInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMpSearchInput(val);
                      const matched = hierarchy?.mps?.find(
                        (m) => m.mp_name.toLowerCase() === val.trim().toLowerCase()
                      );
                      if (matched) {
                        handleMpSelect(matched.mp_name);
                      } else if (!val.trim()) {
                        handleMpSelect('');
                      } else {
                        setSelectedMpName(val);
                        applyFilters({ mp_name: val });
                      }
                    }}
                    className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <datalist id="mp-datalist">
                    {availableMps.map((m, idx) => (
                      <option key={`${m.mp_name}-${idx}`} value={m.mp_name}>
                        [{m.house_type === 'Rajya Sabha' ? 'RS' : 'LS'}] {m.mp_party ? `${m.mp_party} - ` : ''}{m.constituency_name || (language === 'hi' ? 'ज़िला कार्य' : 'District Works')}{m.allocated_amount > 0 ? ` (Allocated: ₹${(m.allocated_amount / 10000000).toFixed(2)} Cr)` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>
              ) : (
                <div className="p-2 bg-blue-50/60 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 flex items-center gap-1.5 truncate">
                  <UserCheck size={13} className="text-blue-600 flex-shrink-0" />
                  <span className="truncate">{hierarchy?.constituencies?.[0]?.mp_name || (language === 'hi' ? 'माननीय संसद सदस्य' : "Hon'ble Member of Parliament")}</span>
                </div>
              )}
            </div>
          )}

          {/* 6. PARLIAMENTARY HOUSE TYPE (LOK SABHA / RAJYA SABHA) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              {t('filterHouseType', 'House Type')}
            </label>
            <select
              value={selectedHouseType}
              onChange={(e) => handleHouseTypeChange(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">{t('filterHouseAll', 'All Houses')}</option>
              <option value="Lok Sabha">{language === 'hi' ? 'लोक सभा (Lok Sabha)' : 'Lok Sabha'}</option>
              <option value="Rajya Sabha">{language === 'hi' ? 'राज्य सभा (Rajya Sabha)' : 'Rajya Sabha'}</option>
            </select>
          </div>
        </div>

        {/* Selected MP Quick Intelligence Strip (Only when Lok Sabha / General MP is active) */}
        {selectedMpName && selectedHouseType !== 'Rajya Sabha' && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-blue-50/40 -mx-4 -mb-4 px-4 py-2 rounded-b-2xl border-b border-blue-100">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase">{language === 'hi' ? 'सक्रिय सांसद फ़िल्टर:' : 'Active MP Scope:'}</span>
              <span className="font-bold text-slate-900">{selectedMpName}</span>
              {selectedHouseType && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  {selectedHouseType}
                </span>
              )}
            </div>
            {(() => {
              const matched = hierarchy?.mps?.find((m) => m.mp_name.toLowerCase() === selectedMpName.toLowerCase());
              if (matched && matched.allocated_amount > 0) {
                return (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600 font-medium">{language === 'hi' ? 'सांसद आवंटित सीमा कोटा:' : 'Official MP Allocated Limit:'}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-xs shadow-2xs">
                      ₹{(matched.allocated_amount / 10000000).toFixed(2)} Cr
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {/* Rajya Sabha Status Strip */}
        {selectedHouseType === 'Rajya Sabha' && (
          <div className="mt-3 pt-2.5 border-t border-purple-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-purple-50/60 -mx-4 -mb-4 px-4 py-2 rounded-b-2xl border-b border-purple-200">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                {language === 'hi' ? 'संसदीय सदन दायरा:' : 'Parliamentary House:'}
              </span>
              <span className="font-bold text-purple-950">
                {language === 'hi' ? 'राज्य सभा (राज्यों की परिषद)' : 'Rajya Sabha (Council of States)'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                {language === 'hi' ? 'राज्य-स्तरीय प्रतिनिधित्व' : 'State-Wide Representation'}
              </span>
            </div>
            <span className="text-purple-700 text-[11px] font-medium">
              {language === 'hi'
                ? 'इस क्षेत्र में केवल राज्य सभा सांसदों द्वारा प्रदत्त निधियां एवं स्वीकृत कार्य प्रदर्शित हैं'
                : 'Showing funds & works recommended strictly by Rajya Sabha Members in this jurisdiction'}
            </span>
          </div>
        )}
      </div>

      {/* Upload Modal (Hidden for MP, Active for District, State, Ministry, Admin) */}
      {!isMP && (
        <DataUploadModal
          isOpen={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          user={user}
          hierarchy={hierarchy}
          onUploadSuccess={() => {
            if (onDataUploaded) onDataUploaded();
          }}
        />
      )}
    </>
  );
}
