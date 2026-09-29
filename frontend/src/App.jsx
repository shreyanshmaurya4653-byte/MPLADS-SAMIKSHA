import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Parliament } from './pages/Parliament';
import { Works } from './pages/Works';
import { WorkDetails } from './pages/WorkDetails';
import { Risks } from './pages/Risks';
import { Alerts } from './pages/Alerts';
import { Trends } from './pages/Trends';
import { Profile } from './pages/Profile';
import { Investigations } from './pages/Investigations';
import { Finance } from './pages/Finance';
import { Predictions } from './pages/Predictions';
import { AuditLogs } from './pages/AuditLogs';
import { NationalMap } from './pages/NationalMap';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Login & Signup Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout title="Dashboard" subtitle="MPLADS Project & Fund Oversight" />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            <Route element={<AppLayout title="Parliamentary Representation" subtitle="Lok Sabha (543) & Rajya Sabha (245) Scheme Governance" />}>
              <Route path="/parliament" element={<Parliament />} />
            </Route>

            <Route element={<AppLayout title="Works Management" subtitle="Sanctioned Project Proposals & Asset Registry" />}>
              <Route path="/works" element={<Works />} />
              <Route path="/works/:id" element={<WorkDetails />} />
              <Route path="/works/*" element={<WorkDetails />} />
            </Route>

            <Route element={<AppLayout title="Risk Intelligence" subtitle="Ensemble AI Anomaly Detection & Scoring" />}>
              <Route path="/risks" element={<Risks />} />
            </Route>

            <Route element={<AppLayout title="Audit & Verification Alerts" subtitle="Official Anomaly Verification Queue" />}>
              <Route path="/alerts" element={<Alerts />} />
            </Route>

            <Route element={<AppLayout title="Macro Trends" subtitle="State & District Comparative Performance" />}>
              <Route path="/trends" element={<Trends />} />
            </Route>

            <Route element={<AppLayout title="Investigation & Evidence Management" subtitle="Vigilance Dossiers, Checklists & Action Tracking" />}>
              <Route path="/investigations" element={<Investigations />} />
            </Route>

            <Route element={<AppLayout title="Financial & Payments Intelligence" subtitle="Fund Pipeline Tracking & Milestone Mismatch Audit" />}>
              <Route path="/finance" element={<Finance />} />
            </Route>

            <Route element={<AppLayout title="Predictive Analytics & Early Warning" subtitle="Machine Learning Delay Probabilities & Overrun Forecasts" />}>
              <Route path="/predictions" element={<Predictions />} />
            </Route>

            <Route element={<AppLayout title="National GIS Risk Map" subtitle="State & District Geospatial Anomaly Heatmap" />}>
              <Route path="/map" element={<NationalMap />} />
            </Route>

            <Route element={<AppLayout title="Immutable Audit Trail" subtitle="Tamper-evident Governance & Administrative Log" />}>
              <Route path="/audit-logs" element={<AuditLogs />} />
            </Route>

            <Route element={<AppLayout title="Official Profile Dossier" subtitle="Administrative Credentials & Role Permissions" />}>
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}
