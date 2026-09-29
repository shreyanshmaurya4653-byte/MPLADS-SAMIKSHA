import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import {
  LayoutDashboard,
  FolderKanban,
  Landmark,
  ShieldAlert,
  BellRing,
  TrendingUp,
  MapPin,
  User,
  Menu,
  X,
  Compass,
  DollarSign,
  Brain,
  ShieldCheck,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function GovNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const role = user?.role || 'Ministry';

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', hi: 'डैशबोर्ड', icon: LayoutDashboard },
    ...(role === 'Ministry' || role === 'State' ? [
      { to: '/parliament', label: role === 'State' ? 'State MPs' : 'Parliament', hi: role === 'State' ? 'राज्य सांसद' : 'संसद', icon: Landmark }
    ] : []),
    { to: '/works', label: role === 'MP' ? 'My Works' : 'Works', hi: role === 'MP' ? 'मेरे कार्य' : 'कार्य', icon: FolderKanban },
    { to: '/map', label: 'GIS Map', hi: 'मानचित्र', icon: Compass },
    { to: '/risks', label: 'AI Risks', hi: 'जोखिम', icon: ShieldAlert },
    { to: '/predictions', label: 'Predictions', hi: 'भविष्यवाणी', icon: Brain },
    { to: '/finance', label: role === 'MP' ? 'My Quota & Finance' : 'Finance', hi: role === 'MP' ? 'मेरा कोटा एवं वित्त' : 'वित्त', icon: DollarSign },
    ...(role !== 'MP' ? [
      { to: '/investigations', label: 'Investigations', hi: 'जांच केंद्र', icon: ShieldCheck }
    ] : []),
    { to: '/alerts', label: 'Alerts', hi: 'अलर्ट', icon: BellRing },
    ...(role === 'Ministry' || role === 'State' ? [
      { to: '/trends', label: 'Trends', hi: 'रुझान', icon: TrendingUp }
    ] : []),
    ...(role === 'Ministry' ? [
      { to: '/audit-logs', label: 'Audit Trail', hi: 'लेखापरीक्षा', icon: Fingerprint }
    ] : []),
    { to: '/profile', label: 'Profile', hi: 'प्रोफ़ाइल', icon: User },
  ];

  return (
    <nav className="bg-[#0b3b60] text-white shadow-md select-none sticky top-0 z-40 border-b-2 border-amber-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 sm:h-13">
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-t-md text-xs font-semibold transition-all relative ${
                      isActive
                        ? 'bg-white text-[#0b3b60] font-bold shadow-sm'
                        : 'text-slate-100 hover:bg-[#124d7b] hover:text-amber-300'
                    }`
                  }
                >
                  <Icon size={14} />
                  <span>{language === 'hi' ? item.hi : item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Right Status / National Portal Helpdesk */}
          <div className="hidden md:flex items-center gap-3 text-xs text-amber-300 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-200">
              {t('coreDbOnline', 'National Core Database Online')}
            </span>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden w-full items-center justify-between py-2">
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              {t('mpladsNav', 'MPLADS Navigation')}
            </span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md text-slate-200 hover:text-white hover:bg-[#124d7b]"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#07263f] border-t border-[#124d7b] px-4 pt-2 pb-3 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-amber-500 text-slate-900 font-bold'
                      : 'text-slate-200 hover:bg-[#124d7b]'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={15} />
                  <span>{item.label}</span>
                </div>
                <span className="text-[10px] opacity-75">{item.hi}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </nav>
  );
}
