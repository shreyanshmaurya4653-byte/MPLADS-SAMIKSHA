import { apiClient } from './client';

export const dashboardApi = {
  getStats: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.state_id && params.state_id !== 'All') query.set('state_id', params.state_id);
    if (params.district_id && params.district_id !== 'All') query.set('district_id', params.district_id);
    if (params.subdivision && params.subdivision !== 'All') query.set('subdivision', params.subdivision);
    if (params.constituency_id && params.constituency_id !== 'All') query.set('constituency_id', params.constituency_id);
    if (params.mp_name && params.mp_name !== 'All') query.set('mp_name', params.mp_name);
    if (params.house_type && params.house_type !== 'All') query.set('house_type', params.house_type);
    if (params.status && params.status !== 'All') query.set('status', params.status);
    if (params.category && params.category !== 'All') query.set('category', params.category);

    const qs = query.toString();
    const endpoint = `/dashboard/stats${qs ? `?${qs}` : ''}`;
    try {
      return await apiClient(endpoint);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      return {
        total_works: 0,
        completed_works: 0,
        ongoing_works: 0,
        delayed_works: 0,
        high_risk_works: 0,
        critical_risk_works: 0,
        total_sanctioned: 0,
        total_expenditure: 0,
        unspent_balance: 0,
        utilization_rate: 0
      };
    }
  },

  getUtilizationTrends: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.state_id && params.state_id !== 'All') query.set('state_id', params.state_id);
    if (params.district_id && params.district_id !== 'All') query.set('district_id', params.district_id);
    if (params.subdivision && params.subdivision !== 'All') query.set('subdivision', params.subdivision);
    if (params.constituency_id && params.constituency_id !== 'All') query.set('constituency_id', params.constituency_id);
    if (params.mp_name && params.mp_name !== 'All') query.set('mp_name', params.mp_name);
    if (params.house_type && params.house_type !== 'All') query.set('house_type', params.house_type);

    const qs = query.toString();
    const endpoint = `/dashboard/utilization-trends${qs ? `?${qs}` : ''}`;
    try {
      return await apiClient(endpoint);
    } catch {
      return [];
    }
  },

  getRecentAlerts: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.state_id && params.state_id !== 'All') query.set('state_id', params.state_id);
    if (params.district_id && params.district_id !== 'All') query.set('district_id', params.district_id);
    if (params.subdivision && params.subdivision !== 'All') query.set('subdivision', params.subdivision);
    if (params.constituency_id && params.constituency_id !== 'All') query.set('constituency_id', params.constituency_id);

    const qs = query.toString();
    const endpoint = `/dashboard/recent-alerts${qs ? `?${qs}` : ''}`;
    try {
      return await apiClient(endpoint);
    } catch {
      return [];
    }
  }
};
