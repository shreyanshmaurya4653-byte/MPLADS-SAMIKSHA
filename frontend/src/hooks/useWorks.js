import { useState, useEffect, useCallback } from 'react';
import { worksApi } from '../api/worksApi';

export function useWorks(params = {}) {
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await worksApi.getWorks(params);
      setWorks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load works');
      setWorks([]);
    } finally {
      setLoading(false);
    }
  }, [
    params.status, 
    params.category, 
    params.search, 
    params.state_id, 
    params.district_id, 
    params.subdivision,
    params.constituency_id, 
    params.mp_name,
    params.house_type,
    params.risk_level,
    params.sort_by,
    params.limit,
    params.offset
  ]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  return { works, loading, error, refetch: fetchWorks };

}
