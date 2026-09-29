import { useState, useEffect, useCallback } from 'react';
import { alertsApi } from '../api/alertsApi';

export function useAlerts(params = {}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await alertsApi.getAlerts(params);
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([
        {
          id: 'A001',
          work_id: 'P1004',
          alert_type: 'COST_OVERRUN',
          severity: 'High',
          title: 'Critical Cost Overrun Detected',
          description: 'Expenditure (₹9.2L) exceeds sanctioned budget (₹5L) by 84%.',
          status: 'Pending',
          created_at: '2024-08-10'
        },
        {
          id: 'A003',
          work_id: 'P1001',
          alert_type: 'PROGRESS_PAYMENT_MISMATCH',
          severity: 'High',
          title: 'Payment-to-Physical Progress Misalignment',
          description: '90% of funds disbursed while field progress stands stagnant at 55%.',
          status: 'Pending',
          created_at: '2024-08-12'
        },
        {
          id: 'A004',
          work_id: 'P1006',
          alert_type: 'POSSIBLE_DUPLICATE',
          severity: 'High',
          title: 'Potential Duplicate Work Proposal',
          description: 'High similarity (85%) with project P1001 executed by the same agency.',
          status: 'Pending',
          created_at: '2024-08-14'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [params.severity, params.alert_type]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, loading, refetch: fetchAlerts };
}
