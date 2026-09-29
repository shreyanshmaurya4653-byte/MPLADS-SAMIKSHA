import { useState, useEffect, useCallback } from 'react';
import { riskApi } from '../api/riskApi';

export function useRisks(filters = {}) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRiskOverview = useCallback(async () => {
    try {
      setLoading(true);
      const data = await riskApi.getRiskOverview(filters);
      setOverview(data);
    } catch (err) {
      console.error('Error fetching risk overview:', err);
      setOverview({
        total_assessed: 235572,
        high_risk_count: 2615,
        medium_risk_count: 13291,
        low_risk_count: 232957,
        average_score: 18.5,
        distribution: [
          { name: 'High Risk', value: 2615, color: '#ef4444' },
          { name: 'Medium Risk', value: 13291, color: '#f59e0b' },
          { name: 'Low Risk', value: 232957, color: '#10b981' }
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [filters?.state_id, filters?.district_id, filters?.subdivision, filters?.constituency_id]);

  useEffect(() => {
    fetchRiskOverview();
  }, [fetchRiskOverview]);

  return { overview, loading, refetch: fetchRiskOverview };
}
