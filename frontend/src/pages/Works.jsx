import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { useWorks } from '../hooks/useWorks';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../hooks/useLanguage';
import { WorkFilters } from '../components/works/WorkFilters';
import { WorkTable } from '../components/works/WorkTable';
import { WorkCard } from '../components/works/WorkCard';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';
import { JurisdictionSelectorBar } from '../components/common/JurisdictionSelectorBar';
import { worksApi } from '../api/worksApi';

export function Works() {
  const { user } = useAuth();
  const { language, t, tr } = useLanguage();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [category, setCategory] = useState('All');
  const [houseType, setHouseType] = useState('All');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [jurisdictionFilters, setJurisdictionFilters] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 280);
    return () => clearTimeout(timer);
  }, [search]);

  // New Work Proposal Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Community Infrastructure');
  const [newAgency, setNewAgency] = useState('Public Works Department (PWD)');
  const [newAmount, setNewAmount] = useState('1500000');
  const [creating, setCreating] = useState(false);

  const { works, loading, refetch } = useWorks({
    search: debouncedSearch,
    status,
    category,
    house_type: houseType,
    limit: 100,
    ...jurisdictionFilters
  });

  const handleCreateWork = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await worksApi.createWork({
        title: newTitle,
        category: newCategory,
        implementing_agency: newAgency,
        sanctioned_amount: parseFloat(newAmount),
        estimated_cost: parseFloat(newAmount),
        start_date: new Date().toISOString().split('T')[0],
        expected_completion: '2025-03-31'
      });
      setIsModalOpen(false);
      setNewTitle('');
      refetch();
    } catch (err) {
      console.error('Failed to register work:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            {language === 'hi' ? 'परियोजनाएं एवं कार्य रिपॉजिटरी' : 'Works & Project Repository'}
          </h3>
          <p className="text-xs text-slate-400">
            {language === 'hi'
              ? 'एमपीलैड्स स्वीकृत विकासात्मक परिसंपत्तियों की संपूर्ण रजिस्ट्री'
              : 'Complete registry of MPLADS sanctioned developmental assets'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title={language === 'hi' ? 'तालिका दृश्य' : 'Table View'}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title={language === 'hi' ? 'ग्रिड दृश्य' : 'Grid View'}
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <Button variant="primary" size="md" icon={Plus} onClick={() => setIsModalOpen(true)}>
            {language === 'hi' ? 'नया कार्य अनुशंसित करें' : 'Recommend New Work'}
          </Button>
        </div>
      </div>

      {/* Role-Based Jurisdiction & MP Selector Bar */}
      <JurisdictionSelectorBar
        onFilterChange={setJurisdictionFilters}
        activeFilters={jurisdictionFilters}
        onDataUploaded={refetch}
      />

      {/* MP Role Regulatory Advisory */}
      {user?.role === 'MP' && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-xs">
          <div className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center shrink-0 mt-0.5">
            {language === 'hi' ? 'सांसद' : 'MP'}
          </div>
          <div>
            <h4 className="font-bold text-slate-900">
              {language === 'hi' ? 'संसदीय अनुशंसा एवं निगरानी मोड' : 'Parliamentary Recommendation & Oversight Mode'}
            </h4>
            <p className="text-slate-600 mt-0.5">
              {language === 'hi'
                ? 'एमपीलैड्स योजना दिशानिर्देशों के तहत, माननीय संसद सदस्यों के पास अनुशंसा और समीक्षा अधिकार हैं। परिचालन डेटा अपलोड, प्रशासनिक ट्रैकिंग और परिसंपत्ति रजिस्टर ज़िला प्राधिकरण अधिकारियों द्वारा बनाए रखे जाते हैं।'
                : "Under MPLADS Scheme Guidelines, Hon'ble Members of Parliament exercise recommendatory and review powers. Operational data uploads, administrative tracking, and asset registers are maintained by District Authority officers."}
            </p>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <WorkFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        category={category}
        onCategoryChange={setCategory}
        houseType={houseType}
        onHouseTypeChange={setHouseType}
      />

      {/* Content */}
      {loading ? (
        <Loader text={language === 'hi' ? 'परियोजना रिकॉर्ड लोड हो रहे हैं...' : 'Loading works records...'} />
      ) : works.length === 0 ? (
        <EmptyState
          title={language === 'hi' ? 'आपकी खोज से कोई परियोजना मेल नहीं खाती' : 'No projects match your query'}
          description={language === 'hi' ? 'अन्य परियोजनाएं देखने के लिए खोज साफ़ करें या श्रेणी फ़िल्टर समायोजित करें।' : 'Clear search or adjust category filters to view other projects.'}
          actionText={language === 'hi' ? 'फ़िल्टर हटाएं' : 'Clear Filters'}
          onAction={() => {
            setSearch('');
            setStatus('All');
            setCategory('All');
          }}
        />
      ) : viewMode === 'table' ? (
        <WorkTable works={works} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}

      {/* Recommend New Work Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={language === 'hi' ? 'नया एमपीलैड्स विकासात्मक कार्य अनुशंसित करें' : 'Recommend New MPLADS Developmental Work'}
      >
        <form onSubmit={handleCreateWork} className="space-y-4 text-xs">
          <Input
            label={language === 'hi' ? 'कार्य शीर्षक एवं दायरा' : 'Work Title & Scope'}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={language === 'hi' ? 'उदा. सेक्टर 5 में सौर पेयजल संयंत्र' : 'e.g. Solar Drinking Water Plant at Sector 5'}
            required
          />

          <div>
            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {language === 'hi' ? 'श्रेणी' : 'Category'}
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {[
                'Community Infrastructure',
                'Roads & Connectivity',
                'Water & Sanitation',
                'Education',
                'Health',
                'Urban Infrastructure'
              ].map((cat) => (
                <option key={cat} value={cat}>{tr(cat)}</option>
              ))}
            </select>
          </div>

          <Input
            label={language === 'hi' ? 'कार्यान्वयन एजेंसी' : 'Implementing Agency'}
            value={newAgency}
            onChange={(e) => setNewAgency(e.target.value)}
            placeholder={language === 'hi' ? 'उदा. लोक निर्माण विभाग (PWD)' : 'e.g. Public Works Department (PWD)'}
            required
          />

          <Input
            label={language === 'hi' ? 'अनुमानित / स्वीकृत लागत (₹)' : 'Estimated / Sanctioned Cost (₹)'}
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              {language === 'hi' ? 'रद्द करें' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" loading={creating}>
              {language === 'hi' ? 'प्रशासनिक स्वीकृति हेतु भेजें' : 'Submit for Administrative Sanction'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
