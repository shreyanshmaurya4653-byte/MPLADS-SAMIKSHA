import React from 'react';
import {
  User,
  Mail,
  Phone,
  Building,
  Landmark,
  Shield,
  ShieldCheck,
  Award,
  MapPin,
  Calendar,
  CheckCircle2,
  KeyRound,
  FileText,
  Clock,
  Layers
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { Button } from '../components/common/Button';

export function Profile() {
  const { user, logout } = useAuth();
  const { language, tr } = useLanguage();

  const getRoleTheme = (role) => {
    switch (role) {
      case 'MP':
        return {
          title: language === 'hi' ? 'सांसद (संसद सदस्य)' : 'Member of Parliament',
          gradient: 'from-blue-600 via-indigo-600 to-blue-800',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Landmark,
          accent: 'text-blue-600'
        };
      case 'District':
        return {
          title: language === 'hi' ? 'ज़िला प्राधिकरण' : 'District Authority',
          gradient: 'from-emerald-600 via-teal-600 to-emerald-800',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: Building,
          accent: 'text-emerald-600'
        };
      case 'State':
        return {
          title: language === 'hi' ? 'राज्य नोडल अधिकारी' : 'State Nodal Officer',
          gradient: 'from-purple-600 via-indigo-600 to-purple-800',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Layers,
          accent: 'text-purple-600'
        };
      default:
        return {
          title: language === 'hi' ? 'सांख्यिकी एवं कार्यक्रम कार्यान्वयन मंत्रालय' : 'Ministry of Statistics & PI',
          gradient: 'from-rose-600 via-pink-600 to-rose-800',
          badge: 'bg-rose-100 text-rose-800 border-rose-200',
          icon: Award,
          accent: 'text-rose-600'
        };
    }
  };

  const theme = getRoleTheme(user?.role);
  const RoleIcon = theme.icon;

  const permissions = [
    { 
      name: language === 'hi' ? 'संसदीय क्षेत्र परियोजना अनुशंसाएं' : 'Constituency Project Recommendations', 
      allowed: user?.role === 'MP' || user?.role === 'Ministry' 
    },
    { 
      name: language === 'hi' ? 'तकनीकी एवं वित्तीय स्वीकृति सत्यापन' : 'Technical & Financial Sanction Verification', 
      allowed: user?.role === 'District' || user?.role === 'Ministry' 
    },
    { 
      name: language === 'hi' ? 'भौतिक प्रगति माइलस्टोन प्रमाणीकरण' : 'Physical Progress Milestone Certification', 
      allowed: user?.role === 'District' 
    },
    { 
      name: language === 'hi' ? 'अंतर-ज़िला विलंब ऑडिट एवं बेंचमार्किंग' : 'Inter-District Delay Auditing & Benchmarking', 
      allowed: user?.role === 'State' || user?.role === 'Ministry' 
    },
    { 
      name: language === 'hi' ? 'एजेंसियों को कारण बताओ निर्देश जारी करना' : 'Issue Show-Cause Directives to Agencies', 
      allowed: user?.role === 'District' || user?.role === 'State' 
    },
    { 
      name: language === 'hi' ? 'राष्ट्रीय विसंगति हीटमैप निगरानी' : 'National Anomaly Heatmap Oversight', 
      allowed: true 
    },
    { 
      name: language === 'hi' ? 'आधिकारिक ऑडिट डोजियर निर्यात (PDF/CSV)' : 'Export Official Audit Dossiers (PDF/CSV)', 
      allowed: true 
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Hero Profile Banner */}
      <div className={`bg-gradient-to-r ${theme.gradient} rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg`}>
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar Circle */}
            <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-white text-2xl font-black shadow-xl">
              {user?.avatar || 'US'}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                  {tr(user?.role)} {language === 'hi' ? 'स्तर' : 'Tier'}
                </span>
                <span className="text-xs text-white/80 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-300" /> {language === 'hi' ? 'एनआईसी द्वारा प्रमाणित' : 'NIC Verified'}
                </span>
              </div>
              <h2 className="text-2xl font-black">{user?.name || (language === 'hi' ? 'अधिकृत अधिकारी' : 'Authorized Official')}</h2>
              <p className="text-xs text-white/80">
                {user?.designation || theme.title} • {user?.department || (language === 'hi' ? 'भारत सरकार' : 'Government of India')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-xs cursor-pointer"
              onClick={logout}
            >
              {language === 'hi' ? 'सत्र समाप्त (लॉगआउट)' : 'Sign Out'}
            </Button>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Official Administrative Dossier */}
        <div className="lg:col-span-2 space-y-6">
          {/* Official Credentials Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <RoleIcon size={18} className={theme.accent} />
              <h3 className="text-sm font-bold text-slate-900">
                {language === 'hi' ? 'प्रशासनिक पहचान एवं अधिकार क्षेत्र' : 'Administrative Identity & Jurisdiction'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {language === 'hi' ? 'आधिकारिक ईमेल' : 'Official Email'}
                </span>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                  <Mail size={13} className="text-slate-400 flex-shrink-0" /> {user?.email || 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  {language === 'hi' ? 'संपर्क मोबाइल' : 'Contact Mobile'}
                </span>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400 flex-shrink-0" /> {user?.phone || '+91 98765 43210'}
                </p>
              </div>

              {/* MP Specific */}
              {user?.role === 'MP' && (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? 'संसदीय क्षेत्र' : 'Parliamentary Constituency'}
                    </span>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400 flex-shrink-0" /> {user?.constituency_name || 'Central Constituency'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? 'संसदीय सदन' : 'Parliamentary House'}
                    </span>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Landmark size={13} className="text-slate-400 flex-shrink-0" /> {tr(user?.house_type || 'Lok Sabha')}
                    </p>
                  </div>
                </>
              )}

              {/* District Specific */}
              {user?.role === 'District' && (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? 'ज़िला अधिकार क्षेत्र' : 'District Jurisdiction'}
                    </span>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400 flex-shrink-0" /> {tr(user?.district_name || 'District Administrative Division')}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? 'संवर्ग / सेवा कोड' : 'Cadre / Service Code'}
                    </span>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Award size={13} className="text-slate-400 flex-shrink-0" /> {user?.employee_code || 'IAS-UP-2018'}
                    </p>
                  </div>
                </>
              )}

              {/* State Specific */}
              {user?.role === 'State' && (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? 'राज्य अधिकार क्षेत्र' : 'State Jurisdiction'}
                    </span>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400 flex-shrink-0" /> {tr(user?.state_name || 'Uttar Pradesh')}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? 'नोडल विभाग' : 'Nodal Department'}
                    </span>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                      <Building size={13} className="text-slate-400 flex-shrink-0" /> {user?.department || (language === 'hi' ? 'योजना विभाग' : 'Planning Dept')}
                    </p>
                  </div>
                </>
              )}

              {/* Ministry Specific */}
              {user?.role === 'Ministry' && (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? 'मंत्रालय प्रभाग' : 'Ministry Division'}
                    </span>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Building size={13} className="text-slate-400 flex-shrink-0" /> {user?.department || 'MPLADS Division, New Delhi'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {language === 'hi' ? 'केंद्रीय कर्मचारी कोड' : 'Central Employee Code'}
                    </span>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <KeyRound size={13} className="text-slate-400 flex-shrink-0" /> {user?.employee_code || 'MOSPI-C-4421'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Role-Based Permissions Matrix */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'hi' ? 'शासन एवं ऑडिट अनुमतियां मैट्रिक्स' : 'Governance & Audit Permissions Matrix'}
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {language === 'hi' ? 'RBAC सक्रिय' : 'RBAC Active'}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {permissions.map((p) => (
                <div key={p.name} className="py-2.5 flex items-center justify-between">
                  <span className={p.allowed ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                    {p.name}
                  </span>
                  {p.allowed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                      <CheckCircle2 size={14} /> {language === 'hi' ? 'अधिकृत' : 'Authorized'}
                    </span>
                  ) : (
                    <span className="text-slate-300 font-medium text-[11px]">
                      {language === 'hi' ? 'प्रतिबंधित' : 'Restricted'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Security & Activity Status */}
        <div className="space-y-6">
          {/* Security & Verification Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'hi' ? 'सुरक्षा एवं अनुपालन' : 'Security & Compliance'}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div>
                  <p className="font-bold text-slate-800">{language === 'hi' ? 'सरकारी सिंगल साइन-ऑन (SSO)' : 'Gov Single Sign-On'}</p>
                  <p className="text-[10px] text-slate-400">{language === 'hi' ? 'केंद्रीय पोर्टल द्वारा प्रमाणित' : 'Authenticated via Central Portal'}</p>
                </div>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div>
                  <p className="font-bold text-slate-800">{language === 'hi' ? 'JWT सत्र टोकन' : 'JWT Session Token'}</p>
                  <p className="text-[10px] text-slate-400">{language === 'hi' ? '24-घंटे क्रिप्टोग्राफ़िक सत्र' : '24-hour cryptographic claim'}</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {language === 'hi' ? 'सक्रिय' : 'Active'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <div>
                  <p className="font-bold text-slate-800">{language === 'hi' ? 'ऑडिट ट्रेल लॉगिंग' : 'Audit Trail Logging'}</p>
                  <p className="text-[10px] text-slate-400">{language === 'hi' ? 'सभी क्रियाएं डेटाबेस में दर्ज' : 'All actions logged to database'}</p>
                </div>
                <CheckCircle2 size={16} className="text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'hi' ? 'त्वरित नेविगेशन' : 'Quick Navigation'}
            </h3>
            <div className="space-y-2">
              <a
                href="/works"
                className="block p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 font-semibold text-slate-700 hover:text-blue-700 transition-colors"
              >
                {language === 'hi' ? 'कार्य सूची का निरीक्षण करें →' : 'Inspect Scoped Works List →'}
              </a>
              <a
                href="/alerts"
                className="block p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 font-semibold text-slate-700 hover:text-blue-700 transition-colors"
              >
                {language === 'hi' ? 'विसंगति अलर्ट कतार देखें →' : 'Review Anomaly Alerts Queue →'}
              </a>
              <a
                href="/dashboard"
                className="block p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 font-semibold text-slate-700 hover:text-blue-700 transition-colors"
              >
                {language === 'hi' ? 'डैशबोर्ड अवलोकन पर वापस जाएं →' : 'Return to Dashboard Overview →'}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
