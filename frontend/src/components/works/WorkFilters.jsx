import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

export function WorkFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  houseType = 'All',
  onHouseTypeChange
}) {
  const { language, tr } = useLanguage();

  const statuses = ['All', 'Ongoing', 'Completed', 'Delayed', 'Sanctioned'];
  const houses = ['All', 'Lok Sabha', 'Rajya Sabha'];
  const categories = [
    'All',
    'Community Infrastructure',
    'Roads & Connectivity',
    'Water & Sanitation',
    'Education',
    'Health',
    'Urban Infrastructure'
  ];

  const getHouseLabel = (h) => {
    if (h === 'All') return language === 'hi' ? 'दोनों सदन (लोकसभा और राज्यसभा)' : 'All Houses (LS & RS)';
    return language === 'hi' ? `${tr(h)} कार्य` : `${h} Works`;
  };

  const getStatusLabel = (s) => {
    if (s === 'All') return language === 'hi' ? 'सभी स्थितियां' : 'All Statuses';
    return tr(s);
  };

  const getCategoryLabel = (c) => {
    if (c === 'All') return language === 'hi' ? 'सभी श्रेणियां' : 'All Categories';
    return tr(c);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[240px]">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={language === 'hi' ? 'कार्य शीर्षक या आईडी द्वारा खोजें...' : 'Search by work title or ID...'}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
        />
      </div>

      {/* Parliamentary House Filter (Lok Sabha vs Rajya Sabha) */}
      {onHouseTypeChange && (
        <div>
          <select
            value={houseType}
            onChange={(e) => onHouseTypeChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {houses.map((h) => (
              <option key={h} value={h}>{getHouseLabel(h)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{getStatusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Category Filter */}
      <div>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{getCategoryLabel(c)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
