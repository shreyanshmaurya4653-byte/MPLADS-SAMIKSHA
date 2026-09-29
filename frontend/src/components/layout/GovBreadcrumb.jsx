import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home, ShieldCheck, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';

export function GovBreadcrumb({ title, subtitle }) {
  const location = useLocation();
  const { user } = useAuth();
  const { language, t, tr } = useLanguage();

  const pathSegments = location.pathname.split('/').filter(Boolean);

  const getJurisdictionLabel = () => {
    switch (user?.role) {
      case 'MP':
        return `${language === 'hi' ? 'संसदीय क्षेत्र: ' : 'Constituency: '}${user?.constituency_name || (language === 'hi' ? 'संसदीय स्तर' : 'Constituency Level')} ${language === 'hi' ? '(सांसद पहुंच)' : '(MP Access)'}`;
      case 'District':
        return `${language === 'hi' ? 'ज़िला: ' : 'District: '}${user?.district_name || (language === 'hi' ? 'ज़िला स्तर' : 'District Level')} ${language === 'hi' ? '(डीआरडीए पहुंच)' : '(DRDA Access)'}`;
      case 'State':
        return `${language === 'hi' ? 'राज्य: ' : 'State: '}${user?.state_name || (language === 'hi' ? 'राज्य स्तर' : 'State Level')} ${language === 'hi' ? '(नोडल प्रकोष्ठ)' : '(Nodal Cell)'}`;
      default:
        return t('nationalSurveyMode', 'National Pan-India Survey Mode (MoSPI Central)');
    }
  };

  return (
    <div className="bg-white border-b border-slate-200/90 py-3 px-4 sm:px-6 lg:px-8 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Breadcrumbs & Page Heading */}
        <div>
          <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-1" aria-label="Breadcrumb">
            <Link to="/dashboard" className="flex items-center gap-1 hover:text-[#0b3b60] text-slate-600 font-medium">
              <Home size={12} />
              <span>{t('breadcrumbPortal', 'Portal')}</span>
            </Link>
            {pathSegments.map((segment, index) => {
              const url = `/${pathSegments.slice(0, index + 1).join('/')}`;
              const isLast = index === pathSegments.length - 1;
              const formattedName = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

              return (
                <React.Fragment key={url}>
                  <ChevronRight size={11} className="text-slate-400" />
                  {isLast ? (
                    <span className="font-bold text-slate-800">{tr(title || formattedName)}</span>
                  ) : (
                    <Link to={url} className="hover:text-[#0b3b60] text-slate-600 font-medium">
                      {tr(formattedName)}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          <div className="flex items-baseline gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {tr(title)}
            </h1>
            {subtitle && (
              <span className="hidden sm:inline text-xs text-slate-500 font-normal">
                — {tr(subtitle)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Statutory Active Jurisdiction Stamp */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-700">
            <MapPin size={12} className="text-amber-600 flex-shrink-0" />
            <span className="font-semibold text-[11px] truncate max-w-[280px]">
              {getJurisdictionLabel()}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-bold">
            <ShieldCheck size={12} className="text-emerald-600" />
            <span>{t('authenticated', 'Authenticated')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
