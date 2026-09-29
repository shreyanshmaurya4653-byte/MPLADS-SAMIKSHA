import React from 'react';
import { Outlet } from 'react-router-dom';
import { GovTopStrip } from './GovTopStrip';
import { GovHeaderBanner } from './GovHeaderBanner';
import { GovNavbar } from './GovNavbar';
import { GovNewsTicker } from './GovNewsTicker';
import { GovBreadcrumb } from './GovBreadcrumb';
import { GovFooter } from './GovFooter';
import { AiCopilotModal } from '../common/AiCopilotModal';

export function AppLayout({ title = 'Dashboard', subtitle = 'National Monitoring & Governance Portal' }) {
  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans text-slate-800 antialiased selection:bg-amber-100 selection:text-amber-900">
      {/* 1. Indian National Top Strip & Accessibility */}
      <GovTopStrip />

      {/* 2. State Emblem, Branding Banner & Official Controls */}
      <GovHeaderBanner />

      {/* 3. National Blue Horizontal Navigation Bar */}
      <GovNavbar />

      {/* 4. Live Governance Announcements / Circular Ticker */}
      <GovNewsTicker />

      {/* 5. Breadcrumb & Active Jurisdiction Stamp */}
      <GovBreadcrumb title={title} subtitle={subtitle} />

      {/* 6. Main Portal Content Container */}
      <main id="main-content" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Grounded AI Decision-Support Copilot Widget */}
      <AiCopilotModal />

      {/* 7. Official 4-Column Government Portal Footer */}
      <GovFooter />
    </div>
  );
}
