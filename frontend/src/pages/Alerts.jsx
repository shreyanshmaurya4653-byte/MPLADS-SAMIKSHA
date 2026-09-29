import React, { useState } from 'react';
import { useAlerts } from '../hooks/useAlerts';
import { alertsApi } from '../api/alertsApi';
import { useLanguage } from '../hooks/useLanguage';
import { AlertFilters } from '../components/alerts/AlertFilters';
import { AlertCard } from '../components/alerts/AlertCard';
import { Loader } from '../components/common/Loader';
import { EmptyState } from '../components/common/EmptyState';

export function Alerts() {
  const { language } = useLanguage();
  const [severity, setSeverity] = useState('All');
  const [alertType, setAlertType] = useState('All');
  const { alerts, loading, refetch } = useAlerts({ severity, alert_type: alertType });

  const handleUpdateStatus = async (alertId, payload) => {
    try {
      await alertsApi.submitVerification(alertId, payload);
      refetch();
    } catch (err) {
      console.error('Failed to submit verification:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">
          {language === 'hi' ? 'लेखापरीक्षा एवं विसंगति अलर्ट फीड' : 'Audit & Anomaly Alert Feed'}
        </h3>
        <p className="text-xs text-slate-400">
          {language === 'hi'
            ? 'एआई मॉडल द्वारा उत्पन्न वास्तविक समय अलर्ट जिन्हें प्रशासनिक क्षेत्रीय सत्यापन की आवश्यकता है'
            : 'Real-time alerts triggered by AI models requiring administrative field verification'}
        </p>
      </div>

      <AlertFilters
        severity={severity}
        onSeverityChange={setSeverity}
        alertType={alertType}
        onAlertTypeChange={setAlertType}
      />

      {loading ? (
        <Loader text={language === 'hi' ? 'लाइव अलर्ट लोड हो रहे हैं...' : 'Loading live alerts...'} />
      ) : alerts.length === 0 ? (
        <EmptyState
          title={language === 'hi' ? 'कोई अलर्ट मानदंडों से मेल नहीं खाता' : 'No alerts match the criteria'}
          description={language === 'hi' ? 'इस अधिकार क्षेत्र के सभी विकासात्मक कार्य सामान्य मापदंडों के भीतर संचालित हैं।' : 'All developmental works in this jurisdiction are operating within normal parameters.'}
          actionText={language === 'hi' ? 'फ़िल्टर हटाएं' : 'Clear Filters'}
          onAction={() => {
            setSeverity('All');
            setAlertType('All');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
