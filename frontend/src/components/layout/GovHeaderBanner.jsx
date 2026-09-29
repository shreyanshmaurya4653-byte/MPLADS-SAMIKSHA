import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { User, LogOut, Shield } from 'lucide-react';

import { InsightAiLogo } from '../common/InsightAiLogo';

export function GovHeaderBanner() {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'MP': return 'bg-amber-600';
      case 'District': return 'bg-emerald-700';
      case 'State': return 'bg-indigo-700';
      default: return 'bg-blue-800';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 py-3 sm:py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Official Emblem & MPLADS Insight AI Portal Branding */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* MPLADS Insight AI Official Emblem */}
          <InsightAiLogo className="w-13 h-17 sm:w-15 sm:h-19" />

          <div className="border-l border-slate-300 pl-3">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg md:text-xl font-black text-[#0a3d62] tracking-tight leading-tight">
                MPLADS-SAMIKSHA
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-2xs">
                AI SAMIKSHA
              </span>
            </div>
            <div className="text-[11px] sm:text-xs font-semibold text-slate-700 leading-tight mt-0.5">
              {language === 'hi' 
                ? 'सांसद स्थानीय क्षेत्र विकास योजना (एमपीलैड्स)' 
                : 'Members of Parliament Local Area Development Scheme'}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[11px] font-medium text-slate-500">
                {t('ministryName')}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0a3d62] border border-blue-200">
                <Shield size={10} className="text-blue-700" />
                {t('aiPortalTag')}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Digital India Badge & Official Profile / Role Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
          {/* Digital India Seal */}
          <div className="hidden xl:flex flex-col items-center justify-center px-3 py-1 bg-amber-50 rounded-lg border border-amber-200 text-center mr-2">
            <span className="text-[10px] font-extrabold text-[#d97706] tracking-wider uppercase">{t('digitalIndia')}</span>
            <span className="text-[9px] text-slate-600 font-medium">{t('powerToEmpower')}</span>
          </div>

          {/* Official User Capsule */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/90 rounded-lg p-1.5 sm:px-3 sm:py-2">
            <div className={`w-8 h-8 rounded-md ${getRoleColor(user?.role)} text-white flex items-center justify-center font-bold text-xs shadow-inner`}>
              {user?.avatar || 'GO'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-none truncate max-w-[150px]">
                {user?.name || (language === 'hi' ? 'प्रशासनिक अधिकारी' : 'Administrative Officer')}
              </p>
              <p className="text-[10px] text-slate-500 font-medium mt-1 leading-none">
                {user?.role ? `${language === 'hi' ? 'स्तर: ' : 'Tier: '}${user.role}` : (language === 'hi' ? 'राष्ट्रीय प्रभाग' : 'National Cell')}
              </p>
            </div>
          </div>



          {/* Official Profile Link */}
          <Link
            to="/profile"
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            title="View Official Profile Dossier"
          >
            <User size={14} className="text-slate-600" />
            <span className="hidden sm:inline">{language === 'hi' ? 'प्रोफ़ाइल' : 'Profile'}</span>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            title="Sign Out Official Session"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
